import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the agent-first local Veta product instead of the starter preview", async () => {
  const [page, app, library, api, layout, css, hosting, bridge, mcp, installer, installGuide, readme, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/veta-app.tsx", root), "utf8"),
    readFile(new URL("lib/library.ts", root), "utf8"),
    readFile(new URL("app/api/library/route.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("scripts/veta-agent-bridge.mjs", root), "utf8"),
    readFile(new URL("scripts/veta-mcp-server.mjs", root), "utf8"),
    readFile(new URL("scripts/setup.mjs", root), "utf8"),
    readFile(new URL("AGENT_INSTALL.md", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /<VetaApp \/>/);
  assert.match(app, /Tus guardados,/);
  assert.match(app, /por fin útiles\./);
  assert.match(app, /Pregunta a tu biblioteca/);
  assert.match(app, /Tu agente se encarga/);
  assert.match(app, /sin configurar otro browser/);
  assert.match(app, /127\.0\.0\.1:4317/);
  assert.match(app, /item\.content/);
  assert.match(app, /\.filter\(\(\{ score \}\) => score > 0\)/);
  assert.match(app, /\.slice\(0, 8\)/);
  assert.doesNotMatch(app, /useState<LibraryItem\[\]>\(seedLibrary\)/);
  assert.doesNotMatch(app, />Inbox</);
  assert.doesNotMatch(app, /Conectar con X|Instalar extensión|Elegir navegador/);
  assert.doesNotMatch(library, /seedLibrary|fieldnotes|distribution-first/);
  assert.match(api, /export async function PUT/);
  assert.match(api, /export async function PATCH/);
  assert.match(api, /La importación enriquecida sólo está disponible localmente/);
  assert.match(api, /has_real_import/);
  assert.doesNotMatch(api, /seedForUser/);
  assert.match(layout, /og\.png/);
  assert.match(css, /\.library-grid/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(bridge, /"thread\/start"/);
  assert.match(bridge, /"thread\/resume"/);
  assert.match(bridge, /"turn\/start"/);
  assert.match(bridge, /sandboxPolicy: \{ type: "readOnly", networkAccess: false \}/);
  assert.match(bridge, /mcp_servers\.\$\{match\[1\]\}\.enabled=false/);
  assert.match(mcp, /veta_import_bookmarks/);
  assert.match(mcp, /veta_enrich_items/);
  assert.match(mcp, /veta_search/);
  assert.match(installer, /--agent/);
  assert.match(installer, /codex/);
  assert.match(installer, /claude/);
  assert.match(installer, /cursor/);
  assert.match(installGuide, /Do not ask them to install, activate, or configure a browser integration/);
  assert.match(installGuide, /https:\/\/x\.com\/i\/bookmarks/);
  assert.match(readme, /Install it by asking your agent/);
  assert.match(readme, /https:\/\/github\.com\/nerdconf\/veta/);
  assert.match(packageJson, /"dev:local"/);
  assert.match(packageJson, /"mcp"/);
  assert.match(packageJson, /--port 4318/);
  assert.doesNotMatch(app, /Cuenta de Tomi|>TS</);
  assert.doesNotMatch(`${page}${app}${layout}`, /codex-preview|Building your site|react-loading-skeleton/i);

  await access(new URL("public/og.png", root));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
