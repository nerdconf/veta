import type { Metadata } from "next";
import VetaApp from "./veta-app";

export const metadata: Metadata = {
  title: "Veta — convierte tus guardados en conocimiento",
  description:
    "Una biblioteca inteligente para leer, ordenar y consultar todo lo que guardas en X.",
};

export default function Home() {
  return <VetaApp />;
}

