# Neon Setup Runbook

This project uses Neon for Postgres and owner authentication. Use this runbook during F1 Platform Bootstrap and whenever an agent needs Neon database access.

Primary docs:
- Neon docs index for agents: https://neon.com/docs/llms.txt
- MCP client setup: https://neon.com/docs/ai/connect-mcp-clients-to-neon
- Neon MCP overview and security guidance: https://neon.com/docs/ai/neon-mcp-server
- Neon CLI init reference: https://neon.com/docs/reference/cli-init

## Security Rule

The Neon MCP Server is for development and testing only. Always review database, branch, migration, schema, and destructive operations before approving execution. Do not expose production credentials through agent prompts, logs, screenshots, or committed config files.

## Project Bootstrap

Use the Neon CLI wizard when setting up a local workstation or agent environment:

```bash
npx neonctl@latest init
```

`neonctl init` creates a Neon API key, configures MCP with API key auth, installs supported editor extensions where applicable, wires supported assistants, and installs Neon agent skills. Restart the assistant/editor after it completes, then ask the assistant:

```text
Get started with Neon
```

Each run creates a new Neon API key. If the command is run more than once, review Neon API keys in the console and revoke stale keys.

## Environment Variables

The app expects these Neon values:

```env
DATABASE_URL=
DATABASE_TEST_URL=
NEON_API_KEY=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

`NEON_API_KEY` is used by `neonctl` and local MCP server authentication. Keep it out of committed files.
`DATABASE_TEST_URL` is used for F2 database and RLS tests and must point at a Neon testing branch, not the default branch.
`NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` are used by F3 owner authentication through Neon Auth with Better Auth.

For Next.js, `NEON_AUTH_COOKIE_SECRET` should be a secret value at least 32 characters long. Generate one locally with:

```bash
openssl rand -base64 32
```

## Owner Auth

F3 uses Neon Auth's Next.js server SDK and custom TripAI auth pages.

Expected local files:

```text
src/lib/auth/server.ts
src/lib/auth/client.ts
src/app/api/auth/[...path]/route.ts
proxy.ts
```

Google OAuth is available for development through Neon Auth shared credentials. Before production launch, configure custom Google OAuth credentials and trusted application domains in the Neon Console Auth settings.

## MCP Setup

For the full local setup, prefer:

```bash
npx neonctl@latest init
```

If only MCP config is needed:

```bash
npx add-mcp https://mcp.neon.tech/mcp
```

Use `-g` for global user-level setup instead of project-level setup. Use `-a <agent>` to target a specific client. Check the live supported-agent list from your installed CLI with:

```bash
npx add-mcp list-agents
```

Known `--agent` values include:

| Assistant | Agent value |
|---|---|
| Claude Code | `claude-code` |
| Codex | `codex` |
| Cursor | `cursor` |
| VS Code | `vscode` |
| Claude Desktop | `claude-desktop` |
| Cline | `cline` |
| Cline CLI | `cline-cli` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Gemini CLI | `gemini-cli` |
| GitHub Copilot CLI | `github-copilot-cli` |
| Goose | `goose` |
| OpenCode | `opencode` |
| Antigravity | `antigravity` |
| MCPorter | `mcporter` |

Aliases may exist, such as `cline-vscode` to `cline`, `gemini` to `gemini-cli`, and `github-copilot` to `vscode`.

## Agent-Specific Commands

Codex:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a codex
```

For API-key auth in Codex, use:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a codex --header "Authorization: Bearer $NEON_API_KEY"
```

The generated project-local Codex config can contain the bearer token. Keep `.codex/config.toml` ignored and never commit it.

## Testing Branches

Use a dedicated Neon branch for schema, migration, and RLS tests. For F2, the expected branch name is `test-data-model-rls`.

Create the branch:

```bash
set -a
. ./.env.local
set +a
npx neonctl@latest branches create --project-id sparkling-thunder-06034517 --name test-data-model-rls --output json
```

Fetch its connection string:

```bash
set -a
. ./.env.local
set +a
npx neonctl@latest connection-string test-data-model-rls --project-id sparkling-thunder-06034517
```

Store that value as `DATABASE_TEST_URL` in `.env.local`. Do not commit it.

If the development database branch has not had migrations applied yet, load `DATABASE_URL` through Next's env loader before running Drizzle. Raw Neon URLs may contain shell-special characters and may not be safely sourceable directly from `.env.local`.

```bash
DATABASE_URL="$(node -e 'require("@next/env").loadEnvConfig(process.cwd()); process.stdout.write(process.env.DATABASE_URL || "")')" npm run db:migrate
```

Claude Code:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a claude-code
```

Cursor:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a cursor
```

VS Code with GitHub Copilot:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a vscode
```

Claude Desktop:

```bash
npx add-mcp https://mcp.neon.tech/mcp -a claude-desktop
```

## Local MCP Server

Use local API-key auth when OAuth is awkward or when the client does not handle remote MCP well. Replace `<YOUR_NEON_API_KEY>` with a Neon API key from the console.

Generic MCP config:

```json
{
  "mcpServers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "@neondatabase/mcp-server-neon", "start", "<YOUR_NEON_API_KEY>"]
    }
  }
}
```

Claude Code local command:

```bash
claude mcp add neon -- npx -y @neondatabase/mcp-server-neon start "<YOUR_NEON_API_KEY>"
```

VS Code user settings shape:

```json
{
  "mcp": {
    "servers": {
      "neon": {
        "command": "npx",
        "args": ["-y", "@neondatabase/mcp-server-neon", "start", "<YOUR_NEON_API_KEY>"]
      }
    }
  }
}
```

## OAuth Remote MCP

For clients that need manual remote MCP configuration:

```json
{
  "mcpServers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://mcp.neon.tech/mcp"]
    }
  }
}
```

Restart the client, then authorize Neon in the browser when prompted.

For clients that do not support Streamable HTTP, Neon documents a deprecated SSE endpoint:

```text
https://mcp.neon.tech/sse
```

SSE does not support API key authentication.

## Troubleshooting

OAuth error:

```json
{"code":"invalid_request","error":"invalid redirect uri"}
```

Typical fix:

```bash
rm -rf ~/.mcp-auth
```

Then restart the MCP client and rerun the OAuth flow.

If a client does not store MCP config as JSON, use one of these direct commands when prompted:

```bash
npx -y mcp-remote https://mcp.neon.tech/mcp
npx -y @neondatabase/mcp-server-neon start <YOUR_NEON_API_KEY>
```

## F1 Acceptance Notes

F1 should not be marked complete until:
- Neon Postgres project exists.
- Neon Auth is configured.
- `DATABASE_URL`, `NEON_API_KEY`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` are documented in local env setup.
- At least one agent or local developer environment can connect to Neon through MCP.
- Stale or duplicate Neon API keys created during setup have been revoked.
