import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const libraryItems = sqliteTable(
  "library_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    url: text("url").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    handle: text("handle").notNull(),
    source: text("source").notNull(),
    savedAt: text("saved_at").notNull(),
    readingMinutes: integer("reading_minutes").notNull(),
    summary: text("summary").notNull(),
    preview: text("preview").notNull(),
    why: text("why_it_matters").notNull(),
    keyPoints: text("key_points", { mode: "json" }).$type<string[]>().notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    accent: text("accent").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_library_items_user_url").on(table.userId, table.url),
  ],
);

