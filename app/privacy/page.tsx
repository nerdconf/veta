import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Veta's local-first privacy policy in English and Spanish.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand">VETA</Link>
        <nav aria-label="Languages">
          <a href="#es">SPA</a>
          <a href="#en">ENG</a>
        </nav>
      </header>

      <article className="legal-document">
        <p className="legal-kicker">Local-first · Effective August 2, 2026</p>
        <h1>Privacy Policy</h1>
        <p className="legal-intro">
          Veta turns saved X posts into a local knowledge library. It has no
          Veta account, hosted user database, advertising, or analytics.
        </p>

        <section id="es" lang="es">
          <p className="legal-language">SPA</p>
          <h2>Política de privacidad</h2>
          <h3>1. Alcance</h3>
          <p>Esta política cubre el software open-source Veta y su app local.</p>
          <h3>2. Información almacenada localmente</h3>
          <p>
            La biblioteca de bookmarks, el contenido extraído, las etiquetas,
            resúmenes, progreso de sincronización y preferencias de interfaz se
            guardan en tu computadora. Veta no crea una cuenta propia ni envía
            esta base a un servidor operado por Veta.
          </p>
          <h3>3. Sesión de X</h3>
          <p>
            La autenticación ocurre dentro del browser que ya usa tu agente.
            Veta no recibe ni almacena tu contraseña, cookies o tokens de X.
          </p>
          <h3>4. Procesamiento por tu proveedor de IA</h3>
          <p>
            Cuando Codex, Claude Code o Cursor importa, resume, etiqueta o
            responde preguntas, puede enviar el contexto seleccionado a su
            propio proveedor usando tu suscripción existente. Ese procesamiento
            se rige por la política y configuración del proveedor que elegiste.
          </p>
          <h3>5. Telemetría y terceros</h3>
          <p>
            Veta no incluye analytics, anuncios, trackers, X OAuth, formularios
            de API keys ni venta de datos. X recibe el tráfico normal generado
            cuando su página de bookmarks se abre en el browser.
          </p>
          <h3>6. Control y eliminación</h3>
          <p>
            Vos controlás los archivos locales. Podés eliminar la biblioteca,
            exportarla o desinstalar Veta en cualquier momento. Veta no conserva
            una copia remota para recuperar después.
          </p>
          <h3>7. Cambios y contacto</h3>
          <p>
            Los cambios materiales se publicarán en el repositorio. Para
            preguntas o reportes, abrí un issue en {" "}
            <a href="https://github.com/nerdconf/veta/issues">GitHub</a>.
          </p>
        </section>

        <section id="en" lang="en">
          <p className="legal-language">ENG</p>
          <h2>Privacy Policy</h2>
          <h3>1. Scope</h3>
          <p>This policy covers the open-source Veta software and its local app.</p>
          <h3>2. Information stored locally</h3>
          <p>
            Your bookmark library, extracted content, tags, summaries, sync
            progress, and interface preferences are stored on your computer.
            Veta does not create its own account or send this database to a
            Veta-operated server.
          </p>
          <h3>3. X session</h3>
          <p>
            Authentication happens inside the browser your agent already uses.
            Veta does not receive or store your X password, cookies, or tokens.
          </p>
          <h3>4. Processing by your AI provider</h3>
          <p>
            When Codex, Claude Code, or Cursor imports, summarizes, tags, or
            answers questions, it may send selected context to its own provider
            through your existing subscription. That processing is governed by
            the privacy policy and settings of your chosen provider.
          </p>
          <h3>5. Telemetry and third parties</h3>
          <p>
            Veta includes no analytics, ads, trackers, X OAuth, API-key forms,
            or sale of data. X receives the normal browser traffic generated
            when its bookmarks page is opened.
          </p>
          <h3>6. Control and deletion</h3>
          <p>
            You control the local files. You may delete or export the library,
            or uninstall Veta, at any time. Veta does not keep a remote recovery
            copy.
          </p>
          <h3>7. Changes and contact</h3>
          <p>
            Material changes will be published in the repository. For questions
            or reports, open an issue on {" "}
            <a href="https://github.com/nerdconf/veta/issues">GitHub</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
