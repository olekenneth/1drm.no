# 1drm.no

Static website for **1. Drammen Speidergruppe**, built with [Eleventy (11ty)](https://www.11ty.dev/).

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

## Deployment

The site is deployed automatically to **GitHub Pages** via the workflow in `.github/workflows/deploy.yml`.

Every push to the `main` branch triggers the workflow, which:
1. Installs Node.js dependencies
2. Runs `npm run build` (Eleventy outputs to `_site/`)
3. Publishes `_site/` to GitHub Pages

The custom domain **1drm.no** is preserved by the `src/CNAME` file, which Eleventy copies into `_site/` on every build.

### First-time setup

In the repository **Settings → Pages**:
- Set **Source** to *GitHub Actions*
- Optionally enter `1drm.no` as the custom domain (GitHub will create the `CNAME` record for you)

DNS for `1drm.no` must point to GitHub Pages. Use these records with your registrar:

| Type  | Host | Value                    |
|-------|------|--------------------------|
| A     | @    | 185.199.108.153          |
| A     | @    | 185.199.109.153          |
| A     | @    | 185.199.110.153          |
| A     | @    | 185.199.111.153          |
| CNAME | www  | olekenneth.github.io     |

## Project structure

```
src/
├── _layouts/
│   └── base.njk          # Base HTML layout (Nunjucks)
├── css/
│   └── style.css         # Global stylesheet
└── index.md              # Home page
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
