(() => {
  // figma-plugin/reconcile.ts
  var COMPARED_FIELDS = [
    "name",
    "x",
    "y",
    "width",
    "height",
    "opacity",
    "textContent",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textColor",
    "fill",
    "stroke",
    "strokeWidth",
    "cornerRadius",
    "vectorSvgPath",
    "assetId",
    "imageReference",
    "fitMode"
  ];
  function normalizeValue(val) {
    if (val === void 0 || val === null) return "";
    if (typeof val === "number") return Number(val.toFixed(3)).toString();
    return String(val).trim();
  }
  function rgbToHex(r, g, b) {
    const toByte = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0").toUpperCase();
    return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
  }
  function styleToFontWeight(style) {
    if (!style) return 400;
    const s = style.toLowerCase();
    if (s.includes("bold") && s.includes("semi")) return 600;
    if (s.includes("bold")) return 700;
    if (s.includes("medium")) return 500;
    return 400;
  }
  function buildSnapshotFromSpecLayer(layer) {
    const lType = String(layer.type || "");
    return {
      id: String(layer.id || ""),
      type: lType,
      name: String(layer.name || ""),
      x: Number(layer.x || 0),
      y: Number(layer.y || 0),
      width: Number(layer.width || 0),
      height: lType === "LINE" ? Number(layer.height ?? 1) : Number(layer.height || 0),
      opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
      textContent: lType === "TEXT" ? String(layer.textContent ?? "") : void 0,
      fontFamily: lType === "TEXT" ? String(layer.fontFamily || "Inter") : void 0,
      fontSize: lType === "TEXT" ? Number(layer.fontSize || 24) : void 0,
      fontWeight: lType === "TEXT" ? Number(layer.fontWeight || 400) : void 0,
      lineHeight: lType === "TEXT" ? Number(layer.lineHeight || 1.2) : void 0,
      letterSpacing: lType === "TEXT" ? Number(layer.letterSpacing || 0) : void 0,
      textAlign: lType === "TEXT" ? String(layer.textAlign || "LEFT").toUpperCase() : void 0,
      textColor: lType === "TEXT" ? String(layer.textColor || "#121212").toUpperCase() : void 0,
      fill: lType === "RECTANGLE" || lType === "ELLIPSE" || lType === "VECTOR" || lType === "LINE" ? layer.fill ? String(layer.fill).toUpperCase() : null : void 0,
      stroke: lType === "RECTANGLE" || lType === "ELLIPSE" || lType === "VECTOR" || lType === "LINE" ? layer.stroke ? String(layer.stroke).toUpperCase() : null : void 0,
      strokeWidth: lType === "RECTANGLE" || lType === "ELLIPSE" || lType === "VECTOR" || lType === "LINE" ? typeof layer.strokeWidth === "number" ? layer.strokeWidth : void 0 : void 0,
      cornerRadius: lType === "RECTANGLE" && typeof layer.cornerRadius === "number" ? layer.cornerRadius : void 0,
      vectorSvgPath: lType === "VECTOR" && layer.vectorSvgPath ? String(layer.vectorSvgPath) : void 0,
      assetId: lType === "IMAGE" && layer.assetId ? String(layer.assetId) : void 0,
      imageReference: lType === "IMAGE" && layer.imageReference ? String(layer.imageReference) : void 0,
      fitMode: lType === "IMAGE" && layer.fitMode ? String(layer.fitMode) : void 0
    };
  }
  function extractSnapshotFromFigmaNode(node, pluginKey = "legacya_stable_id", baseline) {
    const stableId = typeof node.getPluginData === "function" ? node.getPluginData(pluginKey) : node.id || "";
    const logicalType = typeof node.getPluginData === "function" && node.getPluginData("legacya_layer_type") || baseline?.type || node.type || "RECTANGLE";
    const firstSolidFill = Array.isArray(node.fills) ? node.fills.find((f) => f && f.type === "SOLID" && f.color) : null;
    const fillHex = firstSolidFill ? rgbToHex(firstSolidFill.color.r, firstSolidFill.color.g, firstSolidFill.color.b) : null;
    const firstSolidStroke = Array.isArray(node.strokes) ? node.strokes.find((s) => s && s.type === "SOLID" && s.color) : null;
    const strokeHex = firstSolidStroke ? rgbToHex(firstSolidStroke.color.r, firstSolidStroke.color.g, firstSolidStroke.color.b) : null;
    const isText = logicalType === "TEXT" || node.type === "TEXT";
    const isShape = logicalType === "RECTANGLE" || logicalType === "ELLIPSE" || logicalType === "LINE" || logicalType === "VECTOR";
    const isImage = logicalType === "IMAGE";
    let effectiveHeight = Number(node.height ?? baseline?.height ?? 0);
    if (logicalType === "LINE" && effectiveHeight === 0 && baseline?.height) {
      effectiveHeight = baseline.height;
    }
    if (isText && baseline && String(node.characters ?? "") === String(baseline.textContent ?? "") && Number(node.width ?? 0) === baseline.width && Number(node.fontSize ?? baseline.fontSize) === baseline.fontSize) {
      effectiveHeight = baseline.height;
    }
    let lineHeightMultiplier = baseline?.lineHeight ?? 1.2;
    if (isText && node.lineHeight && typeof node.lineHeight === "object") {
      if (node.lineHeight.unit === "PERCENT" && typeof node.lineHeight.value === "number") {
        lineHeightMultiplier = Number((node.lineHeight.value / 100).toFixed(2));
      } else if (node.lineHeight.unit === "PIXELS" && typeof node.lineHeight.value === "number" && node.fontSize) {
        lineHeightMultiplier = Number((node.lineHeight.value / node.fontSize).toFixed(2));
      }
    }
    let letterSpacingEm = baseline?.letterSpacing ?? 0;
    if (isText && node.letterSpacing && typeof node.letterSpacing === "object") {
      if (node.letterSpacing.unit === "PERCENT" && typeof node.letterSpacing.value === "number") {
        letterSpacingEm = Number((node.letterSpacing.value / 100).toFixed(3));
      }
    }
    let fontFamily = baseline?.fontFamily || "Inter";
    let fontWeight = baseline?.fontWeight || 400;
    if (isText && node.fontName && typeof node.fontName === "object") {
      const substitutedFont = typeof node.getPluginData === "function" ? node.getPluginData("legacya_substituted_font") : "";
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
      name: String(node.name || ""),
      x: Number(node.x ?? 0),
      y: Number(node.y ?? 0),
      width: Number(node.width ?? 0),
      height: effectiveHeight,
      opacity: typeof node.opacity === "number" ? node.opacity : 1,
      textContent: isText ? String(node.characters ?? "") : void 0,
      fontFamily: isText ? fontFamily : void 0,
      fontSize: isText ? Number(node.fontSize ?? baseline?.fontSize ?? 24) : void 0,
      fontWeight: isText ? fontWeight : void 0,
      lineHeight: isText ? lineHeightMultiplier : void 0,
      letterSpacing: isText ? letterSpacingEm : void 0,
      textAlign: isText ? String(node.textAlignHorizontal || baseline?.textAlign || "LEFT").toUpperCase() : void 0,
      textColor: isText ? fillHex || baseline?.textColor || "#121212" : void 0,
      fill: isShape ? logicalType === "VECTOR" ? baseline?.fill ?? fillHex : fillHex : void 0,
      stroke: isShape ? logicalType === "VECTOR" ? baseline?.stroke ?? strokeHex : strokeHex : void 0,
      strokeWidth: isShape ? typeof node.strokeWeight === "number" ? node.strokeWeight : baseline?.strokeWidth : void 0,
      cornerRadius: logicalType === "RECTANGLE" && typeof node.cornerRadius === "number" ? node.cornerRadius : void 0,
      vectorSvgPath: logicalType === "VECTOR" ? typeof node.getPluginData === "function" && node.getPluginData("legacya_vector_path") || baseline?.vectorSvgPath : void 0,
      assetId: isImage ? typeof node.getPluginData === "function" && node.getPluginData("legacya_asset_id") || baseline?.assetId : void 0,
      imageReference: isImage ? typeof node.getPluginData === "function" && node.getPluginData("legacya_image_ref") || baseline?.imageReference : void 0,
      fitMode: isImage ? typeof node.getPluginData === "function" && node.getPluginData("legacya_fit_mode") || baseline?.fitMode : void 0
    };
  }
  function diffLayerSnapshots(a, b) {
    const diffs = [];
    for (const key of COMPARED_FIELDS) {
      if (a[key] === void 0 && b[key] === void 0) continue;
      if (normalizeValue(a[key]) !== normalizeValue(b[key])) {
        diffs.push(key);
      }
    }
    return diffs;
  }
  function evaluateLayerReconciliation(baselineSnapshot, currentFigmaProps, incomingSpecProps, preserveManualEdits = true) {
    const currentVsIncoming = diffLayerSnapshots(currentFigmaProps, incomingSpecProps);
    if (currentVsIncoming.length === 0) {
      return {
        layerId: incomingSpecProps.id,
        layerName: incomingSpecProps.name,
        action: "NO_OP",
        manualDiffFields: [],
        incomingDiffFields: [],
        conflictingFields: [],
        explanation: `Layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) already matches the incoming specification.`
      };
    }
    if (!baselineSnapshot) {
      if (preserveManualEdits && currentVsIncoming.length > 0) {
        return {
          layerId: incomingSpecProps.id,
          layerName: incomingSpecProps.name,
          action: "PRESERVE_MANUAL_EDIT",
          manualDiffFields: currentVsIncoming,
          incomingDiffFields: currentVsIncoming,
          conflictingFields: currentVsIncoming,
          explanation: `Layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) has existing Figma properties (${currentVsIncoming.join(", ")}) without a baseline snapshot; preserved existing node to avoid overwriting manual work.`
        };
      }
      return {
        layerId: incomingSpecProps.id,
        layerName: incomingSpecProps.name,
        action: "UPDATE_IN_PLACE",
        manualDiffFields: [],
        incomingDiffFields: currentVsIncoming,
        conflictingFields: [],
        explanation: `Updated layer "${incomingSpecProps.name}" (${incomingSpecProps.id}) in place.`
      };
    }
    const manualDiffFields = diffLayerSnapshots(baselineSnapshot, currentFigmaProps);
    const incomingDiffFields = diffLayerSnapshots(baselineSnapshot, incomingSpecProps);
    if (manualDiffFields.length === 0) {
      return {
        layerId: incomingSpecProps.id,
        layerName: incomingSpecProps.name,
        action: "UPDATE_IN_PLACE",
        manualDiffFields: [],
        incomingDiffFields,
        conflictingFields: [],
        explanation: `Updated "${incomingSpecProps.name}" (${incomingSpecProps.id}) in place (${incomingDiffFields.join(", ") || "synced"}).`
      };
    }
    const conflictingFields = Array.from(/* @__PURE__ */ new Set([...manualDiffFields, ...incomingDiffFields]));
    if (preserveManualEdits) {
      return {
        layerId: incomingSpecProps.id,
        layerName: incomingSpecProps.name,
        action: "PRESERVE_MANUAL_EDIT",
        manualDiffFields,
        incomingDiffFields,
        conflictingFields,
        explanation: `Conflict on "${incomingSpecProps.name}" (${incomingSpecProps.id}): manual Figma edits detected on [${manualDiffFields.join(", ")}]${incomingDiffFields.length > 0 ? ` while incoming contract modified [${incomingDiffFields.join(", ")}]` : ""}. Preserved manual Figma layer.`
      };
    }
    return {
      layerId: incomingSpecProps.id,
      layerName: incomingSpecProps.name,
      action: "FORCE_OVERWRITE",
      manualDiffFields,
      incomingDiffFields,
      conflictingFields,
      explanation: `Force-overwrote manual Figma edits on "${incomingSpecProps.name}" (${incomingSpecProps.id}) for fields [${manualDiffFields.join(", ")}].`
    };
  }
  function evaluateChildRemovals(candidates, incomingLayerIds, preserveManualEdits = true) {
    return candidates.map((c) => {
      if (!c.isPluginManaged || !c.stableId) {
        return {
          nodeId: c.nodeId,
          stableId: c.stableId || "",
          shouldRemove: false,
          preservedReason: `Preserved unmanaged Figma layer "${c.nodeName}".`
        };
      }
      if (incomingLayerIds.has(c.stableId)) {
        return {
          nodeId: c.nodeId,
          stableId: c.stableId,
          shouldRemove: false
        };
      }
      if (preserveManualEdits && c.baselineSnapshot) {
        const manualDiffs = diffLayerSnapshots(c.baselineSnapshot, c.currentFigmaProps);
        if (manualDiffs.length > 0) {
          return {
            nodeId: c.nodeId,
            stableId: c.stableId,
            shouldRemove: false,
            preservedReason: `Preserved removed layer "${c.nodeName}" (${c.stableId}) because it has manual Figma edits on [${manualDiffs.join(", ")}].`
          };
        }
      }
      return {
        nodeId: c.nodeId,
        stableId: c.stableId,
        shouldRemove: true
      };
    });
  }

  // figma-plugin/code.ts
  var SNAPSHOT_PLUGIN_KEY = "legacya_layer_snapshot";
  var MANAGED_PLUGIN_KEY = "legacya_managed";
  var LAYER_TYPE_PLUGIN_KEY = "legacya_layer_type";
  function hexToRgb(hex) {
    const clean = String(hex || "#121212").trim().replace(/^#/, "");
    const valid = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : "121212";
    const num = parseInt(valid, 16);
    return {
      r: (num >> 16 & 255) / 255,
      g: (num >> 8 & 255) / 255,
      b: (num & 255) / 255
    };
  }
  function mapFontWeightToStyle(weight) {
    if (weight >= 700) return "Bold";
    if (weight >= 600) return "SemiBold";
    if (weight >= 500) return "Medium";
    return "Regular";
  }
  var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function decodeBase64ToBytes(base64Input) {
    const clean = base64Input.replace(/[\r\n\s]/g, "").replace(/=+$/, "");
    const byteLength = Math.floor(clean.length * 3 / 4);
    const bytes = new Uint8Array(byteLength);
    let p = 0;
    for (let i = 0; i < clean.length; i += 4) {
      const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
      const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
      const enc3 = i + 2 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 2)) : 0;
      const enc4 = i + 3 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 3)) : 0;
      const chr1 = enc1 << 2 | enc2 >> 4;
      const chr2 = (enc2 & 15) << 4 | enc3 >> 2;
      const chr3 = (enc3 & 3) << 6 | enc4;
      if (p < byteLength) bytes[p++] = chr1;
      if (p < byteLength && i + 2 < clean.length) bytes[p++] = chr2;
      if (p < byteLength && i + 3 < clean.length) bytes[p++] = chr3;
    }
    return bytes;
  }
  function decodeSvgDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    if (dataUrl.startsWith("data:image/svg+xml;utf8,")) {
      const raw = dataUrl.slice("data:image/svg+xml;utf8,".length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
    if (dataUrl.startsWith("data:image/svg+xml;base64,")) {
      const b64 = dataUrl.slice("data:image/svg+xml;base64,".length);
      const bytes = decodeBase64ToBytes(b64);
      let str = "";
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }
    if (dataUrl.trim().startsWith("<svg")) {
      return dataUrl.trim();
    }
    return null;
  }
  function decodeRasterDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const match = dataUrl.match(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,(.+)$/i);
    if (!match) return null;
    return decodeBase64ToBytes(match[1]);
  }
  function buildSvgMarkupFromVectorLayer(layer) {
    const w = Math.max(1, Number(layer.width || 100));
    const h = Math.max(1, Number(layer.height || 100));
    const rawPath = String(layer.vectorSvgPath || `M 0 ${h} L ${w} 0`).trim();
    if (rawPath.startsWith("<svg")) {
      return rawPath;
    }
    const strokeAttr = layer.stroke ? `stroke="${layer.stroke}"` : 'stroke="none"';
    const strokeWidthAttr = `stroke-width="${layer.strokeWidth || 1.5}"`;
    const fillAttr = layer.fill ? `fill="${layer.fill}"` : 'fill="none"';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${rawPath}" ${strokeAttr} ${strokeWidthAttr} ${fillAttr} /></svg>`;
  }
  function parseStoredSnapshot(node) {
    if (!node || typeof node.getPluginData !== "function") return null;
    const raw = node.getPluginData(SNAPSHOT_PLUGIN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function storeLayerMetadata(node, pluginKey, layer, snapshot) {
    if (!node || typeof node.setPluginData !== "function") return;
    node.setPluginData(pluginKey, String(layer.id));
    node.setPluginData(MANAGED_PLUGIN_KEY, "true");
    node.setPluginData(LAYER_TYPE_PLUGIN_KEY, String(layer.type));
    if (layer.type === "VECTOR" && layer.vectorSvgPath) {
      node.setPluginData("legacya_vector_path", String(layer.vectorSvgPath));
    }
    if (layer.type === "IMAGE") {
      if (layer.assetId) node.setPluginData("legacya_asset_id", String(layer.assetId));
      if (layer.imageReference) node.setPluginData("legacya_image_ref", String(layer.imageReference));
      if (layer.fitMode) node.setPluginData("legacya_fit_mode", String(layer.fitMode));
    }
    node.setPluginData(SNAPSHOT_PLUGIN_KEY, JSON.stringify(snapshot));
  }
  async function createOrUpdateLayerNode(figmaApi, frame, existingNode, layer, contractAssets, pluginKey, warnings) {
    const snapshot = buildSnapshotFromSpecLayer(layer);
    const opacity = typeof layer.opacity === "number" ? layer.opacity : 1;
    if (layer.type === "TEXT") {
      const textNode = existingNode && existingNode.type === "TEXT" ? existingNode : figmaApi.createText();
      if (existingNode && existingNode !== textNode) {
        existingNode.remove();
      }
      const desiredFont = {
        family: layer.fontFamily || "Inter",
        style: mapFontWeightToStyle(layer.fontWeight || 400)
      };
      try {
        await figmaApi.loadFontAsync(desiredFont);
        textNode.fontName = desiredFont;
        if (typeof textNode.setPluginData === "function") {
          textNode.setPluginData("legacya_substituted_font", "");
        }
      } catch {
        warnings.push(
          `Font "${desiredFont.family} ${desiredFont.style}" unavailable in Figma; substituted Inter Regular on layer "${layer.name}".`
        );
        await figmaApi.loadFontAsync({ family: "Inter", style: "Regular" });
        textNode.fontName = { family: "Inter", style: "Regular" };
        if (typeof textNode.setPluginData === "function") {
          textNode.setPluginData("legacya_substituted_font", "Inter");
        }
      }
      textNode.name = layer.name;
      textNode.characters = String(layer.textContent ?? "");
      textNode.fontSize = Number(layer.fontSize || 24);
      textNode.textAlignHorizontal = layer.textAlign === "CENTER" || layer.textAlign === "RIGHT" || layer.textAlign === "JUSTIFIED" ? layer.textAlign : "LEFT";
      textNode.lineHeight = {
        value: Math.round(Number(layer.lineHeight || 1.2) * 100),
        unit: "PERCENT"
      };
      textNode.letterSpacing = {
        value: Number((Number(layer.letterSpacing || 0) * 100).toFixed(2)),
        unit: "PERCENT"
      };
      textNode.x = Number(layer.x || 0);
      textNode.y = Number(layer.y || 0);
      textNode.resize(Number(layer.width || 100), Math.max(24, Number(layer.height || 28)));
      textNode.textAutoResize = "HEIGHT";
      textNode.opacity = opacity;
      textNode.fills = [{ type: "SOLID", color: hexToRgb(layer.textColor || "#121212") }];
      storeLayerMetadata(textNode, pluginKey, layer, snapshot);
      if (!existingNode || existingNode !== textNode) {
        frame.appendChild(textNode);
      }
      return textNode;
    }
    if (layer.type === "RECTANGLE") {
      const rect = existingNode && existingNode.type === "RECTANGLE" ? existingNode : figmaApi.createRectangle();
      if (existingNode && existingNode !== rect) {
        existingNode.remove();
      }
      rect.name = layer.name;
      rect.x = Number(layer.x || 0);
      rect.y = Number(layer.y || 0);
      rect.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
      rect.opacity = opacity;
      rect.fills = layer.fill ? [{ type: "SOLID", color: hexToRgb(layer.fill) }] : [];
      if (layer.stroke) {
        rect.strokes = [{ type: "SOLID", color: hexToRgb(layer.stroke) }];
        rect.strokeWeight = Number(layer.strokeWidth || 1);
      } else {
        rect.strokes = [];
      }
      if (typeof layer.cornerRadius === "number") {
        rect.cornerRadius = layer.cornerRadius;
      }
      storeLayerMetadata(rect, pluginKey, layer, snapshot);
      if (!existingNode || existingNode !== rect) {
        frame.appendChild(rect);
      }
      return rect;
    }
    if (layer.type === "ELLIPSE") {
      const ellipse = existingNode && existingNode.type === "ELLIPSE" ? existingNode : figmaApi.createEllipse();
      if (existingNode && existingNode !== ellipse) {
        existingNode.remove();
      }
      ellipse.name = layer.name;
      ellipse.x = Number(layer.x || 0);
      ellipse.y = Number(layer.y || 0);
      ellipse.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
      ellipse.opacity = opacity;
      ellipse.fills = layer.fill ? [{ type: "SOLID", color: hexToRgb(layer.fill) }] : [];
      if (layer.stroke) {
        ellipse.strokes = [{ type: "SOLID", color: hexToRgb(layer.stroke) }];
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
    if (layer.type === "LINE") {
      const line = existingNode && existingNode.type === "LINE" ? existingNode : figmaApi.createLine();
      if (existingNode && existingNode !== line) {
        existingNode.remove();
      }
      line.name = layer.name;
      line.x = Number(layer.x || 0);
      line.y = Number(layer.y || 0);
      line.resize(Math.max(1, Number(layer.width || 1)), 0);
      line.opacity = opacity;
      if (layer.stroke || layer.fill) {
        line.strokes = [{ type: "SOLID", color: hexToRgb(layer.stroke || layer.fill) }];
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
    if (layer.type === "VECTOR") {
      const svgMarkup = buildSvgMarkupFromVectorLayer(layer);
      let vectorNode = null;
      if (typeof figmaApi.createNodeFromSvg === "function") {
        try {
          vectorNode = figmaApi.createNodeFromSvg(svgMarkup);
        } catch (err) {
          warnings.push(
            `SVG vector parse failed on "${layer.name}" (${layer.id}); fell back to native line (${err instanceof Error ? err.message : "SVG error"}).`
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
        if (typeof vectorNode.resize === "function") {
          vectorNode.resize(
            Math.max(1, Number(layer.width || 1)),
            Math.max(1, Number(layer.height || 1))
          );
        }
        vectorNode.opacity = opacity;
        vectorNode.fills = layer.fill ? [{ type: "SOLID", color: hexToRgb(layer.fill) }] : [];
        storeLayerMetadata(vectorNode, pluginKey, layer, snapshot);
        frame.appendChild(vectorNode);
        return vectorNode;
      }
      const fallbackLine = existingNode && existingNode.type === "LINE" ? existingNode : figmaApi.createLine();
      if (existingNode && existingNode !== fallbackLine) {
        existingNode.remove();
      }
      fallbackLine.name = layer.name;
      fallbackLine.x = Number(layer.x || 0);
      fallbackLine.y = Number(layer.y || 0);
      fallbackLine.resize(Math.max(1, Number(layer.width || 1)), 0);
      fallbackLine.opacity = opacity;
      if (layer.stroke) {
        fallbackLine.strokes = [{ type: "SOLID", color: hexToRgb(layer.stroke) }];
        fallbackLine.strokeWeight = Number(layer.strokeWidth || 1.5);
      }
      storeLayerMetadata(fallbackLine, pluginKey, layer, snapshot);
      if (!existingNode || existingNode !== fallbackLine) {
        frame.appendChild(fallbackLine);
      }
      return fallbackLine;
    }
    if (layer.type === "IMAGE") {
      const matchedAsset = Array.isArray(contractAssets) ? contractAssets.find(
        (a) => a && (a.assetId === layer.assetId || a.id === layer.assetId)
      ) : null;
      const sourceUrl = String(
        layer.imageReference || matchedAsset?.imageReference || matchedAsset?.previewDataUrl || ""
      ).trim();
      const scaleMode = layer.fitMode === "FIT" ? "FIT" : "FILL";
      const svgContent = decodeSvgDataUrl(sourceUrl);
      if (svgContent && typeof figmaApi.createNodeFromSvg === "function") {
        try {
          const svgFrame = figmaApi.createNodeFromSvg(svgContent);
          if (existingNode) {
            existingNode.remove();
          }
          svgFrame.name = layer.name;
          svgFrame.x = Number(layer.x || 0);
          svgFrame.y = Number(layer.y || 0);
          if (typeof svgFrame.resize === "function") {
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
            `SVG asset import failed for "${layer.name}" (${layer.assetId}): ${err instanceof Error ? err.message : "SVG parse error"}.`
          );
        }
      }
      const rasterBytes = decodeRasterDataUrl(sourceUrl);
      const rect = existingNode && existingNode.type === "RECTANGLE" ? existingNode : figmaApi.createRectangle();
      if (existingNode && existingNode !== rect) {
        existingNode.remove();
      }
      rect.name = layer.name;
      rect.x = Number(layer.x || 0);
      rect.y = Number(layer.y || 0);
      rect.resize(Math.max(1, Number(layer.width || 1)), Math.max(1, Number(layer.height || 1)));
      rect.opacity = opacity;
      if (rasterBytes && typeof figmaApi.createImage === "function") {
        try {
          const imageObj = figmaApi.createImage(rasterBytes);
          rect.fills = [
            {
              type: "IMAGE",
              imageHash: imageObj.hash,
              scaleMode
            }
          ];
        } catch (err) {
          rect.fills = [{ type: "SOLID", color: hexToRgb("#E5DFD3") }];
          warnings.push(
            `Raster image decode failed on "${layer.name}" (${layer.assetId}): ${err instanceof Error ? err.message : "createImage error"}.`
          );
        }
      } else if (/^https?:\/\//i.test(sourceUrl) && typeof figmaApi.createImageAsync === "function") {
        try {
          const imageObj = await figmaApi.createImageAsync(sourceUrl);
          rect.fills = [
            {
              type: "IMAGE",
              imageHash: imageObj.hash,
              scaleMode
            }
          ];
        } catch (err) {
          rect.fills = [{ type: "SOLID", color: hexToRgb("#E5DFD3") }];
          warnings.push(
            `Remote image fetch failed on "${layer.name}" (${sourceUrl}): ${err instanceof Error ? err.message : "network error"}.`
          );
        }
      } else {
        rect.fills = [{ type: "SOLID", color: hexToRgb("#E5DFD3") }];
        warnings.push(
          `Image layer "${layer.name}" (${layer.assetId}) has no transferable raster/SVG payload ("${sourceUrl || "empty"}"); created editable placeholder container.`
        );
      }
      storeLayerMetadata(rect, pluginKey, layer, snapshot);
      if (!existingNode || existingNode !== rect) {
        frame.appendChild(rect);
      }
      return rect;
    }
    if (layer.type === "GROUP") {
      const groupFrame = existingNode && existingNode.type === "FRAME" ? existingNode : figmaApi.createFrame();
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
  async function runFigmaContractImport(figmaApi, contract, options = {}) {
    const preserveManualEdits = options.preserveManualEdits !== void 0 ? Boolean(options.preserveManualEdits) : true;
    if (!contract || contract.schemaVersion !== "1.0.0") {
      throw new Error('Unsupported schemaVersion. Expected "1.0.0".');
    }
    if (!Array.isArray(contract.slides) || contract.slides.length === 0) {
      throw new Error("Contract contains zero slides.");
    }
    const warnings = [];
    const conflicts = [];
    let createdFrames = 0;
    let updatedFrames = 0;
    let createdLayers = 0;
    let updatedLayers = 0;
    let preservedLayers = 0;
    let removedLayers = 0;
    let unchangedLayers = 0;
    const pluginKey = contract.reimportStrategy?.pluginDataKey || "legacya_stable_id";
    const draftPageName = (contract.reimportStrategy?.draftPagePrefix || "[Draft] LEGACYA SPHERE \u2014 ") + contract.projectName;
    let targetPage = figmaApi.root.children.find(
      (p) => typeof p.getPluginData === "function" && p.getPluginData("legacya_project_id") === contract.projectId || p.name === draftPageName
    );
    if (!targetPage) {
      targetPage = figmaApi.createPage();
      targetPage.name = draftPageName;
      if (typeof targetPage.setPluginData === "function") {
        targetPage.setPluginData("legacya_project_id", contract.projectId);
      }
    }
    if (typeof figmaApi.setCurrentPageAsync === "function") {
      await figmaApi.setCurrentPageAsync(targetPage);
    } else {
      figmaApi.currentPage = targetPage;
    }
    const existingFramesById = /* @__PURE__ */ new Map();
    for (const child of targetPage.children || []) {
      if (child.type === "FRAME" && typeof child.getPluginData === "function") {
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
        if (typeof frame.setPluginData === "function") {
          frame.setPluginData(pluginKey, fSpec.id);
          frame.setPluginData(MANAGED_PLUGIN_KEY, "true");
        }
        targetPage.appendChild(frame);
        createdFrames++;
      }
      frame.name = fSpec.name;
      frame.x = Number(fSpec.x || 0);
      frame.y = Number(fSpec.y || 0);
      frame.resize(Number(fSpec.width || 1080), Number(fSpec.height || 1440));
      frame.fills = [{ type: "SOLID", color: hexToRgb(fSpec.fill || "#F7F4EE") }];
      const orderedLayers = [...slide.layers || []].sort(
        (a, b) => Number(a.layerOrder || 0) - Number(b.layerOrder || 0)
      );
      const incomingLayerIds = new Set(orderedLayers.map((l) => String(l.id)));
      const existingChildrenById = /* @__PURE__ */ new Map();
      const existingChildNodes = [...frame.children || []];
      if (isReimportFrame && existingChildNodes.length > 0) {
        const removalCandidates = existingChildNodes.map((child) => {
          const stableId = typeof child.getPluginData === "function" ? child.getPluginData(pluginKey) : "";
          const isManaged = Boolean(stableId) || typeof child.getPluginData === "function" && child.getPluginData(MANAGED_PLUGIN_KEY) === "true";
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
            nodeName: String(child.name || "Unnamed Layer"),
            stableId: String(stableId || ""),
            isPluginManaged: isManaged,
            baselineSnapshot,
            currentFigmaProps
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
        if (decision.action === "NO_OP") {
          unchangedLayers++;
          if (!baselineSnapshot) {
            storeLayerMetadata(existingNode, pluginKey, layer, incomingSpecProps);
          }
        } else if (decision.action === "PRESERVE_MANUAL_EDIT") {
          preservedLayers++;
          conflicts.push(decision.explanation);
        } else if (decision.action === "UPDATE_IN_PLACE" || decision.action === "FORCE_OVERWRITE") {
          if (decision.action === "FORCE_OVERWRITE") {
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
    if (figmaApi.viewport && typeof figmaApi.viewport.scrollAndZoomIntoView === "function") {
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
      warnings
    };
  }
  if (typeof figma !== "undefined" && typeof figma.showUI === "function") {
    figma.showUI(__html__, { width: 540, height: 680, themeColors: true });
    figma.ui.onmessage = async (msg) => {
      if (msg.type === "CANCEL") {
        figma.closePlugin();
        return;
      }
      if (msg.type === "IMPORT_CONTRACT") {
        try {
          const summary = await runFigmaContractImport(figma, msg.payload, {
            preserveManualEdits: msg.preserveManualEdits !== void 0 ? Boolean(msg.preserveManualEdits) : true
          });
          figma.ui.postMessage({
            type: "IMPORT_COMPLETE",
            summary
          });
        } catch (err) {
          figma.ui.postMessage({
            type: "IMPORT_ERROR",
            message: err instanceof Error ? err.message : "Unknown Figma import error."
          });
        }
      }
    };
  }
})();
