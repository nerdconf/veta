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
  content?: string;
  why: string;
  keyPoints: string[];
  tags: string[];
  accent: string;
  status: "ready" | "processing";
};
