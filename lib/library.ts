export type LibraryItem = {
  id: string;
  url: string;
  kind: "Ensayo" | "Playbook" | "Hilo" | "Research";
  title: string;
  author: string;
  handle: string;
  source: string;
  savedAt: string;
  readingMinutes: number;
  summary: string;
  preview: string;
  why: string;
  keyPoints: string[];
  tags: string[];
  accent: string;
  status: "ready" | "processing";
};

export const seedLibrary: LibraryItem[] = [
  {
    id: "agent-production",
    url: "https://x.com/fieldnotes/status/1900000000000000001",
    kind: "Playbook",
    title: "How to build an AI agent that actually survives production",
    author: "Noah Park",
    handle: "@fieldnotes",
    source: "x.com",
    savedAt: "Hoy",
    readingMinutes: 17,
    summary:
      "Un marco práctico para pasar de una demo convincente a un agente observable, recuperable y útil en producción.",
    preview:
      "La autonomía no es una feature binaria. Es una escalera de permisos, evidencia y capacidad de recuperación.",
    why:
      "Convierte la conversación abstracta sobre agentes en decisiones concretas de producto: qué delegar, qué observar y cuándo pedir ayuda humana.",
    keyPoints: [
      "Diseñar autonomía por niveles, no como un interruptor.",
      "Guardar trazas que expliquen decisiones, no solo errores.",
      "Definir salidas seguras antes de ampliar herramientas y permisos.",
    ],
    tags: ["IA & agentes", "Producto", "Sistemas"],
    accent: "violet",
    status: "ready",
  },
  {
    id: "distribution-first",
    url: "https://x.com/growthfield/status/1900000000000000002",
    kind: "Ensayo",
    title: "Distribution before product: the founder’s unfair advantage",
    author: "Mara Silva",
    handle: "@growthfield",
    source: "fieldwork.press",
    savedAt: "Ayer",
    readingMinutes: 12,
    summary:
      "La distribución no es el megáfono que se agrega al final: puede ser el sistema que decide qué vale la pena construir.",
    preview:
      "Los mejores loops de crecimiento nacen cuando el producto deja una razón natural para volver, mostrar o invitar.",
    why:
      "Sirve para evaluar ideas antes de invertir meses: obliga a nombrar el canal, la audiencia y el loop de retorno desde el inicio.",
    keyPoints: [
      "Elegir una audiencia accesible antes de cerrar el alcance del producto.",
      "Construir un loop de retorno dentro de la experiencia central.",
      "Medir densidad de uso antes que volumen superficial.",
    ],
    tags: ["Growth", "Distribución", "Estrategia"],
    accent: "orange",
    status: "ready",
  },
  {
    id: "pricing-test",
    url: "https://x.com/revstudio/status/1900000000000000003",
    kind: "Hilo",
    title: "The $10k pricing test",
    author: "Eli Navarro",
    handle: "@revstudio",
    source: "x.com",
    savedAt: "Hace 2 días",
    readingMinutes: 9,
    summary:
      "Un método para descubrir si una oferta B2B tiene suficiente dolor, autoridad y urgencia como para sostener un precio serio.",
    preview:
      "Si nadie puede explicar qué cambia el lunes después de comprarte, todavía no tienes una oferta: tienes una lista de capacidades.",
    why:
      "Ayuda a separar una propuesta interesante de una propuesta comprable y a preparar conversaciones de venta más nítidas.",
    keyPoints: [
      "Anclar el precio a un cambio observable en el negocio.",
      "Pedir compromiso antes de sumar personalización.",
      "Tratar objeciones como fallas de diagnóstico, no de persuasión.",
    ],
    tags: ["Pricing", "B2B", "Ventas"],
    accent: "blue",
    status: "ready",
  },
  {
    id: "proof-not-plans",
    url: "https://x.com/buildsignal/status/1900000000000000004",
    kind: "Playbook",
    title: "Working backwards from proof, not plans",
    author: "Jon Bell",
    handle: "@buildsignal",
    source: "builders.work",
    savedAt: "Hace 4 días",
    readingMinutes: 14,
    summary:
      "Una forma de planificar proyectos ambiguos empezando por la evidencia que debería existir al final de la semana.",
    preview:
      "Un plan describe actividad. Una prueba describe qué será verdad cuando la actividad haya servido.",
    why:
      "Reduce la planificación ornamental y produce hitos verificables, especialmente en trabajos creativos o de estrategia.",
    keyPoints: [
      "Escribir primero la prueba que un tercero podría verificar.",
      "Reducir cada semana a uno o dos artefactos externos.",
      "Usar incertidumbre para achicar el próximo paso, no para expandir el plan.",
    ],
    tags: ["Ejecución", "Estrategia", "Sistemas"],
    accent: "green",
    status: "ready",
  },
  {
    id: "small-models",
    url: "https://x.com/modelbrief/status/1900000000000000005",
    kind: "Research",
    title: "A field guide to small language models",
    author: "Anika Rao",
    handle: "@modelbrief",
    source: "modelbrief.org",
    savedAt: "Hace 1 semana",
    readingMinutes: 24,
    summary:
      "Comparación de costos, latencia y precisión para decidir cuándo un modelo pequeño supera a uno generalista.",
    preview:
      "El modelo correcto no es el más inteligente en abstracto; es el que conserva el margen de error aceptable dentro del presupuesto operativo.",
    why:
      "Da criterios para armar sistemas híbridos que escalen mejor y reservan los modelos grandes para las decisiones difíciles.",
    keyPoints: [
      "Enrutar por dificultad puede ahorrar más que optimizar prompts.",
      "Evaluar con ejemplos reales y costos de error explícitos.",
      "La latencia es parte de la calidad percibida del producto.",
    ],
    tags: ["IA & agentes", "Research", "Infraestructura"],
    accent: "pink",
    status: "ready",
  },
  {
    id: "content-system",
    url: "https://x.com/quietmedia/status/1900000000000000006",
    kind: "Ensayo",
    title: "The compounding content system",
    author: "Lena Ortiz",
    handle: "@quietmedia",
    source: "quietmedia.co",
    savedAt: "Hace 1 semana",
    readingMinutes: 11,
    summary:
      "Un sistema de contenido que transforma conversaciones y trabajo real en piezas reutilizables sin crear una fábrica vacía.",
    preview:
      "La unidad mínima de contenido no es un post. Es una observación que sobrevivió al contacto con trabajo real.",
    why:
      "Propone una manera sostenible de publicar: capturar señales durante el trabajo, agruparlas y distribuirlas con intención.",
    keyPoints: [
      "Capturar observaciones antes de convertirlas en formatos.",
      "Reutilizar ideas, no copiar piezas enteras.",
      "Medir conversaciones iniciadas además de impresiones.",
    ],
    tags: ["Contenido", "Distribución", "Sistemas"],
    accent: "yellow",
    status: "ready",
  },
  {
    id: "knowledge-future-you",
    url: "https://x.com/notesystems/status/1900000000000000007",
    kind: "Ensayo",
    title: "Designing knowledge systems for future-you",
    author: "Isa Moreno",
    handle: "@notesystems",
    source: "notebook.fm",
    savedAt: "Hace 2 semanas",
    readingMinutes: 16,
    summary:
      "Principios para construir una memoria externa que prioriza recuperar y recombinar ideas por encima de archivarlas.",
    preview:
      "Una nota sin contexto es inventario. Una nota conectada a una decisión futura es una herramienta.",
    why:
      "Es el fundamento conceptual de Veta: cada guardado necesita estructura, contexto y caminos de recuperación.",
    keyPoints: [
      "Guardar el porqué junto al contenido.",
      "Organizar alrededor de preguntas y decisiones recurrentes.",
      "Crear conexiones cuando se recupera una nota, no solo cuando se captura.",
    ],
    tags: ["Conocimiento", "PKM", "Sistemas"],
    accent: "red",
    status: "ready",
  },
  {
    id: "onboarding",
    url: "https://x.com/productlayers/status/1900000000000000008",
    kind: "Hilo",
    title: "What great onboarding quietly removes",
    author: "Theo Kim",
    handle: "@productlayers",
    source: "x.com",
    savedAt: "Hace 3 semanas",
    readingMinutes: 8,
    summary:
      "Patrones de onboarding que reducen decisiones tempranas y llevan al usuario a una primera prueba de valor más rápido.",
    preview:
      "El onboarding no debería explicar el producto. Debería eliminar todo lo que impide experimentar su primera consecuencia útil.",
    why:
      "Ofrece un criterio concreto para revisar el MVP: menos configuración y más evidencia inmediata de valor.",
    keyPoints: [
      "Posponer decisiones reversibles hasta que exista contexto.",
      "Usar datos de ejemplo que se parezcan al resultado final.",
      "Celebrar una consecuencia útil, no el fin del tutorial.",
    ],
    tags: ["Producto", "UX", "Onboarding"],
    accent: "aqua",
    status: "ready",
  },
];

export const filterGroups = [
  "Todos",
  "IA & agentes",
  "Growth",
  "Pricing",
  "Contenido",
  "Sistemas",
];

