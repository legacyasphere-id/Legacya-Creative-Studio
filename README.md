# LEGACYA SPHERE CREATIVE STUDIO

Editorial creative workspace for planning, generating, reviewing, and translating 3:4 Instagram carousel systems into validated native Figma specifications.

---

## 1. Architecture & Separation of Concerns

- **UI Workspace (`src/components/*`, `src/App.tsx`)**: Editorial 8-section workspace (`A. Dashboard`, `B. Creative Brief`, `C. Concept & Storyboard`, `D. Slide Editor & Preview`, `E. Brand System`, `F. Asset Library`, `G. Export & Figma Handoff`, `H. Settings & Usage`).
- **Data Models (`src/types/studio.ts`)**: Strict TypeScript interfaces for briefs, concepts, storyboards, provisional brand tokens, native Figma nodes (`FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `LINE`, `VECTOR`, `IMAGE`, `GROUP`), and the `1.0.0` export contract.
- **Provisional Brand Tokens (`src/tokens/defaultTokens.ts`)**: Editable tokens for Warm Cream (`#F7F4EE`), Clean White (`#FFFFFF`), Deep Navy (`#0F1A2C`), Ink Black (`#121212`), Restrained Gray (`#5C5852`), `Fraunces` display typography, `Plus Jakarta Sans` body prose, and `1080×1440` (3:4 portrait) grid geometry.
- **Deterministic Layout Engine (`src/services/layoutEngine.ts`)**: Compiles approved storyboard slides + brand tokens into native Figma layer specifications across 10 reusable layout patterns with WCAG AA contrast verification and character-budget checks (never silently shrinking font sizes to unreadable levels).
- **Schema & Bounds Validator (`src/services/schemaValidator.ts`)**: Validates schema version `1.0.0`, frame dimensions, top-left origin coordinates, unique stable layer IDs, contrast ratios, and asset references.
- **Companion Figma Plugin (`figma-plugin/manifest.json`, `figma-plugin/code.ts`, `figma-plugin/ui.html`)**: Separate Figma plugin deliverable that validates the exported JSON, previews the slide count, creates or updates a dedicated `[Draft] LEGACYA SPHERE` page, and matches frames/layers via `pluginData("legacya_stable_id")` so re-imports never duplicate layers.
- **Server-Side API & Secret Isolation (`server.ts`)**: Express backend hosting `/api/studio/status` and `/api/gemini/concept`. `GEMINI_API_KEY` remains strictly server-side and is never exposed in client bundles or exported JSON.

---

## 2. Setup & Running Locally

```bash
# Start full-stack workspace on port 3000 (works with zero API key in Deterministic Studio mode)
npm run dev

# Run unit tests (schema validation, layout bounds, contrast, export serialization)
npm test

# Type-check codebase
npm run lint

# Build production bundle
npm run build
```

---

## 3. Limitations & Honest Handoff Status

1. **Preview vs. Figma Import**: Google AI Studio does not write directly to a live Figma canvas. Exporting JSON validates and downloads the `1.0.0` contract; writing editable frames requires running the companion plugin inside Figma Desktop/Web.
2. **Provisional Brand Tokens**: All default colors and font pairings are marked `1.0.0-provisional` and remain editable in Section E (**Brand System**).
3. **Font Availability in Figma**: If `Fraunces` or `Plus Jakarta Sans` is not installed in the target Figma environment, the companion plugin logs a substitution warning and falls back to `Inter Regular`.
