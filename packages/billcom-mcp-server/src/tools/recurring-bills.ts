import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList, withErrorHandling } from "../client.js";

export function registerRecurringBillTools(server: McpServer): void {
  server.tool(
    "list_recurring_bills",
    "List recurring bills from your Bill.com account.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
    },
    async ({ page, pageSize }) => withErrorHandling(async () => {
      const query: Record<string, string> = {};
      if (page) query.page = String(page);
      if (pageSize) query.pageSize = String(pageSize);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/recurringbills",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { recurringBills: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  server.tool(
    "get_recurring_bill",
    "Get details for a specific recurring bill by ID.",
    {
      recurringBillId: z.string().describe("The Bill.com recurring bill ID"),
    },
    async ({ recurringBillId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        path: `/recurringbills/${recurringBillId}`,
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
    "create_recurring_bill",
    "Create a new recurring bill in Bill.com.",
    {
      vendorId: z.string().describe("The vendor ID this recurring bill is from"),
      period: z.string().describe("Recurrence period (e.g. MONTHLY, WEEKLY)"),
      frequency: z.number().int().describe("Recurrence frequency (e.g. 1 for every period, 2 for every other)"),
      nextDueDate: z.string().describe("Next due date (YYYY-MM-DD)"),
      description: z.string().optional().describe("Recurring bill description/memo"),
      billLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .optional()
        .describe("Individual line items on the recurring bill"),
    },
    async (params) => withErrorHandling(async () => {
      const body: Record<string, unknown> = {
        vendorId: params.vendorId,
        schedule: {
          period: params.period,
          frequency: params.frequency,
          nextDueDate: params.nextDueDate,
        },
      };
      if (params.description) body.description = params.description;
      if (params.billLineItems) body.billLineItems = params.billLineItems;

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/recurringbills",
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
    })
  );

  server.tool(
    "update_recurring_bill",
    "Update an existing recurring bill in Bill.com.",
    {
      recurringBillId: z.string().describe("The Bill.com recurring bill ID"),
      vendorId: z.string().optional().describe("The vendor ID this recurring bill is from"),
      period: z.string().optional().describe("Recurrence period (e.g. MONTHLY, WEEKLY)"),
      frequency: z.number().int().optional().describe("Recurrence frequency"),
      nextDueDate: z.string().optional().describe("Next due date (YYYY-MM-DD)"),
      description: z.string().optional().describe("Recurring bill description/memo"),
      billLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .optional()
        .describe("Individual line items on the recurring bill"),
    },
    async (params) => withErrorHandling(async () => {
      const body: Record<string, unknown> = {};
      if (params.vendorId) body.vendorId = params.vendorId;
      if (params.description) body.description = params.description;
      if (params.billLineItems) body.billLineItems = params.billLineItems;

      const schedule: Record<string, unknown> = {};
      if (params.period) schedule.period = params.period;
      if (params.frequency) schedule.frequency = params.frequency;
      if (params.nextDueDate) schedule.nextDueDate = params.nextDueDate;
      if (Object.keys(schedule).length > 0) body.schedule = schedule;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/recurringbills/${params.recurringBillId}`,
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
    })
  );

  server.tool(
    "archive_recurring_bill",
    "Archive a recurring bill in Bill.com.",
    {
      recurringBillId: z.string().describe("The Bill.com recurring bill ID to archive"),
    },
    async ({ recurringBillId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/recurringbills/${recurringBillId}/archive`,
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
    "restore_recurring_bill",
    "Restore an archived recurring bill in Bill.com.",
    {
      recurringBillId: z.string().describe("The Bill.com recurring bill ID to restore"),
    },
    async ({ recurringBillId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/recurringbills/${recurringBillId}/restore`,
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
