import {
  FigmaExportContract,
  SlideSpecification,
  StudioProject,
  ValidationIssue,
  ValidationReport,
} from '../types/studio';
import { compileSlideSpecification, computeContrastRatio } from './layoutEngine';

/**
 * Validates all compiled SlideSpecifications and project tokens before export.
 */
export function validateProjectSpecifications(
  project: StudioProject,
  specs?: SlideSpecification[]
): ValidationReport {
  const compiled =
    specs ||
    project.storyboard.map((slide) =>
      compileSlideSpecification(slide, project.storyboard.length, project.brandTokens, project.assets)
    );

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seenSlideIds = new Set<string>();
  const seenLayerIds = new Set<string>();
  let totalLayersChecked = 0;

  if (!project.id || project.id.trim().length === 0) {
    errors.push({
      id: 'err_project_id',
      severity: 'error',
      code: 'MISSING_PROJECT_ID',
      message: 'Project is missing a stable Project ID.',
      remediation: 'Assign a unique, persistent project identifier before exporting.',
    });
  }

  if (compiled.length === 0) {
    errors.push({
      id: 'err_empty_slides',
      severity: 'error',
      code: 'EMPTY_CAROUSEL',
      message: 'Carousel contains zero slides.',
      remediation: 'Add at least one slide to the storyboard before generating an export.',
    });
  }

  for (const spec of compiled) {
    if (seenSlideIds.has(spec.slideId)) {
      errors.push({
        id: `err_dup_slide_${spec.slideId}`,
        severity: 'error',
        code: 'DUPLICATE_SLIDE_ID',
        slideId: spec.slideId,
        message: `Duplicate Slide ID "${spec.slideId}" detected on slide ${spec.slideNumber}.`,
        remediation: 'Ensure every slide has a unique, immutable slideId for safe Figma re-imports.',
      });
    }
    seenSlideIds.add(spec.slideId);

    if (spec.width < 320 || spec.height < 320) {
      errors.push({
        id: `err_dim_${spec.slideId}`,
        severity: 'error',
        code: 'INVALID_CANVAS_DIMENSIONS',
        slideId: spec.slideId,
        message: `Slide ${spec.slideNumber} has invalid canvas dimensions (${spec.width}×${spec.height}).`,
        remediation: 'Use standard logical export dimensions such as 1080×1440 (3:4 portrait).',
      });
    }

    if (spec.computedContrastRatio < 4.5) {
      errors.push({
        id: `err_contrast_${spec.slideId}`,
        severity: 'error',
        code: 'INSUFFICIENT_CONTRAST',
        slideId: spec.slideId,
        message: `Slide ${spec.slideNumber} primary contrast ratio is ${spec.computedContrastRatio}:1 (minimum WCAG AA 4.5:1 required).`,
        remediation: 'Adjust background treatment or primary text token in the Brand System.',
      });
    }

    if (spec.estimatedTextOverflow && spec.overflowRecommendation) {
      warnings.push({
        id: `warn_overflow_${spec.slideId}`,
        severity: 'warning',
        code: 'TEXT_COPY_DENSITY_RISK',
        slideId: spec.slideId,
        message: `Slide ${spec.slideNumber}: ${spec.overflowRecommendation}`,
        remediation: 'Shorten headline/supporting copy or select a layout pattern with a larger text register.',
      });
    }

    for (const el of spec.elements) {
      totalLayersChecked++;
      if (!el.id || el.id.trim().length === 0) {
        errors.push({
          id: `err_missing_layer_id_${spec.slideId}_${totalLayersChecked}`,
          severity: 'error',
          code: 'MISSING_LAYER_ID',
          slideId: spec.slideId,
          message: `Unnamed or ID-less layer on Slide ${spec.slideNumber}.`,
          remediation: 'Every exported Figma element requires a deterministic stable layer ID.',
        });
      } else if (seenLayerIds.has(el.id)) {
        errors.push({
          id: `err_dup_layer_${el.id}`,
          severity: 'error',
          code: 'DUPLICATE_LAYER_ID',
          slideId: spec.slideId,
          layerId: el.id,
          message: `Duplicate stable layer ID "${el.id}" found across slides.`,
          remediation: 'Prefix layer IDs with the slide ID so re-imports never collide.',
        });
      }
      seenLayerIds.add(el.id);

      // Bounds verification
      if (
        el.x < 0 ||
        el.y < 0 ||
        el.x + el.width > spec.width ||
        el.y + el.height > spec.height
      ) {
        errors.push({
          id: `err_bounds_${el.id}`,
          severity: 'error',
          code: 'OUT_OF_CANVAS_BOUNDS',
          slideId: spec.slideId,
          layerId: el.id,
          message: `Layer "${el.name}" (${el.id}) extends outside the ${spec.width}×${spec.height} canvas bounds.`,
          remediation: 'Recalculate layout geometry or increase canvas margins.',
        });
      }

      if (el.type === 'TEXT') {
        if (el.fontSize < 14) {
          errors.push({
            id: `err_small_font_${el.id}`,
            severity: 'error',
            code: 'UNREADABLE_FONT_SIZE',
            slideId: spec.slideId,
            layerId: el.id,
            message: `Text layer "${el.name}" uses ${el.fontSize}px font on a ${spec.width}px canvas (minimum 14px required for mobile legibility).`,
            remediation: 'Increase token font size instead of shrinking text to fit.',
          });
        }

        const textContrast = computeContrastRatio(spec.backgroundColor, el.textColor);
        if (textContrast < 3.0) {
          warnings.push({
            id: `warn_text_contrast_${el.id}`,
            severity: 'warning',
            code: 'LOW_LAYER_CONTRAST',
            slideId: spec.slideId,
            layerId: el.id,
            message: `Text layer "${el.name}" has ${textContrast}:1 contrast against slide background.`,
            remediation: 'Ensure secondary text maintains at least 4.5:1 contrast for body copy.',
          });
        }
      }

      if (el.type === 'IMAGE') {
        const assetExists = project.assets.some((a) => a.id === el.assetId);
        if (!assetExists) {
          warnings.push({
            id: `warn_missing_asset_${el.id}`,
            severity: 'warning',
            code: 'UNRESOLVED_ASSET_REFERENCE',
            slideId: spec.slideId,
            layerId: el.id,
            message: `Image layer "${el.name}" references asset ID "${el.assetId}" which is not registered in the Asset Library.`,
            remediation: 'Register the asset in the Asset Library or select an existing studio asset.',
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    checkedAt: new Date().toISOString(),
    schemaVersion: '1.0.0',
    totalSlidesChecked: compiled.length,
    totalLayersChecked,
    errors,
    warnings,
  };
}

/**
 * Validates a raw JSON string or object against the FigmaExportContract 1.0.0 schema.
 * Used both prior to export download and in the interactive JSON Contract Validator.
 */
export function validateExportContractJson(rawInput: string | unknown): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let parsed: Partial<FigmaExportContract> | null = null;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        valid: false,
        checkedAt: new Date().toISOString(),
        schemaVersion: 'unknown',
        totalSlidesChecked: 0,
        totalLayersChecked: 0,
        errors: [
          {
            id: 'err_json_syntax',
            severity: 'error',
            code: 'INVALID_JSON_SYNTAX',
            message: `Malformed JSON syntax: ${err instanceof Error ? err.message : 'Unable to parse JSON string'}.`,
            remediation: 'Provide valid, well-formed JSON matching the LEGACYA SPHERE 1.0.0 export contract.',
          },
        ],
        warnings: [],
      };
    }
  } else if (rawInput && typeof rawInput === 'object') {
    parsed = rawInput as Partial<FigmaExportContract>;
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      checkedAt: new Date().toISOString(),
      schemaVersion: 'unknown',
      totalSlidesChecked: 0,
      totalLayersChecked: 0,
      errors: [
        {
          id: 'err_not_object',
          severity: 'error',
          code: 'ROOT_MUST_BE_OBJECT',
          message: 'Export root must be a JSON object.',
          remediation: 'Export the full FigmaExportContract object.',
        },
      ],
      warnings: [],
    };
  }

  if (parsed.schemaVersion !== '1.0.0') {
    errors.push({
      id: 'err_schema_version',
      severity: 'error',
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      message: `Expected schemaVersion "1.0.0", received "${String(parsed.schemaVersion)}".`,
      remediation: 'Use schemaVersion "1.0.0" compatible with the LEGACYA SPHERE Figma Plugin importer.',
    });
  }

  if (!parsed.projectId || typeof parsed.projectId !== 'string') {
    errors.push({
      id: 'err_contract_project_id',
      severity: 'error',
      code: 'MISSING_PROJECT_ID',
      message: 'Contract is missing a valid string "projectId".',
      remediation: 'Include the stable projectId at the root of the JSON export.',
    });
  }

  if (!parsed.coordinateSystem || parsed.coordinateSystem.origin !== 'TOP_LEFT') {
    errors.push({
      id: 'err_coord_system',
      severity: 'error',
      code: 'INVALID_COORDINATE_SYSTEM',
      message: 'Contract must specify coordinateSystem.origin = "TOP_LEFT" and units = "LOGICAL_PIXELS".',
      remediation: 'Include the documented coordinateSystem descriptor.',
    });
  }

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    errors.push({
      id: 'err_contract_slides',
      severity: 'error',
      code: 'MISSING_SLIDES_ARRAY',
      message: 'Contract "slides" property must be a non-empty array.',
      remediation: 'Include at least one slide definition in the export payload.',
    });
  }

  let totalLayers = 0;
  const slideIds = new Set<string>();
  const layerIds = new Set<string>();
  const allowedTypes = new Set(['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'LINE', 'VECTOR', 'IMAGE', 'GROUP']);

  if (Array.isArray(parsed.slides)) {
    for (const slide of parsed.slides) {
      if (!slide.slideId) {
        errors.push({
          id: `err_slide_missing_id_${slide.slideNumber || 'unknown'}`,
          severity: 'error',
          code: 'MISSING_SLIDE_ID',
          message: 'A slide entry is missing its stable "slideId".',
          remediation: 'Ensure every slide item contains a string slideId.',
        });
      } else if (slideIds.has(slide.slideId)) {
        errors.push({
          id: `err_dup_slide_contract_${slide.slideId}`,
          severity: 'error',
          code: 'DUPLICATE_SLIDE_ID',
          slideId: slide.slideId,
          message: `Duplicate slideId "${slide.slideId}" in export payload.`,
          remediation: 'Assign distinct IDs to every slide.',
        });
      } else {
        slideIds.add(slide.slideId);
      }

      if (!slide.frameNode || slide.frameNode.type !== 'FRAME') {
        errors.push({
          id: `err_frame_node_${slide.slideId}`,
          severity: 'error',
          code: 'INVALID_FRAME_NODE',
          slideId: slide.slideId,
          message: `Slide "${slide.slideId}" is missing a valid root frameNode of type "FRAME".`,
          remediation: 'Wrap each slide in a native FRAME descriptor with explicit width and height.',
        });
      }

      if (Array.isArray(slide.layers)) {
        for (const layer of slide.layers) {
          totalLayers++;
          if (!layer.id) {
            errors.push({
              id: `err_layer_no_id_${totalLayers}`,
              severity: 'error',
              code: 'MISSING_LAYER_ID',
              slideId: slide.slideId,
              message: `Layer #${totalLayers} on slide "${slide.slideId}" is missing a stable "id".`,
              remediation: 'Assign a deterministic string ID to every layer.',
            });
          } else if (layerIds.has(layer.id)) {
            errors.push({
              id: `err_contract_dup_layer_${layer.id}`,
              severity: 'error',
              code: 'DUPLICATE_LAYER_ID',
              slideId: slide.slideId,
              layerId: layer.id,
              message: `Layer ID "${layer.id}" is duplicated in the export file.`,
              remediation: 'Ensure all layer IDs are globally unique within the project export.',
            });
          } else {
            layerIds.add(layer.id);
          }

          if (!allowedTypes.has(layer.type)) {
            errors.push({
              id: `err_unsupported_type_${layer.id}`,
              severity: 'error',
              code: 'UNSUPPORTED_FIGMA_NODE_TYPE',
              slideId: slide.slideId,
              layerId: layer.id,
              message: `Layer "${layer.id}" has unsupported node type "${String(layer.type)}".`,
              remediation: 'Use only FRAME, TEXT, RECTANGLE, ELLIPSE, LINE, VECTOR, IMAGE, or GROUP.',
            });
          }

          if (
            slide.frameNode &&
            (layer.x < 0 ||
              layer.y < 0 ||
              layer.x + layer.width > slide.frameNode.width ||
              layer.y + layer.height > slide.frameNode.height)
          ) {
            errors.push({
              id: `err_contract_bounds_${layer.id}`,
              severity: 'error',
              code: 'LAYER_OUT_OF_BOUNDS',
              slideId: slide.slideId,
              layerId: layer.id,
              message: `Layer "${layer.id}" (${layer.x},${layer.y} ${layer.width}×${layer.height}) exceeds frame bounds (${slide.frameNode.width}×${slide.frameNode.height}).`,
              remediation: 'Clamp or reposition layer inside the slide frame.',
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    checkedAt: new Date().toISOString(),
    schemaVersion: String(parsed.schemaVersion || 'unknown'),
    totalSlidesChecked: Array.isArray(parsed.slides) ? parsed.slides.length : 0,
    totalLayersChecked: totalLayers,
    errors,
    warnings,
  };
}
