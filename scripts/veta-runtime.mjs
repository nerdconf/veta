import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const vetaUrl = process.env.VETA_URL ?? "http://127.0.0.1:4318";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function request(pathname, options = {}) {
  const response = await fetch(new URL(pathname, vetaUrl), {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Veta respondió con estado ${response.status}.`);
  }
  return data;
}

export async function isRunning() {
  try {
    await request("/api/library", { signal: AbortSignal.timeout(1_500) });
    return true;
  } catch {
    return false;
  }
}

export async function startApp() {
  if (await isRunning()) return { started: false, url: vetaUrl };

  const logPath = join(projectRoot, ".veta", "runtime.log");
  const log = await open(logPath, "a").catch(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(projectRoot, ".veta"), { recursive: true });
    return open(logPath, "a");
  });
  const child = spawn("npm", ["run", "dev:local"], {
    cwd: projectRoot,
    detached: true,
    env: process.env,
    stdio: ["ignore", log.fd, log.fd],
  });
  child.unref();
  await log.close();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(500);
    if (await isRunning()) return { started: true, url: vetaUrl };
  }
  throw new Error(`Veta no inició. Revisá ${logPath}.`);
}

export async function ensureApp() {
  if (!(await isRunning())) await startApp();
  return vetaUrl;
}

export function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const stopWords = new Set([
  "algo", "algun", "alguna", "algunos", "con", "cual", "cuales", "de", "del",
  "dice", "dicen", "el", "en", "esta", "esto", "hay", "la", "las", "los",
  "me", "mis", "por", "que", "sobre", "tenemos", "tengo", "the", "what",
  "with", "from", "your", "you",
]);

export function searchItems(query, items, limit = 8) {
  const tokens = normalizeSearch(query)
    .split(/[^a-z0-9&]+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
  if (!tokens.length) return [];

  return items
    .map((item, index) => {
      const title = normalizeSearch(item.title);
      const tags = normalizeSearch((item.tags ?? []).join(" "));
      const body = normalizeSearch([
        item.title,
        item.author,
        item.handle,
        item.summary,
        item.preview,
        item.content,
        item.why,
        ...(item.tags ?? []),
        ...(item.keyPoints ?? []),
      ].filter(Boolean).join(" "));
      const score = tokens.reduce((total, token) => {
        const occurrences = body.split(token).length - 1;
        return total
          + Math.min(occurrences, 8)
          + (title.includes(token) ? 8 : 0)
          + (tags.includes(token) ? 12 : 0);
      }, 0);
      return { item, score, index };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(1, Math.min(Number(limit) || 8, 25)))
    .map(({ item }) => item);
}
