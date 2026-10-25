# LEGACYA SPHERE CREATIVE STUDIO

Editorial creative workspace for planning, generating, reviewing, and translating 3:4 Instagram carousel systems into validated native Figma specifications.

---

## 1. Architecture & Separation of Concerns

- **UI Workspace (`src/components/*`, `src/App.tsx`)**: Editorial 8-section workspace (`A. Dashboard`, `B. Creative Brief`, `C. Concept & Storyboard`, `D. Slide Editor & Preview`, `E. Brand System`, `F. Asset Library`, `G. Export & Figma Handoff`, `H. Settings & Usage`).
- **Data Models (`src/types/studio.ts`)**: Strict TypeScript interfaces for briefs, concepts, storyboards, provisional brand tokens, native Figma nodes (`FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `LINE`, `VECTOR`, `IMAGE`, `GROUP`), and the `1.0.0` export contract.
- **Provisional Brand Tokens (`src/tokens/defaultTokens.ts`)**: Editable tokens for Warm Cream (`#F7F4EE`), Clean White (`#FFFFFF`), Deep Navy (`#0F1A2C`), Ink Black (`#121212`), Restrained Gray (`#5C5852`), `Fraunces` display typography, `Plus Jakarta Sans` body prose, and `1080×1440` (3:4 portrait) grid geometry.
- **Deterministic Layout Engine (`src/services/layoutEngine.ts`)**: Compiles approved storyboard slides + brand tokens into 10 structurally distinct native Figma layout patterns (`minimal_cover`, `editorial_headline`, `split_composition`, `comparison_columns`, `numbered_steps`, `large_statistic`, `image_with_caption`, `service_showcase`, `product_showcase`, `closing_statement`) with WCAG AA contrast verification and character-budget checks.
- **Schema & Type-Specific Node Validator (`src/services/schemaValidator.ts`)**: Validates schema version `1.0.0`, frame dimensions, top-left origin coordinates, unique stable layer IDs, contrast ratios, and type-specific required properties for `TEXT`, `RECTANGLE`, `ELLIPSE`, `LINE`, `VECTOR`, `IMAGE`, and `GROUP` nodes.
- **Companion Figma Plugin (`figma-plugin/manifest.json`, `figma-plugin/code.ts`, `figma-plugin/reconcile.ts`, `figma-plugin/ui.html`)**:
  - Compiles via `npm run build:plugin` into `figma-plugin/code.js`.
  - Performs **3-way baseline snapshot reconciliation** (`legacya_layer_snapshot` + `legacya_stable_id`), comparing current Figma layer properties against the stored baseline snapshot from the last import and against the incoming contract.
  - Enables **"Preserve manual Figma edits on re-import (Recommended)"** by default so manual designer edits and unmanaged layers are never silently overwritten, while supporting an explicit force-overwrite option.
  - Imports SVG `VECTOR` nodes via `figma.createNodeFromSvg`, raster/SVG `IMAGE` assets via `figma.createImage` / `figma.createNodeFromSvg`, and full `TEXT` typography (`textAlignHorizontal`, `lineHeight`, `letterSpacing`).
- **Server-Side API & Secret Isolation (`server.ts`)**: Express backend hosting `/api/studio/status`, `/api/gemini/concept`, `/api/gemini/storyboard`, and `/api/gemini/slide-copy` with schema sanitization and automatic fallback to the deterministic studio engine when `GEMINI_API_KEY` is unconfigured.

---

## 2. Setup, Build & Verification Commands

```bash
# Start full-stack workspace on port 3000 (works with zero API key in Deterministic Studio mode)
npm run dev

# Build the Figma plugin bundle (figma-plugin/code.ts -> figma-plugin/code.js)
npm run build:plugin

# Run unit & integration test suite (reconciliation, 10 layouts, validator, and Gemini server routes)
npm test

# Type-check codebase
npm run lint

# Build production web bundle + Figma plugin bundle
npm run build
```

---

## 3. Limitations & Honest Handoff Status

1. **Preview vs. Figma Import**: Google AI Studio does not write directly to a live Figma canvas. Exporting JSON validates and downloads the `1.0.0` contract; writing editable frames requires running the companion plugin inside Figma Desktop/Web.
2. **Provisional Brand Tokens**: All default colors and font pairings are marked `1.0.0-provisional` and remain editable in Section E (**Brand System**).
3. **Font Availability in Figma**: If `Fraunces` or `Plus Jakarta Sans` is not installed in the target Figma environment, the companion plugin logs a substitution warning, records `legacya_substituted_font` so re-imports do not misclassify the fallback as a manual edit, and falls back to `Inter Regular`.
