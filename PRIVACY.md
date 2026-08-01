# Veta privacy boundary

Veta is local-first software. It does not create a Veta account and does not
send data to a Veta-owned backend.

## What stays local

- The bookmark database and generated metadata
- Sync progress and the optional Codex thread identifier
- The local web app and MCP server
- X cookies and credentials, which remain in the user's existing browser

Veta does not include telemetry, advertising, analytics, an X OAuth client, or
an API-key form.

## What can leave the computer

The user's chosen agent still uses its normal subscription and provider. Saved
post text, article excerpts, and retrieved sources can be sent to Codex, Claude,
or Cursor when the agent summarizes, tags, searches, or answers a question.
The provider's own terms and privacy settings apply to that processing.

The X website also receives normal browser traffic while the user or agent
views bookmarks. Veta never receives or stores the X password or session cookie.

## Public repository safety

Local databases live under ignored runtime folders (`.wrangler/` and `.veta/`).
Do not commit exports, screenshots containing private bookmarks, or runtime
database files when contributing.
