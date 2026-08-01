import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: {
      default: "Veta — convierte tus guardados en conocimiento",
      template: "%s · Veta",
    },
    description:
      "Una biblioteca inteligente para leer, ordenar y consultar todo lo que guardas en X.",
    openGraph: {
      title: "Veta — tus guardados, por fin útiles",
      description:
        "Lee, ordena y consulta todo lo que guardas en X.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "Veta — tus guardados, por fin útiles" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Veta — tus guardados, por fin útiles",
      description: "Lee, ordena y consulta todo lo que guardas en X.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
