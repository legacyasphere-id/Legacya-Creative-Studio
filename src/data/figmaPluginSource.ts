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
// Compiles 1.0.0 FigmaExportContract JSON into editable native Frame, Text, Shape, and Vector nodes.
// Preserves stable layer IDs via pluginData("legacya_stable_id") for non-destructive re-imports.

figma.showUI(__html__, { width: 520, height: 640, themeColors: true });

function hexToRgb(hex: string): RGB {
  const clean = hex.replace(/^#/, '');
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function mapFontWeightToStyle(weight: number): string {
  if (weight >= 700) return 'Bold';
  if (weight >= 600) return 'SemiBold';
  if (weight >= 500) return 'Medium';
  return 'Regular';
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'CANCEL') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'IMPORT_CONTRACT') {
    const contract = msg.payload;
    const warnings: string[] = [];
    let createdFrames = 0;
    let updatedFrames = 0;
    let createdLayers = 0;

    if (!contract || contract.schemaVersion !== '1.0.0') {
      figma.ui.postMessage({
        type: 'IMPORT_ERROR',
        message: 'Unsupported schemaVersion. Expected "1.0.0".',
      });
      return;
    }

    const pluginKey = contract.reimportStrategy?.pluginDataKey || 'legacya_stable_id';
    const draftPageName = (contract.reimportStrategy?.draftPagePrefix || '[Draft] LEGACYA SPHERE — ') + contract.projectName;

    // 1. Locate or create dedicated Draft Page (never overwrite approved production pages)
    let targetPage = figma.root.children.find(
      (p) => p.getPluginData('legacya_project_id') === contract.projectId || p.name === draftPageName
    );
    if (!targetPage) {
      targetPage = figma.createPage();
      targetPage.name = draftPageName;
      targetPage.setPluginData('legacya_project_id', contract.projectId);
    }
    await figma.setCurrentPageAsync(targetPage);

    // 2. Index existing frames by stable ID for safe re-import
    const existingFramesById = new Map<string, FrameNode>();
    for (const child of targetPage.children) {
      if (child.type === 'FRAME') {
        const stableId = child.getPluginData(pluginKey);
        if (stableId) existingFramesById.set(stableId, child);
      }
    }

    for (const slide of contract.slides) {
      const fSpec = slide.frameNode;
      let frame = existingFramesById.get(fSpec.id);
      if (frame) {
        updatedFrames++;
        // Clear previous child nodes inside the matched slide frame before rebuilding
        for (const child of [...frame.children]) {
          child.remove();
        }
      } else {
        frame = figma.createFrame();
        frame.setPluginData(pluginKey, fSpec.id);
        targetPage.appendChild(frame);
        createdFrames++;
      }

      frame.name = fSpec.name;
      frame.x = fSpec.x;
      frame.y = fSpec.y;
      frame.resize(fSpec.width, fSpec.height);
      frame.fills = [{ type: 'SOLID', color: hexToRgb(fSpec.fill || '#F7F4EE') }];

      const orderedLayers = [...(slide.layers || [])].sort((a, b) => a.layerOrder - b.layerOrder);

      for (const layer of orderedLayers) {
        createdLayers++;
        if (layer.type === 'TEXT') {
          const textNode = figma.createText();
          textNode.name = layer.name;
          textNode.setPluginData(pluginKey, layer.id);
          const desiredFont: FontName = {
            family: layer.fontFamily || 'Inter',
            style: mapFontWeightToStyle(layer.fontWeight || 400),
          };
          try {
            await figma.loadFontAsync(desiredFont);
            textNode.fontName = desiredFont;
          } catch {
            warnings.push(\`Font "\${desiredFont.family} \${desiredFont.style}" unavailable in Figma; substituted Inter Regular on layer "\${layer.name}".\`);
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            textNode.fontName = { family: 'Inter', style: 'Regular' };
          }
          textNode.characters = layer.textContent || '';
          textNode.fontSize = layer.fontSize || 24;
          textNode.x = layer.x;
          textNode.y = layer.y;
          textNode.resize(layer.width, Math.max(24, layer.height));
          textNode.textAutoResize = 'HEIGHT';
          textNode.fills = [{ type: 'SOLID', color: hexToRgb(layer.textColor || '#121212') }];
          frame.appendChild(textNode);
        } else if (layer.type === 'RECTANGLE' || layer.type === 'IMAGE') {
          const rect = figma.createRectangle();
          rect.name = layer.name;
          rect.setPluginData(pluginKey, layer.id);
          rect.x = layer.x;
          rect.y = layer.y;
          rect.resize(layer.width, Math.max(1, layer.height));
          if (layer.type === 'RECTANGLE') {
            rect.fills = layer.fill ? [{ type: 'SOLID', color: hexToRgb(layer.fill) }] : [];
            if (layer.stroke) {
              rect.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
              rect.strokeWeight = layer.strokeWidth || 1;
            }
            if (typeof layer.cornerRadius === 'number') rect.cornerRadius = layer.cornerRadius;
          } else {
            rect.fills = [{ type: 'SOLID', color: hexToRgb('#E5DFD3') }];
            warnings.push(\`Image slot "\${layer.name}" (\${layer.assetId}) created as an editable frame container.\`);
          }
          frame.appendChild(rect);
        } else if (layer.type === 'ELLIPSE') {
          const ellipse = figma.createEllipse();
          ellipse.name = layer.name;
          ellipse.setPluginData(pluginKey, layer.id);
          ellipse.x = layer.x;
          ellipse.y = layer.y;
          ellipse.resize(layer.width, layer.height);
          ellipse.fills = layer.fill ? [{ type: 'SOLID', color: hexToRgb(layer.fill) }] : [];
          if (layer.stroke) {
            ellipse.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
            ellipse.strokeWeight = layer.strokeWidth || 1.5;
          }
          frame.appendChild(ellipse);
        } else if (layer.type === 'LINE' || layer.type === 'VECTOR') {
          const line = figma.createLine();
          line.name = layer.name;
          line.setPluginData(pluginKey, layer.id);
          line.x = layer.x;
          line.y = layer.y;
          line.resize(layer.width, 0);
          if (layer.stroke) {
            line.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
            line.strokeWeight = layer.strokeWidth || 1;
          }
          frame.appendChild(line);
        }
      }
    }

    figma.viewport.scrollAndZoomIntoView(targetPage.children);
    figma.ui.postMessage({
      type: 'IMPORT_COMPLETE',
      summary: {
        draftPageName,
        createdFrames,
        updatedFrames,
        createdLayers,
        warnings,
      },
    });
  }
};
`;

export const FIGMA_PLUGIN_UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LEGACYA SPHERE Carousel Importer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif;
      background: #F7F4EE;
      color: #121212;
      margin: 0;
      padding: 20px;
    }
    h1 { font-size: 16px; margin: 0 0 6px; letter-spacing: 0.04em; text-transform: uppercase; }
    p { font-size: 12px; color: #5C5852; margin: 0 0 14px; line-height: 1.5; }
    textarea {
      width: 100%;
      height: 220px;
      box-sizing: border-box;
      border: 1px solid #D8D2C5;
      background: #FFFFFF;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      margin-bottom: 12px;
    }
    .preview-box {
      border: 1px solid #D8D2C5;
      background: #FFFFFF;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 12px;
      display: none;
    }
    .actions { display: flex; gap: 8px; }
    button {
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #121212;
      background: #FFFFFF;
      color: #121212;
      cursor: pointer;
    }
    button.primary { background: #0F1A2C; color: #F7F4EE; border-color: #0F1A2C; }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    .status { margin-top: 12px; font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>LEGACYA SPHERE · Native Importer</h1>
  <p>Paste or load a validated 1.0.0 JSON export contract. The plugin validates the schema and asks for confirmation before creating or updating a draft page.</p>
  <textarea id="jsonInput" placeholder="Paste LEGACYA SPHERE 1.0.0 JSON export here..."></textarea>
  <div id="previewBox" class="preview-box"></div>
  <div class="actions">
    <button id="validateBtn">1. Validate & Preview</button>
    <button id="importBtn" class="primary" disabled>2. Confirm & Write to Draft Page</button>
  </div>
  <div id="statusBox" class="status"></div>

  <script>
    let validatedPayload = null;
    const jsonInput = document.getElementById('jsonInput');
    const previewBox = document.getElementById('previewBox');
    const validateBtn = document.getElementById('validateBtn');
    const importBtn = document.getElementById('importBtn');
    const statusBox = document.getElementById('statusBox');

    validateBtn.onclick = () => {
      validatedPayload = null;
      importBtn.disabled = true;
      try {
        const parsed = JSON.parse(jsonInput.value);
        if (parsed.schemaVersion !== '1.0.0') {
          throw new Error('Unsupported schemaVersion: ' + parsed.schemaVersion);
        }
        if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
          throw new Error('Contract contains zero slides.');
        }
        validatedPayload = parsed;
        previewBox.style.display = 'block';
        previewBox.innerHTML =
          '<strong>Validated Project:</strong> ' + parsed.projectName + '<br/>' +
          '<strong>Slides:</strong> ' + parsed.slides.length + ' independent frames<br/>' +
          '<strong>Target Page:</strong> [Draft] LEGACYA SPHERE — ' + parsed.projectName + '<br/>' +
          '<strong>Re-import Strategy:</strong> Match by stable ID (legacya_stable_id)';
        statusBox.textContent = 'Schema 1.0.0 verified. Ready to write native Figma layers.';
        importBtn.disabled = false;
      } catch (err) {
        previewBox.style.display = 'none';
        statusBox.textContent = 'Validation Error: ' + err.message;
      }
    };

    importBtn.onclick = () => {
      if (!validatedPayload) return;
      statusBox.textContent = 'Creating editable frames and layers in Figma...';
      parent.postMessage({ pluginMessage: { type: 'IMPORT_CONTRACT', payload: validatedPayload } }, '*');
    };

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === 'IMPORT_ERROR') {
        statusBox.textContent = 'Import failed: ' + msg.message;
      } else if (msg.type === 'IMPORT_COMPLETE') {
        const s = msg.summary;
        statusBox.textContent =
          'Completed on page "' + s.draftPageName + '".\\n' +
          'Created Frames: ' + s.createdFrames + ' | Updated Frames: ' + s.updatedFrames + ' | Total Layers: ' + s.createdLayers +
          (s.warnings.length ? '\\nNotes:\\n- ' + s.warnings.join('\\n- ') : '');
      }
    };
  </script>
</body>
</html>`;
