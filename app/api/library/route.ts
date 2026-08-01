import { env } from "cloudflare:workers";
import { seedLibrary, type LibraryItem } from "../../../lib/library";

type LibraryRow = {
  id: string;
  url: string;
  kind: LibraryItem["kind"];
  title: string;
  author: string;
  handle: string;
  source: string;
  saved_at: string;
  reading_minutes: number;
  summary: string;
  preview: string;
  why_it_matters: string;
  key_points: string;
  tags: string;
  accent: string;
  status: LibraryItem["status"];
};

function currentUserId(request: Request) {
  return request.headers.get("oai-authenticated-user-id") ?? "private-owner";
}

async function ensureSchema() {
  const db = env.DB;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS library_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        handle TEXT NOT NULL,
        source TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        reading_minutes INTEGER NOT NULL,
        summary TEXT NOT NULL,
        preview TEXT NOT NULL,
        why_it_matters TEXT NOT NULL,
        key_points TEXT NOT NULL,
        tags TEXT NOT NULL,
        accent TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `),
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_library_items_user_url
      ON library_items(user_id, url)
    `),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

function rowToItem(row: LibraryRow): LibraryItem {
  return {
    id: row.id,
    url: row.url,
    kind: row.kind,
    title: row.title,
    author: row.author,
    handle: row.handle,
    source: row.source,
    savedAt: row.saved_at,
    readingMinutes: row.reading_minutes,
    summary: row.summary,
    preview: row.preview,
    why: row.why_it_matters,
    keyPoints: JSON.parse(row.key_points) as string[],
    tags: JSON.parse(row.tags) as string[],
    accent: row.accent,
    status: row.status,
  };
}

async function seedForUser(userId: string) {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM library_items WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ total: number }>();

  if ((count?.total ?? 0) > 0) return;

  await env.DB.batch(
    seedLibrary.map((item, index) =>
      env.DB.prepare(`
        INSERT OR IGNORE INTO library_items (
          id, user_id, url, kind, title, author, handle, source, saved_at,
          reading_minutes, summary, preview, why_it_matters, key_points, tags,
          accent, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `${userId}:${item.id}`,
        userId,
        item.url,
        item.kind,
        item.title,
        item.author,
        item.handle,
        item.source,
        item.savedAt,
        item.readingMinutes,
        item.summary,
        item.preview,
        item.why,
        JSON.stringify(item.keyPoints),
        JSON.stringify(item.tags),
        item.accent,
        item.status,
        Date.now() - index * 1000,
      ),
    ),
  );
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const userId = currentUserId(request);
    await seedForUser(userId);

    const result = await env.DB.prepare(`
      SELECT id, url, kind, title, author, handle, source, saved_at,
             reading_minutes, summary, preview, why_it_matters, key_points,
             tags, accent, status
      FROM library_items
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
      .bind(userId)
      .all<LibraryRow>();

    return Response.json({ items: result.results.map(rowToItem) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos abrir la biblioteca";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const userId = currentUserId(request);
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return Response.json({ error: "Falta el enlace" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return Response.json({ error: "El enlace no es válido" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const item: LibraryItem = {
      id,
      url,
      kind: "Hilo",
      title: "Nuevo guardado en proceso",
      author: "Fuente importada",
      handle: parsed.hostname.includes("x.com") ? "@x" : parsed.hostname,
      source: parsed.hostname.replace(/^www\./, ""),
      savedAt: "Ahora",
      readingMinutes: 1,
      summary:
        "El enlace ya está en tu biblioteca. La extracción y el enriquecimiento se completan al conectar el motor de ingesta.",
      preview:
        "Pendiente de leer el contenido completo, detectar ideas clave y proponer etiquetas.",
      why:
        "Lo conservamos desde ahora para que no vuelva a perderse entre tus guardados.",
      keyPoints: [
        "Enlace capturado correctamente.",
        "Extracción de contenido pendiente.",
        "Etiquetas automáticas pendientes.",
      ],
      tags: ["Inbox", "Sin procesar"],
      accent: "slate",
      status: "processing",
    };

    await env.DB.prepare(`
      INSERT INTO library_items (
        id, user_id, url, kind, title, author, handle, source, saved_at,
        reading_minutes, summary, preview, why_it_matters, key_points, tags,
        accent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        id,
        userId,
        item.url,
        item.kind,
        item.title,
        item.author,
        item.handle,
        item.source,
        item.savedAt,
        item.readingMinutes,
        item.summary,
        item.preview,
        item.why,
        JSON.stringify(item.keyPoints),
        JSON.stringify(item.tags),
        item.accent,
        item.status,
        Date.now(),
      )
      .run();

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos guardar el enlace";
    if (message.includes("UNIQUE")) {
      return Response.json({ error: "Ese enlace ya está en tu biblioteca" }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

