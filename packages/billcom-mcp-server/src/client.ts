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
  const env = (process.env.BILLCOM_ENV || "sandbox") as BillComEnv;

  if (!devKey) throw new Error("BILLCOM_DEV_KEY environment variable is required");
  if (!userName) throw new Error("BILLCOM_USERNAME environment variable is required");
  if (!password) throw new Error("BILLCOM_PASSWORD environment variable is required");
  if (!orgId) throw new Error("BILLCOM_ORG_ID environment variable is required");

  if (env !== "sandbox" && env !== "production") {
    throw new Error('BILLCOM_ENV must be "sandbox" or "production"');
  }

  return { devKey, userName, password, orgId, env };
}

let session: SessionState | null = null;
let config: BillComConfig | null = null;

// Rate limiting: max 3 concurrent requests
let activeRequests = 0;
const requestQueue: Array<{ resolve: () => void }> = [];
const MAX_CONCURRENT = 3;

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestQueue.push({ resolve });
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

function getBaseUrl(): string {
  if (!config) config = getConfig();
  return BASE_URLS[config.env];
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
    const text = await res.text();
    throw new Error(`Bill.com login failed (${res.status}): ${text}`);
  }

  const data = await res.json() as Record<string, unknown>;
  // v3 login returns sessionId at top level (not nested under response_data)
  const sessionId = (data.sessionId ?? (data as any).response_data?.sessionId) as string | undefined;

  if (!sessionId) {
    throw new Error(`Bill.com login response missing sessionId: ${JSON.stringify(data)}`);
  }

  // Session expires after 35 minutes; refresh at 30 min to be safe
  session = {
    sessionId,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  console.error(`[billcom] Authenticated as ${config.userName} (${config.env})`);
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bill.com API error (${res.status} ${opts.method || "GET"} ${opts.path}): ${text}`);
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
