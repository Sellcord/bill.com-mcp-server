#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerVendorTools } from "./tools/vendors.js";
import { registerBillTools } from "./tools/bills.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerVendorCreditTools } from "./tools/vendor-credits.js";
import { registerRecurringBillTools } from "./tools/recurring-bills.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerReceivablePaymentTools } from "./tools/receivable-payments.js";
import { registerCreditMemoTools } from "./tools/credit-memos.js";
import { registerRecurringInvoiceTools } from "./tools/recurring-invoices.js";
import { registerChartOfAccountTools } from "./tools/chart-of-accounts.js";

const server = new McpServer({
  name: "billcom",
  version: "0.1.0",
});

// Register all tool groups
registerVendorTools(server);
registerBillTools(server);
registerPaymentTools(server);
registerVendorCreditTools(server);
registerRecurringBillTools(server);
registerCustomerTools(server);
registerInvoiceTools(server);
registerReceivablePaymentTools(server);
registerCreditMemoTools(server);
registerRecurringInvoiceTools(server);
registerChartOfAccountTools(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[billcom-mcp] Server started on stdio transport");
