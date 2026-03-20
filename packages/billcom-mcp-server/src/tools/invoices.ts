import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerInvoiceTools(server: McpServer): void {
  server.tool(
    "list_invoices",
    "List invoices from your Bill.com account. Shows invoice numbers, amounts, due dates, and customers. Supports filtering and sorting.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100). The API returns 20 by default when omitted."),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
      sort: z.string().optional().describe("Field name and sort order. Format: field:asc|desc or compound field1:asc,field2:desc. Example: createdTime:desc"),
      filters: z.string().optional().describe("Field name, operator, and value for filtering. Format: field:op:value or compound field1:op:value,field2:op:value. Example: id:eq:abc123"),
    },
    async ({ max, page, sort, filters }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;
      if (sort) query.sort = sort;
      if (filters) query.filters = filters;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/invoices",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { invoices: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_invoice",
    "Get details for a specific invoice by ID, including line items, amounts, and payment status.",
    {
      invoiceId: z.string().describe("The Bill.com invoice ID"),
    },
    async ({ invoiceId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/invoices/${invoiceId}`,
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
    "create_invoice",
    "Create a new invoice in Bill.com. Requires a customer ID, invoice date, due date, and at least one line item with price and quantity.",
    {
      customerId: z.string().describe("The customer ID this invoice is for"),
      invoiceNumber: z.string().optional().describe("Invoice number"),
      invoiceDate: z.string().describe("Invoice date (YYYY-MM-DD)"),
      dueDate: z.string().describe("Payment due date (YYYY-MM-DD)"),
      invoiceLineItems: z
        .array(
          z.object({
            price: z.number().describe("Unit price for the line item"),
            quantity: z.number().int().min(1).describe("Quantity"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .describe("Individual line items on the invoice"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        customer: { id: params.customerId },
        invoiceDate: params.invoiceDate,
        dueDate: params.dueDate,
        invoiceLineItems: params.invoiceLineItems,
      };
      if (params.invoiceNumber) body.invoiceNumber = params.invoiceNumber;

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/invoices",
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
    "update_invoice",
    "Update an existing invoice in Bill.com.",
    {
      invoiceId: z.string().describe("The Bill.com invoice ID"),
      invoiceNumber: z.string().optional().describe("Invoice number"),
      invoiceDate: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
      dueDate: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
      invoiceLineItems: z
        .array(
          z.object({
            price: z.number().describe("Unit price for the line item"),
            quantity: z.number().int().min(1).describe("Quantity"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .optional()
        .describe("Individual line items on the invoice"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.invoiceNumber) body.invoiceNumber = params.invoiceNumber;
      if (params.invoiceDate) body.invoiceDate = params.invoiceDate;
      if (params.dueDate) body.dueDate = params.dueDate;
      if (params.invoiceLineItems) body.invoiceLineItems = params.invoiceLineItems;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/invoices/${params.invoiceId}`,
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
    "archive_invoice",
    "Archive an invoice in Bill.com.",
    {
      invoiceId: z.string().describe("The Bill.com invoice ID"),
    },
    async ({ invoiceId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/invoices/${invoiceId}/archive`,
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
    "restore_invoice",
    "Restore an archived invoice in Bill.com.",
    {
      invoiceId: z.string().describe("The Bill.com invoice ID"),
    },
    async ({ invoiceId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/invoices/${invoiceId}/restore`,
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
