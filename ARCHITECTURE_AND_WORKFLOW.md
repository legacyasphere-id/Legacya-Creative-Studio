# LEGACYA SPHERE CREATIVE STUDIO
## Complete System Architecture, Module Reference & End-to-End Operational Workflow

**Document Version:** `1.0.0`  
**Default Target Format:** Instagram Carousel · `3:4` Portrait (`1080 × 1440` logical pixels)  
**Contract Version:** `FigmaExportContract v1.0.0`

---

## 1. Executive Summary & Core Principle

**LEGACYA SPHERE CREATIVE STUDIO** is an editorial creative workspace engineered to transform a structured creative brief into a strategic concept, a slide-by-slide narrative storyboard, a deterministic 3:4 layout specification, and a validated `1.0.0` JSON contract that a companion Figma plugin converts into editable native Figma layers.

### The Governing Architectural Rule
> **Gemini / Studio Strategist is the creative reasoning and specification engine. Figma is the editable design canvas and final source of truth.**

- **No Flattened Slides**: Headlines, body copy, footers, geometric accents, and image frames remain independent layers (`FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `LINE`, `VECTOR`, `IMAGE`).
- **No Silent Mutations**: Editing or regenerating a single slide never overwrites other slides or alters the approved brand token system.
- **No False Handoff Claims**: Exporting JSON validates and downloads the `1.0.0` design specification; a slide is only marked as imported into Figma after running the companion Figma plugin.
- **Zero-Cost Default Operation**: The entire application works out of the box without an API key via the **Deterministic Local Studio Engine**, while optionally supporting server-side Gemini API calls (`/api/gemini/*`) when `GEMINI_API_KEY` is configured on the server.

---

## 2. Complete End-to-End Workflow (Step-by-Step)

```text
[1. Creative Brief]
        │  (Inline validation of 6 required + 13 optional parameters)
        ▼
[2. Strategic Concept Generation]
        │  (Central idea, rationale, narrative arc, epistemic/factual claim flags)
        ▼
[3. Explicit Human Approval Gate]
        │  (Must approve concept before full storyboard synthesis)
        ▼
[4. Slide-by-Slide Storyboard]
        │  (Slide categories, headlines, body prose, microcopy, CTAs, reading order)
        ▼
[5. Deterministic Layout Engine + Provisional Brand Tokens]
        │  (10 layout patterns → 1080×1440 top-left coordinates + WCAG contrast check)
        ▼
[6. Interactive 3:4 Slide Editor & Native Layer Inspector]
        │  (Per-slide copy/layout/asset edits, undo history, manual slide approval)
        ▼
[7. Schema & Geometry Validation (v1.0.0)]
        │  (Verifies frame bounds, unique stable layer IDs, font sizes, contrast)
        ▼
[8. Validated JSON Contract Export (.json)]
        │  (Includes designTokensSnapshot, assetManifest, and reimportStrategy)
        ▼
[9. Companion Figma Plugin Importer (/figma-plugin/)]
        │  (Creates/updates "[Draft] LEGACYA SPHERE" page via legacya_stable_id)
        ▼
[10. Human Art Director Review & Final Export in Figma]
```

### Stage-by-Stage Breakdown

#### Stage 1 — Dashboard & Project Selection (`Section A`)
1. Open the workspace to inspect the active project (*Autonomous Systems Architecture — Q4 Editorial Series*, 7 slides).
2. View top-level operational metrics:
   - **Carousel Geometry**: Slide count, `3:4` aspect ratio, `1080 × 1440` logical pixels.
   - **Editorial Review Gate**: Number of manually approved slides (`3 / 7 Approved` initially) and concept approval state.
   - **JSON Contract Validation**: Live `v1.0.0` schema status and total native Figma layers verified (`77 layers`).
   - **Figma Handoff Status**: Distinguishes between `Contract Ready` and `Imported to Figma`.
3. From here, you can click **New Project Brief** to start from a clean slate, **Restore Sample Carousel** to reset to the reference 7-slide project, or click any slide card to jump directly into the **Slide Editor & Preview**.

#### Stage 2 — Defining the Creative Brief (`Section B`)
1. Complete the **6 Required Foundations**:
   - `Project Name` (minimum 3 characters)
   - `Carousel Topic` (minimum 10 characters)
   - `Target Audience`
   - `Communication Objective`
   - `Language` (e.g., English, Indonesian)
   - `Desired Slide Count` (`3` to `12` slides)
2. Optionally supply any of the **13 Strategic & Governance Directives**:
   - Product or service, Tone of voice, Audience pain point, Desired audience response, Key message, Call to action (CTA), Supporting facts & verified evidence, Existing copy, Preferred visual direction, Content that must not appear, Reference links, Reference asset IDs, and Legal/factual disclaimers.
3. Click **Save Draft Brief** to validate and persist your brief locally without making any AI or network calls.
4. Click **Generate Concept** when you are ready to synthesize the strategic direction.

#### Stage 3 — Concept Review & Epistemic Verification (`Section C — Part 1`)
1. The Creative Strategist returns a structured thesis containing:
   - **Central Idea** & **Key Message**
   - **Creative Rationale**
   - **Audience Insight & Intended Emotional Response**
   - **Narrative Arc** & **Proposed Art Direction**
   - **Recommended Slide Sequence** (assigning appropriate categories to each slide number)
   - **Epistemic & Factual Claims Verification Log**: Classifies claims as `established_fact`, `reasonable_interpretation`, or `requires_verification` so unsupported statistics or fabricated testimonials never slip into production copy.
2. **Approval Gate**: Review or edit any field of the concept, then click **Approve Concept**. Full storyboard regeneration is intentionally gated behind this approval step.

#### Stage 4 — Slide-by-Slide Storyboard Editing (`Section C — Part 2`)
1. Once the concept is approved, click **Rebuild Storyboard from Concept** (or edit the existing storyboard slides directly).
2. Each slide in the sequence specifies:
   - `slideId` (e.g., `slide_01`) and `slideNumber`
   - `category` (chosen from 11 supported slide categories)
   - `layoutPattern` (chosen from 10 deterministic layout patterns)
   - `primaryHeadline` and `supportingCopy`
   - `microcopy` (section kicker) and optional `ctaText`
   - `narrativePurpose`, `visualFocalPoint`, and `accessibilityNotes`

#### Stage 5 — Interactive Slide Editor, Preview & Scoped Regeneration (`Section D`)
1. Browse the horizontal **Carousel Sequence Strip** showing all slides in consistent `3:4` framing.
2. Select any slide to open it in the split-screen editor:
   - **Left Pane (`SlideCanvasPreview`)**: Renders the exact `1080 × 1440` logical coordinate plane scaled smoothly to fit your viewport.
   - Click **Inspect Stable Layer IDs** to overlay wireframe bounding boxes and deterministic IDs (`slide_01_brand_mark`, `slide_01_headline`, `slide_01_geo_circle`, etc.) on the canvas, or click any element on the slide to inspect its exact `X`, `Y`, `Width`, `Height`, and typography metadata in the **Native Layer Inspector**.
   - **Right Pane (Editorial Controls)**:
     - Edit headline, supporting copy, section kicker, CTA, slide category, layout pattern, background treatment (`Warm Cream`, `Clean White`, `Deep Navy`, `Ink Black`), and placed asset reference.
     - **Readability Guardrail**: Each layout pattern enforces a character budget. If copy exceeds the recommended length, an advisory banner warns you to trim copy or switch layouts—the engine **never** silently shrinks font sizes to unreadable dimensions.
     - **Single-Slide Scoped Regeneration**:
       - `Regenerate Slide Copy`: Cycles/synthesizes fresh headline and body prose strictly for the active slide.
       - `Cycle Layout Variant`: Switches the active slide across the 10 approved layout patterns.
       - `Synthesize Vector Plate Asset`: Creates a deterministic architectural SVG asset for the active slide.
     - **Sequence Controls**: Move slide earlier/later, duplicate slide, undo last edit (up to 15 steps), or delete slide (protected by an explicit confirmation prompt).
     - **Manual Approval**: Click **Mark Slide Approved** only after human review. Editing a slide's headline or body copy automatically resets its approval status back to review.

#### Stage 6 — Managing the Brand System & Provisional Tokens (`Section E`)
1. Inspect and customize the **Provisional LEGACYA SPHERE Tokens (`1.0.0-provisional`)**:
   - **Colors**: `backgroundPrimary` (`#F7F4EE`), `backgroundSecondary` (`#FFFFFF`), `surfaceDark` (`#0F1A2C`), `textPrimary` (`#121212`), `textSecondary` (`#5C5852`), `textOnDark` (`#F7F4EE`), `accent` (`#0F1A2C`), and `border` (`#D8D2C5`), with live WCAG 2.1 contrast ratio readouts.
   - **Typography Scale**: `display` (`Fraunces`, 76px), `heading` (`Fraunces`, 54px), `body` (`Plus Jakarta Sans`, 30px), `caption` (`Plus Jakarta Sans`, 22px), and `label` (`JetBrains Mono`, 18px), including explicit local fallback font definitions.
   - **Canvas & Grid Geometry**: Default `1080 × 1440` logical pixels, `84px` outer safe margin, `12` columns, `24px` gutter.
   - **Component Rules**: Header brand wordmark, footer studio colophon, geometric accent toggles (circles & diagonal axes), and header/footer hairline rules.
2. Any token change immediately updates all slide previews and the exported Figma token snapshot. Click **Reset to Provisional Defaults** at any time to restore the baseline studio identity.

#### Stage 7 — Studio Asset Library & Optional Visual Synthesis (`Section F`)
1. Inspect all registered studio assets (provisional geometric emblem, architectural monolith study, pipeline grid matrix, quadrant radial arc).
2. **Synthesize Studio Vector Plate**: Explicitly generate a new deterministic SVG architectural plate for a chosen slide without baking any text or logos into the image.
3. **Upload Local Image**: Load a local reference image via browser `FileReader` (kept strictly in local browser state; never uploaded to external third-party servers) and assign it to any showcase slide.

#### Stage 8 — Validating & Exporting the `1.0.0` Figma Contract (`Section G`)
1. Review the **Explicit 6-Stage Verification & Figma Handoff Ledger**:
   - `Stage 01: JSON Generated` (Automated)
   - `Stage 02: JSON Validated` (Automated)
   - `Stage 03: Plugin Implemented` (Automated)
   - `Stage 04: Figma Import Completed` (Manual confirmation after running the plugin in Figma)
   - `Stage 05: Design Reviewed` (Manual human review confirmation)
   - `Stage 06: Design Approved` (Final creative director sign-off)
2. Use the **JSON Schema & Coordinate Bounds Validator**:
   - Inspect the live `1.0.0` JSON contract.
   - Click **Test Invalid JSON Sample** to load a deliberately broken payload (`0.9-invalid` schema version, missing `projectId`, duplicate layer IDs, out-of-bounds coordinates, and an unsupported `CANVAS_BLOB_3D` node type) and verify how the validator reports each error and its remediation.
   - Click **Load Current Valid Export** to restore the valid project contract.
3. Click **Download Validated JSON Contract (v1.0.0)** (or **Copy Contract JSON**) to export `<projectId>_figma_contract_v1.0.0.json`.

#### Stage 9 — Importing into Figma via the Companion Plugin (`/figma-plugin/`)
1. Build the plugin script once from the repository root:
   ```bash
   npx esbuild figma-plugin/code.ts --outfile=figma-plugin/code.js
   ```
2. In Figma Desktop, navigate to **Plugins → Development → Import plugin from manifest…** and select `figma-plugin/manifest.json`.
3. Run the plugin, paste the exported `1.0.0` JSON contract into the plugin UI, and click **1. Validate & Preview**.
4. Review the project name, slide count, target draft page name (`[Draft] LEGACYA SPHERE — <Project Name>`), and re-import strategy.
5. Click **2. Confirm & Write to Draft Page**:
   - The plugin creates (or locates) the dedicated draft page—never overwriting existing approved pages.
   - It creates one independent `FrameNode` (`1080 × 1440`) per slide and populates native `TextNode`, `RectangleNode`, `EllipseNode`, and `LineNode` layers in exact layer order.
   - Every frame and layer is tagged via `setPluginData("legacya_stable_id", id)`. Re-importing an updated JSON file updates existing frames in place rather than duplicating layers.
   - If a configured font (such as `Fraunces` or `Plus Jakarta Sans`) is missing on the local machine, the plugin substitutes `Inter Regular` and reports the exact layers affected in the completion summary.

---

## 3. Repository File & Module Map

```text
/
├── server.ts                              # Express + Vite server (port 3000) & server-side /api/gemini/* proxy
├── package.json                           # Scripts: dev, start, build, test, lint
├── README.md                              # Quickstart & setup guide
├── ARCHITECTURE_AND_WORKFLOW.md           # Complete system & workflow documentation (this file)
├── figma-plugin/                          # Separate companion Figma plugin deliverable
│   ├── manifest.json                      # Figma plugin manifest (networkAccess: none)
│   ├── code.ts                            # Figma Plugin API importer with stable ID re-import logic
│   └── ui.html                            # Pre-import validation & confirmation UI
└── src/
    ├── App.tsx                            # Root workspace state, undo stack, localStorage, 8-section router
    ├── index.css                          # Editorial font variables (Fraunces, Plus Jakarta Sans, JetBrains Mono)
    ├── types/
    │   └── studio.ts                      # Core TypeScript interfaces & FigmaExportContract 1.0.0 types
    ├── tokens/
    │   └── defaultTokens.ts               # Provisional LEGACYA SPHERE tokens, 11 slide categories, 10 layouts
    ├── services/
    │   ├── creativeEngine.ts              # Brief validation, deterministic strategist, storyboard & copy engine
    │   ├── layoutEngine.ts                # Deterministic 1080×1440 coordinate compiler & WCAG contrast math
    │   ├── schemaValidator.ts             # Project & JSON contract validator (bounds, IDs, contrast, syntax)
    │   └── exportSerializer.ts            # Serializes project state into 1.0.0 FigmaExportContract JSON
    ├── data/
    │   ├── sampleProject.ts               # 7-slide "Autonomous Systems Architecture" sample project & SVG assets
    │   └── figmaPluginSource.ts           # Inspectable plugin source strings for the in-app Handoff viewer
    ├── components/
    │   ├── DashboardSection.tsx           # Section A: Project overview, metrics & 3:4 carousel gallery
    │   ├── BriefSection.tsx               # Section B: 19-field brief form with inline validation
    │   ├── ConceptStoryboardSection.tsx   # Section C: Strategist thesis, approval gate & storyboard editor
    │   ├── SlideEditorSection.tsx         # Section D: Split 3:4 editor, layer inspector & scoped regeneration
    │   ├── SlideCanvasPreview.tsx         # Deterministic 1080×1440 scaled frame & native element renderer
    │   ├── BrandSystemSection.tsx         # Section E: Editable color, typography, grid & component tokens
    │   ├── AssetLibrarySection.tsx        # Section F: Studio vector synthesis, local image upload & provenance
    │   ├── ExportHandoffSection.tsx       # Section G: 6-stage ledger, live JSON validator & plugin viewer
    │   └── SettingsUsageSection.tsx       # Section H: Engine mode selector, cost guardrails & audit history
    └── utils/
        └── studioLogic.test.ts            # Automated unit tests (node:test + node:assert/strict)
```

---

## 4. Supported Slide Categories & Deterministic Layout Patterns

### 11 Slide Categories (`SlideCategory`)
| Category ID | Editorial Label | Default Layout Pattern | Primary Narrative Role |
| :--- | :--- | :--- | :--- |
| `cover_hook` | Cover / Hook | `minimal_cover` | Establishes the central thesis and visual authority to earn the first swipe. |
| `problem_statement` | Problem Statement | `editorial_headline` | Articulates structural friction or industry misconceptions with clarity. |
| `educational_content` | Educational Content | `split_composition` | Distills a core technical or strategic principle into a focused mobile frame. |
| `comparison` | Comparison | `comparison_columns` | Contrasts conventional approaches against intentional system architecture. |
| `process_steps` | Process / Step-by-Step | `numbered_steps` | Breaks a methodology into sequential, numbered operational stages. |
| `service_showcase` | Service Showcase | `service_showcase` | Presents studio capabilities and deliverable scope without sales clutter. |
| `advertising_showcase` | Advertising Asset Showcase | `image_with_caption` | Highlights creative direction and campaign framing with restrained captions. |
| `website_product_showcase` | Website / Product Showcase | `product_showcase` | Frames digital systems and interface architecture within an editorial grid. |
| `case_study` | Case Study | `large_statistic` | Pairs verified architectural outcomes or high-salience statements with context. |
| `summary` | Summary | `editorial_headline` | Synthesizes the narrative arc into an actionable takeaway. |
| `closing_slide` | Closing Slide | `closing_statement` | Concludes with an understated studio signature and clear next step. |

### 10 Deterministic Layout Patterns (`LayoutPatternId`)
1. **`minimal_cover`**: Display thesis anchored in the upper-middle register with geometric circle and diagonal axis.
2. **`editorial_headline`**: High-contrast serif statement with a 160px measure rule and balanced body prose.
3. **`split_composition`**: Asymmetric horizontal division pairing an upper thesis with a lower bordered proof surface.
4. **`comparison_columns`**: Two-column vertical architectural grid contrasting `01 · FRAGMENTED WORKFLOW` against `02 · LEGACYA ARCHITECTURE`.
5. **`numbered_steps`**: Monumental `112px` tabular numeral index anchored above a full-width hairline divider and step methodology.
6. **`large_statistic`**: Monumental display statement with supporting context and an upper-right radial measure arc.
7. **`image_with_caption`**: Dedicated `4:3` visual asset frame with editorial figure caption and independent headline.
8. **`service_showcase`**: Structured studio discipline pillar with deliverable specification and measure rule.
9. **`product_showcase`**: Framed system viewport container (`IMAGE` node inside a bordered architectural frame) with figure annotations.
10. **`closing_statement`**: Deep editorial frame with geometric circle motif, closing directive, CTA container, and studio colophon.

---

## 5. Verification & Testing Commands

```bash
# 1. Run the 5 automated unit test suites (WCAG contrast, 1080×1440 bounds across all 10 layouts,
#    1.0.0 export serialization, negative schema error detection, and brief validation)
npm test

# 2. Run TypeScript static analysis across the application and Figma plugin
npm run lint

# 3. Build the production frontend bundle
npm run build

# 4. Start the full-stack studio workspace on http://localhost:3000
npm run dev
```
