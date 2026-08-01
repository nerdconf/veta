#!/usr/bin/env node

import readline from "node:readline";
import { ensureApp, request, searchItems, vetaUrl } from "./veta-runtime.mjs";

const tools = [
  {
    name: "veta_status",
    description: "Start Veta if needed and report the size and topics of the local library.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "veta_import_bookmarks",
    description: "Import a batch of bookmarks extracted from the user's already signed-in X browser. Send at most 100 items per call.",
    inputSchema: {
      type: "object",
      required: ["items"],
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            required: ["url"],
            additionalProperties: true,
            properties: {
              id: { type: "string" },
              url: { type: "string" },
              author: { type: "string" },
              handle: { type: "string" },
              text: { type: "string" },
              articleText: { type: "string" },
              dateTime: { type: "string" },
              visibleDate: { type: "string" },
              position: { type: "number" },
              links: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
  {
    name: "veta_search",
    description: "Search the local Veta library. Use several focused searches when a question has synonyms or multiple concepts.",
    inputSchema: {
      type: "object",
      required: ["query"],
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25, default: 8 },
      },
    },
  },
  {
    name: "veta_enrich_items",
    description: "Add agent-generated titles, summaries, previews, key points and tags to imported Veta items. Update at most 100 items per call and identify each by id or url.",
    inputSchema: {
      type: "object",
      required: ["items"],
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              url: { type: "string" },
              kind: { type: "string", enum: ["Ensayo", "Playbook", "Hilo", "Research"] },
              title: { type: "string" },
              author: { type: "string" },
              handle: { type: "string" },
              source: { type: "string" },
              savedAt: { type: "string" },
              readingMinutes: { type: "integer" },
              summary: { type: "string" },
              preview: { type: "string" },
              content: { type: "string" },
              why: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              tags: { type: "array", items: { type: "string" } },
              status: { type: "string", enum: ["ready", "processing"] },
            },
            anyOf: [{ required: ["id"] }, { required: ["url"] }],
          },
        },
      },
    },
  },
  {
    name: "veta_get_item",
    description: "Get one complete saved item by its Veta id or original URL.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { id: { type: "string" }, url: { type: "string" } },
      anyOf: [{ required: ["id"] }, { required: ["url"] }],
    },
  },
  {
    name: "veta_list_topics",
    description: "List tags in the local library with the number of matching saved items.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

function result(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

async function allItems() {
  await ensureApp();
  const data = await request("/api/library");
  return data.items ?? [];
}

async function callTool(name, args = {}) {
  if (name === "veta_status") {
    const items = await allItems();
    return result({
      ok: true,
      url: vetaUrl,
      items: items.length,
      topics: new Set(items.flatMap((item) => item.tags ?? [])).size,
      next: items.length ? "Search or ask a question." : "Open X bookmarks in the agent browser and import them in batches.",
    });
  }
  if (name === "veta_import_bookmarks") {
    await ensureApp();
    const response = await request("/api/library", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: args.items, replaceDemo: true }),
    });
    return result({ ...response, url: vetaUrl });
  }
  if (name === "veta_search") {
    const items = searchItems(args.query, await allItems(), args.limit ?? 8).map((item) => ({
      id: item.id,
      url: item.url,
      title: item.title,
      author: item.author,
      handle: item.handle,
      savedAt: item.savedAt,
      readingMinutes: item.readingMinutes,
      summary: item.summary,
      preview: item.preview?.slice(0, 1_200),
      keyPoints: item.keyPoints,
      tags: item.tags,
    }));
    return result({ query: args.query, count: items.length, items });
  }
  if (name === "veta_enrich_items") {
    await ensureApp();
    const response = await request("/api/library", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: args.items }),
    });
    return result(response);
  }
  if (name === "veta_get_item") {
    const item = (await allItems()).find((candidate) =>
      (args.id && candidate.id === args.id) || (args.url && candidate.url === args.url));
    if (!item) throw new Error("No encontré ese guardado en Veta.");
    return result({ item });
  }
  if (name === "veta_list_topics") {
    const counts = new Map();
    for (const item of await allItems()) {
      for (const tag of item.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const topics = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
    return result({ topics });
  }
  throw new Error(`Herramienta desconocida: ${name}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  if (message.method === "notifications/initialized") return;
  if (message.id == null) return;

  try {
    if (message.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: message.params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "veta-local", version: "0.2.0" },
        },
      });
      return;
    }
    if (message.method === "ping") {
      send({ jsonrpc: "2.0", id: message.id, result: {} });
      return;
    }
    if (message.method === "tools/list") {
      send({ jsonrpc: "2.0", id: message.id, result: { tools } });
      return;
    }
    if (message.method === "tools/call") {
      const response = await callTool(message.params?.name, message.params?.arguments ?? {});
      send({ jsonrpc: "2.0", id: message.id, result: response });
      return;
    }
    send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not found" } });
  } catch (error) {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        isError: true,
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
      },
    });
  }
}

const reader = readline.createInterface({ input: process.stdin });
reader.on("line", (line) => {
  try {
    handle(JSON.parse(line));
  } catch {
    // Ignore malformed input so one client message cannot kill the local server.
  }
});
