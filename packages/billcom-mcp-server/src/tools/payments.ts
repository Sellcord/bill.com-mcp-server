import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerPaymentTools(server: McpServer): void {
  server.tool(
    "list_payments",
    "List payments from your Bill.com account. Shows payment history with amounts, dates, vendors, and statuses. Supports filtering and sorting.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100). The API returns 20 by default when omitted."),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
      sort: z.string().optional().describe("Field name and sort order. Format: field:asc|desc or compound field1:asc,field2:desc. Example: createdTime:desc"),
      filters: z.string().optional().describe("Field name, operator, and value for filtering. Format: field:op:value or compound field1:op:value,field2:op:value. Example: amount:gt:100"),
    },
    async ({ max, page, sort, filters }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;
      if (sort) query.sort = sort;
      if (filters) query.filters = filters;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/payments",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { payments: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_payment",
    "Get details for a specific payment by ID.",
    {
      paymentId: z.string().describe("The Bill.com payment ID"),
    },
    async ({ paymentId }) => {
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
    }
  );

  server.tool(
    "cancel_payment",
    "Cancel a payment in Bill.com. The payment must not have been processed yet.",
    {
      paymentId: z.string().describe("The Bill.com payment ID to cancel"),
    },
    async ({ paymentId }) => {
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
    }
  );

  server.tool(
    "void_payment",
    "Void a payment in Bill.com. Requires a reason for voiding.",
    {
      paymentId: z.string().describe("The Bill.com payment ID to void"),
      voidReason: z.string().describe("Reason for voiding the payment"),
    },
    async ({ paymentId, voidReason }) => {
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
    }
  );
}
