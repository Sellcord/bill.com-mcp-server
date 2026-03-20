import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList } from "../client.js";

export function registerVendorCreditTools(server: McpServer): void {
  server.tool(
    "list_vendor_credits",
    "List vendor credits from your Bill.com account.",
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
        path: "/vendor-credits",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { vendorCredits: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_vendor_credit",
    "Get details for a specific vendor credit by ID.",
    {
      vendorCreditId: z.string().describe("The Bill.com vendor credit ID"),
    },
    async ({ vendorCreditId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/vendor-credits/${vendorCreditId}`,
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
    "create_vendor_credit",
    "Create a new vendor credit in Bill.com.",
    {
      vendorId: z.string().describe("The vendor ID this credit is from"),
      creditDate: z.string().describe("Credit date (YYYY-MM-DD)"),
      referenceNumber: z.string().describe("Reference number for the vendor credit"),
      vendorCreditLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .describe("Individual line items on the vendor credit"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        vendorId: params.vendorId,
        creditDate: params.creditDate,
        referenceNumber: params.referenceNumber,
        vendorCreditLineItems: params.vendorCreditLineItems,
      };

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/vendor-credits",
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
    "update_vendor_credit",
    "Update an existing vendor credit in Bill.com.",
    {
      vendorCreditId: z.string().describe("The Bill.com vendor credit ID"),
      vendorId: z.string().optional().describe("The vendor ID this credit is from"),
      creditDate: z.string().optional().describe("Credit date (YYYY-MM-DD)"),
      referenceNumber: z.string().optional().describe("Reference number for the vendor credit"),
      vendorCreditLineItems: z
        .array(
          z.object({
            amount: z.number().describe("Line item amount"),
            description: z.string().optional().describe("Line item description"),
            chartOfAccountId: z.string().optional().describe("Chart of account ID for this line"),
          })
        )
        .optional()
        .describe("Individual line items on the vendor credit"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.vendorId) body.vendorId = params.vendorId;
      if (params.creditDate) body.creditDate = params.creditDate;
      if (params.referenceNumber) body.referenceNumber = params.referenceNumber;
      if (params.vendorCreditLineItems) body.vendorCreditLineItems = params.vendorCreditLineItems;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/vendor-credits/${params.vendorCreditId}`,
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
    "archive_vendor_credit",
    "Archive a vendor credit in Bill.com.",
    {
      vendorCreditId: z.string().describe("The Bill.com vendor credit ID to archive"),
    },
    async ({ vendorCreditId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/vendor-credits/${vendorCreditId}/archive`,
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
