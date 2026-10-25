import {
  FigmaExportContract,
  SlideSpecification,
  StudioProject,
  ValidationIssue,
  ValidationReport,
} from '../types/studio';
import { compileSlideSpecification, computeContrastRatio } from './layoutEngine';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function isValidHexColor(val: unknown): val is string {
  return typeof val === 'string' && HEX_COLOR_REGEX.test(val.trim());
}

/**
 * Validates type-specific properties of a single layer node (used in both project spec and JSON contract validation).
 */
export function validateLayerNodeProperties(
  layer: Record<string, any>,
  slideId: string,
  frameWidth: number,
  frameHeight: number,
  seenLayerIds: Set<string>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  registeredAssetIds?: Set<string>,
  slideBgColor?: string
): number {
  let checkedCount = 1;
  const allowedTypes = new Set([
    'TEXT',
    'RECTANGLE',
    'ELLIPSE',
    'LINE',
    'VECTOR',
    'IMAGE',
    'GROUP',
  ]);

  const layerId = typeof layer.id === 'string' ? layer.id.trim() : '';
  if (!layerId) {
    errors.push({
      id: `err_missing_layer_id_${slideId}_${ errors.length + 1}`,
      severity: 'error',
      code: 'MISSING_LAYER_ID',
      slideId,
      message: `Layer on slide "${slideId}" is missing a non-empty string "id".`,
      remediation: 'Assign a deterministic string ID to every layer.',
    });
  } else if (seenLayerIds.has(layerId)) {
    errors.push({
      id: `err_dup_layer_${layerId}`,
      severity: 'error',
      code: 'DUPLICATE_LAYER_ID',
      slideId,
      layerId,
      message: `Layer ID "${layerId}" is duplicated across the carousel export.`,
      remediation: 'Prefix layer IDs with the slide ID so re-imports never collide.',
    });
  } else {
    seenLayerIds.add(layerId);
  }

  if (typeof layer.name !== 'string' || layer.name.trim().length === 0) {
    errors.push({
      id: `err_missing_layer_name_${layerId || slideId}`,
      severity: 'error',
      code: 'MISSING_LAYER_NAME',
      slideId,
      layerId: layerId || undefined,
      message: `Layer "${layerId || 'unnamed'}" on slide "${slideId}" is missing a valid "name".`,
      remediation: 'Provide a descriptive human-readable layer name for the Figma layer tree.',
    });
  }

  if (!allowedTypes.has(layer.type)) {
    errors.push({
      id: `err_unsupported_type_${layerId || slideId}`,
      severity: 'error',
      code: 'UNSUPPORTED_FIGMA_NODE_TYPE',
      slideId,
      layerId: layerId || undefined,
      message: `Layer "${layerId}" has unsupported node type "${String(layer.type)}".`,
      remediation: 'Use only TEXT, RECTANGLE, ELLIPSE, LINE, VECTOR, IMAGE, or GROUP.',
    });
    return checkedCount;
  }

  if (
    !isFiniteNumber(layer.x) ||
    !isFiniteNumber(layer.y) ||
    !isFiniteNumber(layer.width) ||
    !isFiniteNumber(layer.height) ||
    layer.width <= 0 ||
    (layer.type === 'LINE' ? layer.height < 0 : layer.height <= 0)
  ) {
    errors.push({
      id: `err_invalid_geometry_${layerId}`,
      severity: 'error',
      code: 'INVALID_LAYER_GEOMETRY',
      slideId,
      layerId: layerId || undefined,
      message: `Layer "${layerId}" has missing or non-positive geometry (x=${String(layer.x)}, y=${String(layer.y)}, width=${String(layer.width)}, height=${String(layer.height)}).`,
      remediation: 'Specify finite numeric x, y, width (>0), and height coordinates.',
    });
  } else if (
    layer.x < 0 ||
    layer.y < 0 ||
    layer.x + layer.width > frameWidth ||
    layer.y + layer.height > frameHeight
  ) {
    errors.push({
      id: `err_contract_bounds_${layerId}`,
      severity: 'error',
      code: 'LAYER_OUT_OF_BOUNDS',
      slideId,
      layerId: layerId || undefined,
      message: `Layer "${layerId}" (${layer.x},${layer.y} ${layer.width}×${layer.height}) exceeds frame bounds (${frameWidth}×${frameHeight}).`,
      remediation: 'Clamp or reposition layer inside the slide frame.',
    });
  }

  if (layer.opacity !== undefined && (!isFiniteNumber(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) {
    errors.push({
      id: `err_invalid_opacity_${layerId}`,
      severity: 'error',
      code: 'INVALID_LAYER_OPACITY',
      slideId,
      layerId: layerId || undefined,
      message: `Layer "${layerId}" has invalid opacity "${String(layer.opacity)}" (must be between 0 and 1).`,
      remediation: 'Set layer opacity to a number between 0.0 and 1.0.',
    });
  }

  // Type-specific property validation
  switch (layer.type) {
    case 'TEXT': {
      const missingTextProps: string[] = [];
      if (typeof layer.textContent !== 'string') missingTextProps.push('textContent');
      if (typeof layer.fontFamily !== 'string' || layer.fontFamily.trim().length === 0) {
        missingTextProps.push('fontFamily');
      }
      if (!isFiniteNumber(layer.fontSize)) missingTextProps.push('fontSize');
      if (!isFiniteNumber(layer.fontWeight) || layer.fontWeight < 100 || layer.fontWeight > 900) {
        missingTextProps.push('fontWeight');
      }
      if (!isFiniteNumber(layer.lineHeight) || layer.lineHeight <= 0) {
        missingTextProps.push('lineHeight');
      }
      if (!isFiniteNumber(layer.letterSpacing)) {
        missingTextProps.push('letterSpacing');
      }
      if (!['LEFT', 'CENTER', 'RIGHT'].includes(layer.textAlign)) {
        missingTextProps.push('textAlign');
      }
      if (!isValidHexColor(layer.textColor)) {
        missingTextProps.push('textColor');
      }

      if (missingTextProps.length > 0) {
        errors.push({
          id: `err_text_props_${layerId}`,
          severity: 'error',
          code: 'INVALID_TEXT_NODE_PROPERTIES',
          slideId,
          layerId: layerId || undefined,
          message: `TEXT layer "${layerId}" has missing or malformed properties: ${missingTextProps.join(', ')}.`,
          remediation:
            'Provide valid string textContent, fontFamily, numeric fontSize/fontWeight/lineHeight/letterSpacing, textAlign (LEFT|CENTER|RIGHT), and 6-digit hex textColor.',
        });
      } else {
        if (layer.fontSize < 14) {
          errors.push({
            id: `err_small_font_${layerId}`,
            severity: 'error',
            code: 'UNREADABLE_FONT_SIZE',
            slideId,
            layerId: layerId || undefined,
            message: `Text layer "${layer.name}" (${layerId}) uses ${layer.fontSize}px font (minimum 14px required for mobile legibility).`,
            remediation: 'Increase token font size instead of shrinking text to fit.',
          });
        }
        if (slideBgColor && isValidHexColor(slideBgColor)) {
          const textContrast = computeContrastRatio(slideBgColor, layer.textColor);
          if (textContrast < 3.0) {
            warnings.push({
              id: `warn_text_contrast_${layerId}`,
              severity: 'warning',
              code: 'LOW_LAYER_CONTRAST',
              slideId,
              layerId: layerId || undefined,
              message: `Text layer "${layer.name}" has ${textContrast}:1 contrast against slide background.`,
              remediation: 'Ensure secondary text maintains at least 4.5:1 contrast for body copy.',
            });
          }
        }
      }
      break;
    }

    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'LINE': {
      const hasValidFill = layer.fill !== null && layer.fill !== undefined && isValidHexColor(layer.fill);
      const hasValidStroke =
        layer.stroke !== null && layer.stroke !== undefined && isValidHexColor(layer.stroke);
      const invalidFillFormat =
        layer.fill !== null && layer.fill !== undefined && !isValidHexColor(layer.fill);
      const invalidStrokeFormat =
        layer.stroke !== null && layer.stroke !== undefined && !isValidHexColor(layer.stroke);
      const invalidStrokeWidth =
        hasValidStroke &&
        layer.strokeWidth !== undefined &&
        (!isFiniteNumber(layer.strokeWidth) || layer.strokeWidth <= 0);
      const invalidCornerRadius =
        layer.type === 'RECTANGLE' &&
        layer.cornerRadius !== undefined &&
        (!isFiniteNumber(layer.cornerRadius) || layer.cornerRadius < 0);

      if (
        (!hasValidFill && !hasValidStroke) ||
        invalidFillFormat ||
        invalidStrokeFormat ||
        invalidStrokeWidth ||
        invalidCornerRadius
      ) {
        errors.push({
          id: `err_shape_props_${layerId}`,
          severity: 'error',
          code: 'INVALID_SHAPE_NODE_PROPERTIES',
          slideId,
          layerId: layerId || undefined,
          message: `${layer.type} layer "${layerId}" requires a valid 6-digit hex fill or stroke and valid numeric strokeWidth/cornerRadius.`,
          remediation:
            'Specify a valid #RRGGBB fill or stroke color and positive numeric strokeWidth.',
        });
      }
      break;
    }

    case 'VECTOR': {
      const hasPath =
        typeof layer.vectorSvgPath === 'string' &&
        layer.vectorSvgPath.trim().length > 0 &&
        (/(?:[MLHVCSQTAZmlhvcsqtaz]\s*\d|<svg)/i.test(layer.vectorSvgPath));
      const hasColor =
        (layer.fill !== null && layer.fill !== undefined && isValidHexColor(layer.fill)) ||
        (layer.stroke !== null && layer.stroke !== undefined && isValidHexColor(layer.stroke));

      if (!hasPath || !hasColor) {
        errors.push({
          id: `err_vector_props_${layerId}`,
          severity: 'error',
          code: 'INVALID_VECTOR_NODE_PROPERTIES',
          slideId,
          layerId: layerId || undefined,
          message: `VECTOR layer "${layerId}" requires a non-empty SVG path ("vectorSvgPath") and a valid hex fill or stroke.`,
          remediation:
            'Provide a valid SVG path string (e.g., "M 0 100 L 100 0") and hex stroke/fill on every VECTOR node.',
        });
      }
      break;
    }

    case 'IMAGE': {
      const missingImgProps: string[] = [];
      if (typeof layer.assetId !== 'string' || layer.assetId.trim().length === 0) {
        missingImgProps.push('assetId');
      }
      if (typeof layer.imageReference !== 'string' || layer.imageReference.trim().length === 0) {
        missingImgProps.push('imageReference');
      }
      if (!['FILL', 'FIT'].includes(layer.fitMode)) {
        missingImgProps.push('fitMode');
      }
      if (typeof layer.altText !== 'string') {
        missingImgProps.push('altText');
      }

      if (missingImgProps.length > 0) {
        errors.push({
          id: `err_image_props_${layerId}`,
          severity: 'error',
          code: 'INVALID_IMAGE_NODE_PROPERTIES',
          slideId,
          layerId: layerId || undefined,
          message: `IMAGE layer "${layerId}" has missing or invalid properties: ${missingImgProps.join(', ')}.`,
          remediation:
            'Include non-empty assetId, imageReference, fitMode ("FILL" or "FIT"), and altText on every IMAGE node.',
        });
      } else if (registeredAssetIds && !registeredAssetIds.has(layer.assetId)) {
        warnings.push({
          id: `warn_missing_asset_${layerId}`,
          severity: 'warning',
          code: 'UNRESOLVED_ASSET_REFERENCE',
          slideId,
          layerId: layerId || undefined,
          message: `Image layer "${layer.name}" references asset ID "${layer.assetId}" which is not registered in the Asset Library.`,
          remediation: 'Register the asset in the Asset Library or select an existing studio asset.',
        });
      }
      break;
    }

    case 'GROUP': {
      const hasChildrenNodes = Array.isArray(layer.children) && layer.children.length > 0;
      const hasChildrenIds =
        Array.isArray(layer.childrenIds) &&
        layer.childrenIds.length > 0 &&
        layer.childrenIds.every((id: unknown) => typeof id === 'string' && id.trim().length > 0);
      if (!hasChildrenNodes && !hasChildrenIds) {
        errors.push({
          id: `err_group_props_${layerId}`,
          severity: 'error',
          code: 'INVALID_GROUP_NODE_PROPERTIES',
          slideId,
          layerId: layerId || undefined,
          message: `GROUP layer "${layerId}" must contain a non-empty "children" node array or "childrenIds" string array.`,
          remediation: 'Add at least one valid child node or child ID inside the GROUP.',
        });
      } else if (hasChildrenNodes) {
        for (const child of layer.children) {
          checkedCount += validateLayerNodeProperties(
            child,
            slideId,
            frameWidth,
            frameHeight,
            seenLayerIds,
            errors,
            warnings,
            registeredAssetIds,
            slideBgColor
          );
        }
      }
      break;
    }
  }

  return checkedCount;
}

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
  const registeredAssetIds = new Set<string>((project.assets || []).map((a) => a.id));
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
      totalLayersChecked += validateLayerNodeProperties(
        el as Record<string, any>,
        spec.slideId,
        spec.width,
        spec.height,
        seenLayerIds,
        errors,
        warnings,
        registeredAssetIds,
        spec.backgroundColor
      );
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
 * Enforces root metadata, coordinate system, frame bounds, and strict type-specific properties
 * for TEXT, RECTANGLE, ELLIPSE, LINE, VECTOR, IMAGE, and GROUP nodes.
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

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
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

  if (!parsed.projectId || typeof parsed.projectId !== 'string' || parsed.projectId.trim().length === 0) {
    errors.push({
      id: 'err_contract_project_id',
      severity: 'error',
      code: 'MISSING_PROJECT_ID',
      message: 'Contract is missing a valid string "projectId".',
      remediation: 'Include the stable projectId at the root of the JSON export.',
    });
  }

  if (
    !parsed.coordinateSystem ||
    parsed.coordinateSystem.origin !== 'TOP_LEFT' ||
    parsed.coordinateSystem.units !== 'LOGICAL_PIXELS'
  ) {
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
  const registeredAssetIds = Array.isArray(parsed.assetManifest)
    ? new Set<string>(
        parsed.assetManifest.map((a) => String(a?.assetId || '')).filter(Boolean)
      )
    : undefined;

  if (Array.isArray(parsed.slides)) {
    for (const slide of parsed.slides) {
      const slideId = typeof slide?.slideId === 'string' ? slide.slideId.trim() : '';
      if (!slideId) {
        errors.push({
          id: `err_slide_missing_id_${slide?.slideNumber || 'unknown'}`,
          severity: 'error',
          code: 'MISSING_SLIDE_ID',
          message: 'A slide entry is missing its stable "slideId".',
          remediation: 'Ensure every slide item contains a non-empty string slideId.',
        });
      } else if (slideIds.has(slideId)) {
        errors.push({
          id: `err_dup_slide_contract_${slideId}`,
          severity: 'error',
          code: 'DUPLICATE_SLIDE_ID',
          slideId,
          message: `Duplicate slideId "${slideId}" in export payload.`,
          remediation: 'Assign distinct IDs to every slide.',
        });
      } else {
        slideIds.add(slideId);
      }

      const fn = slide?.frameNode;
      if (
        !fn ||
        fn.type !== 'FRAME' ||
        typeof fn.id !== 'string' ||
        !fn.id.trim() ||
        !isFiniteNumber(fn.width) ||
        !isFiniteNumber(fn.height) ||
        fn.width < 320 ||
        fn.height < 320
      ) {
        errors.push({
          id: `err_frame_node_${slideId || 'unknown'}`,
          severity: 'error',
          code: 'INVALID_FRAME_NODE',
          slideId: slideId || undefined,
          message: `Slide "${slideId}" is missing a valid root frameNode of type "FRAME" with dimensions >= 320×320.`,
          remediation: 'Wrap each slide in a native FRAME descriptor with explicit id, width, and height.',
        });
      }

      if (!Array.isArray(slide?.layers)) {
        errors.push({
          id: `err_missing_layers_${slideId || 'unknown'}`,
          severity: 'error',
          code: 'MISSING_SLIDE_LAYERS',
          slideId: slideId || undefined,
          message: `Slide "${slideId}" is missing a valid "layers" array.`,
          remediation: 'Provide an array of native Figma layer specifications for each slide.',
        });
      } else {
        const frameW = fn && isFiniteNumber(fn.width) ? fn.width : 1080;
        const frameH = fn && isFiniteNumber(fn.height) ? fn.height : 1440;
        const frameBg = fn && isValidHexColor(fn.fill) ? fn.fill : undefined;
        for (const layer of slide.layers) {
          totalLayers += validateLayerNodeProperties(
            layer as Record<string, any>,
            slideId || 'unknown_slide',
            frameW,
            frameH,
            layerIds,
            errors,
            warnings,
            registeredAssetIds,
            frameBg
          );
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
