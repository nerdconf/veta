# Veta

Veta converts saved X posts and long-form links into a private, organized,
queryable knowledge library.

The current product slice includes:

- an editorial library with search, topic filters, tags, and deep previews;
- a source-cited question experience over the current library;
- durable, per-user item storage in D1;
- manual URL capture with processing state;
- a clear handoff for X OAuth bookmark sync and content enrichment.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

