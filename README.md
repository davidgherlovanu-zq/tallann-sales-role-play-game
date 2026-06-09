# Tallann — Sales Role Play Scorecard

## What This Project Is

A client-side sales role play scorecard SPA. Users practice cold calls via an ElevenLabs voice widget, then get an AI-scored breakdown of their performance. Firebase handles auth, Firestore stores scorecards/config/audit logs, Chart.js renders history, and jsPDF exports PDF reports.

## What Was Rewritten

Originally a **2576-line monolithic HTML file** (`index.html`) with inline CSS, inline JS, CDN script tags, and a base64-encoded logo. Rebuilt into a maintainable Astro project:

| Before | After |
|---|---|
| Single HTML file (2576 lines) | 18 modular `src/lib/` JS modules + 8 Astro components |
| Inline `<style>` blocks | 4 CSS files in `src/styles/` (variables, reset, components, responsive), bundled by Vite |
| Base64 logo inline | `public/logo.png` (extracted to static asset) |
| Hardcoded Firebase/API config | `.env` with `PUBLIC_*` environment variables |
| `require()` / dynamic script loading | Static ES module imports (tree-shaken by Vite) |
| jQuery-free but unstructured DOM queries | Same pattern, organized by module |
| Circular dep between firebase & auth modules | `shared.js` extracted as single source of truth for `db`, `auth`, `currentUser` |

### File structure

```text
/
├── public/
│   └── logo.png
├── src/
│   ├── components/
│   │   ├── header.astro
│   │   ├── setup-wizard.astro
│   │   ├── auth-screen.astro
│   │   ├── loading-screen.astro
│   │   ├── admin-modal.astro
│   │   ├── dashboard-modal.astro
│   │   ├── audit-log-modal.astro
│   │   └── main-app.astro
│   ├── layouts/
│   │   └── base-layout.astro
│   ├── lib/
│   │   ├── config.js          # Env-based Firebase + app config
│   │   ├── shared.js          # Mutable firebase refs (db, auth, currentUser)
│   │   ├── state.js           # Mutable app state (transcript, session, etc.)
│   │   ├── firebase.js        # Firebase init + dynamic SDK loader
│   │   ├── auth.js            # Auth UI + Firebase auth handlers
│   │   ├── setup.js           # Setup wizard logic
│   │   ├── admin.js           # Admin config panel
│   │   ├── session.js         # Start/end/reset session
│   │   ├── elevenlabs.js      # ElevenLabs widget + transcript polling
│   │   ├── scoring.js         # AI scoring call (Anthropic/OpenAI)
│   │   ├── scorecard.js       # Scorecard rendering
│   │   ├── firestore.js       # Firestore CRUD (scorecards, audit logs)
│   │   ├── history.js         # Call history list + Chart.js chart
│   │   ├── dashboard.js       # Team dashboard (admin)
│   │   ├── audit.js           # Audit log viewer (admin)
│   │   ├── pdf.js             # jsPDF report generation
│   │   ├── grading.js         # Score colors + grade labels
│   │   └── ui.js              # DOM helpers, tab switching, escapeHtml
│   ├── pages/
│   │   └── index.astro        # Main page (assembles all components)
│   ├── scripts/
│   │   └── boot.js            # Entry point — imports all lib modules
│   └── styles/
│       ├── variables.css
│       ├── reset.css
│       ├── components.css
│       └── responsive.css
├── .env                       # PUBLIC_FIREBASE_*, PUBLIC_AGENT_ID, etc.
├── astro.config.mjs
└── package.json
```

### Key design decisions

- **No framework migration** — vanilla JS ES modules throughout. Astro components render static HTML shells; all interactivity lives in `src/lib/`.
- **`shared.js`** isolates mutable Firebase references (`db`, `auth`, `currentUser`) so `firebase.js` and `auth.js` don't circular-import each other.
- **ES module live bindings** — state variables (`transcript`, `isSessionActive`, etc.) are exported `let` bindings with setter functions, consumed by all lib modules.
- **`window.*` exports** — critical functions (`startSession`, `handleAuth`, etc.) are assigned to `window` so Astro components' inline `onclick` handlers can call them.
- **CDN-loaded SDKs** — Firebase compat SDKs, ElevenLabs widget, Chart.js, and jsPDF are loaded via `<script>` tags in `base-layout.astro`, not npm.

### Build output

`astro build` produces a static `dist/` folder (~62KB gzipped):
- `dist/_astro/boot.*.js` — bundled lib modules (61KB)
- `dist/_astro/index.*.css` — bundled CSS (14KB)
- `dist/index.html` — final HTML

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`            | Installs dependencies                            |
| `pnpm dev`                | Starts local dev server at `localhost:4321`      |
| `pnpm build`              | Build your production site to `./dist/`          |
| `pnpm preview`            | Preview your build locally, before deploying     |
| `pnpm astro ...`          | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help`    | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
