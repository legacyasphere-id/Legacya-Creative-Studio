# LEGACYA SPHERE CREATIVE STUDIO

Editorial creative workspace for planning, generating, reviewing, and translating 3:4 Instagram carousel systems into validated native Figma specifications (`v1.0.0`) and deterministic HyperFrames ("Video as Code") motion compositions.

---

## 1. Architecture & Separation of Concerns

- **UI Workspace (`src/components/*`, `src/App.tsx`)**: Editorial 9-section workspace:
  - `A. Dashboard` — Project overview, operational metrics, and 3:4 slide preview gallery.
  - `B. Creative Brief` — 19-field brief editor with inline validation + Market Intelligence Drawer (`#3 → #2`).
  - `C. Concept & Storyboard` — Strategic thesis, epistemic claim verification, approval gate, and storyboard editor.
  - `D. Slide Editor & Preview` — Interactive 3:4 canvas preview, stable layer ID inspector, and scoped single-slide regeneration.
  - `E. Brand System` — Editable provisional brand tokens (`1.0.0-provisional`) with live WCAG 2.1 contrast verification.
  - `F. Asset Library` — Deterministic studio SVG plates, optional server-side Gemini image synthesis, and Google Flow MCP Prompt Matrix (`02. Image Prompt Matrix`).
  - `G. HyperFrames Motion` — Frame-deterministic HTML/CSS/SVG motion composition studio (`window.__timelines`, `.clip` windows, SMPTE timecode, 90% Action-Safe / 80% Title-Safe guides, `frame.md` camera spec, and 12-rule contract linter).
  - `H. Export & Figma Handoff` — 6-stage handoff ledger, live `1.0.0` JSON contract validator, standalone HTML preview download, and companion Figma plugin source inspector.
  - `I. Settings & Usage` — Execution mode toggle (`Deterministic Studio` vs `Server-Side Gemini API`), cost guardrails, and operation audit log.
- **Market Intelligence Bridge (`src/services/intelligenceBridge.ts`, `scripts/intel_to_campaign.ts`)**: Converts upstream B2B market & competitor intelligence (`#3`) into validated creative briefs, approved concepts, storyboards, Google Flow MCP image prompt matrices, and `1.0.0` Figma contracts (`#2`).
- **Deterministic Layout Engine (`src/services/layoutEngine.ts`)**: Compiles storyboard slides + brand tokens into 10 structurally distinct native Figma layout patterns (`minimal_cover`, `editorial_headline`, `split_composition`, `comparison_columns`, `numbered_steps`, `large_statistic`, `image_with_caption`, `service_showcase`, `product_showcase`, `closing_statement`) within `1080×1440` bounds.
- **HyperFrames Video-as-Code Engine (`src/services/hyperframesEngine.ts`)**: Compiles 3:4 carousels into seekable HTML compositions (`index.html` + `<template>` scenes), `frame.md` camera design specs, `timeline.json` manifests, and automated 12-rule contract check reports.
- **Companion Figma Plugin (`figma-plugin/manifest.json`, `figma-plugin/code.ts`, `figma-plugin/reconcile.ts`, `figma-plugin/ui.html`)**:
  - Compiles via `npm run build:plugin` into `figma-plugin/code.js`.
  - Performs **3-way baseline snapshot reconciliation** (`legacya_layer_snapshot` + `legacya_stable_id`), preserving manual designer edits and unmanaged layers by default while supporting explicit force-overwrite.
- **Server-Side API & Secret Isolation (`server.ts`, `src/services/securityAudit.ts`)**: Express backend hosting `/api/studio/status`, `/api/gemini/concept`, `/api/gemini/storyboard`, `/api/gemini/slide-copy`, `/api/gemini/image`, and `/api/studio/intelligence-bridge` with strict secret isolation and zero-cost fallback when `GEMINI_API_KEY` is unconfigured or rate-limited.

---

## 2. Setup, Build & QA Verification Commands

```bash
# Start full-stack workspace on port 3000 (works with zero API key in Deterministic Studio mode)
npm run dev

# Build the Figma plugin bundle (figma-plugin/code.ts -> figma-plugin/code.js)
npm run build:plugin

# Run all 11 unit & integration test suites (WCAG, 10 layouts, validator, Figma reconciler, Gemini routes, Intel bridge, HyperFrames, API leak audit, E2E pipeline)
npm test

# Run standalone QA & API Key / Secret Leak Security Audit across source, build, exported artifacts, and live server endpoints
npm run qa:audit

# Run headless Chromium Playwright E2E verification across all 9 Studio sections (A–I)
npm run test:e2e

# Type-check codebase
npm run lint

# Build production web bundle + Figma plugin bundle
npm run build
```

---

## 3. Limitations & Honest Handoff Status

1. **Preview vs. Figma Import**: Google AI Studio does not write directly to a live Figma canvas. Exporting JSON validates and downloads the `1.0.0` contract; writing editable frames requires running the companion plugin inside Figma Desktop/Web.
2. **HyperFrames HTML vs. Local FFmpeg Render**: Exporting `hyperframes_index.html` and `frame.md` produces a frame-accurate, seekable HTML composition (`window.__hyperframes.seek(t)`). Encoding to `.mp4` runs via `npx hyperframes render` in an environment with FFmpeg.
3. **Provisional Brand Tokens**: All default colors and font pairings are marked `1.0.0-provisional` and remain editable in Section E (**Brand System**).
