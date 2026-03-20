import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList } from "../client.js";

export function registerCreditMemoTools(server: McpServer): void {
  server.tool(
    "list_credit_memos",
    "List credit memos from your Bill.com account.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 100, max 200)"),
    },
    async ({ page, pageSize }) => {
      const query: Record<string, string> = {};
      const resolvedMax = pageSize ?? 100;
      const start = ((page ?? 1) - 1) * resolvedMax;
      if (start > 0) query.start = String(start);
      query.max = String(resolvedMax);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/credit-memos",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { creditMemos: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_credit_memo",
    "Get details for a specific credit memo by ID.",
    {
      creditMemoId: z.string().describe("The Bill.com credit memo ID"),
    },
    async ({ creditMemoId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/credit-memos/${creditMemoId}`,
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
    "create_credit_memo",
    "Create a new credit memo in Bill.com. Requires a customer ID, date, and at least one line item.",
    {
      customerId: z.string().describe("The customer ID this credit memo is for"),
      creditDate: z.string().describe("Credit date (YYYY-MM-DD)"),
      referenceNumber: z.string().describe("Reference number for the credit memo"),
      creditMemoLineItems: z
        .array(
          z.object({
            price: z.number().describe("Unit price for the line item"),
            quantity: z.number().int().min(1).describe("Quantity"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .describe("Individual line items on the credit memo"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        customerId: params.customerId,
        creditDate: params.creditDate,
        referenceNumber: params.referenceNumber,
        creditMemoLineItems: params.creditMemoLineItems,
      };

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/credit-memos",
        body,
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
    "update_credit_memo",
    "Update an existing credit memo in Bill.com.",
    {
      creditMemoId: z.string().describe("The Bill.com credit memo ID"),
      customerId: z.string().optional().describe("The customer ID this credit memo is for"),
      creditDate: z.string().optional().describe("Credit date (YYYY-MM-DD)"),
      referenceNumber: z.string().optional().describe("Reference number for the credit memo"),
      creditMemoLineItems: z
        .array(
          z.object({
            price: z.number().describe("Unit price for the line item"),
            quantity: z.number().int().min(1).describe("Quantity"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .optional()
        .describe("Individual line items on the credit memo"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.customerId) body.customerId = params.customerId;
      if (params.creditDate) body.creditDate = params.creditDate;
      if (params.referenceNumber) body.referenceNumber = params.referenceNumber;
      if (params.creditMemoLineItems) body.creditMemoLineItems = params.creditMemoLineItems;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/credit-memos/${params.creditMemoId}`,
        body,
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
    "archive_credit_memo",
    "Archive a credit memo in Bill.com.",
    {
      creditMemoId: z.string().describe("The Bill.com credit memo ID"),
    },
    async ({ creditMemoId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/credit-memos/${creditMemoId}/archive`,
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
    "restore_credit_memo",
    "Restore an archived credit memo in Bill.com.",
    {
      creditMemoId: z.string().describe("The Bill.com credit memo ID"),
    },
    async ({ creditMemoId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/credit-memos/${creditMemoId}/restore`,
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
