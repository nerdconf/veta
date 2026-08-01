# Veta agent instructions

When the user asks to install, sync, scrape, import, organize, or query their X
bookmarks with Veta, read and follow `AGENT_INSTALL.md` completely.

The user-facing contract is agent-first: use the browser already available in
the current agent product. Never turn browser configuration, MCP registration,
or local setup into a human onboarding checklist.

For code changes, preserve the local-only boundary. Do not add X OAuth, paid X
API access, AI API-key forms, analytics, or hosted user data unless explicitly
requested.
