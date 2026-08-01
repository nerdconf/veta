#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { ensureApp, request, searchItems, startApp, vetaUrl } from "./veta-runtime.mjs";

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadItems(path) {
  const raw = path && path !== "-" ? await readFile(path, "utf8") : await readStdin();
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items) || !items.length) {
    throw new Error("El JSON debe ser un array o un objeto con un array `items`.");
  }
  return items;
}

async function importItems(items) {
  await ensureApp();
  let imported = 0;
  for (let index = 0; index < items.length; index += 100) {
    const result = await request("/api/library", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: items.slice(index, index + 100), replaceDemo: index === 0 }),
    });
    imported += result.imported ?? 0;
  }
  return imported;
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);

  if (command === "start") {
    print(await startApp());
    return;
  }
  if (command === "status") {
    await ensureApp();
    const { items = [] } = await request("/api/library");
    print({ ok: true, url: vetaUrl, items: items.length, topics: new Set(items.flatMap((item) => item.tags ?? [])).size });
    return;
  }
  if (command === "import") {
    const items = await loadItems(args[0]);
    print({ imported: await importItems(items), received: items.length, url: vetaUrl });
    return;
  }
  if (command === "search") {
    await ensureApp();
    const { items = [] } = await request("/api/library");
    print({ query: args.join(" "), items: searchItems(args.join(" "), items, 10) });
    return;
  }

  process.stdout.write([
    "Veta local",
    "",
    "  veta start",
    "  veta status",
    "  veta import bookmarks.json",
    "  cat bookmarks.json | veta import -",
    "  veta search linkedin growth",
    "",
  ].join("\n"));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
