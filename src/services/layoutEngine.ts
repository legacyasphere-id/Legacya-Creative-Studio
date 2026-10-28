import type {
  BrandSystemTokens,
  FigmaImageNode,
  FigmaShapeNode,
  FigmaSlideElement,
  FigmaTextNode,
  SlideSpecification,
  StoryboardSlide,
  StudioAsset,
} from '../types/studio.ts';
import { LAYOUT_PATTERN_META, SLIDE_CATEGORY_META } from '../tokens/defaultTokens.ts';

/**
 * Computes WCAG 2.1 relative luminance and contrast ratio between two hex colors.
 */
export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function getRelativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function computeContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA);
  const l2 = getRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function resolveSlideColors(
  treatment: StoryboardSlide['backgroundTreatment'],
  tokens: BrandSystemTokens
) {
  switch (treatment) {
    case 'deep_navy':
      return {
        bg: tokens.colors.surfaceDark,
        textPrimary: tokens.colors.textOnDark,
        textSecondary: '#C7C2B8',
        border: '#2B3A55',
        accent: tokens.colors.textOnDark,
        surfaceBox: '#16243B',
      };
    case 'ink_black':
      return {
        bg: tokens.colors.textPrimary,
        textPrimary: tokens.colors.textOnDark,
        textSecondary: '#B5AFA4',
        border: '#2E2D2A',
        accent: tokens.colors.textOnDark,
        surfaceBox: '#1E1E1E',
      };
    case 'clean_white':
      return {
        bg: tokens.colors.backgroundSecondary,
        textPrimary: tokens.colors.textPrimary,
        textSecondary: tokens.colors.textSecondary,
        border: tokens.colors.border,
        accent: tokens.colors.accent,
        surfaceBox: tokens.colors.backgroundPrimary,
      };
    case 'warm_cream':
    default:
      return {
        bg: tokens.colors.backgroundPrimary,
        textPrimary: tokens.colors.textPrimary,
        textSecondary: tokens.colors.textSecondary,
        border: tokens.colors.border,
        accent: tokens.colors.accent,
        surfaceBox: tokens.colors.backgroundSecondary,
      };
  }
}

export function formatSlideNumber(
  slideNumber: number,
  totalSlides: number,
  format: BrandSystemTokens['components']['slideNumberFormat']
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (format === '01') return pad(slideNumber);
  if (format === 'SLIDE 01') return `SLIDE ${pad(slideNumber)}`;
  return `${pad(slideNumber)} / ${pad(totalSlides)}`;
}

/**
 * Estimates height required for a text block without ever shrinking font size silently.
 */
export function estimateTextHeight(
  text: string,
  width: number,
  fontSize: number,
  lineHeightMultiplier: number
): number {
  if (!text || text.trim().length === 0) return Math.ceil(fontSize * lineHeightMultiplier);
  const avgCharWidth = fontSize * 0.52;
  const charsPerLine = Math.max(8, Math.floor(width / avgCharWidth));
  const explicitLines = text.split('\n');
  let totalLines = 0;
  for (const line of explicitLines) {
    totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return Math.ceil(totalLines * fontSize * lineHeightMultiplier);
}

/**
 * Deterministic Layout Engine: translates a StoryboardSlide + BrandSystemTokens into
 * a validated SlideSpecification with native Figma node definitions and stable layer IDs.
 */
export function compileSlideSpecification(
  slide: StoryboardSlide,
  totalSlides: number,
  tokens: BrandSystemTokens,
  assets: StudioAsset[] = []
): SlideSpecification {
  const W = tokens.layout.canvasWidth;
  const H = tokens.layout.canvasHeight;
  const M = tokens.layout.outerMargin;
  const contentWidth = W - M * 2;
  const palette = resolveSlideColors(slide.backgroundTreatment, tokens);
  const patternMeta = LAYOUT_PATTERN_META[slide.layoutPattern] || LAYOUT_PATTERN_META.editorial_headline;
  const categoryMeta = SLIDE_CATEGORY_META[slide.category] || SLIDE_CATEGORY_META.educational_content;

  const elements: FigmaSlideElement[] = [];
  let layerIdx = 1;
  const nextOrder = () => layerIdx++;

  const prefix = `${slide.id}`;

  // 1. Header Chrome: Brand Wordmark + Category Kicker + Slide Index + Hairline Rule
  const headerY = tokens.layout.safeAreaTop;

  const brandLabelNode: FigmaTextNode = {
    id: `${prefix}_brand_mark`,
    name: 'Brand Wordmark',
    type: 'TEXT',
    x: M,
    y: headerY,
    width: Math.floor(contentWidth * 0.45),
    height: 28,
    layerOrder: nextOrder(),
    opacity: 1,
    textContent: tokens.components.brandLogoText,
    fontFamily: tokens.typography.label.fontFamily,
    fallbackFontFamily: tokens.typography.label.localFallbackFamily,
    fontSize: tokens.typography.label.fontSize,
    fontWeight: 600,
    lineHeight: tokens.typography.label.lineHeight,
    letterSpacing: tokens.typography.label.letterSpacing,
    textAlign: 'LEFT',
    textColor: palette.textPrimary,
    textStyleToken: 'label',
    overflowBehavior: 'TRUNCATE',
  };
  elements.push(brandLabelNode);

  const slideIndexNode: FigmaTextNode = {
    id: `${prefix}_slide_number`,
    name: 'Slide Number',
    type: 'TEXT',
    x: W - M - 200,
    y: headerY,
    width: 200,
    height: 28,
    layerOrder: nextOrder(),
    opacity: 1,
    textContent: formatSlideNumber(slide.slideNumber, totalSlides, tokens.components.slideNumberFormat),
    fontFamily: tokens.typography.label.fontFamily,
    fallbackFontFamily: tokens.typography.label.localFallbackFamily,
    fontSize: tokens.typography.label.fontSize,
    fontWeight: tokens.typography.label.fontWeight,
    lineHeight: tokens.typography.label.lineHeight,
    letterSpacing: tokens.typography.label.letterSpacing,
    textAlign: 'RIGHT',
    textColor: palette.textSecondary,
    textStyleToken: 'label',
    overflowBehavior: 'TRUNCATE',
  };
  elements.push(slideIndexNode);

  if (tokens.components.showHeaderRule) {
    const headerRule: FigmaShapeNode = {
      id: `${prefix}_header_rule`,
      name: 'Header Hairline Rule',
      type: 'LINE',
      shapeType: 'LINE',
      x: M,
      y: headerY + 44,
      width: contentWidth,
      height: 1,
      layerOrder: nextOrder(),
      opacity: 1,
      fill: null,
      stroke: palette.border,
      strokeWidth: 1,
    };
    elements.push(headerRule);
  }

  // Section / Category Label
  const sectionKickerY = headerY + 76;
  const sectionLabelNode: FigmaTextNode = {
    id: `${prefix}_section_label`,
    name: 'Section Kicker',
    type: 'TEXT',
    x: M,
    y: sectionKickerY,
    width: contentWidth,
    height: 26,
    layerOrder: nextOrder(),
    opacity: 1,
    textContent: (slide.microcopy || categoryMeta.label).toUpperCase(),
    fontFamily: tokens.typography.label.fontFamily,
    fallbackFontFamily: tokens.typography.label.localFallbackFamily,
    fontSize: tokens.typography.label.fontSize,
    fontWeight: 500,
    lineHeight: tokens.typography.label.lineHeight,
    letterSpacing: 0.08,
    textAlign: 'LEFT',
    textColor: palette.textSecondary,
    textStyleToken: 'label',
    overflowBehavior: 'TRUNCATE',
  };
  elements.push(sectionLabelNode);

  // 2. Pattern-Specific Geometry & Content Composition
  const safeBottomLimit = H - tokens.layout.safeAreaBottom - 84;
  let estimatedOverflow = false;
  let overflowRecommendation: string | undefined;

  const headlineFont =
    slide.layoutPattern === 'minimal_cover' || slide.layoutPattern === 'large_statistic'
      ? tokens.typography.display
      : tokens.typography.heading;
  const bodyFont = tokens.typography.body;

  // Check character budget without silently shrinking font sizes
  if (slide.primaryHeadline.length > patternMeta.maxHeadlineChars) {
    estimatedOverflow = true;
    overflowRecommendation = `Headline is ${slide.primaryHeadline.length} chars (recommended max ${patternMeta.maxHeadlineChars} for ${patternMeta.label}). Shorten headline by ${slide.primaryHeadline.length - patternMeta.maxHeadlineChars} chars or switch to Editorial Headline.`;
  } else if (slide.supportingCopy.length > patternMeta.maxBodyChars) {
    estimatedOverflow = true;
    overflowRecommendation = `Supporting copy is ${slide.supportingCopy.length} chars (recommended max ${patternMeta.maxBodyChars} for ${patternMeta.label}). Trim body copy to preserve generous mobile negative space.`;
  }

  // Decorative Geometry (restrained circles, arcs, diagonal divisions)
  if (tokens.components.showGeometricAccents) {
    if (slide.layoutPattern === 'minimal_cover' || slide.layoutPattern === 'closing_statement') {
      const circleDiameter = Math.min(420, Math.floor(contentWidth * 0.46));
      const geoCircle: FigmaShapeNode = {
        id: `${prefix}_geo_circle`,
        name: 'Editorial Geometric Circle',
        type: 'ELLIPSE',
        shapeType: 'ELLIPSE',
        x: W - M - circleDiameter,
        y: sectionKickerY + 48,
        width: circleDiameter,
        height: circleDiameter,
        layerOrder: nextOrder(),
        opacity: 0.9,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
      };
      elements.push(geoCircle);

      const diagonalLine: FigmaShapeNode = {
        id: `${prefix}_geo_diagonal`,
        name: 'Editorial Diagonal Axis',
        type: 'VECTOR',
        shapeType: 'VECTOR',
        x: W - M - circleDiameter,
        y: sectionKickerY + 48,
        width: circleDiameter,
        height: circleDiameter,
        layerOrder: nextOrder(),
        opacity: 0.75,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
        vectorSvgPath: `M 0 ${circleDiameter} L ${circleDiameter} 0`,
      };
      elements.push(diagonalLine);
    } else if (slide.layoutPattern === 'large_statistic') {
      const arcSize = 260;
      const geoArc: FigmaShapeNode = {
        id: `${prefix}_geo_arc`,
        name: 'Editorial Measure Arc',
        type: 'ELLIPSE',
        shapeType: 'ELLIPSE',
        x: W - M - arcSize,
        y: sectionKickerY + 24,
        width: arcSize,
        height: arcSize,
        layerOrder: nextOrder(),
        opacity: 0.85,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
      };
      elements.push(geoArc);
    }
  }

  // Pattern Layout Switch
  switch (slide.layoutPattern) {
    case 'minimal_cover': {
      const headlineY = 460;
      const hHeight = Math.min(
        420,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Primary Cover Display',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'display',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const bodyY = Math.min(safeBottomLimit - 220, headlineY + hHeight + 48);
      const bHeight = Math.min(
        200,
        estimateTextHeight(slide.supportingCopy, Math.floor(contentWidth * 0.82), bodyFont.fontSize, bodyFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_body`,
        name: 'Cover Deck Copy',
        type: 'TEXT',
        x: M,
        y: bodyY,
        width: Math.floor(contentWidth * 0.82),
        height: bHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'split_composition': {
      const headlineY = 276;
      const hHeight = Math.min(
        300,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Split Upper Thesis',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const splitRuleY = 660;
      elements.push({
        id: `${prefix}_split_divider`,
        name: 'Horizontal Split Rule',
        type: 'LINE',
        shapeType: 'LINE',
        x: M,
        y: splitRuleY,
        width: contentWidth,
        height: 1,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
      });

      const cardY = splitRuleY + 48;
      const cardH = 420;
      elements.push({
        id: `${prefix}_split_container`,
        name: 'Architectural Proof Surface',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: cardY,
        width: contentWidth,
        height: cardH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_body`,
        name: 'Supporting Specification Copy',
        type: 'TEXT',
        x: M + 48,
        y: cardY + 56,
        width: contentWidth - 96,
        height: cardH - 112,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'comparison_columns': {
      const headlineY = 264;
      const hHeight = Math.min(
        240,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Comparison Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const colTop = 556;
      const colHeight = 560;
      const colGap = 32;
      const colWidth = Math.floor((contentWidth - colGap) / 2);

      // Left & Right Comparison Containers
      elements.push({
        id: `${prefix}_col_left_box`,
        name: 'Baseline Column Frame',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: colTop,
        width: colWidth,
        height: colHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_col_right_box`,
        name: 'Systemic Column Frame',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M + colWidth + colGap,
        y: colTop,
        width: colWidth,
        height: colHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.bg,
        stroke: palette.textPrimary,
        strokeWidth: 1.5,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      const parts = slide.supportingCopy.includes('|')
        ? slide.supportingCopy.split('|').map((s) => s.trim())
        : [
            slide.supportingCopy.slice(0, Math.ceil(slide.supportingCopy.length / 2)).trim(),
            slide.supportingCopy.slice(Math.ceil(slide.supportingCopy.length / 2)).trim() ||
              'Structured tokens, deterministic bounds, and editable native Figma layers.',
          ];

      elements.push({
        id: `${prefix}_col_left_label`,
        name: 'Column A Index',
        type: 'TEXT',
        x: M + 36,
        y: colTop + 36,
        width: colWidth - 72,
        height: 26,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: '01 · FRAGMENTED WORKFLOW',
        fontFamily: tokens.typography.label.fontFamily,
        fallbackFontFamily: tokens.typography.label.localFallbackFamily,
        fontSize: tokens.typography.label.fontSize,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0.06,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'label',
        overflowBehavior: 'TRUNCATE',
      });

      elements.push({
        id: `${prefix}_body`,
        name: 'Column A Copy',
        type: 'TEXT',
        x: M + 36,
        y: colTop + 88,
        width: colWidth - 72,
        height: colHeight - 124,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: parts[0],
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: Math.max(24, bodyFont.fontSize - 4),
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      elements.push({
        id: `${prefix}_col_right_label`,
        name: 'Column B Index',
        type: 'TEXT',
        x: M + colWidth + colGap + 36,
        y: colTop + 36,
        width: colWidth - 72,
        height: 26,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: '02 · LEGACYA ARCHITECTURE',
        fontFamily: tokens.typography.label.fontFamily,
        fallbackFontFamily: tokens.typography.label.localFallbackFamily,
        fontSize: tokens.typography.label.fontSize,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0.06,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'label',
        overflowBehavior: 'TRUNCATE',
      });

      elements.push({
        id: `${prefix}_body_secondary`,
        name: 'Column B Copy',
        type: 'TEXT',
        x: M + colWidth + colGap + 36,
        y: colTop + 88,
        width: colWidth - 72,
        height: colHeight - 124,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: parts[1],
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: Math.max(24, bodyFont.fontSize - 4),
        fontWeight: 500,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'numbered_steps': {
      const stepNumNode: FigmaTextNode = {
        id: `${prefix}_step_numeral`,
        name: 'Step Monumental Numeral',
        type: 'TEXT',
        x: M,
        y: 268,
        width: 260,
        height: 140,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: String(slide.slideNumber).padStart(2, '0'),
        fontFamily: tokens.typography.display.fontFamily,
        fallbackFontFamily: tokens.typography.display.localFallbackFamily,
        fontSize: 112,
        fontWeight: 600,
        lineHeight: 1.0,
        letterSpacing: -0.03,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'display',
        overflowBehavior: 'TRUNCATE',
      };
      elements.push(stepNumNode);

      elements.push({
        id: `${prefix}_step_rule`,
        name: 'Step Index Divider',
        type: 'LINE',
        shapeType: 'LINE',
        x: M,
        y: 444,
        width: contentWidth,
        height: 1,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
      });

      const headlineY = 488;
      const hHeight = Math.min(
        260,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Step Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const bodyY = Math.min(safeBottomLimit - 240, headlineY + hHeight + 44);
      elements.push({
        id: `${prefix}_body`,
        name: 'Step Methodology Body',
        type: 'TEXT',
        x: M,
        y: bodyY,
        width: contentWidth,
        height: 220,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'image_with_caption': {
      const headlineY = 264;
      const hHeight = Math.min(
        220,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Showcase Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const imageFrameY = 516;
      const imageFrameH = 440;
      const matchedAsset = assets.find((a) => a.id === slide.suggestedAssetId) || assets[0];

      elements.push({
        id: `${prefix}_media_frame`,
        name: 'Visual Asset Frame Border',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: imageFrameY,
        width: contentWidth,
        height: imageFrameH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      const imageNode: FigmaImageNode = {
        id: `${prefix}_image_asset`,
        name: matchedAsset ? matchedAsset.name : 'Editorial Asset Slot',
        type: 'IMAGE',
        x: M + 16,
        y: imageFrameY + 16,
        width: contentWidth - 32,
        height: imageFrameH - 32,
        layerOrder: nextOrder(),
        opacity: 1,
        assetId: matchedAsset?.id || 'asset_placeholder_arch',
        imageReference: matchedAsset?.previewDataUrl || 'internal://placeholder/editorial-grid',
        fitMode: 'FILL',
        altText: slide.visualFocalPoint || slide.primaryHeadline,
      };
      elements.push(imageNode);

      const captionY = imageFrameY + imageFrameH + 32;
      elements.push({
        id: `${prefix}_body`,
        name: 'Editorial Figure Caption & Context',
        type: 'TEXT',
        x: M,
        y: captionY,
        width: contentWidth,
        height: 160,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: Math.max(24, bodyFont.fontSize - 4),
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'product_showcase': {
      const headlineWidth = Math.floor(contentWidth * 0.72);
      const badgeWidth = contentWidth - headlineWidth - 24;
      const headlineY = 256;
      const hHeight = Math.min(
        200,
        estimateTextHeight(slide.primaryHeadline, headlineWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );

      elements.push({
        id: `${prefix}_headline`,
        name: 'Product Artifact Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: headlineWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      elements.push({
        id: `${prefix}_product_spec_badge`,
        name: 'Artifact Spec Stamp',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M + headlineWidth + 24,
        y: headlineY + 8,
        width: badgeWidth,
        height: 56,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_product_spec_label`,
        name: 'Artifact Spec Code',
        type: 'TEXT',
        x: M + headlineWidth + 40,
        y: headlineY + 22,
        width: badgeWidth - 32,
        height: 28,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: 'SPEC · 1080×1440',
        fontFamily: tokens.typography.label.fontFamily,
        fallbackFontFamily: tokens.typography.label.localFallbackFamily,
        fontSize: tokens.typography.label.fontSize,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0.06,
        textAlign: 'CENTER',
        textColor: palette.textPrimary,
        textStyleToken: 'label',
        overflowBehavior: 'TRUNCATE',
      });

      const stageY = 484;
      const stageH = 540;
      const sidebarW = Math.floor(contentWidth * 0.36);
      const viewportW = contentWidth - sidebarW - 24;
      const matchedAsset = assets.find((a) => a.id === slide.suggestedAssetId) || assets[0];

      elements.push({
        id: `${prefix}_product_stage`,
        name: 'Product Specification Stage',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: stageY,
        width: sidebarW,
        height: stageH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_body`,
        name: 'Product Architecture Notes',
        type: 'TEXT',
        x: M + 28,
        y: stageY + 36,
        width: sidebarW - 56,
        height: stageH - 72,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: Math.max(22, bodyFont.fontSize - 6),
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      elements.push({
        id: `${prefix}_media_frame`,
        name: 'Product Viewport Frame',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M + sidebarW + 24,
        y: stageY,
        width: viewportW,
        height: stageH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.bg,
        stroke: palette.textPrimary,
        strokeWidth: 1.5,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_image_asset`,
        name: matchedAsset ? matchedAsset.name : 'Product Interface Slot',
        type: 'IMAGE',
        x: M + sidebarW + 40,
        y: stageY + 16,
        width: viewportW - 32,
        height: stageH - 32,
        layerOrder: nextOrder(),
        opacity: 1,
        assetId: matchedAsset?.id || 'asset_arch_monolith_01',
        imageReference: matchedAsset?.previewDataUrl || 'internal://placeholder/product-viewport',
        fitMode: 'FILL',
        altText: slide.visualFocalPoint || slide.primaryHeadline,
      });
      break;
    }

    case 'service_showcase': {
      const headlineY = 256;
      const hHeight = Math.min(
        210,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Capabilities Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const pillarSegments = slide.supportingCopy
        .split(/(?:;|\n|\|)/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pillarTexts = [
        pillarSegments[0] || slide.supportingCopy,
        pillarSegments[1] || 'Custom Web & Design Systems governed by reusable tokens.',
        pillarSegments[2] || 'Editorial Creative Production engineered for native Figma handoff.',
      ];

      const rowStart = 500;
      const rowHeight = 152;
      const rowGap = 24;

      for (let i = 0; i < 3; i++) {
        const rowY = rowStart + i * (rowHeight + rowGap);
        const idxCode = String(i + 1).padStart(2, '0');
        elements.push({
          id: `${prefix}_service_card_${idxCode}`,
          name: `Service Pillar ${idxCode} Surface`,
          type: 'RECTANGLE',
          shapeType: 'RECTANGLE',
          x: M,
          y: rowY,
          width: contentWidth,
          height: rowHeight,
          layerOrder: nextOrder(),
          opacity: 1,
          fill: i === 0 ? palette.surfaceBox : palette.bg,
          stroke: i === 0 ? palette.textPrimary : palette.border,
          strokeWidth: i === 0 ? 1.5 : 1,
          cornerRadius: tokens.components.defaultCornerRadius,
        });

        elements.push({
          id: `${prefix}_service_index_${idxCode}`,
          name: `Service Pillar ${idxCode} Index`,
          type: 'TEXT',
          x: M + 32,
          y: rowY + 36,
          width: 96,
          height: 44,
          layerOrder: nextOrder(),
          opacity: 1,
          textContent: idxCode,
          fontFamily: tokens.typography.display.fontFamily,
          fallbackFontFamily: tokens.typography.display.localFallbackFamily,
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: -0.02,
          textAlign: 'LEFT',
          textColor: palette.textPrimary,
          textStyleToken: 'display',
          overflowBehavior: 'TRUNCATE',
        });

        elements.push({
          id: i === 0 ? `${prefix}_body` : `${prefix}_service_copy_${idxCode}`,
          name: `Service Pillar ${idxCode} Copy`,
          type: 'TEXT',
          x: M + 144,
          y: rowY + 32,
          width: contentWidth - 176,
          height: rowHeight - 64,
          layerOrder: nextOrder(),
          opacity: 1,
          textContent: pillarTexts[i],
          fontFamily: bodyFont.fontFamily,
          fallbackFontFamily: bodyFont.localFallbackFamily,
          fontSize: Math.max(22, bodyFont.fontSize - 4),
          fontWeight: i === 0 ? 500 : bodyFont.fontWeight,
          lineHeight: bodyFont.lineHeight,
          letterSpacing: bodyFont.letterSpacing,
          textAlign: 'LEFT',
          textColor: i === 0 ? palette.textPrimary : palette.textSecondary,
          textStyleToken: 'body',
          overflowBehavior: 'WARN_IF_EXCEEDED',
        });
      }
      break;
    }

    case 'large_statistic': {
      const statMatch = slide.primaryHeadline.match(/(\d+[%×xX+]?|\d+\.\d+)/);
      const statValue = statMatch ? statMatch[1] : `0${slide.slideNumber}`;

      elements.push({
        id: `${prefix}_stat_figure`,
        name: 'Monumental Figure Callout',
        type: 'TEXT',
        x: M,
        y: 264,
        width: Math.floor(contentWidth * 0.64),
        height: 176,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: statValue,
        fontFamily: tokens.typography.display.fontFamily,
        fallbackFontFamily: tokens.typography.display.localFallbackFamily,
        fontSize: Math.max(96, tokens.typography.display.fontSize + 24),
        fontWeight: 600,
        lineHeight: 1.0,
        letterSpacing: -0.03,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'display',
        overflowBehavior: 'TRUNCATE',
      });

      elements.push({
        id: `${prefix}_stat_baseline`,
        name: 'Metric Datum Rule',
        type: 'LINE',
        shapeType: 'LINE',
        x: M,
        y: 468,
        width: contentWidth,
        height: 1,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: null,
        stroke: palette.textPrimary,
        strokeWidth: 2,
      });

      const headlineY = 508;
      const hHeight = Math.min(
        240,
        estimateTextHeight(slide.primaryHeadline, contentWidth, tokens.typography.heading.fontSize, tokens.typography.heading.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Metric Thesis Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: tokens.typography.heading.fontFamily,
        fallbackFontFamily: tokens.typography.heading.localFallbackFamily,
        fontSize: tokens.typography.heading.fontSize,
        fontWeight: tokens.typography.heading.fontWeight,
        lineHeight: tokens.typography.heading.lineHeight,
        letterSpacing: tokens.typography.heading.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const boxY = 788;
      const boxH = 228;
      elements.push({
        id: `${prefix}_stat_context_box`,
        name: 'Metric Context Frame',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: boxY,
        width: contentWidth,
        height: boxH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      elements.push({
        id: `${prefix}_body`,
        name: 'Metric Verification & Scope Copy',
        type: 'TEXT',
        x: M + 36,
        y: boxY + 32,
        width: contentWidth - 72,
        height: boxH - 64,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'closing_statement': {
      const frameBoxY = 280;
      const frameBoxH = 740;
      elements.push({
        id: `${prefix}_closing_frame_box`,
        name: 'Closing Architectural Frame',
        type: 'RECTANGLE',
        shapeType: 'RECTANGLE',
        x: M,
        y: frameBoxY,
        width: contentWidth,
        height: frameBoxH,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: palette.surfaceBox,
        stroke: palette.border,
        strokeWidth: 1.5,
        cornerRadius: tokens.components.defaultCornerRadius,
      });

      const headlineY = 348;
      const innerWidth = contentWidth - 112;
      const hHeight = Math.min(
        280,
        estimateTextHeight(slide.primaryHeadline, innerWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Closing Invitation Headline',
        type: 'TEXT',
        x: M + 56,
        y: headlineY,
        width: innerWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const dividerY = 668;
      elements.push({
        id: `${prefix}_closing_divider`,
        name: 'Closing Colophon Rule',
        type: 'LINE',
        shapeType: 'LINE',
        x: M + 56,
        y: dividerY,
        width: innerWidth,
        height: 1,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: null,
        stroke: palette.border,
        strokeWidth: 1.5,
      });

      elements.push({
        id: `${prefix}_body`,
        name: 'Closing Briefing Summary',
        type: 'TEXT',
        x: M + 56,
        y: dividerY + 40,
        width: innerWidth,
        height: 240,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }

    case 'editorial_headline':
    default: {
      const headlineY = 340;
      const hHeight = Math.min(
        380,
        estimateTextHeight(slide.primaryHeadline, contentWidth, headlineFont.fontSize, headlineFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_headline`,
        name: 'Primary Editorial Headline',
        type: 'TEXT',
        x: M,
        y: headlineY,
        width: contentWidth,
        height: hHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.primaryHeadline,
        fontFamily: headlineFont.fontFamily,
        fallbackFontFamily: headlineFont.localFallbackFamily,
        fontSize: headlineFont.fontSize,
        fontWeight: headlineFont.fontWeight,
        lineHeight: headlineFont.lineHeight,
        letterSpacing: headlineFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textPrimary,
        textStyleToken: 'heading',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });

      const accentLineY = Math.min(safeBottomLimit - 280, headlineY + hHeight + 40);
      elements.push({
        id: `${prefix}_editorial_divider`,
        name: 'Editorial Measure Accent Rule',
        type: 'LINE',
        shapeType: 'LINE',
        x: M,
        y: accentLineY,
        width: 160,
        height: 1,
        layerOrder: nextOrder(),
        opacity: 1,
        fill: null,
        stroke: palette.textPrimary,
        strokeWidth: 2,
      });

      const bodyY = accentLineY + 40;
      const bHeight = Math.min(
        240,
        estimateTextHeight(slide.supportingCopy, contentWidth, bodyFont.fontSize, bodyFont.lineHeight)
      );
      elements.push({
        id: `${prefix}_body`,
        name: 'Supporting Editorial Prose',
        type: 'TEXT',
        x: M,
        y: bodyY,
        width: contentWidth,
        height: bHeight,
        layerOrder: nextOrder(),
        opacity: 1,
        textContent: slide.supportingCopy,
        fontFamily: bodyFont.fontFamily,
        fallbackFontFamily: bodyFont.localFallbackFamily,
        fontSize: bodyFont.fontSize,
        fontWeight: bodyFont.fontWeight,
        lineHeight: bodyFont.lineHeight,
        letterSpacing: bodyFont.letterSpacing,
        textAlign: 'LEFT',
        textColor: palette.textSecondary,
        textStyleToken: 'body',
        overflowBehavior: 'WARN_IF_EXCEEDED',
      });
      break;
    }
  }

  // 3. Optional CTA Block (anchored above footer safe area)
  if (slide.ctaText && slide.ctaText.trim().length > 0) {
    const ctaY = H - tokens.layout.safeAreaBottom - 116;
    elements.push({
      id: `${prefix}_cta_box`,
      name: 'CTA Container',
      type: 'RECTANGLE',
      shapeType: 'RECTANGLE',
      x: M,
      y: ctaY,
      width: Math.min(contentWidth, Math.max(340, slide.ctaText.length * 16 + 72)),
      height: 64,
      layerOrder: nextOrder(),
      opacity: 1,
      fill: palette.textPrimary,
      stroke: palette.textPrimary,
      strokeWidth: 1,
      cornerRadius: tokens.components.defaultCornerRadius,
    });

    elements.push({
      id: `${prefix}_cta_label`,
      name: 'CTA Label Text',
      type: 'TEXT',
      x: M + 28,
      y: ctaY + 18,
      width: Math.min(contentWidth - 56, Math.max(284, slide.ctaText.length * 16 + 16)),
      height: 28,
      layerOrder: nextOrder(),
      opacity: 1,
      textContent: slide.ctaText,
      fontFamily: tokens.typography.label.fontFamily,
      fallbackFontFamily: tokens.typography.label.localFallbackFamily,
      fontSize: tokens.typography.label.fontSize,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0.06,
      textAlign: 'LEFT',
      textColor: palette.bg,
      textStyleToken: 'label',
      overflowBehavior: 'TRUNCATE',
    });
  }

  // 4. Footer Chrome (Rule + Studio Colophon)
  const footerRuleY = tokens.layout.footerY - 28;
  if (tokens.components.showFooterRule) {
    elements.push({
      id: `${prefix}_footer_rule`,
      name: 'Footer Hairline Rule',
      type: 'LINE',
      shapeType: 'LINE',
      x: M,
      y: footerRuleY,
      width: contentWidth,
      height: 1,
      layerOrder: nextOrder(),
      opacity: 1,
      fill: null,
      stroke: palette.border,
      strokeWidth: 1,
    });
  }

  elements.push({
    id: `${prefix}_footer_signature`,
    name: 'Footer Studio Signature',
    type: 'TEXT',
    x: M,
    y: tokens.layout.footerY,
    width: contentWidth,
    height: 26,
    layerOrder: nextOrder(),
    opacity: 1,
    textContent: tokens.components.footerSignature,
    fontFamily: tokens.typography.label.fontFamily,
    fallbackFontFamily: tokens.typography.label.localFallbackFamily,
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: 0.08,
    textAlign: 'LEFT',
    textColor: palette.textSecondary,
    textStyleToken: 'label',
    overflowBehavior: 'TRUNCATE',
  });

  const computedContrastRatio = computeContrastRatio(palette.bg, palette.textPrimary);

  return {
    slideId: slide.id,
    slideNumber: slide.slideNumber,
    frameNodeId: `${prefix}_frame`,
    width: W,
    height: H,
    backgroundColor: palette.bg,
    layoutPattern: slide.layoutPattern,
    elements,
    computedContrastRatio,
    estimatedTextOverflow: estimatedOverflow,
    overflowRecommendation,
  };
}
