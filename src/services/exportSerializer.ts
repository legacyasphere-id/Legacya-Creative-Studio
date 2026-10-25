import { FigmaExportContract, StudioProject } from '../types/studio';
import { compileSlideSpecification } from './layoutEngine';

/**
 * Serializes a StudioProject into the versioned 1.0.0 FigmaExportContract JSON structure.
 */
export function buildFigmaExportContract(project: StudioProject): FigmaExportContract {
  const totalSlides = project.storyboard.length;
  const horizontalFrameSpacing = project.brandTokens.layout.canvasWidth + 160;

  const slides = project.storyboard.map((slide, index) => {
    const spec = compileSlideSpecification(
      slide,
      totalSlides,
      project.brandTokens,
      project.assets
    );

    return {
      slideId: slide.id,
      slideNumber: slide.slideNumber,
      category: slide.category,
      approved: slide.approved,
      frameNode: {
        id: spec.frameNodeId,
        type: 'FRAME' as const,
        name: `Slide ${String(slide.slideNumber).padStart(2, '0')} — ${slide.category}`,
        x: index * horizontalFrameSpacing,
        y: 0,
        width: spec.width,
        height: spec.height,
        fill: spec.backgroundColor,
      },
      layers: spec.elements,
    };
  });

  return {
    schemaVersion: '1.0.0',
    coordinateSystem: {
      origin: 'TOP_LEFT',
      units: 'LOGICAL_PIXELS',
      scaleFactor: 1,
    },
    reimportStrategy: {
      mode: 'UPDATE_OR_CREATE_BY_STABLE_ID',
      pluginDataKey: 'legacya_stable_id',
      createDraftPageByDefault: true,
      draftPagePrefix: '[Draft] LEGACYA SPHERE — ',
    },
    exportedAt: new Date().toISOString(),
    projectId: project.id,
    projectName: project.brief.projectName,
    projectStatus: project.status,
    designTokensSnapshot: structuredClone(project.brandTokens),
    assetManifest: project.assets.map((asset) => ({
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      aspectRatio: asset.aspectRatio,
      status: asset.status,
      provenance: asset.provenance,
      imageReference: asset.previewDataUrl,
    })),
    slides,
    importInstructions: [
      '1. Open your target Figma file and run the "LEGACYA SPHERE Carousel Importer" plugin from Plugins > Development.',
      '2. Load or paste this validated 1.0.0 JSON contract into the plugin importer panel.',
      '3. Review the pre-import validation summary (slide count, frame dimensions, font availability, and re-import mode).',
      '4. Confirm import. By default, the plugin creates or updates a dedicated draft page named "[Draft] LEGACYA SPHERE — <Project Name>" and matches existing frames/layers via pluginData("legacya_stable_id") without duplicating layers.',
    ],
  };
}
