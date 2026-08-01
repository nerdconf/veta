import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the Veta product instead of the starter preview", async () => {
  const [page, app, library, layout, css, hosting] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/veta-app.tsx", root), "utf8"),
    readFile(new URL("lib/library.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);

  assert.match(page, /<VetaApp \/>/);
  assert.match(app, /Tus guardados,/);
  assert.match(app, /por fin útiles\./);
  assert.match(app, /Pregunta a tu biblioteca/);
  assert.match(library, /How to build an AI agent/);
  assert.match(layout, /og\.png/);
  assert.match(css, /\.library-grid/);
  assert.match(hosting, /"d1": "DB"/);
  assert.doesNotMatch(`${page}${app}${layout}`, /codex-preview|Building your site|react-loading-skeleton/i);

  await access(new URL("public/og.png", root));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
