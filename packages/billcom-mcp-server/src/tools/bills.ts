import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList, withErrorHandling } from "../client.js";

export function registerBillTools(server: McpServer): void {
  server.tool(
    "list_bills",
    "List bills from your Bill.com account. Shows outstanding and paid bills with amounts, due dates, and vendors.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
    },
    async ({ page, pageSize }) => withErrorHandling(async () => {
      const query: Record<string, string> = {};
      if (page) query.page = String(page);
      if (pageSize) query.pageSize = String(pageSize);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/bills",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { bills: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  server.tool(
    "get_bill",
    "Get details for a specific bill by ID, including line items, amounts, and payment status.",
    {
      billId: z.string().describe("The Bill.com bill ID"),
    },
    async ({ billId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        path: `/bills/${billId}`,
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
    "create_bill",
    "Create a new bill in Bill.com. Requires a vendor ID, invoice number, due date, and at least one line item.",
    {
      vendorId: z.string().describe("The vendor ID this bill is from"),
      invoiceNumber: z.string().optional().describe("Vendor's invoice number"),
      invoiceDate: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
      dueDate: z.string().describe("Payment due date (YYYY-MM-DD)"),
      amount: z.number().optional().describe("Total bill amount (if not using line items)"),
      description: z.string().optional().describe("Bill description/memo"),
      billLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .optional()
        .describe("Individual line items on the bill"),
    },
    async (params) => withErrorHandling(async () => {
      const body: Record<string, unknown> = {
        vendorId: params.vendorId,
        dueDate: params.dueDate,
      };
      if (params.invoiceNumber || params.invoiceDate) {
        body.invoice = {
          ...(params.invoiceNumber ? { invoiceNumber: params.invoiceNumber } : {}),
          ...(params.invoiceDate ? { invoiceDate: params.invoiceDate } : {}),
        };
      }
      if (params.amount !== undefined) body.amount = params.amount;
      if (params.description) body.description = params.description;
      if (params.billLineItems) body.billLineItems = params.billLineItems;

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/bills",
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
    "update_bill",
    "Update an existing bill in Bill.com.",
    {
      billId: z.string().describe("The Bill.com bill ID"),
      vendorId: z.string().optional().describe("The vendor ID this bill is from"),
      dueDate: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
      description: z.string().optional().describe("Bill description/memo"),
      invoiceNumber: z.string().optional().describe("Vendor's invoice number"),
      invoiceDate: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
      billLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
            description: z.string().optional().describe("Line item description"),
          })
        )
        .optional()
        .describe("Individual line items on the bill"),
    },
    async (params) => withErrorHandling(async () => {
      const body: Record<string, unknown> = {};
      if (params.vendorId) body.vendorId = params.vendorId;
      if (params.dueDate) body.dueDate = params.dueDate;
      if (params.description) body.description = params.description;
      if (params.invoiceNumber || params.invoiceDate) {
        body.invoice = {
          ...(params.invoiceNumber ? { invoiceNumber: params.invoiceNumber } : {}),
          ...(params.invoiceDate ? { invoiceDate: params.invoiceDate } : {}),
        };
      }
      if (params.billLineItems) body.billLineItems = params.billLineItems;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/bills/${params.billId}`,
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
    "archive_bill",
    "Archive a bill in Bill.com. Archived bills are hidden from default lists.",
    {
      billId: z.string().describe("The Bill.com bill ID to archive"),
    },
    async ({ billId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/bills/${billId}/archive`,
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
    "restore_bill",
    "Restore an archived bill in Bill.com.",
    {
      billId: z.string().describe("The Bill.com bill ID to restore"),
    },
    async ({ billId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/bills/${billId}/restore`,
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
    "approve_bill",
    "Approve a bill for payment in Bill.com. The bill must be in a pending approval state.",
    {
      billId: z.string().describe("The Bill.com bill ID to approve"),
    },
    async ({ billId }) => withErrorHandling(async () => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/bill-approvals/actions",
        body: [{ billId, action: "APPROVE" }],
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
