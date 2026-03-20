import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerRecurringInvoiceTools(server: McpServer): void {
  server.tool(
    "list_recurring_invoices",
    "List recurring invoices from your Bill.com account.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100, default 20)"),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
    },
    async ({ max, page }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/recurring-invoices",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { recurringInvoices: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_recurring_invoice",
    "Get details for a specific recurring invoice by ID.",
    {
      recurringInvoiceId: z.string().describe("The Bill.com recurring invoice ID"),
    },
    async ({ recurringInvoiceId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/recurring-invoices/${recurringInvoiceId}`,
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
    "create_recurring_invoice",
    "Create a new recurring invoice in Bill.com. Requires a customer ID, schedule, and at least one line item.",
    {
      customerId: z.string().describe("The customer ID this recurring invoice is for"),
      schedule: z.object({
        period: z.string().describe("Recurrence period (e.g. MONTHLY, WEEKLY, YEARLY)"),
        frequency: z.number().int().describe("Frequency of recurrence (e.g. 1 for every period, 2 for every other)"),
        nextDueDate: z.string().describe("Next due date (YYYY-MM-DD)"),
      }).describe("Recurrence schedule"),
      invoiceLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .describe("Individual line items on the recurring invoice"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        customerId: params.customerId,
        schedule: params.schedule,
        invoiceLineItems: params.invoiceLineItems,
      };

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/recurring-invoices",
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
    "update_recurring_invoice",
    "Update an existing recurring invoice in Bill.com.",
    {
      recurringInvoiceId: z.string().describe("The Bill.com recurring invoice ID"),
      customerId: z.string().optional().describe("The customer ID this recurring invoice is for"),
      schedule: z.object({
        period: z.string().describe("Recurrence period (e.g. MONTHLY, WEEKLY, YEARLY)"),
        frequency: z.number().int().describe("Frequency of recurrence"),
        nextDueDate: z.string().describe("Next due date (YYYY-MM-DD)"),
      }).optional().describe("Recurrence schedule"),
      invoiceLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .optional()
        .describe("Individual line items on the recurring invoice"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.customerId) body.customerId = params.customerId;
      if (params.schedule) body.schedule = params.schedule;
      if (params.invoiceLineItems) body.invoiceLineItems = params.invoiceLineItems;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/recurring-invoices/${params.recurringInvoiceId}`,
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
    "archive_recurring_invoice",
    "Archive a recurring invoice in Bill.com.",
    {
      recurringInvoiceId: z.string().describe("The Bill.com recurring invoice ID"),
    },
    async ({ recurringInvoiceId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/recurring-invoices/${recurringInvoiceId}/archive`,
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
    "restore_recurring_invoice",
    "Restore an archived recurring invoice in Bill.com.",
    {
      recurringInvoiceId: z.string().describe("The Bill.com recurring invoice ID"),
    },
    async ({ recurringInvoiceId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/recurring-invoices/${recurringInvoiceId}/restore`,
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
