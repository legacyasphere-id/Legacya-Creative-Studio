import type { BrandSystemTokens, LayoutPatternId, SlideCategory } from '../types/studio.ts';

export const DEFAULT_BRAND_TOKENS: BrandSystemTokens = {
  version: '1.0.0-provisional',
  isProvisional: true,
  provisionalNote:
    'Provisional LEGACYA SPHERE editorial tokens. No official external brand guide has been uploaded yet; all colors, fonts, and grid constants remain editable and are explicitly flagged for Figma font-mapping review.',
  colors: {
    backgroundPrimary: '#F7F4EE',   // Warm Cream
    backgroundSecondary: '#FFFFFF', // Clean White
    surfaceDark: '#0F1A2C',         // Deep Navy
    textPrimary: '#121212',         // Ink Black
    textSecondary: '#5C5852',       // Restrained Gray
    textOnDark: '#F7F4EE',          // Warm Cream on Dark
    accent: '#0F1A2C',              // Deep Navy Editorial Accent
    border: '#D8D2C5',              // Subtle Architectural Stone Hairline
    semanticWarning: '#B45309',
    semanticSuccess: '#15803D',
    semanticDanger: '#B91C1C',
  },
  typography: {
    display: {
      role: 'display',
      fontFamily: 'Fraunces',
      localFallbackFamily: 'Georgia, serif',
      fontSize: 76,
      fontWeight: 600,
      lineHeight: 1.08,
      letterSpacing: -0.025,
      textAlign: 'LEFT',
    },
    heading: {
      role: 'heading',
      fontFamily: 'Fraunces',
      localFallbackFamily: 'Georgia, serif',
      fontSize: 54,
      fontWeight: 600,
      lineHeight: 1.14,
      letterSpacing: -0.02,
      textAlign: 'LEFT',
    },
    body: {
      role: 'body',
      fontFamily: 'Plus Jakarta Sans',
      localFallbackFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 30,
      fontWeight: 400,
      lineHeight: 1.48,
      letterSpacing: -0.005,
      textAlign: 'LEFT',
    },
    caption: {
      role: 'caption',
      fontFamily: 'Plus Jakarta Sans',
      localFallbackFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: 0.01,
      textAlign: 'LEFT',
    },
    label: {
      role: 'label',
      fontFamily: 'JetBrains Mono',
      localFallbackFamily: 'monospace',
      fontSize: 18,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: 0.08,
      textAlign: 'LEFT',
    },
  },
  layout: {
    canvasWidth: 1080,
    canvasHeight: 1440,
    aspectRatioLabel: '3:4 Portrait',
    outerMargin: 84,
    columnCount: 12,
    gutter: 24,
    spacingScale: [8, 16, 24, 32, 48, 64, 84, 120],
    safeAreaTop: 96,
    safeAreaBottom: 108,
    footerY: 1332,
    baselineGrid: 8,
  },
  components: {
    brandLogoText: 'LEGACYA SPHERE',
    footerSignature: 'LEGACYA SPHERE · SYSTEMS & EDITORIAL STUDIO',
    slideNumberFormat: '01 / 07',
    showGeometricAccents: true,
    showHeaderRule: true,
    showFooterRule: true,
    defaultCornerRadius: 0,
  },
};

export const SLIDE_CATEGORY_META: Record<
  SlideCategory,
  { label: string; description: string; defaultLayout: LayoutPatternId }
> = {
  cover_hook: {
    label: 'Cover / Hook',
    description: 'Establishes the central thesis and visual authority to earn the first swipe.',
    defaultLayout: 'minimal_cover',
  },
  problem_statement: {
    label: 'Problem Statement',
    description: 'Articulates the structural friction or industry misconception with clarity.',
    defaultLayout: 'editorial_headline',
  },
  educational_content: {
    label: 'Educational Content',
    description: 'Distills a core technical or strategic principle into a focused mobile frame.',
    defaultLayout: 'split_composition',
  },
  comparison: {
    label: 'Comparison',
    description: 'Contrasts conventional approaches against intentional system architecture.',
    defaultLayout: 'comparison_columns',
  },
  process_steps: {
    label: 'Process / Step-by-Step',
    description: 'Breaks a methodology into sequential, numbered operational stages.',
    defaultLayout: 'numbered_steps',
  },
  service_showcase: {
    label: 'Service Showcase',
    description: 'Presents studio capabilities and deliverable scope without sales clutter.',
    defaultLayout: 'service_showcase',
  },
  advertising_showcase: {
    label: 'Advertising Asset Showcase',
    description: 'Highlights creative direction and campaign framing with restrained captions.',
    defaultLayout: 'image_with_caption',
  },
  website_product_showcase: {
    label: 'Website / Product Showcase',
    description: 'Frames digital systems and interface architecture within an editorial grid.',
    defaultLayout: 'product_showcase',
  },
  case_study: {
    label: 'Case Study',
    description: 'Pairs verified architectural outcomes or high-salience statements with context.',
    defaultLayout: 'large_statistic',
  },
  summary: {
    label: 'Summary',
    description: 'Synthesizes the narrative arc into an actionable takeaway.',
    defaultLayout: 'editorial_headline',
  },
  closing_slide: {
    label: 'Closing Slide',
    description: 'Concludes with an understated studio signature and clear next step.',
    defaultLayout: 'closing_statement',
  },
};

export const LAYOUT_PATTERN_META: Record<
  LayoutPatternId,
  { label: string; summary: string; maxHeadlineChars: number; maxBodyChars: number }
> = {
  minimal_cover: {
    label: 'Minimal Cover',
    summary: 'Display thesis anchored in the upper-middle register with geometric arc and diagonal index.',
    maxHeadlineChars: 105,
    maxBodyChars: 170,
  },
  editorial_headline: {
    label: 'Editorial Headline',
    summary: 'High-contrast serif statement with balanced two-deck body prose and hairline rule.',
    maxHeadlineChars: 95,
    maxBodyChars: 240,
  },
  split_composition: {
    label: 'Split Composition',
    summary: 'Asymmetric horizontal division pairing upper thesis with lower architectural proof block.',
    maxHeadlineChars: 90,
    maxBodyChars: 230,
  },
  comparison_columns: {
    label: 'Comparison Columns',
    summary: 'Two-column vertical architectural grid contrasting fragile defaults vs. intentional systems.',
    maxHeadlineChars: 85,
    maxBodyChars: 260,
  },
  numbered_steps: {
    label: 'Numbered Steps',
    summary: 'Oversized tabular index figure paired with structured methodology sequence.',
    maxHeadlineChars: 85,
    maxBodyChars: 230,
  },
  large_statistic: {
    label: 'Large Statement / Metric',
    summary: 'Monumental display anchor with supporting context and explicit verification note.',
    maxHeadlineChars: 70,
    maxBodyChars: 210,
  },
  image_with_caption: {
    label: 'Image with Caption',
    summary: 'Dedicated 4:3 visual asset frame with editorial figure caption and independent headline.',
    maxHeadlineChars: 80,
    maxBodyChars: 180,
  },
  service_showcase: {
    label: 'Service Showcase',
    summary: 'Structured studio discipline pillar with deliverable specification and geometric badge.',
    maxHeadlineChars: 85,
    maxBodyChars: 220,
  },
  product_showcase: {
    label: 'Product / System Showcase',
    summary: 'Framed system viewport container with architectural annotations and specification bar.',
    maxHeadlineChars: 85,
    maxBodyChars: 200,
  },
  closing_statement: {
    label: 'Closing Statement',
    summary: 'Deep editorial frame with centered or anchored final directive and studio colophon.',
    maxHeadlineChars: 80,
    maxBodyChars: 180,
  },
};
