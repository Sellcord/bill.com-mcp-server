import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList } from "../client.js";

export function registerChartOfAccountTools(server: McpServer): void {
  server.tool(
    "list_chart_of_accounts",
    "List chart of accounts from your Bill.com organization. Returns account names, types, and IDs.",
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
        path: "/classifications/chart-of-accounts",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { accounts: items, total, truncated },
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
