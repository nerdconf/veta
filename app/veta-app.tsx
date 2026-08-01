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
  FolderHeart,
  Hash,
  Inbox,
  Layers3,
  Link2,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { filterGroups, seedLibrary, type LibraryItem } from "../lib/library";

type View = "library" | "ask";
type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: LibraryItem[];
};

const starterQuestions = [
  "¿Cómo construir agentes de IA más fiables?",
  "¿Qué ideas se repiten sobre distribución?",
  "¿Cómo validar mejor una oferta B2B?",
];

function searchable(item: LibraryItem) {
  return [
    item.title,
    item.author,
    item.handle,
    item.summary,
    item.preview,
    item.why,
    ...item.tags,
    ...item.keyPoints,
  ]
    .join(" ")
    .toLocaleLowerCase("es");
}

function tokenise(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9&]+/)
    .filter((token) => token.length > 2);
}

function rankSources(question: string, items: LibraryItem[]) {
  const tokens = tokenise(question);
  const scored = items.map((item, index) => {
    const body = tokenise(searchable(item));
    const score = tokens.reduce(
      (total, token) => total + body.filter((part) => part.includes(token)).length,
      0,
    );
    return { item, score, index };
  });

  const ranked = scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ item }) => item);

  return ranked.length > 0 ? ranked : items.slice(0, 3);
}

function composeAnswer(question: string, sources: LibraryItem[]) {
  const lower = question.toLocaleLowerCase("es");
  const lead = lower.includes("agente") || lower.includes("ia")
    ? "La señal más clara es que la fiabilidad no viene de darle más autonomía al agente, sino de diseñar límites, evidencia y recuperación desde el principio."
    : lower.includes("distrib") || lower.includes("growth") || lower.includes("contenido")
      ? "Tus guardados apuntan a una misma idea: la distribución funciona mejor cuando nace dentro del trabajo y del producto, no cuando se agrega como promoción al final."
      : lower.includes("precio") || lower.includes("pricing") || lower.includes("oferta") || lower.includes("b2b")
        ? "La tesis común es anclar la oferta a un cambio observable para el comprador; si el resultado no puede describirse con nitidez, el precio se vuelve una discusión abstracta."
        : "Al cruzar tus guardados, aparece un patrón útil: empezar por la evidencia que debería existir al final y diseñar hacia atrás desde esa prueba.";

  const sourceOne = sources[0];
  const sourceTwo = sources[1] ?? sourceOne;
  const sourceThree = sources[2] ?? sourceTwo;

  return `${lead} ${sourceOne.keyPoints[0]} [1] ${sourceTwo.keyPoints[1]} [2] En la práctica, lo convertiría en un experimento pequeño: ${sourceThree.keyPoints[2].toLocaleLowerCase("es")} [3]`;
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
  const [view, setView] = useState<View>("library");
  const [items, setItems] = useState<LibraryItem[]>(seedLibrary);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importState, setImportState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [askInput, setAskInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { items: LibraryItem[] }) => {
        if (!cancelled && data.items?.length) setItems(data.items);
      })
      .catch(() => {
        // The complete demo library stays available if the local database is offline.
      });
    return () => {
      cancelled = true;
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
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [importOpen, selectedItem]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return items.filter((item) => {
      const matchesFilter =
        activeFilter === "Todos" || item.tags.includes(activeFilter);
      const matchesQuery =
        !normalizedQuery || searchable(item).includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, items, query]);

  const readyCount = items.filter((item) => item.status === "ready").length;
  const tagCount = new Set(items.flatMap((item) => item.tags)).size;

  function changeView(nextView: View) {
    setView(nextView);
    setMobileMenuOpen(false);
  }

  async function importLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importUrl.trim()) return;
    setImportState("saving");
    setImportMessage("");

    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = (await response.json()) as { item?: LibraryItem; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "No se pudo guardar");
      setItems((current) => [data.item!, ...current]);
      setImportUrl("");
      setImportState("done");
      setImportMessage("Guardado. Ya está en la cola de enriquecimiento.");
    } catch (error) {
      setImportState("error");
      setImportMessage(
        error instanceof Error ? error.message : "No pudimos guardar este enlace.",
      );
    }
  }

  function ask(questionOverride?: string) {
    const question = (questionOverride ?? askInput).trim();
    if (!question || isThinking) return;
    setAskInput("");
    setIsThinking(true);
    window.setTimeout(() => {
      const sources = rankSources(question, items.filter((item) => item.status === "ready"));
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question,
          answer: composeAnswer(question, sources),
          sources,
        },
      ]);
      setIsThinking(false);
    }, 650);
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
          <button className="nav-item muted-nav" onClick={() => setActiveFilter("Inbox")}>
            <Inbox aria-hidden="true" />
            Inbox
            <span className="nav-count">{items.filter((item) => item.status === "processing").length}</span>
          </button>
        </nav>

        <div className="sidebar-rule" />

        <div className="sidebar-section">
          <div className="section-label">Colecciones</div>
          <button className="collection-row" onClick={() => { setActiveFilter("IA & agentes"); changeView("library"); }}>
            <span className="collection-dot dot-violet" />
            IA & agentes
            <span>2</span>
          </button>
          <button className="collection-row" onClick={() => { setActiveFilter("Growth"); changeView("library"); }}>
            <span className="collection-dot dot-orange" />
            Growth & distribución
            <span>2</span>
          </button>
          <button className="collection-row" onClick={() => { setActiveFilter("Sistemas"); changeView("library"); }}>
            <span className="collection-dot dot-green" />
            Sistemas de trabajo
            <span>4</span>
          </button>
          <button className="collection-row" onClick={() => { setActiveFilter("Pricing"); changeView("library"); }}>
            <span className="collection-dot dot-blue" />
            Ventas & pricing
            <span>1</span>
          </button>
          <button className="collection-row collection-add" onClick={() => setImportOpen(true)}>
            <Plus aria-hidden="true" />
            Nueva colección
          </button>
        </div>

        <div className="sync-card">
          <div className="sync-card-top">
            <span className="pulse-dot" />
            <span>Motor listo</span>
            <MoreHorizontal aria-hidden="true" />
          </div>
          <div className="sync-title">{readyCount} piezas procesadas</div>
          <div className="sync-progress"><span style={{ width: "78%" }} /></div>
          <div className="sync-meta">{tagCount} etiquetas · biblioteca demo</div>
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
            <Zap aria-hidden="true" />
            Sincronizar X
          </button>
          <button className="avatar-button" aria-label="Cuenta de Tomi">TS</button>
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
              <p>
                Veta responde usando solamente tu contexto y deja cada fuente a la vista.
              </p>
            </section>

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
              <p>Responde desde {readyCount} piezas procesadas · <button onClick={() => changeView("library")}>ver fuentes</button></p>
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
          <button className="modal-backdrop" aria-label="Cerrar importación" onClick={() => setImportOpen(false)} />
          <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow"><span /> Sumar contexto</p>
                <h2 id="import-title">Trae tus guardados a Veta</h2>
              </div>
              <button aria-label="Cerrar" onClick={() => setImportOpen(false)}><X aria-hidden="true" /></button>
            </div>

            <div className="connector-card featured-connector">
              <div className="connector-icon x-icon">X</div>
              <div>
                <div className="connector-title-row"><strong>Sincronización automática</strong><span>Recomendado</span></div>
                <p>Lee tus bookmarks con permiso de solo lectura y agrega únicamente lo nuevo.</p>
                <div className="connector-note"><Check aria-hidden="true" /> Requiere una app en X Developer y OAuth 2.0</div>
              </div>
              <a href="https://console.x.com" target="_blank" rel="noreferrer">Preparar cuenta <ArrowUpRight aria-hidden="true" /></a>
            </div>

            <div className="modal-or"><span>o empieza ahora</span></div>

            <form className="link-import" onSubmit={importLink}>
              <label htmlFor="bookmark-url">Pega un enlace de X o de un artículo</label>
              <div className="link-input-row">
                <Link2 aria-hidden="true" />
                <input
                  id="bookmark-url"
                  type="url"
                  value={importUrl}
                  onChange={(event) => { setImportUrl(event.target.value); setImportState("idle"); }}
                  placeholder="https://x.com/…"
                  required
                />
                <button disabled={importState === "saving" || !importUrl.trim()}>
                  {importState === "saving" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  Guardar
                </button>
              </div>
              {importMessage && <p className={`import-feedback ${importState}`}>{importMessage}</p>}
            </form>

            <button className="archive-option">
              <FolderHeart aria-hidden="true" />
              <span><strong>Importar un archivo completo</strong><small>Preparado para el export de X en la próxima fase</small></span>
              <span className="soon-badge">Próximo</span>
            </button>

            <p className="privacy-note"><Bookmark aria-hidden="true" /> Tu biblioteca se publica con acceso privado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
