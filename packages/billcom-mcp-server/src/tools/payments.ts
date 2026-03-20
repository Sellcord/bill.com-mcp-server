import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList, withErrorHandling } from "../client.js";

export function registerPaymentTools(server: McpServer): void {
  server.tool(
    "list_payments",
    "List payments from your Bill.com account. Shows payment history with amounts, dates, vendors, and statuses.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
    },
    async ({ page, pageSize }) => withErrorHandling(async () => {
      const query: Record<string, string> = {};
      if (page) query.page = String(page);
      if (pageSize) query.pageSize = String(pageSize);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/payments",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { payments: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  server.tool(
    "get_payment",
    "Get details for a specific payment by ID.",
    {
      paymentId: z.string().describe("The Bill.com payment ID"),
    },
    async ({ paymentId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        path: `/payments/${paymentId}`,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    })
  );

  server.tool(
    "cancel_payment",
    "Cancel a payment in Bill.com. The payment must not have been processed yet.",
    {
      paymentId: z.string().describe("The Bill.com payment ID to cancel"),
    },
    async ({ paymentId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/payments/${paymentId}/cancel`,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    })
  );

  server.tool(
    "void_payment",
    "Void a payment in Bill.com. Requires a reason for voiding.",
    {
      paymentId: z.string().describe("The Bill.com payment ID to void"),
      voidReason: z.string().describe("Reason for voiding the payment"),
    },
    async ({ paymentId, voidReason }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/payments/${paymentId}/void`,
        body: { voidReason },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    })
  );
}
