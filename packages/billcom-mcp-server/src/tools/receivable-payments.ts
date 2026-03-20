import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerReceivablePaymentTools(server: McpServer): void {
  server.tool(
    "list_receivable_payments",
    "List receivable payments from your Bill.com account. Shows payments received from customers. Supports filtering and sorting.",
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
        path: "/receivable-payments",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { receivablePayments: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
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
