# 1drm.no

Static website for **1. Drøm Speidergruppe**, built with [Eleventy (11ty)](https://www.11ty.dev/).

## Getting started

**Prerequisites:** Node.js 18+

```bash
npm install
```

### Development server

```bash
npm start
```

Opens a local server at `http://localhost:8080` with live-reload.

### Build

```bash
npm run build
```

Outputs to the `_site/` directory.

## Project structure

```
src/
├── _layouts/
│   └── base.njk          # Base HTML layout (Nunjucks)
├── css/
│   └── style.css         # Global stylesheet
├── index.md              # Home page
├── om-oss/index.md       # About page
├── aktiviteter/index.md  # Activities page
├── bli-speider/index.md  # Join page
└── kontakt/index.md      # Contact page
.eleventy.js              # Eleventy configuration
```

## Adding content

All pages are Markdown files in `src/`. Each page starts with YAML front matter:

```yaml
---
layout: base.njk
title: Side tittel
description: Side beskrivelse for søkemotorer.
---

Innhold her i **Markdown**.
```

HTML is also supported inside Markdown files for richer layouts (cards, info-boxes, etc.).
