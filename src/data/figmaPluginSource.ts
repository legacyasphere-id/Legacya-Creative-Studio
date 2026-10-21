export const FIGMA_PLUGIN_MANIFEST = `{
  "name": "LEGACYA SPHERE Carousel Importer",
  "id": "legacya-sphere-carousel-importer-v1",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}`;

export const FIGMA_PLUGIN_CODE_TS = `// LEGACYA SPHERE Creative Studio — Native Figma Importer (code.ts)
// Compiles 1.0.0 FigmaExportContract JSON into editable native Frame, Text, Shape, Vector, and Image nodes.
// Preserves stable layer IDs via pluginData("legacya_stable_id") and per-layer baseline snapshots
// ("legacya_layer_snapshot") for non-destructive 3-way reconciliation on re-import.

import {
  buildSnapshotFromSpecLayer,
  ChildRemovalCandidate,
  evaluateChildRemovals,
  evaluateLayerReconciliation,
  extractSnapshotFromFigmaNode,
  ImportedLayerSnapshot,
} from './reconcile';

declare const figma: any;
declare const __html__: string;

const SNAPSHOT_PLUGIN_KEY = 'legacya_layer_snapshot';
const MANAGED_PLUGIN_KEY = 'legacya_managed';
const LAYER_TYPE_PLUGIN_KEY = 'legacya_layer_type';

export async function runFigmaContractImport(
  figmaApi: any,
  contract: any,
  options: { preserveManualEdits?: boolean } = {}
) {
  // 1. Locate or create dedicated Draft Page (never overwrite approved production pages)
  // 2. Match existing frames by stable ID ("legacya_stable_id")
  // 3. Reconcile child layers using 3-way comparison (baselineSnapshot vs currentFigmaProps vs incomingSpecProps)
  // 4. Preserve manual designer edits by default; support explicit force-overwrite when requested
  // 5. Render native TEXT (with textAlignHorizontal, lineHeight, letterSpacing), RECTANGLE, ELLIPSE, LINE,
  //    SVG VECTOR (createNodeFromSvg), and raster/SVG IMAGE fills (createImage / createNodeFromSvg).
}`;

export const FIGMA_PLUGIN_UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LEGACYA SPHERE Carousel Importer</title>
</head>
<body>
  <h1>LEGACYA SPHERE · Native Importer</h1>
  <p>Paste a validated 1.0.0 JSON export contract. Re-imports reconcile layers by stable ID and baseline snapshot without destroying manual Figma edits.</p>
  <textarea id="jsonInput" placeholder="Paste LEGACYA SPHERE 1.0.0 JSON export here..."></textarea>
  <label for="preserveManualEditsToggle">
    <input type="checkbox" id="preserveManualEditsToggle" checked />
    Preserve manual Figma edits on re-import (Recommended)
  </label>
  <div class="actions">
    <button id="validateBtn">1. Validate & Preview</button>
    <button id="importBtn" class="primary" disabled>2. Confirm & Reconcile Draft Page</button>
  </div>
  <div id="statusBox" class="status"></div>
</body>
</html>`;
