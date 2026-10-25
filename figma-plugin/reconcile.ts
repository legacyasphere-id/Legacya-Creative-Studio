export interface ImportedLayerSnapshot {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  textContent?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  textColor?: string;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  cornerRadius?: number;
  vectorSvgPath?: string;
  assetId?: string;
  imageReference?: string;
  fitMode?: string;
}

export type ReconciliationAction =
  | 'NO_OP'
  | 'UPDATE_IN_PLACE'
  | 'PRESERVE_MANUAL_EDIT'
  | 'FORCE_OVERWRITE';

export interface LayerReconciliationDecision {
  layerId: string;
  layerName: string;
  action: ReconciliationAction;
  manualDiffFields: string[];
  incomingDiffFields: string[];
  conflictingFields: string[];
  explanation: string;
}

const COMPARED_FIELDS: Array<keyof ImportedLayerSnapshot> = [
  'name',
  'x',
  'y',
  'width',
  'height',
  'opacity',
  'textContent',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textColor',
  'fill',
  'stroke',
  'strokeWidth',
  'cornerRadius',
  'vectorSvgPath',
  'assetId',
  'imageReference',
  'fitMode',
];

function normalizeValue(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number') return Number(val.toFixed(3)).toString();
  return String(val).trim();
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toByte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * 255)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function styleToFontWeight(style?: string): number {
  if (!style) return 400;
  const s = style.toLowerCase();
  if (s.includes('bold') && s.includes('semi')) return 600;
  if (s.includes('bold')) return 700;
  if (s.includes('medium')) return 500;
  return 400;
}

export function buildSnapshotFromSpecLayer(layer: Record<string, any>): ImportedLayerSnapshot {
  const lType = String(layer.type || '');
  return {
    id: String(layer.id || ''),
    type: lType,
    name: String(layer.name || ''),
    x: Number(layer.x || 0),
    y: Number(layer.y || 0),
    width: Number(layer.width || 0),
    height: lType === 'LINE' ? Number(layer.height ?? 1) : Number(layer.height || 0),
    opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
    textContent: lType === 'TEXT' ? String(layer.textContent ?? '') : undefined,
    fontFamily: lType === 'TEXT' ? String(layer.fontFamily || 'Inter') : undefined,
    fontSize: lType === 'TEXT' ? Number(layer.fontSize || 24) : undefined,
    fontWeight: lType === 'TEXT' ? Number(layer.fontWeight || 400) : undefined,
    lineHeight: lType === 'TEXT' ? Number(layer.lineHeight || 1.2) : undefined,
    letterSpacing: lType === 'TEXT' ? Number(layer.letterSpacing || 0) : undefined,
    textAlign: lType === 'TEXT' ? String(layer.textAlign || 'LEFT').toUpperCase() : undefined,
    textColor:
      lType === 'TEXT' ? String(layer.textColor || '#121212').toUpperCase() : undefined,
    fill:
      lType === 'RECTANGLE' || lType === 'ELLIPSE' || lType === 'VECTOR' || lType === 'LINE'
        ? layer.fill
          ? String(layer.fill).toUpperCase()
          : null
        : undefined,
    stroke:
      lType === 'RECTANGLE' || lType === 'ELLIPSE' || lType === 'VECTOR' || lType === 'LINE'
        ? layer.stroke
          ? String(layer.stroke).toUpperCase()
          : null
        : undefined,
    strokeWidth:
      lType === 'RECTANGLE' || lType === 'ELLIPSE' || lType === 'VECTOR' || lType === 'LINE'
        ? typeof layer.strokeWidth === 'number'
          ? layer.strokeWidth
          : undefined
        : undefined,
    cornerRadius:
      lType === 'RECTANGLE' && typeof layer.cornerRadius === 'number'
        ? layer.cornerRadius
        : undefined,
    vectorSvgPath:
      lType === 'VECTOR' && layer.vectorSvgPath ? String(layer.vectorSvgPath) : undefined,
    assetId: lType === 'IMAGE' && layer.assetId ? String(layer.assetId) : undefined,
    imageReference:
      lType === 'IMAGE' && layer.imageReference ? String(layer.imageReference) : undefined,
    fitMode: lType === 'IMAGE' && layer.fitMode ? String(layer.fitMode) : undefined,
  };
}

/**
 * Extracts a normalized ImportedLayerSnapshot from a live Figma node.
 * Uses stored baseline metadata for logical properties that Figma transforms (such as LINE height or SVG source),
 * unless the designer altered the node's visual geometry, fills, strokes, or text in Figma.
 */
export function extractSnapshotFromFigmaNode(
  node: any,
  pluginKey = 'legacya_stable_id',
  baseline?: ImportedLayerSnapshot | null
): ImportedLayerSnapshot {
  const stableId =
    typeof node.getPluginData === 'function' ? node.getPluginData(pluginKey) : node.id || '';
  const logicalType =
    (typeof node.getPluginData === 'function' && node.getPluginData('legacya_layer_type')) ||
    baseline?.type ||
    node.type ||
    'RECTANGLE';

  const firstSolidFill = Array.isArray(node.fills)
    ? node.fills.find((f: any) => f && f.type === 'SOLID' && f.color)
    : null;
  const fillHex = firstSolidFill
    ? rgbToHex(firstSolidFill.color.r, firstSolidFill.color.g, firstSolidFill.color.b)
    : null;

  const firstSolidStroke = Array.isArray(node.strokes)
    ? node.strokes.find((s: any) => s && s.type === 'SOLID' && s.color)
    : null;
  const strokeHex = firstSolidStroke
    ? rgbToHex(firstSolidStroke.color.r, firstSolidStroke.color.g, firstSolidStroke.color.b)
    : null;

  const isText = logicalType === 'TEXT' || node.type === 'TEXT';
  const isShape =
    logicalType === 'RECTANGLE' ||
    logicalType === 'ELLIPSE' ||
    logicalType === 'LINE' ||
    logicalType === 'VECTOR';
  const isImage = logicalType === 'IMAGE';

  // For TEXT nodes with auto-resize HEIGHT, Figma recalculates node.height based on font metrics.
  // Preserve baseline height if characters, width, and fontSize haven't changed.
  let effectiveHeight = Number(node.height ?? baseline?.height ?? 0);
  if (logicalType === 'LINE' && effectiveHeight === 0 && baseline?.height) {
    effectiveHeight = baseline.height;
  }
  if (
    isText &&
    baseline &&
    String(node.characters ?? '') === String(baseline.textContent ?? '') &&
    Number(node.width ?? 0) === baseline.width &&
    Number(node.fontSize ?? baseline.fontSize) === baseline.fontSize
  ) {
    effectiveHeight = baseline.height;
  }

  let lineHeightMultiplier = baseline?.lineHeight ?? 1.2;
  if (isText && node.lineHeight && typeof node.lineHeight === 'object') {
    if (node.lineHeight.unit === 'PERCENT' && typeof node.lineHeight.value === 'number') {
      lineHeightMultiplier = Number((node.lineHeight.value / 100).toFixed(2));
    } else if (
      node.lineHeight.unit === 'PIXELS' &&
      typeof node.lineHeight.value === 'number' &&
      node.fontSize
    ) {
      lineHeightMultiplier = Number((node.lineHeight.value / node.fontSize).toFixed(2));
    }
  }

  let letterSpacingEm = baseline?.letterSpacing ?? 0;
  if (isText && node.letterSpacing && typeof node.letterSpacing === 'object') {
    if (node.letterSpacing.unit === 'PERCENT' && typeof node.letterSpacing.value === 'number') {
      letterSpacingEm = Number((node.letterSpacing.value / 100).toFixed(3));
    }
  }

  let fontFamily = baseline?.fontFamily || 'Inter';
  let fontWeight = baseline?.fontWeight || 400;
  if (isText && node.fontName && typeof node.fontName === 'object') {
    // If font was substituted during import because the custom font wasn't installed in Figma,
    // don't treat the fallback font family as a manual edit unless the user changed it to something else.
    const substitutedFont =
      typeof node.getPluginData === 'function'
        ? node.getPluginData('legacya_substituted_font')
        : '';
    if (substitutedFont && node.fontName.family === substitutedFont && baseline?.fontFamily) {
      fontFamily = baseline.fontFamily;
    } else {
      fontFamily = node.fontName.family || fontFamily;
    }
    fontWeight = styleToFontWeight(node.fontName.style);
  }

  return {
    id: stableId,
    type: logicalType,
    name: String(node.name || ''),
    x: Number(node.x ?? 0),
    y: Number(node.y ?? 0),
    width: Number(node.width ?? 0),
    height: effectiveHeight,
    opacity: typeof node.opacity === 'number' ? node.opacity : 1,
    textContent: isText ? String(node.characters ?? '') : undefined,
    fontFamily: isText ? fontFamily : undefined,
    fontSize: isText ? Number(node.fontSize ?? baseline?.fontSize ?? 24) : undefined,
    fontWeight: isText ? fontWeight : undefined,
    lineHeight: isText ? lineHeightMultiplier : undefined,
    letterSpacing: isText ? letterSpacingEm : undefined,
    textAlign: isText
      ? String(node.textAlignHorizontal || baseline?.textAlign || 'LEFT').toUpperCase()
      : undefined,
    textColor: isText ? fillHex || baseline?.textColor || '#121212' : undefined,
    fill: isShape ? (logicalType === 'VECTOR' ? baseline?.fill ?? fillHex : fillHex) : undefined,
    stroke: isShape
      ? logicalType === 'VECTOR'
        ? baseline?.stroke ?? strokeHex
        : strokeHex
      : undefined,
    strokeWidth: isShape
      ? typeof node.strokeWeight === 'number'
        ? node.strokeWeight
        : baseline?.strokeWidth
      : undefined,
    cornerRadius:
      logicalType === 'RECTANGLE' && typeof node.cornerRadius === 'number'
        ? node.cornerRadius
        : undefined,
    vectorSvgPath:
      logicalType === 'VECTOR'
        ? (typeof node.getPluginData === 'function' &&
            node.getPluginData('legacya_vector_path')) ||
          baseline?.vectorSvgPath
        : undefined,
    assetId:
      isImage
        ? (typeof node.getPluginData === 'function' && node.getPluginData('legacya_asset_id')) ||
          baseline?.assetId
        : undefined,
    imageReference:
      isImage
        ? (typeof node.getPluginData === 'function' && node.getPluginData('legacya_image_ref')) ||
          baseline?.imageReference
        : undefined,
    fitMode:
      isImage
        ? (typeof node.getPluginData === 'function' && node.getPluginData('legacya_fit_mode')) ||
          baseline?.fitMode
        : undefined,
  };
}

export function diffLayerSnapshots(
  a: ImportedLayerSnapshot,
  b: ImportedLayerSnapshot
): string[] {
  const diffs: string[] = [];
  for (const key of COMPARED_FIELDS) {
    if (a[key] === undefined && b[key] === undefined) continue;
    if (normalizeValue(a[key]) !== normalizeValue(b[key])) {
      diffs.push(key);
    }
  }
  return diffs;
}

/**
 * 3-Way Layer Reconciliation:
 * Compares live Figma node properties against the stored baseline snapshot from the last import,
 * and against the incoming contract specification.
 */
export function evaluateLayerReconciliation(
  baselineSnapshot: ImportedLayerSnapshot | null,
  currentFigmaProps: ImportedLayerSnapshot,
  incomingSpecProps: ImportedLayerSnapshot,
  preserveManualEdits = true
): LayerReconciliationDecision {
  const currentVsIncoming = diffLayerSnapshots(currentFigmaProps, incomingSpecProps);

  if (currentVsIncoming.length === 0) {
    return {
      layerId: incomingSpecProps.id,
      layerName: incomingSpecProps.name,
      action: 'NO_OP',
      manualDiffFields: [],
      incomingDiffFields: [],
      conflictingFields: [],
      explanation: `Layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) already matches the incoming specification.`,
    };
  }

  // If no baseline snapshot exists yet, check whether current Figma properties differ from incoming
  if (!baselineSnapshot) {
    if (preserveManualEdits && currentVsIncoming.length > 0) {
      return {
        layerId: incomingSpecProps.id,
        layerName: incomingSpecProps.name,
        action: 'PRESERVE_MANUAL_EDIT',
        manualDiffFields: currentVsIncoming,
        incomingDiffFields: currentVsIncoming,
        conflictingFields: currentVsIncoming,
        explanation: `Layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) has existing Figma properties (${currentVsIncoming.join(', ')}) without a baseline snapshot; preserved existing node to avoid overwriting manual work.`,
      };
    }
    return {
      layerId: incomingSpecProps.id,
      layerName: incomingSpecProps.name,
      action: 'UPDATE_IN_PLACE',
      manualDiffFields: [],
      incomingDiffFields: currentVsIncoming,
      conflictingFields: [],
      explanation: `Updated layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) in place.`,
    };
  }

  const manualDiffFields = diffLayerSnapshots(baselineSnapshot, currentFigmaProps);
  const incomingDiffFields = diffLayerSnapshots(baselineSnapshot, incomingSpecProps);

  // Case 1: Designer has NOT manually edited this layer in Figma since the last import
  if (manualDiffFields.length === 0) {
    return {
      layerId: incomingSpecProps.id,
      layerName: incomingSpecProps.name,
      action: 'UPDATE_IN_PLACE',
      manualDiffFields: [],
      incomingDiffFields,
      conflictingFields: [],
      explanation: `Updated "${incomingSpecProps.name}" (${incomingSpecProps.id}) in place (${incomingDiffFields.join(', ') || 'synced'}).`,
    };
  }

  // Case 2: Designer manually edited this layer in Figma
  const conflictingFields = Array.from(new Set([...manualDiffFields, ...incomingDiffFields]));

  if (preserveManualEdits) {
    return {
      layerId: incomingSpecProps.id,
      layerName: incomingSpecProps.name,
      action: 'PRESERVE_MANUAL_EDIT',
      manualDiffFields,
      incomingDiffFields,
      conflictingFields,
      explanation: `Conflict on "${incomingSpecProps.name}" (${incomingSpecProps.id}): manual Figma edits detected on [${manualDiffFields.join(', ')}]${
        incomingDiffFields.length > 0
          ? ` while incoming contract modified [${incomingDiffFields.join(', ')}]`
          : ''
      }. Preserved manual Figma layer.`,
    };
  }

  return {
    layerId: incomingSpecProps.id,
    layerName: incomingSpecProps.name,
    action: 'FORCE_OVERWRITE',
    manualDiffFields,
    incomingDiffFields,
    conflictingFields,
    explanation: `Force-overwrote manual Figma edits on "${incomingSpecProps.name}" (${incomingSpecProps.id}) for fields [${manualDiffFields.join(', ')}].`,
  };
}

export interface ChildRemovalCandidate {
  nodeId: string;
  nodeName: string;
  stableId: string;
  isPluginManaged: boolean;
  baselineSnapshot: ImportedLayerSnapshot | null;
  currentFigmaProps: ImportedLayerSnapshot;
}

export interface ChildRemovalDecision {
  nodeId: string;
  stableId: string;
  shouldRemove: boolean;
  preservedReason?: string;
}

/**
 * Determines which existing child nodes in a frame should be removed when re-importing.
 * - Unmanaged nodes (created manually by a designer in Figma) are NEVER removed.
 * - Managed nodes still present in incomingLayerIds are kept for in-place reconciliation.
 * - Managed nodes removed from incomingLayerIds are removed ONLY if they were not manually edited
 *   (or if preserveManualEdits is false).
 */
export function evaluateChildRemovals(
  candidates: ChildRemovalCandidate[],
  incomingLayerIds: Set<string>,
  preserveManualEdits = true
): ChildRemovalDecision[] {
  return candidates.map((c) => {
    if (!c.isPluginManaged || !c.stableId) {
      return {
        nodeId: c.nodeId,
        stableId: c.stableId || '',
        shouldRemove: false,
        preservedReason: `Preserved unmanaged Figma layer "${c.nodeName}".`,
      };
    }

    if (incomingLayerIds.has(c.stableId)) {
      return {
        nodeId: c.nodeId,
        stableId: c.stableId,
        shouldRemove: false,
      };
    }

    if (preserveManualEdits && c.baselineSnapshot) {
      const manualDiffs = diffLayerSnapshots(c.baselineSnapshot, c.currentFigmaProps);
      if (manualDiffs.length > 0) {
        return {
          nodeId: c.nodeId,
          stableId: c.stableId,
          shouldRemove: false,
          preservedReason: `Preserved removed layer "${c.nodeName}" (${c.stableId}) because it has manual Figma edits on [${manualDiffs.join(', ')}].`,
        };
      }
    }

    return {
      nodeId: c.nodeId,
      stableId: c.stableId,
      shouldRemove: true,
    };
  });
}
