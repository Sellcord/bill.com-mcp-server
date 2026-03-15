import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request, truncateList } from "../client.js";

export function registerVendorTools(server: McpServer): void {
  server.tool(
    "list_vendors",
    "List vendors from your Bill.com account. Returns vendor names, emails, and IDs.",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
    },
    async ({ page, pageSize }) => {
      const query: Record<string, string> = {};
      if (page) query.page = String(page);
      if (pageSize) query.pageSize = String(pageSize);

      const data = await request<{ results: Record<string, unknown>[] }>({
        path: "/vendors",
        query,
      });

      const { items, truncated, total } = truncateList(data.results);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { vendors: items, total, truncated },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_vendor",
    "Get details for a specific vendor by ID.",
    {
      vendorId: z.string().describe("The Bill.com vendor ID"),
    },
    async ({ vendorId }) => {
      const data = await request<Record<string, unknown>>({
        path: `/vendors/${vendorId}`,
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
    "create_vendor",
    "Create a new vendor in Bill.com. Requires name, address line 1, and city at minimum.",
    {
      name: z.string().describe("Vendor name"),
      email: z.string().email().optional().describe("Vendor email address"),
      phone: z.string().optional().describe("Vendor phone number"),
      addressLine1: z.string().describe("Street address line 1 (required)"),
      addressLine2: z.string().optional().describe("Street address line 2"),
      city: z.string().describe("City (required)"),
      state: z.string().describe("State/province (required)"),
      zip: z.string().describe("ZIP/postal code (required)"),
      country: z.string().optional().describe("Country code (e.g. US)"),
      accountNumber: z.string().optional().describe("Your account number with this vendor"),
    },
    async (params) => {
      const body: Record<string, unknown> = { name: params.name };
      if (params.email) body.email = params.email;
      if (params.phone) body.phone = params.phone;
      if (params.accountNumber) body.accountNumber = params.accountNumber;

      // v3 API uses nested address object
      const address: Record<string, string> = {};
      if (params.addressLine1) address.line1 = params.addressLine1;
      if (params.addressLine2) address.line2 = params.addressLine2;
      if (params.city) address.city = params.city;
      if (params.state) address.stateOrProvince = params.state;
      if (params.zip) address.zipOrPostalCode = params.zip;
      if (params.country) address.country = params.country;
      body.address = Object.keys(address).length > 0 ? address : { country: "US" };

      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: "/vendors",
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
    "update_vendor",
    "Update an existing vendor in Bill.com.",
    {
      vendorId: z.string().describe("The Bill.com vendor ID"),
      name: z.string().optional().describe("Vendor name"),
      email: z.string().email().optional().describe("Vendor email address"),
      phone: z.string().optional().describe("Vendor phone number"),
      addressLine1: z.string().optional().describe("Street address line 1"),
      addressLine2: z.string().optional().describe("Street address line 2"),
      city: z.string().optional().describe("City"),
      state: z.string().optional().describe("State/province"),
      zip: z.string().optional().describe("ZIP/postal code"),
      country: z.string().optional().describe("Country code (e.g. US)"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};
      if (params.name) body.name = params.name;
      if (params.email) body.email = params.email;
      if (params.phone) body.phone = params.phone;

      const address: Record<string, string> = {};
      if (params.addressLine1) address.line1 = params.addressLine1;
      if (params.addressLine2) address.line2 = params.addressLine2;
      if (params.city) address.city = params.city;
      if (params.state) address.stateOrProvince = params.state;
      if (params.zip) address.zipOrPostalCode = params.zip;
      if (params.country) address.country = params.country;
      if (Object.keys(address).length > 0) body.address = address;

      const data = await request<Record<string, unknown>>({
        method: "PATCH",
        path: `/vendors/${params.vendorId}`,
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
    "archive_vendor",
    "Archive a vendor in Bill.com. Archived vendors are hidden from default lists.",
    {
      vendorId: z.string().describe("The Bill.com vendor ID to archive"),
    },
    async ({ vendorId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/vendors/${vendorId}/archive`,
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
    "restore_vendor",
    "Restore an archived vendor in Bill.com.",
    {
      vendorId: z.string().describe("The Bill.com vendor ID to restore"),
    },
    async ({ vendorId }) => {
      const data = await request<Record<string, unknown>>({
        method: "POST",
        path: `/vendors/${vendorId}/restore`,
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
