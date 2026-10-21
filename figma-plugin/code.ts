// LEGACYA SPHERE Creative Studio — Native Figma Importer (code.ts)
// Compiles 1.0.0 FigmaExportContract JSON into editable native Frame, Text, Shape, and Vector nodes.
// Preserves stable layer IDs via pluginData("legacya_stable_id") for non-destructive re-imports.

declare const figma: any;
declare const __html__: string;

figma.showUI(__html__, { width: 520, height: 640, themeColors: true });

function hexToRgb(hex: string) {
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

figma.ui.onmessage = async (msg: any) => {
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
    const draftPageName =
      (contract.reimportStrategy?.draftPagePrefix || '[Draft] LEGACYA SPHERE — ') +
      contract.projectName;

    let targetPage = figma.root.children.find(
      (p: any) =>
        p.getPluginData('legacya_project_id') === contract.projectId || p.name === draftPageName
    );
    if (!targetPage) {
      targetPage = figma.createPage();
      targetPage.name = draftPageName;
      targetPage.setPluginData('legacya_project_id', contract.projectId);
    }
    await figma.setCurrentPageAsync(targetPage);

    const existingFramesById = new Map<string, any>();
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

      const orderedLayers = [...(slide.layers || [])].sort(
        (a: any, b: any) => a.layerOrder - b.layerOrder
      );

      for (const layer of orderedLayers) {
        createdLayers++;
        if (layer.type === 'TEXT') {
          const textNode = figma.createText();
          textNode.name = layer.name;
          textNode.setPluginData(pluginKey, layer.id);
          const desiredFont = {
            family: layer.fontFamily || 'Inter',
            style: mapFontWeightToStyle(layer.fontWeight || 400),
          };
          try {
            await figma.loadFontAsync(desiredFont);
            textNode.fontName = desiredFont;
          } catch {
            warnings.push(
              `Font "${desiredFont.family} ${desiredFont.style}" unavailable in Figma; substituted Inter Regular on layer "${layer.name}".`
            );
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
            warnings.push(
              `Image slot "${layer.name}" (${layer.assetId}) created as an editable frame container.`
            );
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
