import { SAMPLE_STUDIO_ASSETS } from '../data/sampleProject';
import { DEFAULT_BRAND_TOKENS } from '../tokens/defaultTokens';
import {
  BrandSystemTokens,
  CreativeBrief,
  FigmaExportContract,
  MarketIntelligenceRecord,
  SlideImagePromptEntry,
  StoryboardSlide,
  StudioAsset,
  StudioProject,
  ValidationReport,
} from '../types/studio';
import {
  generateConceptLocal,
  generateStoryboardLocal,
  validateBriefForm,
} from './creativeEngine';
import { buildFigmaExportContract } from './exportSerializer';
import { validateExportContractJson } from './schemaValidator';

export const DEFAULT_INTELLIGENCE: MarketIntelligenceRecord = {
  id: 'intel_preset_agency_retainer',
  title: '01. Agency Retainer Replacement & Autonomous Studio Velocity',
  source: 'Agency Market Analysis 2026 / Founder Intelligence Briefing',
  industrySector: 'B2B Creative & Operations Automation',
  coreAudience: 'Founders, Agency Owners & Enterprise Brand Directors',
  targetPainPoint:
    'Traditional retainers burn $5k-$15k/month on manual design and ops bottlenecks that take weeks to deliver simple campaign assets.',
  provenHook:
    'Why High-Performing Brands Are Firing Traditional Retainers for Autonomous Studio Infrastructure.',
  marketProofMetric:
    '85% faster campaign velocity with 100% deterministic brand consistency.',
  strategicSolution:
    'Deploying autonomous creative workflows and Figma-linked token systems (LEGACYA SPHERE Method).',
  desiredSlideCount: 5,
};

export const INTELLIGENCE_PRESETS: MarketIntelligenceRecord[] = [
  DEFAULT_INTELLIGENCE,
  {
    id: 'intel_preset_design_governance',
    title: '02. Native Figma Contract vs. Flattened AI Templates',
    source: 'Enterprise Design Systems Audit 2026 / Creative Director Benchmark',
    industrySector: 'Design Engineering & Brand Governance',
    coreAudience: 'VPs of Design, Creative Directors & Design Systems Leads',
    targetPainPoint:
      'Generic AI social tools flatten typography into dead raster pixels, forcing design teams to rebuild every slide from scratch when copy changes.',
    provenHook:
      'Stop Flattening Brand Equity Into Uneditable Raster Templates.',
    marketProofMetric:
      '100% native editable Figma layers with 3-way reconciliation via stable IDs.',
    strategicSolution:
      'Separating Gemini narrative reasoning from a deterministic 1080×1440 coordinate engine and versioned 1.0.0 Figma JSON contract.',
    desiredSlideCount: 6,
  },
  {
    id: 'intel_preset_ops_architecture',
    title: '03. Schema-Validated AI Pipelines vs. Fragile Prompt Chains',
    source: 'Technical Operations Resilience Report Q4 / CTO Briefing',
    industrySector: 'Full-Stack AI Systems & Workflow Engineering',
    coreAudience: 'CTOs, COOs & Principal Systems Architects',
    targetPainPoint:
      'Unvalidated webhook chains and ad-hoc prompt scripts silently corrupt downstream data whenever model outputs drift.',
    provenHook:
      'Automation Without Architecture Only Accelerates Operational Entropy.',
    marketProofMetric:
      'Zero silent schema regressions across multi-stage editorial and operational pipelines.',
    strategicSolution:
      'Enforcing strict TypeScript contract validation, epistemic claim verification, and human approval gates before commit.',
    desiredSlideCount: 7,
  },
];

export interface IntelligenceValidationResult {
  valid: boolean;
  fieldErrors: Partial<Record<keyof MarketIntelligenceRecord, string>>;
}

export function validateIntelligenceRecord(
  intel: MarketIntelligenceRecord
): IntelligenceValidationResult {
  const fieldErrors: Partial<Record<keyof MarketIntelligenceRecord, string>> = {};

  if (!intel.source || intel.source.trim().length < 4) {
    fieldErrors.source = 'Specify the intelligence source or briefing origin (min 4 chars).';
  }
  if (!intel.industrySector || intel.industrySector.trim().length < 3) {
    fieldErrors.industrySector = 'Specify the target industry sector (min 3 chars).';
  }
  if (!intel.coreAudience || intel.coreAudience.trim().length < 5) {
    fieldErrors.coreAudience = 'Identify the core decision-maker audience (min 5 chars).';
  }
  if (!intel.targetPainPoint || intel.targetPainPoint.trim().length < 10) {
    fieldErrors.targetPainPoint = 'Describe the verified operational pain point (min 10 chars).';
  }
  if (!intel.provenHook || intel.provenHook.trim().length < 10) {
    fieldErrors.provenHook = 'Provide the proven editorial hook (min 10 chars).';
  }
  if (!intel.marketProofMetric || intel.marketProofMetric.trim().length < 5) {
    fieldErrors.marketProofMetric = 'State the verified proof metric or benchmark (min 5 chars).';
  }
  if (!intel.strategicSolution || intel.strategicSolution.trim().length < 10) {
    fieldErrors.strategicSolution = 'Articulate the strategic architectural solution (min 10 chars).';
  }
  if (
    intel.desiredSlideCount !== undefined &&
    (Number.isNaN(Number(intel.desiredSlideCount)) ||
      Number(intel.desiredSlideCount) < 3 ||
      Number(intel.desiredSlideCount) > 12)
  ) {
    fieldErrors.desiredSlideCount = 'Slide count must be between 3 and 12.';
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

/**
 * Synthesizes a complete 19-field CreativeBrief from a MarketIntelligenceRecord (#3 -> #2).
 */
export function synthesizeBriefFromIntelligence(
  intel: MarketIntelligenceRecord
): CreativeBrief {
  const slideCount = Math.max(3, Math.min(12, Number(intel.desiredSlideCount || 5)));
  const hookClean = intel.provenHook.trim().replace(/\.$/, '');

  return {
    projectName: intel.title
      ? `LEGACYA SPHERE — ${intel.title.replace(/^\d+\.\s*/, '')}`
      : 'LEGACYA SPHERE — Autonomous Studio Engine',
    carouselTopic: `${hookClean}. How autonomous infrastructure eliminates agency bloat.`,
    targetAudience: intel.coreAudience.trim(),
    communicationObjective: `Demonstrate authority in ${intel.industrySector.trim()}. Verified benchmark: ${intel.marketProofMetric.trim()}`,
    language: 'English',
    desiredSlideCount: slideCount,
    productOrService: intel.strategicSolution.trim(),
    audiencePainPoint: intel.targetPainPoint.trim(),
    desiredAudienceResponse:
      'Audit existing retainer or workflow bottlenecks and initiate an architectural briefing with LEGACYA SPHERE.',
    toneOfVoice: 'Editorial, restrained, analytical, architecturally precise, confident without hype.',
    keyMessage: `${hookClean}.`,
    callToAction: 'INITIATE AN ARCHITECTURAL REVIEW · LEGACYASPHERE.STUDIO',
    supportingFacts: `Source: ${intel.source.trim()} — Benchmark: ${intel.marketProofMetric.trim()}`,
    referenceLinks: 'internal://legacya-sphere/intelligence-pipeline-v1',
    existingCopy: `${intel.provenHook.trim()} ${intel.targetPainPoint.trim()}`,
    referenceImages: 'asset_arch_monolith_01, asset_system_matrix_02',
    preferredVisualDirection:
      'Warm Cream (#F7F4EE) with Deep Navy (#0F1A2C), architectural geometric layout, Fraunces serif headlines, Plus Jakarta Sans body.',
    excludedContent:
      'No baked-in raster text, no unverified third-party claims, no neon gradients, no generic dashboard clutter.',
    legalDisclaimers: `Derived from ${intel.source.trim()}. Metrics reflect documented studio architecture benchmarks.`,
  };
}

/**
 * Compiles the slide-by-slide Image Prompt Matrix formatted for Google Flow MCP & Diffusion Models.
 * Enforces the strict LEGACYA SPHERE rule that text and logos are never baked into raster images.
 */
export function buildImagePromptMatrix(
  storyboard: StoryboardSlide[],
  brandTokens: BrandSystemTokens = DEFAULT_BRAND_TOKENS
): SlideImagePromptEntry[] {
  const bgHex = brandTokens.colors.backgroundPrimary;
  const darkHex = brandTokens.colors.surfaceDark;

  return storyboard.map((slide) => {
    const cleanHeadline = slide.primaryHeadline.replace(/["']/g, '').toLowerCase();
    const isProductOrShowcase =
      slide.category === 'website_product_showcase' ||
      slide.category === 'service_showcase' ||
      slide.category === 'advertising_showcase';

    return {
      slideId: slide.id,
      slideNumber: slide.slideNumber,
      category: slide.category,
      layoutPattern: slide.layoutPattern,
      headline: slide.primaryHeadline,
      visualConcept: slide.visualFocalPoint,
      flowMcpPrompt: `Minimal architectural composition, editorial photography, high-end studio lighting, deep navy ${darkHex} accents on warm cream ${bgHex} textured background, ultra-sharp detail, 3:4 aspect ratio, subtle geometric structure reflecting ${cleanHeadline}, strictly no text or typography`,
      negativePrompt:
        'text, typography, letters, words, numbers, watermarks, signatures, logos, UI screenshots, neon glow, 3D cartoon blobs',
      aspectRatio: isProductOrShowcase ? '4:3' : '3:4',
      recommendedAssetCategory: isProductOrShowcase
        ? 'product_imagery'
        : 'editorial_photography',
    };
  });
}

/**
 * Generates a standalone, self-contained HTML preview board for the carousel.
 */
export function generateStandaloneHtmlCarouselPreview(project: StudioProject): string {
  const slidesHtml = project.storyboard
    .map(
      (s) => `
      <div class="slide-card">
        <div class="slide-meta">SLIDE ${String(s.slideNumber).padStart(2, '0')} · ${s.category.toUpperCase()} · ${s.layoutPattern}</div>
        <h3 class="slide-headline">${s.primaryHeadline}</h3>
        <p class="slide-body">${s.supportingCopy}</p>
        <div class="slide-visual">
          <strong>Visual Focal Point:</strong> ${s.visualFocalPoint}
        </div>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LEGACYA SPHERE — Carousel Preview (${project.brief.projectName})</title>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #F7F4EE;
      color: #121212;
      margin: 0;
      padding: 40px 32px;
    }
    .header {
      max-width: 1200px;
      margin: 0 auto 32px auto;
      border-bottom: 1px solid #0F1A2C;
      padding-bottom: 16px;
    }
    h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 32px;
      color: #0F1A2C;
      margin: 0 0 8px 0;
    }
    .meta {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 13px;
      color: #5C5852;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .slide-card {
      background: #FFFFFF;
      border: 1px solid #D8D2C5;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }
    .slide-meta {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      letter-spacing: 0.06em;
      color: #5C5852;
      margin-bottom: 12px;
    }
    .slide-headline {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 20px;
      color: #0F1A2C;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .slide-body {
      font-size: 14px;
      line-height: 1.6;
      color: #292524;
      margin-bottom: 16px;
      flex-grow: 1;
    }
    .slide-visual {
      font-size: 12px;
      background: #F7F4EE;
      border: 1px solid #D8D2C5;
      padding: 10px 12px;
      color: #5C5852;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEGACYA SPHERE — Campaign Storyboard</h1>
    <div class="meta">Project: ${project.brief.projectName} · Ratio: 3:4 (1080×1440) · Slides: ${project.storyboard.length} · Contract: v1.0.0</div>
  </div>
  <div class="grid">
    ${slidesHtml}
  </div>
</body>
</html>`;
}

export interface CompiledIntelligenceCampaign {
  brief: CreativeBrief;
  concept: NonNullable<StudioProject['concept']>;
  storyboard: StoryboardSlide[];
  project: StudioProject;
  contract: FigmaExportContract;
  contractValidation: ValidationReport;
  promptMatrix: SlideImagePromptEntry[];
  htmlPreview: string;
}

/**
 * End-to-end deterministic compiler from MarketIntelligenceRecord (#3) to Visual Campaign (#2).
 */
export function compileCampaignFromIntelligence(
  intel: MarketIntelligenceRecord = DEFAULT_INTELLIGENCE,
  brandTokens: BrandSystemTokens = DEFAULT_BRAND_TOKENS,
  assets: StudioAsset[] = SAMPLE_STUDIO_ASSETS
): CompiledIntelligenceCampaign {
  const intelCheck = validateIntelligenceRecord(intel);
  if (!intelCheck.valid) {
    throw new Error(
      `Invalid market intelligence record: ${JSON.stringify(intelCheck.fieldErrors)}`
    );
  }

  const brief = synthesizeBriefFromIntelligence(intel);
  const briefCheck = validateBriefForm(brief);
  if (!briefCheck.valid) {
    throw new Error(
      `Invalid brief synthesized from intelligence: ${JSON.stringify(briefCheck.fieldErrors)}`
    );
  }

  const concept = {
    ...generateConceptLocal(brief),
    approved: true,
    approvedAt: new Date().toISOString(),
  };

  const storyboard = generateStoryboardLocal(brief, concept);
  const nowIso = new Date().toISOString();

  const project: StudioProject = {
    id: `project_intel_${Date.now()}`,
    status: 'Ready for review',
    createdAt: nowIso,
    updatedAt: nowIso,
    brief,
    concept,
    storyboard,
    brandTokens: structuredClone(brandTokens),
    assets: structuredClone(assets),
    handoffState: {
      jsonGenerated: true,
      jsonValidated: true,
      figmaPluginImplemented: true,
      figmaImportCompleted: false,
      designReviewed: false,
      designApproved: false,
    },
    history: [
      {
        id: `hist_intel_${Date.now()}`,
        timestamp: nowIso,
        operation: 'intelligence_ingested',
        mode: 'local_deterministic',
        summary: `Ingested intelligence "${intel.source}" and compiled ${storyboard.length}-slide campaign + 1.0.0 Figma contract.`,
      },
    ],
  };

  const contract = buildFigmaExportContract(project);
  const contractValidation = validateExportContractJson(contract);
  if (!contractValidation.valid) {
    throw new Error(
      `Export contract validation failed: ${JSON.stringify(contractValidation.errors)}`
    );
  }

  const promptMatrix = buildImagePromptMatrix(storyboard, brandTokens);
  const htmlPreview = generateStandaloneHtmlCarouselPreview(project);

  return {
    brief,
    concept,
    storyboard,
    project,
    contract,
    contractValidation,
    promptMatrix,
    htmlPreview,
  };
}
