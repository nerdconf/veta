"use client";

import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  FileUp,
  Globe2,
  Hash,
  Layers3,
  Link2,
  LoaderCircle,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { LibraryItem } from "../lib/library";

type View = "library" | "ask";
type Language = "es" | "en";
type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: LibraryItem[];
};

type AgentState = {
  status: "checking" | "ready" | "offline";
  provider: string | null;
  threadId: string | null;
  error: string | null;
};

const agentBridgeUrl = "http://127.0.0.1:4317";

const onboardingCopy = {
  es: {
    eyebrow: "Primer paso",
    title: "Convertí tus guardados en contexto",
    close: "Cerrar onboarding",
    agentTitle: "Tu agente se encarga",
    recommended: "Recomendado",
    agentBody: "Pedile: “sincronizá mis bookmarks de X con Veta”. Va a usar el browser que ya tiene, abrir X y recorrer los guardados.",
    agentNote: "Sin extensión · sin API de X · sin configurar otro browser",
    local: "Local",
    manual: "alternativa manual",
    pasteLabel: "Pegá todos los enlaces que quieras, uno por línea",
    import: "Importar",
    noLinks: "No encontramos enlaces válidos en ese texto.",
    saveError: "No pudimos guardar los enlaces.",
    fileMissing: "No encontramos posts de X en ese archivo.",
    fileError: "No pudimos leer el archivo.",
    imported: (count: number, skipped: number) => `${count} enlaces importados${skipped ? ` · ${skipped} ya existían` : ""}.`,
    detected: (count: number) => `${count} posts detectados. Revisalos y presioná Importar.`,
    fileTitle: "Leer un archivo exportado",
    fileFormats: "JSON, JS, CSV, Markdown, texto o HTML",
    choose: "Elegir",
    loginTitle: "Si X pide login, hacelo en esa misma pestaña.",
    loginBody: "Es la única pausa humana: Veta nunca ve ni guarda tu contraseña.",
    privacyLead: "La base queda local; tu agente procesa el contexto con tu suscripción actual.",
    privacy: "Política de privacidad",
    license: "Licencia MIT",
    languageLabel: "Idioma del onboarding",
  },
  en: {
    eyebrow: "First step",
    title: "Turn your saves into context",
    close: "Close onboarding",
    agentTitle: "Your agent handles it",
    recommended: "Recommended",
    agentBody: "Ask it: “sync my X bookmarks with Veta”. It will use the browser it already controls, open X, and scan your saves.",
    agentNote: "No extension · no X API · no extra browser setup",
    local: "Local",
    manual: "manual alternative",
    pasteLabel: "Paste as many links as you want, one per line",
    import: "Import",
    noLinks: "We couldn't find any valid links in that text.",
    saveError: "We couldn't save those links.",
    fileMissing: "We couldn't find X posts in that file.",
    fileError: "We couldn't read that file.",
    imported: (count: number, skipped: number) => `${count} links imported${skipped ? ` · ${skipped} already existed` : ""}.`,
    detected: (count: number) => `${count} posts detected. Review them and press Import.`,
    fileTitle: "Read an exported file",
    fileFormats: "JSON, JS, CSV, Markdown, text, or HTML",
    choose: "Choose",
    loginTitle: "If X asks you to log in, do it in that same tab.",
    loginBody: "That is the only human pause: Veta never sees or stores your password.",
    privacyLead: "Your database stays local; your agent processes context through your existing subscription.",
    privacy: "Privacy Policy",
    license: "MIT License",
    languageLabel: "Onboarding language",
  },
} as const;

const languageEvent = "veta-language-change";

function getLanguageSnapshot(): Language {
  const stored = window.localStorage.getItem("veta-language");
  if (stored === "en" || stored === "es") return stored;
  return window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function subscribeToLanguage(callback: () => void) {
  window.addEventListener(languageEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(languageEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

const starterQuestions = [
  "¿Tenemos algo sobre LinkedIn?",
  "¿Qué ideas se repiten sobre agentes de IA?",
  "¿Qué guardé sobre growth y distribución?",
];

const searchStopWords = new Set([
  "algo", "algun", "alguna", "algunos", "con", "cual", "cuales", "de", "del",
  "dice", "dicen", "el", "en", "esta", "esto", "hay", "la", "las", "los",
  "me", "mis", "por", "que", "sobre", "tenemos", "tengo", "the", "what",
  "with", "from", "your", "you",
]);

function searchable(item: LibraryItem) {
  return [
    item.title,
    item.author,
    item.handle,
    item.summary,
    item.preview,
    item.content ?? "",
    item.why,
    ...item.tags,
    ...item.keyPoints,
  ]
    .join(" ")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenise(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9&]+/)
    .filter((token) => token.length > 2 && !searchStopWords.has(token));
}

function rankSources(question: string, items: LibraryItem[]) {
  const tokens = tokenise(question);
  const scored = items.map((item, index) => {
    const body = searchable(item);
    const title = tokenise(item.title).join(" ");
    const tags = tokenise(item.tags.join(" ")).join(" ");
    const score = tokens.reduce(
      (total, token) => {
        const occurrences = body.split(token).length - 1;
        return total + Math.min(occurrences, 8) + (title.includes(token) ? 8 : 0) + (tags.includes(token) ? 12 : 0);
      },
      0,
    );
    return { item, score, index };
  });

  const ranked = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .map(({ item }) => item);

  return ranked;
}

function extractImportUrls(value: string, fromFile = false) {
  const urls = new Set<string>();
  const matches = value.match(/https?:\/\/[^\s"'<>\\]+/g) ?? [];

  for (const raw of matches) {
    const candidate = raw.replace(/[),.;\]}]+$/g, "");
    try {
      const parsed = new URL(candidate);
      const isXPost =
        /(^|\.)x\.com$/.test(parsed.hostname) ||
        /(^|\.)twitter\.com$/.test(parsed.hostname);
      if (!fromFile || (isXPost && /\/status\/\d+/.test(parsed.pathname))) {
        urls.add(candidate);
      }
    } catch {
      // Ignore malformed URLs found inside exports.
    }
  }

  if (fromFile) {
    const idPattern = /["']?(?:tweetId|tweet_id)["']?\s*[:=]\s*["']?(\d{8,24})/gi;
    for (const match of value.matchAll(idPattern)) {
      urls.add(`https://x.com/i/web/status/${match[1]}`);
    }
  }

  return [...urls];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SourceGlyph({ item }: { item: LibraryItem }) {
  if (item.kind === "Research") return <FileText aria-hidden="true" />;
  if (item.kind === "Playbook") return <Layers3 aria-hidden="true" />;
  if (item.kind === "Hilo") return <Hash aria-hidden="true" />;
  return <BookOpen aria-hidden="true" />;
}

export default function VetaApp() {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, () => "es");
  const [view, setView] = useState<View>("library");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importState, setImportState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [askInput, setAskInput] = useState("");
  const [askError, setAskError] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>({
    status: "checking",
    provider: null,
    threadId: null,
    error: null,
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onboarding = onboardingCopy[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { items: LibraryItem[] }) => {
        if (!cancelled) {
          const library = data.items ?? [];
          setItems(library);
          if (!library.length && window.localStorage.getItem("veta-onboarding-seen") !== "1") {
            setImportOpen(true);
          }
        }
      })
      .catch(() => {
        // Stay empty instead of presenting demo data as the user's library.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAgent() {
      if (!(["localhost", "127.0.0.1"] as string[]).includes(window.location.hostname)) {
        if (!cancelled) {
          setAgentState({
            status: "offline",
            provider: null,
            threadId: null,
            error: "El hilo funciona en la versión local de Veta.",
          });
        }
        return;
      }

      try {
        const response = await fetch(`${agentBridgeUrl}/health`);
        const data = (await response.json()) as {
          ok?: boolean;
          threadId?: string | null;
          provider?: string | null;
          error?: string | null;
        };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "Agente desconectado");
        if (!cancelled) {
          setAgentState({ status: "ready", provider: data.provider ?? "Agente local", threadId: data.threadId ?? null, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setAgentState({
            status: "offline",
            provider: null,
            threadId: null,
            error: error instanceof Error ? error.message : "Agente desconectado",
          });
        }
      }
    }

    checkAgent();
    const timer = window.setInterval(checkAgent, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !importOpen && !selectedItem) {
        const element = event.target as HTMLElement;
        if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") {
          event.preventDefault();
          setView("library");
          window.setTimeout(() => searchRef.current?.focus(), 0);
        }
      }
      if (event.key === "Escape") {
        setSelectedItem(null);
        setImportOpen(false);
        if (importOpen) window.localStorage.setItem("veta-onboarding-seen", "1");
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [importOpen, selectedItem]);

  const filteredItems = useMemo(() => {
    const queryTokens = tokenise(query);
    return items.filter((item) => {
      const matchesFilter =
        activeFilter === "Todos" || item.tags.includes(activeFilter);
      const matchesQuery =
        !queryTokens.length || queryTokens.every((token) => searchable(item).includes(token));
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, items, query]);

  const filterGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [
      "Todos",
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag]) => tag),
    ];
  }, [items]);

  const readyCount = items.filter((item) => item.status === "ready").length;
  const tagCount = new Set(items.flatMap((item) => item.tags)).size;
  const collectionRows = filterGroups.slice(1, 5).map((tag, index) => ({
    tag,
    count: items.filter((item) => item.tags.includes(tag)).length,
    dot: ["dot-violet", "dot-orange", "dot-green", "dot-blue"][index],
  }));

  function changeView(nextView: View) {
    setView(nextView);
    setMobileMenuOpen(false);
  }

  function changeLanguage(nextLanguage: Language) {
    window.localStorage.setItem("veta-language", nextLanguage);
    window.dispatchEvent(new Event(languageEvent));
  }

  function closeImport() {
    setImportOpen(false);
    window.localStorage.setItem("veta-onboarding-seen", "1");
  }

  async function importLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const urls = extractImportUrls(importUrl);
    if (!urls.length) {
      setImportState("error");
      setImportMessage(onboarding.noLinks);
      return;
    }
    setImportState("saving");
    setImportMessage("");

    try {
      const imported: LibraryItem[] = [];
      let skipped = 0;
      for (let index = 0; index < urls.length; index += 8) {
        const batch = urls.slice(index, index + 8);
        const results = await Promise.all(
          batch.map(async (url) => {
            const response = await fetch("/api/library", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ url }),
            });
            const data = (await response.json()) as { item?: LibraryItem; error?: string };
            if (response.status === 409) return null;
            if (!response.ok || !data.item) throw new Error(data.error ?? "No se pudo guardar");
            return data.item;
          }),
        );
        for (const item of results) {
          if (item) imported.push(item);
          else skipped += 1;
        }
      }
      if (imported.length) setItems((current) => [...imported, ...current]);
      setImportUrl("");
      setImportState("done");
      setImportMessage(onboarding.imported(imported.length, skipped));
    } catch (error) {
      setImportState("error");
      setImportMessage(
        error instanceof Error ? error.message : onboarding.saveError,
      );
    }
  }

  async function loadImportFile(file: File) {
    setImportState("idle");
    setImportMessage("");
    try {
      const text = await file.text();
      const urls = extractImportUrls(text, true);
      if (!urls.length) throw new Error(onboarding.fileMissing);
      setImportUrl((current) => [current.trim(), ...urls].filter(Boolean).join("\n"));
      setImportMessage(onboarding.detected(urls.length));
    } catch (error) {
      setImportState("error");
      setImportMessage(error instanceof Error ? error.message : onboarding.fileError);
    }
  }

  async function ask(questionOverride?: string) {
    const question = (questionOverride ?? askInput).trim();
    if (!question || isThinking) return;
    setAskInput("");
    setAskError("");
    setIsThinking(true);
    const sources = rankSources(question, items.filter((item) => item.status === "ready"));

    if (!sources.length) {
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question,
          answer: "No encontré coincidencias textuales para ese tema en la biblioteca. No voy a inventar una respuesta ni elegir fuentes al azar.",
          sources: [],
        },
      ]);
      setIsThinking(false);
      return;
    }

    try {
      const response = await fetch(`${agentBridgeUrl}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, sources }),
      });
      const data = (await response.json()) as {
        answer?: string;
        threadId?: string;
        provider?: string;
        error?: string;
      };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "El hilo no devolvió una respuesta.");
      }
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question,
          answer: data.answer!,
          sources,
        },
      ]);
      setAgentState({ status: "ready", provider: data.provider ?? "Agente local", threadId: data.threadId ?? null, error: null });
    } catch (error) {
      setAskInput(question);
      setAskError(
        error instanceof Error
          ? error.message
          : "No pudimos conectar con el hilo local.",
      );
      setAgentState((current) => ({ ...current, status: "offline" }));
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="brand-name">VETA</div>
            <div className="brand-caption">Tu memoria aumentada</div>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          <button
            className={view === "library" ? "nav-item active" : "nav-item"}
            onClick={() => changeView("library")}
          >
            <Bookmark aria-hidden="true" />
            Biblioteca
            <span className="nav-count">{items.length}</span>
          </button>
          <button
            className={view === "ask" ? "nav-item active" : "nav-item"}
            onClick={() => changeView("ask")}
          >
            <MessageCircle aria-hidden="true" />
            Preguntar
            <span className="nav-spark"><Sparkles aria-hidden="true" /></span>
          </button>
        </nav>

        <div className="sidebar-rule" />

        <div className="sidebar-section">
          <div className="section-label">Colecciones</div>
          {collectionRows.map((collection) => (
            <button className="collection-row" key={collection.tag} onClick={() => { setActiveFilter(collection.tag); changeView("library"); }}>
              <span className={`collection-dot ${collection.dot}`} />
              {collection.tag}
              <span>{collection.count}</span>
            </button>
          ))}
          <button className="collection-row collection-add" onClick={() => setImportOpen(true)}>
            <Plus aria-hidden="true" />
            Sincronizar X
          </button>
        </div>

        <div className="sync-card">
          <div className="sync-card-top">
            <span className={`pulse-dot ${agentState.status === "ready" ? "" : "pulse-offline"}`} />
            <span>{agentState.status === "ready" ? "Agente conectado" : "Modo biblioteca"}</span>
            {agentState.status === "ready" ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          </div>
          <div className="sync-title">{readyCount} piezas procesadas</div>
          <div className="sync-progress"><span style={{ width: "78%" }} /></div>
          <div className="sync-meta">
            {agentState.status === "ready"
              ? `hilo ${agentState.threadId?.slice(0, 8) ?? "local"} · ${tagCount} etiquetas`
              : `${tagCount} etiquetas · Preguntar requiere modo local`}
          </div>
        </div>
        <div className="sidebar-legal" aria-label="Legal">
          <a href={`/privacy#${language}`} target="_blank" rel="noreferrer">{onboarding.privacy}</a>
          <span>·</span>
          <a href="/license" target="_blank" rel="noreferrer">MIT</a>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="main-canvas">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label="Abrir menú"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <div className="global-search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setView("library");
              }}
              placeholder="Busca una idea, autor o tema…"
              aria-label="Buscar en tu biblioteca"
            />
            <kbd>/</kbd>
          </div>
          <button className="sync-button" onClick={() => setImportOpen(true)}>
            <Plus aria-hidden="true" />
            Sincronizar
          </button>
          <button className="avatar-button" aria-label="Veta local">VT</button>
        </header>

        {view === "library" ? (
          <div className="page-content library-page">
            <section className="library-heading">
              <div>
                <p className="eyebrow"><span /> Biblioteca viva</p>
                <h1>Tus guardados,<br /><em>por fin útiles.</em></h1>
                <p className="heading-copy">
                  Ideas, estrategias y research ordenados para volver a encontrarlos
                  cuando de verdad importan.
                </p>
              </div>
              <div className="heading-stats" aria-label="Resumen de biblioteca">
                <div><strong>{items.length}</strong><span>piezas</span></div>
                <div><strong>{tagCount}</strong><span>temas</span></div>
                <div><strong>{items.reduce((sum, item) => sum + item.readingMinutes, 0)}</strong><span>min leídos</span></div>
              </div>
            </section>

            <section className="filter-bar" aria-label="Filtros de biblioteca">
              <div className="filter-scroll">
                {filterGroups.map((filter) => (
                  <button
                    key={filter}
                    className={activeFilter === filter ? "filter-chip active" : "filter-chip"}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                    {filter !== "Todos" && (
                      <span>{items.filter((item) => item.tags.includes(filter)).length}</span>
                    )}
                  </button>
                ))}
              </div>
              <button className="sort-button">
                Más recientes <ChevronRight aria-hidden="true" />
              </button>
            </section>

            <section className="library-grid" aria-live="polite">
              {filteredItems.map((item) => (
                <article
                  className={`library-card accent-${item.accent}`}
                  key={item.id}
                  tabIndex={0}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                >
                  <div className="card-topline">
                    <span className="kind-label"><SourceGlyph item={item} /> {item.kind}</span>
                    <span className="saved-label">{item.savedAt}</span>
                  </div>
                  <div className="card-visual" aria-hidden="true">
                    <span className="visual-orbit orbit-one" />
                    <span className="visual-orbit orbit-two" />
                    <span className="visual-monogram">{initials(item.author)}</span>
                    <span className="visual-index">{String(items.indexOf(item) + 1).padStart(2, "0")}</span>
                  </div>
                  <h2>{item.title}</h2>
                  <p className="card-summary">{item.summary}</p>
                  <div className="tag-row">
                    {item.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                  <footer className="card-footer">
                    <div className="author-avatar">{initials(item.author)}</div>
                    <div className="author-copy">
                      <strong>{item.author}</strong>
                      <span>{item.handle}</span>
                    </div>
                    <span className="read-time"><Clock3 aria-hidden="true" /> {item.readingMinutes} min</span>
                    <ArrowUpRight className="card-arrow" aria-hidden="true" />
                  </footer>
                  {item.status === "processing" && (
                    <div className="processing-ribbon"><LoaderCircle aria-hidden="true" /> Enriqueciendo</div>
                  )}
                </article>
              ))}
              {filteredItems.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon"><Search aria-hidden="true" /></div>
                  <h2>No encontramos esa veta todavía.</h2>
                  <p>Prueba con otra palabra o vuelve a ver toda la biblioteca.</p>
                  <button onClick={() => { setQuery(""); setActiveFilter("Todos"); }}>Limpiar búsqueda</button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="page-content ask-page">
            <section className="ask-heading">
              <div className="ask-symbol"><Sparkles aria-hidden="true" /></div>
              <p className="eyebrow"><span /> Pregunta a tu biblioteca</p>
              <h1>Conecta ideas que<br /><em>ya elegiste guardar.</em></h1>
              <p className="ask-description">
                Veta responde usando solamente tu contexto y deja cada fuente a la vista.
              </p>
              <div className={`agent-pill ${agentState.status}`}>
                {agentState.status === "ready" ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
                <span>
                  <strong>
                    {agentState.status === "ready"
                      ? `${agentState.provider ?? "Agente"} conectado`
                      : agentState.status === "checking"
                        ? "Conectando con tu agente"
                        : "Hilo local desconectado"}
                  </strong>
                  <small>
                    {agentState.status === "ready"
                      ? `Veta — biblioteca local · ${agentState.threadId?.slice(0, 8) ?? "activo"}`
                      : "Disponible al iniciar Veta en modo local"}
                  </small>
                </span>
              </div>
            </section>

            {agentState.status === "offline" && (
              <div className="agent-offline-card">
                <WifiOff aria-hidden="true" />
                <div>
                  <strong>Podés preguntar desde tu agente</strong>
                  <p>Codex, Claude Code o Cursor ya tienen acceso a esta biblioteca mediante Veta MCP. El chat dentro de la app se activa con el puente local de Codex.</p>
                </div>
              </div>
            )}

            {askError && <div className="ask-error">{askError}</div>}

            {turns.length === 0 ? (
              <div className="ask-starter">
                <div className="starter-label">Prueba una pregunta</div>
                <div className="question-grid">
                  {starterQuestions.map((question, index) => (
                    <button key={question} onClick={() => ask(question)}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {question}
                      <ArrowUpRight aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="conversation" aria-live="polite">
                {turns.map((turn) => (
                  <div className="chat-turn" key={turn.id}>
                    <div className="user-question"><span>Vos</span><p>{turn.question}</p></div>
                    <div className="veta-answer">
                      <div className="answer-mark"><Sparkles aria-hidden="true" /></div>
                      <div className="answer-body">
                        <div className="answer-label">Veta conectó {turn.sources.length} fuentes</div>
                        <p>{turn.answer}</p>
                        <div className="answer-sources">
                          {turn.sources.map((source, index) => (
                            <button key={source.id} onClick={() => setSelectedItem(source)}>
                              <span>{index + 1}</span>
                              <span><strong>{source.title}</strong><small>{source.author} · {source.readingMinutes} min</small></span>
                              <ChevronRight aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ask-composer-wrap">
              <form className="ask-composer" onSubmit={(event) => { event.preventDefault(); ask(); }}>
                <Sparkles aria-hidden="true" />
                <textarea
                  value={askInput}
                  onChange={(event) => setAskInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      ask();
                    }
                  }}
                  placeholder="¿Qué dicen mis guardados sobre…?"
                  aria-label="Pregunta a tu biblioteca"
                  rows={1}
                />
                <button disabled={!askInput.trim() || isThinking} aria-label="Enviar pregunta">
                  {isThinking ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                </button>
              </form>
              <p>
                {agentState.status === "ready" ? "Hilo local activo" : "Esperando agente local"}
                {" · "}{readyCount} piezas procesadas · <button onClick={() => changeView("library")}>ver fuentes</button>
              </p>
            </div>
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="drawer-layer" role="presentation">
          <button className="drawer-backdrop" aria-label="Cerrar preview" onClick={() => setSelectedItem(null)} />
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`Preview de ${selectedItem.title}`}>
            <div className={`drawer-hero accent-${selectedItem.accent}`}>
              <button className="drawer-close" aria-label="Cerrar" onClick={() => setSelectedItem(null)}><X aria-hidden="true" /></button>
              <div className="drawer-type"><SourceGlyph item={selectedItem} /> {selectedItem.kind}</div>
              <span className="drawer-number">{String(items.indexOf(selectedItem) + 1).padStart(2, "0")}</span>
              <div className="drawer-rings" aria-hidden="true"><span /><span /><span /></div>
            </div>
            <div className="drawer-content">
              <div className="drawer-source-row">
                <div className="author-avatar">{initials(selectedItem.author)}</div>
                <div><strong>{selectedItem.author}</strong><span>{selectedItem.handle} · {selectedItem.source}</span></div>
                <span><Clock3 aria-hidden="true" /> {selectedItem.readingMinutes} min</span>
              </div>
              <h2>{selectedItem.title}</h2>
              <p className="drawer-summary">{selectedItem.summary}</p>

              <div className="drawer-divider" />
              <section>
                <p className="drawer-kicker"><Sparkles aria-hidden="true" /> Por qué importa</p>
                <p>{selectedItem.why}</p>
              </section>
              <section>
                <p className="drawer-kicker"><Check aria-hidden="true" /> Ideas clave</p>
                <ol className="key-points">
                  {selectedItem.keyPoints.map((point, index) => (
                    <li key={point}><span>{index + 1}</span><p>{point}</p></li>
                  ))}
                </ol>
              </section>
              <blockquote>“{selectedItem.preview}”</blockquote>
              <div className="drawer-tags">
                {selectedItem.tags.map((tag) => <button key={tag} onClick={() => { setActiveFilter(tag); setView("library"); setSelectedItem(null); }}>#{tag}</button>)}
              </div>
              <a className="original-link" href={selectedItem.url} target="_blank" rel="noreferrer">
                Abrir fuente original <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </aside>
        </div>
      )}

      {importOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" aria-label={onboarding.close} onClick={closeImport} />
          <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow"><span /> {onboarding.eyebrow}</p>
                <h2 id="import-title">{onboarding.title}</h2>
              </div>
              <div className="modal-actions">
                <div className="language-selector" role="group" aria-label={onboarding.languageLabel}>
                  <Globe2 aria-hidden="true" />
                  <button
                    type="button"
                    className={language === "es" ? "active" : ""}
                    aria-pressed={language === "es"}
                    onClick={() => changeLanguage("es")}
                  >SPA</button>
                  <button
                    type="button"
                    className={language === "en" ? "active" : ""}
                    aria-pressed={language === "en"}
                    onClick={() => changeLanguage("en")}
                  >ENG</button>
                </div>
                <button className="modal-close" aria-label={onboarding.close} onClick={closeImport}><X aria-hidden="true" /></button>
              </div>
            </div>

            <div className="connector-card featured-connector">
              <div className="connector-icon local-icon"><Sparkles aria-hidden="true" /></div>
              <div>
                <div className="connector-title-row"><strong>{onboarding.agentTitle}</strong><span>{onboarding.recommended}</span></div>
                <p>{onboarding.agentBody}</p>
                <div className="connector-note"><Check aria-hidden="true" /> {onboarding.agentNote}</div>
              </div>
              <span className="local-badge">{onboarding.local}</span>
            </div>

            <div className="modal-or"><span>{onboarding.manual}</span></div>

            <form className="link-import" onSubmit={importLink}>
              <label htmlFor="bookmark-url">{onboarding.pasteLabel}</label>
              <div className="link-input-row batch-input-row">
                <Link2 aria-hidden="true" />
                <textarea
                  id="bookmark-url"
                  value={importUrl}
                  onChange={(event) => { setImportUrl(event.target.value); setImportState("idle"); }}
                  placeholder={"https://x.com/…\nhttps://un-articulo.com/…"}
                  required
                  rows={4}
                />
                <button disabled={importState === "saving" || !importUrl.trim()}>
                  {importState === "saving" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  {onboarding.import}
                </button>
              </div>
              {importMessage && <p className={`import-feedback ${importState}`}>{importMessage}</p>}
            </form>

            <input
              ref={fileInputRef}
              className="hidden-file-input"
              type="file"
              accept=".json,.js,.csv,.md,.txt,.html"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadImportFile(file);
                event.currentTarget.value = "";
              }}
            />
            <button className="archive-option" onClick={() => fileInputRef.current?.click()}>
              <FileUp aria-hidden="true" />
              <span><strong>{onboarding.fileTitle}</strong><small>{onboarding.fileFormats}</small></span>
              <span className="soon-badge">{onboarding.choose}</span>
            </button>

            <div className="agent-capture-note">
              <Sparkles aria-hidden="true" />
              <p><strong>{onboarding.loginTitle}</strong> {onboarding.loginBody}</p>
            </div>

            <div className="privacy-note">
              <Bookmark aria-hidden="true" />
              <span>{onboarding.privacyLead}</span>
              <a href={`/privacy#${language}`} target="_blank" rel="noreferrer">{onboarding.privacy}</a>
              <span aria-hidden="true">·</span>
              <a href="/license" target="_blank" rel="noreferrer">{onboarding.license}</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
