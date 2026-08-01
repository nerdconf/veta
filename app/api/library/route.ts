import { env } from "cloudflare:workers";
import type { LibraryItem } from "../../../lib/library";

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
  content: string;
  why_it_matters: string;
  key_points: string;
  tags: string;
  accent: string;
  status: LibraryItem["status"];
};

function currentUserId(request: Request) {
  return request.headers.get("oai-authenticated-user-id") ?? "private-owner";
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
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
        content TEXT NOT NULL DEFAULT '',
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
    db.prepare(`
      CREATE TABLE IF NOT EXISTS library_profiles (
        user_id TEXT PRIMARY KEY,
        has_real_import INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `),
  ]);
  const columns = await db.prepare("PRAGMA table_info(library_items)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "content")) {
    await db.prepare("ALTER TABLE library_items ADD COLUMN content TEXT NOT NULL DEFAULT ''").run();
  }
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
    content: row.content || row.preview,
    why: row.why_it_matters,
    keyPoints: JSON.parse(row.key_points) as string[],
    tags: JSON.parse(row.tags) as string[],
    accent: row.accent,
    status: row.status,
  };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const userId = currentUserId(request);
    const result = await env.DB.prepare(`
      SELECT id, url, kind, title, author, handle, source, saved_at,
             reading_minutes, summary, preview, content, why_it_matters, key_points,
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
      content: "",
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
        content, accent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        item.content ?? "",
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

type ScrapedBookmark = {
  id?: unknown;
  url?: unknown;
  author?: unknown;
  handle?: unknown;
  text?: unknown;
  articleText?: unknown;
  dateTime?: unknown;
  visibleDate?: unknown;
  position?: unknown;
  links?: unknown;
};

function clean(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").trim().slice(0, maximum)
    : "";
}

function inferTags(content: string) {
  const rules: Array<[RegExp, string]> = [
    [/\blinkedin\b/i, "LinkedIn"],
    [/\b(ai|agent|agents|agente|agentes|llm|gpt|claude|codex)\b/i, "IA & agentes"],
    [/\b(growth|distribution|acquisition|retention|viral)\b/i, "Growth"],
    [/\b(sales|ventas|selling|outbound|lead|prospect)\b/i, "Ventas"],
    [/\b(content|contenido|copywriting|newsletter|audience)\b/i, "Contenido"],
    [/\b(design|diseño|ui|ux|website|landing page)\b/i, "Diseño"],
    [/\b(product|producto|saas|app|startup|founder)\b/i, "Producto"],
    [/\b(code|coding|developer|github|api|typescript|python)\b/i, "Desarrollo"],
    [/\b(crypto|bitcoin|ethereum|defi|web3|blockchain)\b/i, "Crypto"],
    [/\b(workout|fitness|gym|exercise|training)\b/i, "Fitness"],
  ];
  const tags = rules.filter(([pattern]) => pattern.test(content)).map(([, tag]) => tag);
  return tags.length ? tags.slice(0, 4) : ["Sin clasificar"];
}

function bookmarkToItem(raw: ScrapedBookmark, userId: string): LibraryItem & { position: number } {
  const sourceId = clean(raw.id, 32);
  const url = clean(raw.url, 500);
  const author = clean(raw.author, 140) || "Autor de X";
  const handle = clean(raw.handle, 80) || "@x";
  const postText = clean(raw.text, 12_000);
  const articleText = clean(raw.articleText, 20_000);
  const linkText = Array.isArray(raw.links)
    ? raw.links
        .slice(0, 20)
        .map((link) => {
          if (!link || typeof link !== "object") return "";
          const candidate = link as { href?: unknown; text?: unknown };
          return [clean(candidate.text, 240), clean(candidate.href, 500)].filter(Boolean).join(" — ");
        })
        .filter(Boolean)
        .join("\n")
    : "";
  const content = [postText, articleText !== postText ? articleText : "", linkText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 30_000);
  const firstLine = postText.split(/\n+/).find((line) => line.trim()) ?? "";
  const title = (firstLine || `Post guardado de ${author}`).slice(0, 120);
  const sentences = postText
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18);
  const tags = inferTags(content);
  const accents = ["violet", "orange", "blue", "green", "pink", "yellow", "red", "aqua"];
  const accentIndex = Number.parseInt(sourceId.slice(-3), 10);

  return {
    id: `${userId}:x:${sourceId || crypto.randomUUID()}`,
    url,
    kind: /Artículo|Article/i.test(articleText) ? "Ensayo" : "Hilo",
    title,
    author,
    handle,
    source: "x.com",
    savedAt: clean(raw.dateTime, 40).slice(0, 10) || clean(raw.visibleDate, 40) || "Sin fecha",
    readingMinutes: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 220)),
    summary: (postText || articleText || "Post guardado de X").slice(0, 420),
    preview: (articleText || postText || "Contenido no disponible").slice(0, 5_000),
    content,
    why: "Guardado real de tu cuenta de X e importado localmente a Veta.",
    keyPoints: sentences.slice(0, 3),
    tags,
    accent: accents[Number.isFinite(accentIndex) ? accentIndex % accents.length : 0],
    status: "ready",
    position: typeof raw.position === "number" ? Math.max(0, raw.position) : 0,
  };
}

export async function PUT(request: Request) {
  try {
    if (!isLocalRequest(request)) {
      return Response.json({ error: "La importación enriquecida sólo está disponible localmente." }, { status: 403 });
    }

    await ensureSchema();
    const userId = currentUserId(request);
    const body = (await request.json()) as { items?: ScrapedBookmark[]; replaceDemo?: boolean };
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
      return Response.json({ error: "El lote debe contener entre 1 y 100 guardados." }, { status: 400 });
    }

    const items = body.items.map((raw) => bookmarkToItem(raw, userId)).filter((item) => item.url);
    if (!items.length) return Response.json({ error: "El lote no contiene URLs válidas." }, { status: 400 });

    if (body.replaceDemo) {
      await env.DB.prepare(
        "DELETE FROM library_items WHERE user_id = ? AND id NOT LIKE ?",
      ).bind(userId, `${userId}:x:%`).run();
    }

    await env.DB.batch(
      items.map((item) =>
        env.DB.prepare(`
          INSERT INTO library_items (
            id, user_id, url, kind, title, author, handle, source, saved_at,
            reading_minutes, summary, preview, content, why_it_matters,
            key_points, tags, accent, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, url) DO UPDATE SET
            kind = excluded.kind,
            title = excluded.title,
            author = excluded.author,
            handle = excluded.handle,
            source = excluded.source,
            saved_at = excluded.saved_at,
            reading_minutes = excluded.reading_minutes,
            summary = excluded.summary,
            preview = excluded.preview,
            content = excluded.content,
            why_it_matters = excluded.why_it_matters,
            key_points = excluded.key_points,
            tags = excluded.tags,
            accent = excluded.accent,
            status = excluded.status,
            created_at = excluded.created_at
        `).bind(
          item.id,
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
          item.content ?? "",
          item.why,
          JSON.stringify(item.keyPoints),
          JSON.stringify(item.tags),
          item.accent,
          item.status,
          Date.now() - item.position,
        ),
      ),
    );

    await env.DB.prepare(`
      INSERT INTO library_profiles (user_id, has_real_import, updated_at)
      VALUES (?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET has_real_import = 1, updated_at = excluded.updated_at
    `).bind(userId, Date.now()).run();

    return Response.json({ imported: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos importar el lote";
    return Response.json({ error: message }, { status: 500 });
  }
}

type EnrichedBookmark = {
  id?: unknown;
  url?: unknown;
  kind?: unknown;
  title?: unknown;
  author?: unknown;
  handle?: unknown;
  source?: unknown;
  savedAt?: unknown;
  readingMinutes?: unknown;
  summary?: unknown;
  preview?: unknown;
  content?: unknown;
  why?: unknown;
  keyPoints?: unknown;
  tags?: unknown;
  status?: unknown;
};

function cleanList(value: unknown, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((item) => clean(item, maximumLength))
    .filter(Boolean)
    .slice(0, maximumItems);
  return items.length ? items : null;
}

export async function PATCH(request: Request) {
  try {
    if (!isLocalRequest(request)) {
      return Response.json({ error: "El enriquecimiento sólo está disponible localmente." }, { status: 403 });
    }

    await ensureSchema();
    const userId = currentUserId(request);
    const body = (await request.json()) as { items?: EnrichedBookmark[] };
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
      return Response.json({ error: "El lote debe contener entre 1 y 100 piezas." }, { status: 400 });
    }

    const kinds = new Set<LibraryItem["kind"]>(["Ensayo", "Playbook", "Hilo", "Research"]);
    const statuses = new Set<LibraryItem["status"]>(["ready", "processing"]);
    const statements = body.items.map((item) => {
      const id = clean(item.id, 240);
      const url = clean(item.url, 500);
      if (!id && !url) throw new Error("Cada enriquecimiento necesita `id` o `url`.");
      const kind = kinds.has(item.kind as LibraryItem["kind"]) ? item.kind : null;
      const status = statuses.has(item.status as LibraryItem["status"]) ? item.status : null;
      const minutes = typeof item.readingMinutes === "number" && Number.isFinite(item.readingMinutes)
        ? Math.max(1, Math.min(Math.round(item.readingMinutes), 10_000))
        : null;
      const keyPoints = cleanList(item.keyPoints, 8, 1_000);
      const tags = cleanList(item.tags, 8, 80);

      return env.DB.prepare(`
        UPDATE library_items SET
          kind = COALESCE(?, kind),
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          handle = COALESCE(?, handle),
          source = COALESCE(?, source),
          saved_at = COALESCE(?, saved_at),
          reading_minutes = COALESCE(?, reading_minutes),
          summary = COALESCE(?, summary),
          preview = COALESCE(?, preview),
          content = COALESCE(?, content),
          why_it_matters = COALESCE(?, why_it_matters),
          key_points = COALESCE(?, key_points),
          tags = COALESCE(?, tags),
          status = COALESCE(?, status)
        WHERE user_id = ? AND ((? != '' AND id = ?) OR (? != '' AND url = ?))
      `).bind(
        kind,
        clean(item.title, 240) || null,
        clean(item.author, 140) || null,
        clean(item.handle, 80) || null,
        clean(item.source, 160) || null,
        clean(item.savedAt, 80) || null,
        minutes,
        clean(item.summary, 2_000) || null,
        clean(item.preview, 8_000) || null,
        clean(item.content, 30_000) || null,
        clean(item.why, 2_000) || null,
        keyPoints ? JSON.stringify(keyPoints) : null,
        tags ? JSON.stringify(tags) : null,
        status,
        userId,
        id,
        id,
        url,
        url,
      );
    });

    const results = await env.DB.batch(statements);
    const updated = results.reduce((total, result) => total + (result.meta.changes ?? 0), 0);
    return Response.json({ updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos enriquecer el lote";
    return Response.json({ error: message }, { status: 500 });
  }
}
