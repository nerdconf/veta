# Veta

Turn saved X posts and long-form articles into a private, searchable context base.
Veta runs on your computer, uses the browser already controlled by your coding
agent, and exposes the library through MCP. There is no X API, OAuth app, API
key, or extra browser extension.

## Install it by asking your agent

Open a task in Codex, Claude Code, or Cursor and paste this:

> Install Veta from https://github.com/nerdconf/veta by following
> `AGENT_INSTALL.md`. Use your current browser to open my X bookmarks, ask me
> to sign in only if the session is closed, sync everything, and verify the
> result with a question about my library. Do not ask me to install or configure
> a browser integration.

The agent handles the clone, local setup, MCP registration, app startup,
browser scrolling, import, and verification. The user only signs in to X when
their existing browser session needs it.

## What the workflow looks like

1. Tell the agent to install and sync Veta.
2. If X shows a login screen, sign in in that same agent-controlled tab.
3. Let the agent scan and import bookmarks in resumable batches.
4. Open the library at `http://127.0.0.1:4318` or ask the agent questions
   directly. In future tasks the agent uses Veta's MCP tools automatically.

MCP is the interoperability layer, not the scraper itself. It gives Codex,
Claude Code, and Cursor the same local tools to import, search, read, and enrich
the database. Each product keeps using its own browser capability and its own
existing subscription.

## Privacy model

- The database and app state stay inside the local Veta installation.
- Veta has no analytics, hosted account, X credentials, or token store.
- X authentication remains inside the user's existing browser session.
- The active agent provider receives the saved text it processes or uses in an
  answer. “Local” describes storage and orchestration; it does not make the
  subscribed AI model offline.
- `.wrangler/` and `.veta/` contain local state and are excluded from Git.

See [PRIVACY.md](PRIVACY.md) for the complete boundary.

## Legal

- [Privacy Policy](PRIVACY.md) — English and Spanish
- [MIT License](LICENSE)

## Contributor setup

```bash
npm install
npm run dev:local
```

The app uses `http://127.0.0.1:4318`; the optional in-app Codex question bridge
uses `http://127.0.0.1:4317`.

Useful checks:

```bash
npm test
npm run veta -- status
node scripts/veta-mcp-server.mjs
```

Veta is an early local-first release for macOS and Linux with Node.js 22.13+
and an installed Codex, Claude Code, or Cursor environment.
