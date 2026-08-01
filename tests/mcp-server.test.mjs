import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import readline from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../scripts/veta-mcp-server.mjs", import.meta.url));

test("MCP server exposes the provider-neutral Veta tool surface", async (t) => {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, VETA_URL: "http://127.0.0.1:9" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));

  const reader = readline.createInterface({ input: child.stdout });
  const messages = [];
  reader.on("line", (line) => messages.push(JSON.parse(line)));

  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(poll);
      reject(new Error("MCP server did not answer"));
    }, 3_000);
    const poll = setInterval(() => {
      if (messages.some((message) => message.id === 2)) {
        clearInterval(poll);
        clearTimeout(timeout);
        resolve();
      }
    }, 20);
  });

  const initialized = messages.find((message) => message.id === 1);
  assert.equal(initialized.result.serverInfo.name, "veta-local");
  const listed = messages.find((message) => message.id === 2);
  const names = listed.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    "veta_status",
    "veta_import_bookmarks",
    "veta_search",
    "veta_enrich_items",
    "veta_get_item",
    "veta_list_topics",
  ]);
});
