import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";

export function registerCustomerTools(server: McpServer): void {
  server.tool(
    "list_customers",
    "List customers from your Bill.com account. Returns customer names, emails, and IDs. Supports filtering and sorting.",
    {
      max: z.number().int().min(1).max(100).optional().describe("Maximum number of results (1–100). The API returns 20 by default when omitted."),
      page: z.string().optional().describe("Page cursor from a previous response's 'nextPage' or 'prevPage' field"),
      sort: z.string().optional().describe("Field name and sort order. Format: field:asc|desc or compound field1:asc,field2:desc. Example: createdTime:desc"),
      filters: z.string().optional().describe("Field name, operator, and value for filtering. Format: field:op:value or compound field1:op:value,field2:op:value. Example: name:eq:Acme"),
    },
    async ({ max, page, sort, filters }) => {
      const query: Record<string, string> = {};
      if (max) query.max = String(max);
      if (page) query.page = page;
      if (sort) query.sort = sort;
      if (filters) query.filters = filters;

      const data = await request<{ results: Record<string, unknown>[]; nextPage?: string; prevPage?: string }>({
        path: "/customers",
        query,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { customers: data.results, nextPage: data.nextPage, prevPage: data.prevPage },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_customer",
    "Get details for a specific customer by ID.",
    {
      customerId: z.string().describe("The Bill.com customer ID"),
    },
    async ({ customerId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/customers/${customerId}`,
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
    "create_customer",
    "Create a new customer in Bill.com. Requires name and email.",
    {
      name: z.string().describe("Customer name"),
      email: z.string().email().describe("Customer email address (required by API)"),
      companyName: z.string().optional().describe("Customer company name"),
      phone: z.string().optional().describe("Customer phone number"),
      addressLine1: z.string().optional().describe("Street address line 1"),
      addressLine2: z.string().optional().describe("Street address line 2"),
      city: z.string().optional().describe("City"),
      stateOrProvince: z.string().optional().describe("State/province"),
      zipOrPostalCode: z.string().optional().describe("ZIP/postal code"),
      country: z.string().optional().describe("Country code (e.g. US)"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        name: params.name,
        email: params.email,
      };
      if (params.companyName) body.companyName = params.companyName;
      if (params.phone) body.phone = params.phone;

      const address: Record<string, string> = {};
      if (params.addressLine1) address.line1 = params.addressLine1;
      if (params.addressLine2) address.line2 = params.addressLine2;
      if (params.city) address.city = params.city;
      if (params.stateOrProvince) address.stateOrProvince = params.stateOrProvince;
      if (params.zipOrPostalCode) address.zipOrPostalCode = params.zipOrPostalCode;
      if (params.country) address.country = params.country;
      if (Object.keys(address).length > 0) body.address = address;

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/customers",
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
    "update_customer",
    "Update an existing customer in Bill.com.",
    {
      customerId: z.string().describe("The Bill.com customer ID"),
      name: z.string().optional().describe("Customer name"),
      email: z.string().email().optional().describe("Customer email address"),
      companyName: z.string().optional().describe("Customer company name"),
      phone: z.string().optional().describe("Customer phone number"),
      addressLine1: z.string().optional().describe("Street address line 1"),
      addressLine2: z.string().optional().describe("Street address line 2"),
      city: z.string().optional().describe("City"),
      stateOrProvince: z.string().optional().describe("State/province"),
      zipOrPostalCode: z.string().optional().describe("ZIP/postal code"),
      country: z.string().optional().describe("Country code (e.g. US)"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.name) body.name = params.name;
      if (params.email) body.email = params.email;
      if (params.companyName) body.companyName = params.companyName;
      if (params.phone) body.phone = params.phone;

      const address: Record<string, string> = {};
      if (params.addressLine1) address.line1 = params.addressLine1;
      if (params.addressLine2) address.line2 = params.addressLine2;
      if (params.city) address.city = params.city;
      if (params.stateOrProvince) address.stateOrProvince = params.stateOrProvince;
      if (params.zipOrPostalCode) address.zipOrPostalCode = params.zipOrPostalCode;
      if (params.country) address.country = params.country;
      if (Object.keys(address).length > 0) body.address = address;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/customers/${params.customerId}`,
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
    "archive_customer",
    "Archive a customer in Bill.com.",
    {
      customerId: z.string().describe("The Bill.com customer ID"),
    },
    async ({ customerId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/customers/${customerId}/archive`,
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
    "restore_customer",
    "Restore an archived customer in Bill.com.",
    {
      customerId: z.string().describe("The Bill.com customer ID"),
    },
    async ({ customerId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/customers/${customerId}/restore`,
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
