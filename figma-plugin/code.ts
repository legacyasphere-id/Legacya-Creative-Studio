// LEGACYA SPHERE Creative Studio — Native Figma Importer (code.ts)
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

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = String(hex || '#121212')
    .trim()
    .replace(/^#/, '');
  const valid = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : '121212';
  const num = parseInt(valid, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export function mapFontWeightToStyle(weight: number): string {
  if (weight >= 700) return 'Bold';
  if (weight >= 600) return 'SemiBold';
  if (weight >= 500) return 'Medium';
  return 'Regular';
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeBase64ToBytes(base64Input: string): Uint8Array {
  const clean = base64Input.replace(/[\r\n\s]/g, '').replace(/=+$/, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let p = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = i + 2 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 2)) : 0;
    const enc4 = i + 3 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 3)) : 0;

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    if (p < byteLength) bytes[p++] = chr1;
    if (p < byteLength && i + 2 < clean.length) bytes[p++] = chr2;
    if (p < byteLength && i + 3 < clean.length) bytes[p++] = chr3;
  }
  return bytes;
}

export function decodeSvgDataUrl(dataUrl: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (dataUrl.startsWith('data:image/svg+xml;utf8,')) {
    const raw = dataUrl.slice('data:image/svg+xml;utf8,'.length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
    const b64 = dataUrl.slice('data:image/svg+xml;base64,'.length);
    const bytes = decodeBase64ToBytes(b64);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }
  if (dataUrl.trim().startsWith('<svg')) {
    return dataUrl.trim();
  }
  return null;
}

export function decodeRasterDataUrl(dataUrl: string): Uint8Array | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,(.+)$/i);
  if (!match) return null;
  return decodeBase64ToBytes(match[1]);
}

export function buildSvgMarkupFromVectorLayer(layer: Record<string, any>): string {
  const w = Math.max(1, Number(layer.width || 100));
  const h = Math.max(1, Number(layer.height || 100));
  const rawPath = String(layer.vectorSvgPath || `M 0 ${h} L ${w} 0`).trim();
  if (rawPath.startsWith('<svg')) {
    return rawPath;
  }
  const strokeAttr = layer.stroke ? `stroke="${layer.stroke}"` : 'stroke="none"';
  const strokeWidthAttr = `stroke-width="${layer.strokeWidth || 1.5}"`;
  const fillAttr = layer.fill ? `fill="${layer.fill}"` : 'fill="none"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${rawPath}" ${strokeAttr} ${strokeWidthAttr} ${fillAttr} /></svg>`;
}

function parseStoredSnapshot(node: any): ImportedLayerSnapshot | null {
  if (!node || typeof node.getPluginData !== 'function') return null;
  const raw = node.getPluginData(SNAPSHOT_PLUGIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImportedLayerSnapshot;
  } catch {
    return null;
  }
}

function storeLayerMetadata(
  node: any,
  pluginKey: string,
  layer: Record<string, any>,
  snapshot: ImportedLayerSnapshot
) {
  if (!node || typeof node.setPluginData !== 'function') return;
  node.setPluginData(pluginKey, String(layer.id));
  node.setPluginData(MANAGED_PLUGIN_KEY, 'true');
  node.setPluginData(LAYER_TYPE_PLUGIN_KEY, String(layer.type));
  if (layer.type === 'VECTOR' && layer.vectorSvgPath) {
    node.setPluginData('legacya_vector_path', String(layer.vectorSvgPath));
  }
  if (layer.type === 'IMAGE') {
    if (layer.assetId) node.setPluginData('legacya_asset_id', String(layer.assetId));
    if (layer.imageReference) node.setPluginData('legacya_image_ref', String(layer.imageReference));
    if (layer.fitMode) node.setPluginData('legacya_fit_mode', String(layer.fitMode));
  }
  node.setPluginData(SNAPSHOT_PLUGIN_KEY, JSON.stringify(snapshot));
}

async function createOrUpdateLayerNode(
  figmaApi: any,
  frame: any,
  existingNode: any | null,
  layer: Record<string, any>,
  contractAssets: Array<Record<string, any>>,
  pluginKey: string,
  warnings: string[]
): Promise<any> {
  const snapshot = buildSnapshotFromSpecLayer(layer);
  const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;

  if (layer.type === 'TEXT') {
    const textNode =
      existingNode && existingNode.type === 'TEXT' ? existingNode : figmaApi.createText();
    if (existingNode && existingNode !== textNode) {
      existingNode.remove();
    }

    const desiredFont = {
      family: layer.fontFamily || 'Inter',
      style: mapFontWeightToStyle(layer.fontWeight || 400),
    };
    try {
      await figmaApi.loadFontAsync(desiredFont);
      textNode.fontName = desiredFont;
      if (typeof textNode.setPluginData === 'function') {
        textNode.setPluginData('legacya_substituted_font', '');
      }
    } catch {
      warnings.push(
        `Font "${desiredFont.family} ${desiredFont.style}" unavailable in Figma; substituted Inter Regular on layer "${layer.name}".`
      );
      await figmaApi.loadFontAsync({ family: 'Inter', style: 'Regular' });
      textNode.fontName = { family: 'Inter', style: 'Regular' };
      if (typeof textNode.setPluginData === 'function') {
        textNode.setPluginData('legacya_substituted_font', 'Inter');
      }
    }

    textNode.name = layer.name;
    textNode.characters = String(layer.textContent ?? '');
    textNode.fontSize = Number(layer.fontSize || 24);
    textNode.textAlignHorizontal =
      layer.textAlign === 'CENTER' ||
      layer.textAlign === 'RIGHT' ||
      layer.textAlign === 'JUSTIFIED'
        ? layer.textAlign
        : 'LEFT';
    textNode.lineHeight = {
      value: Math.round(Number(layer.lineHeight || 1.2) * 100),
      unit: 'PERCENT',
    };
    textNode.letterSpacing = {
      value: Number((Number(layer.letterSpacing || 0) * 100).toFixed(2)),
      unit: 'PERCENT',
    };
    textNode.x = Number(layer.x || 0);
    textNode.y = Number(layer.y || 0);
    textNode.resize(Number(layer.width || 100), Math.max(24, Number(layer.height || 28)));
    textNode.textAutoResize = 'HEIGHT';
    textNode.opacity = opacity;
    textNode.fills = [{ type: 'SOLID', color: hexToRgb(layer.textColor || '#121212') }];

    storeLayerMetadata(textNode, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== textNode) {
      frame.appendChild(textNode);
    }
    return textNode;
  }

  if (layer.type === 'RECTANGLE') {
    const rect =
      existingNode && existingNode.type === 'RECTANGLE'
        ? existingNode
        : figmaApi.createRectangle();
    if (existingNode && existingNode !== rect) {
      existingNode.remove();
    }
    rect.name = layer.name;
    rect.x = Number(layer.x || 0);
    rect.y = Number(layer.y || 0);
    rect.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
    rect.opacity = opacity;
    rect.fills = layer.fill ? [{ type: 'SOLID', color: hexToRgb(layer.fill) }] : [];
    if (layer.stroke) {
      rect.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
      rect.strokeWeight = Number(layer.strokeWidth || 1);
    } else {
      rect.strokes = [];
    }
    if (typeof layer.cornerRadius === 'number') {
      rect.cornerRadius = layer.cornerRadius;
    }
    storeLayerMetadata(rect, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== rect) {
      frame.appendChild(rect);
    }
    return rect;
  }

  if (layer.type === 'ELLIPSE') {
    const ellipse =
      existingNode && existingNode.type === 'ELLIPSE' ? existingNode : figmaApi.createEllipse();
    if (existingNode && existingNode !== ellipse) {
      existingNode.remove();
    }
    ellipse.name = layer.name;
    ellipse.x = Number(layer.x || 0);
    ellipse.y = Number(layer.y || 0);
    ellipse.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
    ellipse.opacity = opacity;
    ellipse.fills = layer.fill ? [{ type: 'SOLID', color: hexToRgb(layer.fill) }] : [];
    if (layer.stroke) {
      ellipse.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
      ellipse.strokeWeight = Number(layer.strokeWidth || 1.5);
    } else {
      ellipse.strokes = [];
    }
    storeLayerMetadata(ellipse, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== ellipse) {
      frame.appendChild(ellipse);
    }
    return ellipse;
  }

  if (layer.type === 'LINE') {
    const line =
      existingNode && existingNode.type === 'LINE' ? existingNode : figmaApi.createLine();
    if (existingNode && existingNode !== line) {
      existingNode.remove();
    }
    line.name = layer.name;
    line.x = Number(layer.x || 0);
    line.y = Number(layer.y || 0);
    line.resize(Math.max(1, Number(layer.width || 1)), 0);
    line.opacity = opacity;
    if (layer.stroke || layer.fill) {
      line.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke || layer.fill) }];
      line.strokeWeight = Number(layer.strokeWidth || 1);
    } else {
      line.strokes = [];
    }
    storeLayerMetadata(line, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== line) {
      frame.appendChild(line);
    }
    return line;
  }

  if (layer.type === 'VECTOR') {
    const svgMarkup = buildSvgMarkupFromVectorLayer(layer);
    let vectorNode: any = null;
    if (typeof figmaApi.createNodeFromSvg === 'function') {
      try {
        vectorNode = figmaApi.createNodeFromSvg(svgMarkup);
      } catch (err) {
        warnings.push(
          `SVG vector parse failed on "${layer.name}" (${layer.id}); fell back to native line (${
            err instanceof Error ? err.message : 'SVG error'
          }).`
        );
      }
    }

    if (vectorNode) {
      if (existingNode) {
        existingNode.remove();
      }
      vectorNode.name = layer.name;
      vectorNode.x = Number(layer.x || 0);
      vectorNode.y = Number(layer.y || 0);
      if (typeof vectorNode.resize === 'function') {
        vectorNode.resize(
          Math.max(1, Number(layer.width || 1)),
          Math.max(1, Number(layer.height || 1))
        );
      }
      vectorNode.opacity = opacity;
      vectorNode.fills = layer.fill ? [{ type: 'SOLID', color: hexToRgb(layer.fill) }] : [];
      storeLayerMetadata(vectorNode, pluginKey, layer, snapshot);
      frame.appendChild(vectorNode);
      return vectorNode;
    }

    // Fallback if createNodeFromSvg is unavailable
    const fallbackLine =
      existingNode && existingNode.type === 'LINE' ? existingNode : figmaApi.createLine();
    if (existingNode && existingNode !== fallbackLine) {
      existingNode.remove();
    }
    fallbackLine.name = layer.name;
    fallbackLine.x = Number(layer.x || 0);
    fallbackLine.y = Number(layer.y || 0);
    fallbackLine.resize(Math.max(1, Number(layer.width || 1)), 0);
    fallbackLine.opacity = opacity;
    if (layer.stroke) {
      fallbackLine.strokes = [{ type: 'SOLID', color: hexToRgb(layer.stroke) }];
      fallbackLine.strokeWeight = Number(layer.strokeWidth || 1.5);
    }
    storeLayerMetadata(fallbackLine, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== fallbackLine) {
      frame.appendChild(fallbackLine);
    }
    return fallbackLine;
  }

  if (layer.type === 'IMAGE') {
    const matchedAsset = Array.isArray(contractAssets)
      ? contractAssets.find(
          (a) => a && (a.assetId === layer.assetId || a.id === layer.assetId)
        )
      : null;
    const sourceUrl = String(
      layer.imageReference ||
        matchedAsset?.imageReference ||
        matchedAsset?.previewDataUrl ||
        ''
    ).trim();
    const scaleMode = layer.fitMode === 'FIT' ? 'FIT' : 'FILL';

    // 1. Check if the image asset is an SVG data URL or inline SVG
    const svgContent = decodeSvgDataUrl(sourceUrl);
    if (svgContent && typeof figmaApi.createNodeFromSvg === 'function') {
      try {
        const svgFrame = figmaApi.createNodeFromSvg(svgContent);
        if (existingNode) {
          existingNode.remove();
        }
        svgFrame.name = layer.name;
        svgFrame.x = Number(layer.x || 0);
        svgFrame.y = Number(layer.y || 0);
        if (typeof svgFrame.resize === 'function') {
          svgFrame.resize(
            Math.max(1, Number(layer.width || 1)),
            Math.max(1, Number(layer.height || 1))
          );
        }
        svgFrame.clipsContent = true;
        svgFrame.opacity = opacity;
        storeLayerMetadata(svgFrame, pluginKey, layer, snapshot);
        frame.appendChild(svgFrame);
        return svgFrame;
      } catch (err) {
        warnings.push(
          `SVG asset import failed for "${layer.name}" (${layer.assetId}): ${
            err instanceof Error ? err.message : 'SVG parse error'
          }.`
        );
      }
    }

    // 2. Check if the image asset is a base64 raster data URL (PNG/JPEG/WEBP)
    const rasterBytes = decodeRasterDataUrl(sourceUrl);
    const rect =
      existingNode && existingNode.type === 'RECTANGLE'
        ? existingNode
        : figmaApi.createRectangle();
    if (existingNode && existingNode !== rect) {
      existingNode.remove();
    }
    rect.name = layer.name;
    rect.x = Number(layer.x || 0);
    rect.y = Number(layer.y || 0);
    rect.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
    rect.opacity = opacity;

    if (rasterBytes && typeof figmaApi.createImage === 'function') {
      try {
        const imageObj = figmaApi.createImage(rasterBytes);
        rect.fills = [
          {
            type: 'IMAGE',
            imageHash: imageObj.hash,
            scaleMode,
          },
        ];
      } catch (err) {
        rect.fills = [{ type: 'SOLID', color: hexToRgb('#E5DFD3') }];
        warnings.push(
          `Raster image decode failed on "${layer.name}" (${layer.assetId}): ${
            err instanceof Error ? err.message : 'createImage error'
          }.`
        );
      }
    } else if (
      /^https?:\/\//i.test(sourceUrl) &&
      typeof figmaApi.createImageAsync === 'function'
    ) {
      try {
        const imageObj = await figmaApi.createImageAsync(sourceUrl);
        rect.fills = [
          {
            type: 'IMAGE',
            imageHash: imageObj.hash,
            scaleMode,
          },
        ];
      } catch (err) {
        rect.fills = [{ type: 'SOLID', color: hexToRgb('#E5DFD3') }];
        warnings.push(
          `Remote image fetch failed on "${layer.name}" (${sourceUrl}): ${
            err instanceof Error ? err.message : 'network error'
          }.`
        );
      }
    } else {
      rect.fills = [{ type: 'SOLID', color: hexToRgb('#E5DFD3') }];
      warnings.push(
        `Image layer "${layer.name}" (${layer.assetId}) has no transferable raster/SVG payload ("${sourceUrl || 'empty'}"); created editable placeholder container.`
      );
    }

    storeLayerMetadata(rect, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== rect) {
      frame.appendChild(rect);
    }
    return rect;
  }

  if (layer.type === 'GROUP') {
    const groupFrame =
      existingNode && existingNode.type === 'FRAME' ? existingNode : figmaApi.createFrame();
    if (existingNode && existingNode !== groupFrame) {
      existingNode.remove();
    }
    groupFrame.name = layer.name;
    groupFrame.x = Number(layer.x || 0);
    groupFrame.y = Number(layer.y || 0);
    groupFrame.resize(
      Math.max(1, Number(layer.width || 1)),
      Math.max(1, Number(layer.height || 1))
    );
    groupFrame.opacity = opacity;
    groupFrame.fills = [];
    storeLayerMetadata(groupFrame, pluginKey, layer, snapshot);
    if (!existingNode || existingNode !== groupFrame) {
      frame.appendChild(groupFrame);
    }
    return groupFrame;
  }

  warnings.push(`Unsupported layer type "${layer.type}" on layer "${layer.name}" (${layer.id}).`);
  return null;
}

export interface ImportSummary {
  draftPageName: string;
  preserveManualEdits: boolean;
  createdFrames: number;
  updatedFrames: number;
  createdLayers: number;
  updatedLayers: number;
  preservedLayers: number;
  removedLayers: number;
  unchangedLayers: number;
  conflicts: string[];
  warnings: string[];
}

export async function runFigmaContractImport(
  figmaApi: any,
  contract: any,
  options: { preserveManualEdits?: boolean } = {}
): Promise<ImportSummary> {
  const preserveManualEdits =
    options.preserveManualEdits !== undefined ? Boolean(options.preserveManualEdits) : true;

  if (!contract || contract.schemaVersion !== '1.0.0') {
    throw new Error('Unsupported schemaVersion. Expected "1.0.0".');
  }
  if (!Array.isArray(contract.slides) || contract.slides.length === 0) {
    throw new Error('Contract contains zero slides.');
  }

  const warnings: string[] = [];
  const conflicts: string[] = [];
  let createdFrames = 0;
  let updatedFrames = 0;
  let createdLayers = 0;
  let updatedLayers = 0;
  let preservedLayers = 0;
  let removedLayers = 0;
  let unchangedLayers = 0;

  const pluginKey = contract.reimportStrategy?.pluginDataKey || 'legacya_stable_id';
  const draftPageName =
    (contract.reimportStrategy?.draftPagePrefix || '[Draft] LEGACYA SPHERE — ') +
    contract.projectName;

  let targetPage = figmaApi.root.children.find(
    (p: any) =>
      (typeof p.getPluginData === 'function' &&
        p.getPluginData('legacya_project_id') === contract.projectId) ||
      p.name === draftPageName
  );
  if (!targetPage) {
    targetPage = figmaApi.createPage();
    targetPage.name = draftPageName;
    if (typeof targetPage.setPluginData === 'function') {
      targetPage.setPluginData('legacya_project_id', contract.projectId);
    }
  }
  if (typeof figmaApi.setCurrentPageAsync === 'function') {
    await figmaApi.setCurrentPageAsync(targetPage);
  } else {
    figmaApi.currentPage = targetPage;
  }

  const existingFramesById = new Map<string, any>();
  for (const child of targetPage.children || []) {
    if (child.type === 'FRAME' && typeof child.getPluginData === 'function') {
      const stableId = child.getPluginData(pluginKey);
      if (stableId) existingFramesById.set(stableId, child);
    }
  }

  const contractAssets = Array.isArray(contract.assets) ? contract.assets : [];

  for (const slide of contract.slides) {
    const fSpec = slide.frameNode;
    let frame = existingFramesById.get(fSpec.id);
    const isReimportFrame = Boolean(frame);

    if (frame) {
      updatedFrames++;
    } else {
      frame = figmaApi.createFrame();
      if (typeof frame.setPluginData === 'function') {
        frame.setPluginData(pluginKey, fSpec.id);
        frame.setPluginData(MANAGED_PLUGIN_KEY, 'true');
      }
      targetPage.appendChild(frame);
      createdFrames++;
    }

    frame.name = fSpec.name;
    frame.x = Number(fSpec.x || 0);
    frame.y = Number(fSpec.y || 0);
    frame.resize(Number(fSpec.width || 1080), Number(fSpec.height || 1440));
    frame.fills = [{ type: 'SOLID', color: hexToRgb(fSpec.fill || '#F7F4EE') }];

    const orderedLayers = [...(slide.layers || [])].sort(
      (a: any, b: any) => Number(a.layerOrder || 0) - Number(b.layerOrder || 0)
    );
    const incomingLayerIds = new Set<string>(orderedLayers.map((l: any) => String(l.id)));

    // Map existing child nodes by stable ID and evaluate safe removals
    const existingChildrenById = new Map<string, any>();
    const existingChildNodes = [...(frame.children || [])];

    if (isReimportFrame && existingChildNodes.length > 0) {
      const removalCandidates: ChildRemovalCandidate[] = existingChildNodes.map((child: any) => {
        const stableId =
          typeof child.getPluginData === 'function' ? child.getPluginData(pluginKey) : '';
        const isManaged =
          Boolean(stableId) ||
          (typeof child.getPluginData === 'function' &&
            child.getPluginData(MANAGED_PLUGIN_KEY) === 'true');
        const baselineSnapshot = parseStoredSnapshot(child);
        const currentFigmaProps = extractSnapshotFromFigmaNode(
          child,
          pluginKey,
          baselineSnapshot
        );

        if (stableId) {
          existingChildrenById.set(stableId, child);
        }

        return {
          nodeId: String(child.id || stableId || child.name),
          nodeName: String(child.name || 'Unnamed Layer'),
          stableId: String(stableId || ''),
          isPluginManaged: isManaged,
          baselineSnapshot,
          currentFigmaProps,
        };
      });

      const removalDecisions = evaluateChildRemovals(
        removalCandidates,
        incomingLayerIds,
        preserveManualEdits
      );

      for (let i = 0; i < removalDecisions.length; i++) {
        const decision = removalDecisions[i];
        const childNode = existingChildNodes[i];
        if (decision.shouldRemove) {
          childNode.remove();
          if (decision.stableId) {
            existingChildrenById.delete(decision.stableId);
          }
          removedLayers++;
        } else if (decision.preservedReason) {
          preservedLayers++;
          conflicts.push(decision.preservedReason);
        }
      }
    }

    // Reconcile or create each incoming layer in deterministic layer order
    for (const layer of orderedLayers) {
      const existingNode = existingChildrenById.get(String(layer.id));

      if (!existingNode) {
        const created = await createOrUpdateLayerNode(
          figmaApi,
          frame,
          null,
          layer,
          contractAssets,
          pluginKey,
          warnings
        );
        if (created) createdLayers++;
        continue;
      }

      const baselineSnapshot = parseStoredSnapshot(existingNode);
      const currentFigmaProps = extractSnapshotFromFigmaNode(
        existingNode,
        pluginKey,
        baselineSnapshot
      );
      const incomingSpecProps = buildSnapshotFromSpecLayer(layer);

      const decision = evaluateLayerReconciliation(
        baselineSnapshot,
        currentFigmaProps,
        incomingSpecProps,
        preserveManualEdits
      );

      if (decision.action === 'NO_OP') {
        unchangedLayers++;
        // Ensure baseline snapshot is persisted if it wasn't already
        if (!baselineSnapshot) {
          storeLayerMetadata(existingNode, pluginKey, layer, incomingSpecProps);
        }
      } else if (decision.action === 'PRESERVE_MANUAL_EDIT') {
        preservedLayers++;
        conflicts.push(decision.explanation);
      } else if (
        decision.action === 'UPDATE_IN_PLACE' ||
        decision.action === 'FORCE_OVERWRITE'
      ) {
        if (decision.action === 'FORCE_OVERWRITE') {
          conflicts.push(decision.explanation);
        }
        await createOrUpdateLayerNode(
          figmaApi,
          frame,
          existingNode,
          layer,
          contractAssets,
          pluginKey,
          warnings
        );
        updatedLayers++;
      }
    }
  }

  if (figmaApi.viewport && typeof figmaApi.viewport.scrollAndZoomIntoView === 'function') {
    figmaApi.viewport.scrollAndZoomIntoView(targetPage.children);
  }

  return {
    draftPageName,
    preserveManualEdits,
    createdFrames,
    updatedFrames,
    createdLayers,
    updatedLayers,
    preservedLayers,
    removedLayers,
    unchangedLayers,
    conflicts,
    warnings,
  };
}

// Initialize Figma Plugin runtime listener when running inside the Figma sandbox
if (typeof figma !== 'undefined' && typeof figma.showUI === 'function') {
  figma.showUI(__html__, { width: 540, height: 680, themeColors: true });

  figma.ui.onmessage = async (msg: any) => {
    if (msg.type === 'CANCEL') {
      figma.closePlugin();
      return;
    }

    if (msg.type === 'IMPORT_CONTRACT') {
      try {
        const summary = await runFigmaContractImport(figma, msg.payload, {
          preserveManualEdits:
            msg.preserveManualEdits !== undefined ? Boolean(msg.preserveManualEdits) : true,
        });
        figma.ui.postMessage({
          type: 'IMPORT_COMPLETE',
          summary,
        });
      } catch (err) {
        figma.ui.postMessage({
          type: 'IMPORT_ERROR',
          message: err instanceof Error ? err.message : 'Unknown Figma import error.',
        });
      }
    }
  };
}
