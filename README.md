# Alex Akinjiola — Portfolio

Personal portfolio of Alex Akinjiola, Product Designer. Built with React, React Router and Motion.

## Run locally

```bash
npm install
npm run dev
```

Build for production with `npm run build` (output in `dist/`), and preview it with `npm run preview`.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/data/` | All copy and content — projects, experience, capabilities, about. Edit these to update the site; no layout code needed. |
| `src/pages/` | One file per route: Home, Work, About, Capabilities, Experience, Contact, NotFound. |
| `src/components/` | Shared UI and motion: Nav, Footer, Button, SplitText, TiltCard, Counter, Cursor, Marquee, page transitions. |
| `src/styles/` | `base.css` (design tokens + reset), `components.css`, `pages.css`. |
| `public/images/` | Optimised WebP images. `public/docs/` holds the CV and cover letter. |

## Design system

- Colour: near-black surfaces (`#0B0C0E` → `#1D1F24`), one accent — lime `#B8F35A`.
- Type: Geist for everything, Geist Mono for labels and metadata.
- Icons: Google Material Symbols (Outlined).
- Motion respects the visitor's *reduce motion* setting: the intro, custom cursor, tilt and scroll effects switch off.

## Deploy

Deploys to Vercel. `vercel.json` sets the Vite build, the single-page-app fallback, and permanent redirects from the old `.html` URLs (e.g. `/projects.html` → `/work`).

## Contact form

Posts to Formspree (`site.formspree` in `src/data/site.js`). Make sure the endpoint is active and its recipient email is verified in your Formspree account.
