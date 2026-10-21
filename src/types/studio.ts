export type ProjectStatus =
  | 'Draft'
  | 'Generating'
  | 'Ready for review'
  | 'Approved'
  | 'Exported';

export type SlideCategory =
  | 'cover_hook'
  | 'problem_statement'
  | 'educational_content'
  | 'comparison'
  | 'process_steps'
  | 'service_showcase'
  | 'advertising_showcase'
  | 'website_product_showcase'
  | 'case_study'
  | 'summary'
  | 'closing_slide';

export type LayoutPatternId =
  | 'minimal_cover'
  | 'editorial_headline'
  | 'split_composition'
  | 'comparison_columns'
  | 'numbered_steps'
  | 'large_statistic'
  | 'image_with_caption'
  | 'service_showcase'
  | 'product_showcase'
  | 'closing_statement';

export type WorkspaceSection =
  | 'dashboard'
  | 'brief'
  | 'concept'
  | 'editor'
  | 'brand'
  | 'assets'
  | 'export'
  | 'settings';

export interface CreativeBrief {
  // Required fields
  projectName: string;
  carouselTopic: string;
  targetAudience: string;
  communicationObjective: string;
  language: string;
  desiredSlideCount: number;

  // Optional fields
  productOrService: string;
  audiencePainPoint: string;
  desiredAudienceResponse: string;
  toneOfVoice: string;
  keyMessage: string;
  callToAction: string;
  supportingFacts: string;
  referenceLinks: string;
  existingCopy: string;
  referenceImages: string;
  preferredVisualDirection: string;
  excludedContent: string;
  legalDisclaimers: string;
}

export interface FactualClaimFlag {
  claim: string;
  classification: 'established_fact' | 'reasonable_interpretation' | 'requires_verification';
  note: string;
}

export interface CreativeConcept {
  id: string;
  generatedAt: string;
  source: 'local_deterministic' | 'gemini_api';
  approved: boolean;
  approvedAt?: string;
  creativeRationale: string;
  centralIdea: string;
  audienceInsight: string;
  intendedEmotionalResponse: string;
  narrativeArc: string;
  keyMessage: string;
  visualMetaphor: string;
  recommendedSlideSequence: Array<{
    slideNumber: number;
    category: SlideCategory;
    roleSummary: string;
  }>;
  proposedArtDirection: string;
  recommendedCta: string;
  factualClaimsToVerify: FactualClaimFlag[];
}

export interface StoryboardSlide {
  id: string;
  slideNumber: number;
  category: SlideCategory;
  narrativePurpose: string;
  primaryHeadline: string;
  supportingCopy: string;
  microcopy: string;
  ctaText: string;
  intendedReadingOrder: string[];
  visualFocalPoint: string;
  layoutPattern: LayoutPatternId;
  suggestedAssetId: string;
  backgroundTreatment: 'warm_cream' | 'clean_white' | 'deep_navy' | 'ink_black';
  relationshipToPrevious: string;
  relationshipToNext: string;
  accessibilityNotes: string;
  readabilityRisks: string[];
  approved: boolean;
  lastModifiedAt: string;
}

export interface TypographyStyleToken {
  role: 'display' | 'heading' | 'body' | 'caption' | 'label';
  fontFamily: string;
  localFallbackFamily: string;
  fontSize: number; // Logical px on 1080x1440 canvas
  fontWeight: number;
  lineHeight: number; // Multiplier e.g. 1.15
  letterSpacing: number; // em e.g. -0.02
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface ColorTokens {
  backgroundPrimary: string;   // Warm cream #F7F4EE
  backgroundSecondary: string; // Clean white #FFFFFF
  surfaceDark: string;         // Deep navy #0F1A2C
  textPrimary: string;         // Ink black #121212
  textSecondary: string;       // Restrained gray #5C5852
  textOnDark: string;          // Alabaster #F7F4EE
  accent: string;              // Deep navy / editorial slate #0F1A2C
  border: string;              // Hairline stone #D8D2C5
  semanticWarning: string;     // Amber #B45309
  semanticSuccess: string;     // Forest #15803D
  semanticDanger: string;      // Crimson #B91C1C
}

export interface LayoutTokens {
  canvasWidth: number;         // Default 1080
  canvasHeight: number;        // Default 1440
  aspectRatioLabel: string;    // "3:4 Portrait"
  outerMargin: number;         // Default 84
  columnCount: number;         // Default 12
  gutter: number;              // Default 24
  spacingScale: number[];      // [8, 16, 24, 32, 48, 64, 84, 120]
  safeAreaTop: number;         // Default 96
  safeAreaBottom: number;      // Default 108
  footerY: number;             // Default 1332
  baselineGrid: number;        // Default 8
}

export interface ComponentRuleTokens {
  brandLogoText: string;
  footerSignature: string;
  slideNumberFormat: '01 / 07' | '01' | 'SLIDE 01';
  showGeometricAccents: boolean;
  showHeaderRule: boolean;
  showFooterRule: boolean;
  defaultCornerRadius: number;
}

export interface BrandSystemTokens {
  version: string;
  isProvisional: boolean;
  provisionalNote: string;
  colors: ColorTokens;
  typography: Record<'display' | 'heading' | 'body' | 'caption' | 'label', TypographyStyleToken>;
  layout: LayoutTokens;
  components: ComponentRuleTokens;
}

export type FigmaNodeType =
  | 'FRAME'
  | 'TEXT'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'VECTOR'
  | 'IMAGE'
  | 'GROUP';

export interface BaseFigmaNode {
  id: string; // Stable deterministic layer ID
  name: string;
  type: FigmaNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  layerOrder: number;
  opacity: number;
}

export interface FigmaTextNode extends BaseFigmaNode {
  type: 'TEXT';
  textContent: string;
  fontFamily: string;
  fallbackFontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT';
  textColor: string;
  textStyleToken: 'display' | 'heading' | 'body' | 'caption' | 'label';
  overflowBehavior: 'RESIZE_HEIGHT' | 'TRUNCATE' | 'WARN_IF_EXCEEDED';
}

export interface FigmaShapeNode extends BaseFigmaNode {
  type: 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'VECTOR';
  shapeType: 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'VECTOR';
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  cornerRadius?: number;
  vectorSvgPath?: string;
}

export interface FigmaImageNode extends BaseFigmaNode {
  type: 'IMAGE';
  assetId: string;
  imageReference: string;
  fitMode: 'FILL' | 'FIT' | 'CROP';
  altText: string;
  cropOffset?: { x: number; y: number; scale: number };
}

export interface FigmaGroupNode extends BaseFigmaNode {
  type: 'GROUP';
  childrenIds: string[];
}

export type FigmaSlideElement =
  | FigmaTextNode
  | FigmaShapeNode
  | FigmaImageNode
  | FigmaGroupNode;

export interface SlideSpecification {
  slideId: string;
  slideNumber: number;
  frameNodeId: string;
  width: number;
  height: number;
  backgroundColor: string;
  layoutPattern: LayoutPatternId;
  elements: FigmaSlideElement[];
  computedContrastRatio: number;
  estimatedTextOverflow: boolean;
  overflowRecommendation?: string;
}

export interface StudioAsset {
  id: string;
  name: string;
  category:
    | 'brand_logo'
    | 'editorial_photography'
    | 'product_imagery'
    | 'geometric_vector'
    | 'abstract_visual'
    | 'reference_image';
  intendedSlideId?: string;
  prompt?: string;
  status: 'ready' | 'placeholder' | 'generating' | 'missing';
  provenance: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9';
  previewDataUrl: string;
  createdAt: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  code: string;
  slideId?: string;
  layerId?: string;
  message: string;
  remediation: string;
}

export interface ValidationReport {
  valid: boolean;
  checkedAt: string;
  schemaVersion: string;
  totalSlidesChecked: number;
  totalLayersChecked: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface HandoffStageStatus {
  jsonGenerated: boolean;
  jsonValidated: boolean;
  figmaPluginImplemented: boolean;
  figmaImportCompleted: boolean;
  designReviewed: boolean;
  designApproved: boolean;
}

export interface GenerationHistoryEntry {
  id: string;
  timestamp: string;
  operation:
    | 'brief_saved'
    | 'concept_generated'
    | 'storyboard_generated'
    | 'layout_compiled'
    | 'slide_copy_regenerated'
    | 'slide_layout_regenerated'
    | 'asset_generated'
    | 'json_exported';
  mode: 'local_deterministic' | 'gemini_api';
  targetSlideId?: string;
  summary: string;
}

export interface FigmaExportContract {
  schemaVersion: '1.0.0';
  coordinateSystem: {
    origin: 'TOP_LEFT';
    units: 'LOGICAL_PIXELS';
    scaleFactor: 1;
  };
  reimportStrategy: {
    mode: 'UPDATE_OR_CREATE_BY_STABLE_ID';
    pluginDataKey: 'legacya_stable_id';
    createDraftPageByDefault: true;
    draftPagePrefix: '[Draft] LEGACYA SPHERE — ';
  };
  exportedAt: string;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  designTokensSnapshot: BrandSystemTokens;
  assetManifest: Array<{
    assetId: string;
    name: string;
    category: StudioAsset['category'];
    aspectRatio: StudioAsset['aspectRatio'];
    status: StudioAsset['status'];
    provenance: string;
    imageReference: string;
  }>;
  slides: Array<{
    slideId: string;
    slideNumber: number;
    category: SlideCategory;
    approved: boolean;
    frameNode: {
      id: string;
      type: 'FRAME';
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
    };
    layers: FigmaSlideElement[];
  }>;
  importInstructions: string[];
}

export interface StudioProject {
  id: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  brief: CreativeBrief;
  concept: CreativeConcept | null;
  storyboard: StoryboardSlide[];
  brandTokens: BrandSystemTokens;
  assets: StudioAsset[];
  handoffState: HandoffStageStatus;
  history: GenerationHistoryEntry[];
}
