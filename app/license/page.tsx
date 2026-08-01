import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MIT License",
  description: "The MIT License governing Veta's open-source code.",
};

const license = `MIT License

Copyright (c) 2026 Veta contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function LicensePage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand">VETA</Link>
        <nav aria-label="Legal navigation">
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/nerdconf/veta">GitHub</a>
        </nav>
      </header>

      <article className="legal-document license-document">
        <p className="legal-kicker">Open source · 2026</p>
        <h1>MIT License</h1>
        <p className="legal-intro" lang="es">
          Podés usar, modificar y distribuir Veta, incluso comercialmente,
          conservando el aviso de copyright y esta licencia. El texto legal
          aplicable es el original en inglés.
        </p>
        <pre id="en">{license}</pre>
      </article>
    </main>
  );
}
