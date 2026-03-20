/**
 * Bill.com API v3 HTTP client with session auth, auto re-auth, and rate limiting.
 */

const BASE_URLS = {
  sandbox: "https://gateway.stage.bill.com/connect/v3",
  production: "https://gateway.prod.bill.com/connect/v3",
} as const;

type BillComEnv = keyof typeof BASE_URLS;

interface BillComConfig {
  devKey: string;
  userName: string;
  password: string;
  orgId: string;
  env: BillComEnv;
}

interface SessionState {
  sessionId: string;
  expiresAt: number; // timestamp ms
}

interface BillComResponse<T = unknown> {
  response_status: number;
  response_message: string;
  response_data: T;
}

interface PaginatedResponse<T = unknown> {
  response_status: number;
  response_message: string;
  response_data: T[];
  total_count?: number;
  page?: number;
}

function getConfig(): BillComConfig {
  const devKey = process.env.BILLCOM_DEV_KEY;
  const userName = process.env.BILLCOM_USERNAME;
  const password = process.env.BILLCOM_PASSWORD;
  const orgId = process.env.BILLCOM_ORG_ID;
  const rawEnv = process.env.BILLCOM_ENV ?? "sandbox";

  if (!devKey) throw new Error("BILLCOM_DEV_KEY environment variable is required");
  if (!userName) throw new Error("BILLCOM_USERNAME environment variable is required");
  if (!password) throw new Error("BILLCOM_PASSWORD environment variable is required");
  if (!orgId) throw new Error("BILLCOM_ORG_ID environment variable is required");

  // Validate before casting to prevent unsafe type coercion
  if (rawEnv !== "sandbox" && rawEnv !== "production") {
    throw new Error('BILLCOM_ENV must be "sandbox" or "production"');
  }

  const env = rawEnv as BillComEnv;

  return { devKey, userName, password, orgId, env };
}

let session: SessionState | null = null;
let config: BillComConfig | null = null;

// Rate limiting: max 3 concurrent requests with a bounded queue to prevent memory DoS
let activeRequests = 0;
const requestQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
const MAX_CONCURRENT = 3;
const MAX_QUEUE_SIZE = 100;

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  if (requestQueue.length >= MAX_QUEUE_SIZE) {
    return Promise.reject(new Error("Request queue is full; too many concurrent requests"));
  }
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject });
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) {
    activeRequests++;
    next.resolve();
  }
}

// Clear sensitive in-memory state on process shutdown
function clearSensitiveState(): void {
  session = null;
  config = null;
}

process.once("SIGTERM", clearSensitiveState);
process.once("SIGINT", clearSensitiveState);

function getBaseUrl(): string {
  if (!config) config = getConfig();
  return BASE_URLS[config.env];
}

/**
 * Validate that a path is safe to use in a URL. Rejects traversal attempts
 * and characters outside the expected API path character set.
 */
function validatePath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error("API path must start with /");
  }
  // Reject path traversal sequences
  if (path.includes("..")) {
    throw new Error("API path must not contain path traversal sequences");
  }
  // Only allow alphanumeric, /, -, _, and the characters typical in Bill.com IDs
  if (!/^\/[\w\-/]*$/.test(path)) {
    throw new Error("API path contains invalid characters");
  }
}

async function login(): Promise<string> {
  if (!config) config = getConfig();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.userName,
      password: config.password,
      devKey: config.devKey,
      organizationId: config.orgId,
    }),
  });

  if (!res.ok) {
    // Do not include the response body in the error to avoid leaking sensitive data
    throw new Error(`Bill.com login failed (${res.status})`);
  }

  const data = await res.json() as Record<string, unknown>;
  // v3 login returns sessionId at top level (not nested under response_data)
  const sessionId = (data.sessionId ?? (data as any).response_data?.sessionId) as string | undefined;

  if (!sessionId) {
    // Do not dump the full response body, which may contain sensitive fields
    throw new Error("Bill.com login response missing sessionId");
  }

  // Session expires after 35 minutes; refresh at 30 min to be safe
  session = {
    sessionId,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  console.error(`[billcom] Authenticated (${config.env})`);
  return sessionId;
}

async function getSessionId(): Promise<string> {
  if (session && Date.now() < session.expiresAt) {
    return session.sessionId;
  }
  return login();
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string>;
}

export async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  await acquireSlot();

  try {
    return await requestInner<T>(opts, true);
  } finally {
    releaseSlot();
  }
}

async function requestInner<T>(opts: RequestOptions, allowRetry: boolean): Promise<T> {
  validatePath(opts.path);

  const sessionId = await getSessionId();
  if (!config) config = getConfig();

  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${opts.path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      sessionId,
      devKey: config.devKey,
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  // Re-auth on 401 once
  if (res.status === 401 && allowRetry) {
    console.error("[billcom] Session expired, re-authenticating...");
    session = null;
    return requestInner<T>(opts, false);
  }

  // Respect rate-limit responses from the API
  if (res.status === 429 && allowRetry) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 5000;
    console.error(`[billcom] Rate limited; retrying after ${delayMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return requestInner<T>(opts, false);
  }

  if (!res.ok) {
    // Do not include the raw response body to avoid leaking sensitive API data
    throw new Error(`Bill.com API error (${res.status} ${opts.method ?? "GET"} ${opts.path})`);
  }

  return res.json() as Promise<T>;
}

/**
 * Truncate large arrays in API responses for LLM context efficiency.
 */
export function truncateList<T>(items: T[], limit = 50): { items: T[]; truncated: boolean; total: number } {
  return {
    items: items.slice(0, limit),
    truncated: items.length > limit,
    total: items.length,
  };
}

/**
 * Wrap a tool handler body so that any thrown error is returned as a
 * structured error response instead of propagating as an unhandled rejection.
 * Error messages are surfaced as-is; sensitive data should never appear in
 * them (client.ts strips raw API response bodies from all thrown errors).
 */
export async function withErrorHandling(
  fn: () => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
      isError: true,
    };
  }
}
