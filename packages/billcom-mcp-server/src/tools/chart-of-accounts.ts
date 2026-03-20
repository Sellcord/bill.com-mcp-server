import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerChartOfAccountTools(server: McpServer): void {
  server.tool(
    "list_chart_of_accounts",
    "List chart of accounts from your Bill.com organization. Returns account names, types, and IDs.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100, default 20)"),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
    },
    async ({ max, page }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/classifications/chart-of-accounts",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { accounts: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_chart_of_account",
    "Get details for a specific chart of account by ID.",
    {
      chartOfAccountId: z.string().describe("The Bill.com chart of account ID"),
    },
    async ({ chartOfAccountId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/classifications/chart-of-accounts/${chartOfAccountId}`,
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
    "create_chart_of_account",
    "Create a new chart of account in Bill.com.",
    {
      name: z.string().describe("Account name"),
      description: z.string().optional().describe("Account description"),
      accountType: z.string().describe("Account type (e.g. EXPENSE, INCOME, ASSET, LIABILITY)"),
      accountNumber: z.string().optional().describe("Account number"),
    },
    async (params) => {
      const body: Record<string, unknown> = { name: params.name };
      if (params.description) body.description = params.description;

      const account: Record<string, string> = { type: params.accountType };
      if (params.accountNumber) account.number = params.accountNumber;
      body.account = account;

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/classifications/chart-of-accounts",
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
    "update_chart_of_account",
    "Update an existing chart of account in Bill.com.",
    {
      chartOfAccountId: z.string().describe("The Bill.com chart of account ID"),
      name: z.string().optional().describe("Account name"),
      description: z.string().optional().describe("Account description"),
      accountType: z.string().optional().describe("Account type (e.g. EXPENSE, INCOME, ASSET, LIABILITY)"),
      accountNumber: z.string().optional().describe("Account number"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.name) body.name = params.name;
      if (params.description) body.description = params.description;

      if (params.accountType || params.accountNumber) {
        const account: Record<string, string> = {};
        if (params.accountType) account.type = params.accountType;
        if (params.accountNumber) account.number = params.accountNumber;
        body.account = account;
      }

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/classifications/chart-of-accounts/${params.chartOfAccountId}`,
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
    "archive_chart_of_account",
    "Archive a chart of account in Bill.com.",
    {
      chartOfAccountId: z.string().describe("The Bill.com chart of account ID"),
    },
    async ({ chartOfAccountId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/classifications/chart-of-accounts/${chartOfAccountId}/archive`,
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
    "restore_chart_of_account",
    "Restore an archived chart of account in Bill.com.",
    {
      chartOfAccountId: z.string().describe("The Bill.com chart of account ID"),
    },
    async ({ chartOfAccountId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/classifications/chart-of-accounts/${chartOfAccountId}/restore`,
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
