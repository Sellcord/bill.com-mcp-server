import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList } from "../client.js";

export function registerReceivablePaymentTools(server: McpServer): void {
  server.tool(
    "list_receivable_payments",
    "List receivable payments from your Bill.com account. Shows payments received from customers.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
    },
    async ({ page, pageSize }) => {
      const query: Record<string, string> = {};
      if (page) query.page = String(page);
      if (pageSize) query.pageSize = String(pageSize);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/receivable-payments",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { receivablePayments: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_receivable_payment",
    "Get details for a specific receivable payment by ID.",
    {
      receivablePaymentId: z.string().describe("The Bill.com receivable payment ID"),
    },
    async ({ receivablePaymentId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/receivable-payments/${receivablePaymentId}`,
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
