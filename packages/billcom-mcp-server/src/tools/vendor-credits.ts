import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerVendorCreditTools(server: McpServer): void {
  server.tool(
    "list_vendor_credits",
    "List vendor credits from your Bill.com account.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100, default 20)"),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
    },
    async ({ max, page }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/vendor-credits",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { vendorCredits: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
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
