# @fintech-mcp/billcom-server

An MCP (Model Context Protocol) server that connects Claude to your [Bill.com](https://bill.com) account. Manage vendors, bills, and payments through natural language.

## Features

**Accounts Payable:**
- **Vendors** -- list, view, and create vendors
- **Bills** -- list, view, create, and approve bills
- **Payments** -- list and view payment history

## Quick Start

### 1. Get Bill.com API credentials

You need a Bill.com developer account and API credentials. Sign up at [developer.bill.com](https://developer.bill.com).

### 2. Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "billcom": {
      "command": "npx",
      "args": ["-y", "@fintech-mcp/billcom-server"],
      "env": {
        "BILLCOM_DEV_KEY": "your-dev-key",
        "BILLCOM_USERNAME": "your-email@example.com",
        "BILLCOM_PASSWORD": "your-password",
        "BILLCOM_ORG_ID": "your-org-id",
        "BILLCOM_ENV": "sandbox"
      }
    }
  }
}
```

### 3. Configure in Claude Code

```bash
claude mcp add --transport stdio billcom \
  --env BILLCOM_DEV_KEY=your-dev-key \
  --env BILLCOM_USERNAME=your-email@example.com \
  --env BILLCOM_PASSWORD=your-password \
  --env BILLCOM_ORG_ID=your-org-id \
  --env BILLCOM_ENV=sandbox \
  -- npx -y @fintech-mcp/billcom-server
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BILLCOM_DEV_KEY` | Yes | Bill.com developer API key |
| `BILLCOM_USERNAME` | Yes | Bill.com account email |
| `BILLCOM_PASSWORD` | Yes | Bill.com account password |
| `BILLCOM_ORG_ID` | Yes | Bill.com organization ID (starts with "008") |
| `BILLCOM_ENV` | No | `sandbox` (default) or `production` |

## Available Tools

### Vendors

| Tool | Description |
|---|---|
| `list_vendors` | List all vendors with pagination |
| `get_vendor` | Get vendor details by ID |
| `create_vendor` | Create a new vendor |

### Bills

| Tool | Description |
|---|---|
| `list_bills` | List bills with pagination |
| `get_bill` | Get bill details by ID |
| `create_bill` | Create a new bill with line items |
| `approve_bill` | Approve a bill for payment |

### Payments

| Tool | Description |
|---|---|
| `list_payments` | List payment history with pagination |
| `get_payment` | Get payment details by ID |

## Example Prompts

Once configured, you can ask Claude things like:

- "Show me all outstanding bills"
- "Who are my top vendors?"
- "Create a bill for $500 from Acme Corp, due March 15th"
- "Approve bill [ID] for payment"
- "Show me recent payments"

## How It Works

This server uses the [Bill.com v3 REST API](https://developer.bill.com/reference/api-reference-overview). Authentication is session-based -- the server logs in automatically and refreshes the session as needed. Rate limiting enforces Bill.com's 3-concurrent-request limit.

## Development

```bash
git clone https://github.com/Christian-Sidak/fintech-mcp-servers.git
cd fintech-mcp-servers/packages/billcom-mcp-server
npm install
npm run build
```

## License

MIT
