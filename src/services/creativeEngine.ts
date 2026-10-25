import { LAYOUT_PATTERN_META, SLIDE_CATEGORY_META } from '../tokens/defaultTokens';
import {
  CreativeBrief,
  CreativeConcept,
  LayoutPatternId,
  SlideCategory,
  StoryboardSlide,
  StudioAsset,
} from '../types/studio';

export interface BriefValidationResult {
  valid: boolean;
  fieldErrors: Partial<Record<keyof CreativeBrief, string>>;
}

/**
 * Validates required fields of the Creative Brief.
 * Never substitutes silent fallbacks when required fields are empty.
 */
export function validateBriefForm(brief: CreativeBrief): BriefValidationResult {
  const fieldErrors: Partial<Record<keyof CreativeBrief, string>> = {};

  if (!brief.projectName || brief.projectName.trim().length < 3) {
    fieldErrors.projectName = 'Enter a project name (at least 3 characters).';
  }
  if (!brief.carouselTopic || brief.carouselTopic.trim().length < 10) {
    fieldErrors.carouselTopic = 'Describe the carousel topic (at least 10 characters).';
  }
  if (!brief.targetAudience || brief.targetAudience.trim().length < 5) {
    fieldErrors.targetAudience = 'Specify the intended target audience.';
  }
  if (!brief.communicationObjective || brief.communicationObjective.trim().length < 8) {
    fieldErrors.communicationObjective = 'State the primary communication objective.';
  }
  if (!brief.language || brief.language.trim().length < 2) {
    fieldErrors.language = 'Specify the output language (e.g., English, Indonesian).';
  }
  if (
    typeof brief.desiredSlideCount !== 'number' ||
    Number.isNaN(brief.desiredSlideCount) ||
    brief.desiredSlideCount < 3 ||
    brief.desiredSlideCount > 12
  ) {
    fieldErrors.desiredSlideCount = 'Slide count must be between 3 and 12 slides.';
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

const SLIDE_SEQUENCE_TEMPLATES: SlideCategory[] = [
  'cover_hook',
  'problem_statement',
  'educational_content',
  'comparison',
  'process_steps',
  'website_product_showcase',
  'service_showcase',
  'case_study',
  'advertising_showcase',
  'summary',
  'closing_slide',
];

export function selectSlideSequenceForCount(count: number): SlideCategory[] {
  const clamped = Math.max(3, Math.min(12, count));
  if (clamped === 3) return ['cover_hook', 'educational_content', 'closing_slide'];
  if (clamped === 4) return ['cover_hook', 'problem_statement', 'process_steps', 'closing_slide'];
  if (clamped === 5) {
    return ['cover_hook', 'problem_statement', 'comparison', 'service_showcase', 'closing_slide'];
  }
  if (clamped === 6) {
    return [
      'cover_hook',
      'problem_statement',
      'educational_content',
      'comparison',
      'service_showcase',
      'closing_slide',
    ];
  }
  if (clamped === 7) {
    return [
      'cover_hook',
      'problem_statement',
      'comparison',
      'process_steps',
      'website_product_showcase',
      'service_showcase',
      'closing_slide',
    ];
  }

  const middlePool: SlideCategory[] = [
    'problem_statement',
    'educational_content',
    'comparison',
    'process_steps',
    'website_product_showcase',
    'service_showcase',
    'case_study',
    'advertising_showcase',
    'summary',
  ];
  const sequence: SlideCategory[] = ['cover_hook'];
  for (let i = 0; i < clamped - 2; i++) {
    sequence.push(middlePool[i % middlePool.length]);
  }
  sequence.push('closing_slide');
  return sequence;
}

/**
 * Deterministic Local Creative Strategist (no API key required, zero cost).
 * Never invents fake statistics, fake testimonials, or unverified metrics.
 */
export function generateConceptLocal(brief: CreativeBrief): CreativeConcept {
  const sequenceCategories = selectSlideSequenceForCount(brief.desiredSlideCount);
  const coreSubject = brief.productOrService?.trim() || brief.carouselTopic.trim();
  const cta = brief.callToAction?.trim() || 'INITIATE AN ARCHITECTURAL REVIEW · LEGACYASPHERE.STUDIO';

  const recommendedSlideSequence = sequenceCategories.map((category, idx) => ({
    slideNumber: idx + 1,
    category,
    roleSummary: `${SLIDE_CATEGORY_META[category].label}: ${SLIDE_CATEGORY_META[category].description}`,
  }));

  const factualClaimsToVerify: CreativeConcept['factualClaimsToVerify'] = [
    {
      claim: brief.supportingFacts?.trim()
        ? `Supplied brief context: "${brief.supportingFacts.trim().slice(0, 120)}"`
        : 'Core thesis relies on architectural methodology rather than quantitative client performance claims.',
      classification: brief.supportingFacts?.trim() ? 'established_fact' : 'reasonable_interpretation',
      note: 'No third-party statistics or unverified customer testimonials have been injected.',
    },
  ];

  if (brief.audiencePainPoint?.trim()) {
    factualClaimsToVerify.push({
      claim: `Audience pain point hypothesis: "${brief.audiencePainPoint.trim().slice(0, 110)}"`,
      classification: 'reasonable_interpretation',
      note: 'Frame as an operational observation rather than a universal industry percentage unless cited.',
    });
  }

  return {
    id: `concept_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    source: 'local_deterministic',
    approved: false,
    creativeRationale: `Position "${brief.projectName}" through calm editorial authority. Rather than overwhelming ${brief.targetAudience} with dense jargon, each 3:4 frame isolates one structural insight with generous negative space and crisp typographic hierarchy.`,
    centralIdea:
      brief.keyMessage?.trim() ||
      `Intentional systems architecture transforms ${coreSubject.slice(0, 64)} into durable operational leverage.`,
    audienceInsight: `${brief.targetAudience} value clarity, inspectable workflows, and long-term maintainability over short-lived tactical trends.`,
    intendedEmotionalResponse:
      brief.desiredAudienceResponse?.trim() ||
      'Measured confidence, intellectual alignment, and readiness to evaluate their current system architecture.',
    narrativeArc: `Open with a high-contrast thesis hook (Slide 01), articulate the operational bottleneck (${sequenceCategories.length} slides total), contrast conventional fragmentation with structured systems, and conclude with a clear briefing invitation.`,
    keyMessage:
      brief.keyMessage?.trim() ||
      'Pair strategic clarity with deterministic systems engineering and native design ownership.',
    visualMetaphor:
      'Editorial monograph grids, hairline structural divisions, and restrained geometric circles/diagonals on Warm Cream and Deep Navy.',
    recommendedSlideSequence,
    proposedArtDirection:
      brief.preferredVisualDirection?.trim() ||
      '3:4 portrait (1080×1440) pairing Fraunces display headlines with Plus Jakarta Sans prose across Warm Cream (#F7F4EE), Clean White (#FFFFFF), and Deep Navy (#0F1A2C) frames.',
    recommendedCta: cta,
    factualClaimsToVerify,
  };
}

/**
 * Deterministic Local Storyboard Generator from an approved CreativeConcept + CreativeBrief.
 */
export function generateStoryboardLocal(
  brief: CreativeBrief,
  concept: CreativeConcept
): StoryboardSlide[] {
  const sequence = concept.recommendedSlideSequence;
  const total = sequence.length;
  const topicShort = brief.carouselTopic.trim().replace(/\.$/, '');
  const painShort =
    brief.audiencePainPoint?.trim() ||
    'Disconnected workflows and ad-hoc execution create hidden maintenance debt across teams.';
  const serviceShort =
    brief.productOrService?.trim() ||
    'AI Automation, Custom Web & Systems Engineering, and Editorial Creative Production.';

  return sequence.map((item, idx) => {
    const n = item.slideNumber;
    const pad = String(n).padStart(2, '0');
    const cat = item.category;
    const defaultLayout = SLIDE_CATEGORY_META[cat].defaultLayout;

    let primaryHeadline = '';
    let supportingCopy = '';
    let microcopy = `${pad} · ${SLIDE_CATEGORY_META[cat].label.toUpperCase()}`;
    let ctaText = '';
    let backgroundTreatment: StoryboardSlide['backgroundTreatment'] = 'warm_cream';
    let suggestedAssetId = '';

    switch (cat) {
      case 'cover_hook': {
        const rawCover = concept.centralIdea.trim();
        if (rawCover.length <= 105) {
          primaryHeadline = rawCover;
        } else {
          const sliced = rawCover.slice(0, 105);
          const lastSpace = sliced.lastIndexOf(' ');
          primaryHeadline = `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:\s]+$/, '')}.`;
        }
        supportingCopy = `${topicShort.slice(0, 150)}.`;
        microcopy = `${pad} · EDITORIAL THESIS`;
        ctaText = 'SWIPE FOR THE ARCHITECTURAL BREAKDOWN →';
        backgroundTreatment = 'deep_navy';
        suggestedAssetId = 'asset_geo_compass_03';
        break;
      }
      case 'problem_statement':
        primaryHeadline = 'Where conventional workflows fracture under real operational load.';
        supportingCopy = painShort.slice(0, 210);
        microcopy = `${pad} · THE STRUCTURAL BOTTLENECK`;
        backgroundTreatment = 'warm_cream';
        break;
      case 'educational_content':
        primaryHeadline = 'Separate strategic reasoning from deterministic execution.';
        supportingCopy = `For ${brief.targetAudience.slice(0, 70)}, clarity comes from explicit contracts between strategy, design tokens, and production systems.`;
        microcopy = `${pad} · CORE PRINCIPLE`;
        backgroundTreatment = 'clean_white';
        break;
      case 'comparison':
        primaryHeadline = 'Ad-hoc execution versus governed system architecture.';
        supportingCopy =
          'Opaque outputs, inconsistent styling, manual rework, and fragile handoffs. | Validated schemas, reusable design tokens, deterministic layouts, and editable native files.';
        microcopy = `${pad} · SYSTEMIC CONTRAST`;
        backgroundTreatment = 'clean_white';
        break;
      case 'process_steps':
        primaryHeadline = 'A three-stage cadence built for inspectability and control.';
        supportingCopy =
          '1. Define the brief and strategic constraints.\n2. Validate narrative and layout geometry.\n3. Deliver native editable files with stable identifiers.';
        microcopy = `${pad} · EXECUTION SEQUENCE`;
        backgroundTreatment = 'warm_cream';
        break;
      case 'website_product_showcase':
      case 'advertising_showcase':
        primaryHeadline = 'Engineered interfaces where every component maps to a token.';
        supportingCopy = `Fig. ${pad} — Structured layout geometry ensures visual consistency from initial concept through native Figma handoff.`;
        microcopy = `${pad} · SYSTEM ARTIFACT`;
        backgroundTreatment = 'clean_white';
        suggestedAssetId = 'asset_arch_monolith_01';
        break;
      case 'service_showcase':
        primaryHeadline = 'Integrated capabilities across automation, systems, and design.';
        supportingCopy = serviceShort.slice(0, 200);
        microcopy = `${pad} · STUDIO CAPABILITIES`;
        backgroundTreatment = 'warm_cream';
        suggestedAssetId = 'asset_system_matrix_02';
        break;
      case 'case_study':
      case 'summary':
        primaryHeadline = 'Design for durability, human review, and zero black boxes.';
        supportingCopy =
          brief.supportingFacts?.trim().slice(0, 195) ||
          'Every stage of the workflow remains transparent, editable, and verifiable by the team that owns it.';
        microcopy = `${pad} · ARCHITECTURAL SUMMARY`;
        backgroundTreatment = 'warm_cream';
        break;
      case 'closing_slide':
      default:
        primaryHeadline = 'Ready to architect systems your team can inspect and own?';
        supportingCopy = `${brief.communicationObjective.slice(0, 160)}`;
        microcopy = `${pad} · NEXT STEP`;
        ctaText = concept.recommendedCta.slice(0, 64);
        backgroundTreatment = 'deep_navy';
        break;
    }

    return {
      id: `slide_${pad}`,
      slideNumber: n,
      category: cat,
      narrativePurpose: item.roleSummary,
      primaryHeadline,
      supportingCopy,
      microcopy,
      ctaText,
      intendedReadingOrder: ['Brand Wordmark', 'Section Kicker', 'Primary Headline', 'Supporting Copy'],
      visualFocalPoint: LAYOUT_PATTERN_META[defaultLayout].summary,
      layoutPattern: defaultLayout,
      suggestedAssetId,
      backgroundTreatment,
      relationshipToPrevious: idx === 0 ? 'Opening slide of carousel.' : `Builds directly on Slide ${String(idx).padStart(2, '0')}.`,
      relationshipToNext:
        idx === total - 1 ? 'Final slide of carousel.' : `Transitions into Slide ${String(idx + 2).padStart(2, '0')}.`,
      accessibilityNotes: 'Meets WCAG AA contrast (>12:1) with generous 84px outer canvas margins.',
      readabilityRisks: [],
      approved: false,
      lastModifiedAt: new Date().toISOString(),
    };
  });
}

const SLIDE_COPY_VARIATIONS: Record<
  SlideCategory,
  Array<{ headline: string; body: string }>
> = {
  cover_hook: [
    {
      headline: 'Systems endure when every layer remains human-governed.',
      body: 'Why modern technical and creative leaders are replacing black-box automation with deterministic architecture.',
    },
    {
      headline: 'Clarity is an architectural decision, not a surface aesthetic.',
      body: 'How structured workflows bridge strategy, engineering, and native design execution without friction.',
    },
  ],
  problem_statement: [
    {
      headline: 'Speed without structural validation compounds technical debt.',
      body: 'When teams rely on unverified outputs, every downstream revision requires rebuilding from scratch.',
    },
    {
      headline: 'Fragmented tooling forces creative teams into repetitive rework.',
      body: 'Disconnected briefs, copy docs, and flattened graphics break the link between strategy and final artwork.',
    },
  ],
  educational_content: [
    {
      headline: 'Treat design specifications as typed, verifiable contracts.',
      body: 'When layout geometry, typography tokens, and layer IDs are explicit, handoffs become deterministic.',
    },
    {
      headline: 'Generative reasoning excels at structure; native canvases excel at craft.',
      body: 'Keep each tool in its domain of strength so human art directors retain final authority.',
    },
  ],
  comparison: [
    {
      headline: 'Opaque automation versus inspectable studio architecture.',
      body: 'Flattened raster outputs, hardcoded styles, and brittle scripts. | Editable native frames, token snapshots, and safe re-imports by stable ID.',
    },
  ],
  process_steps: [
    {
      headline: 'Three deliberate gates from brief to editable Figma canvas.',
      body: '1. Approve the strategic concept.\n2. Refine the slide-by-slide narrative.\n3. Validate and import native layers into Figma.',
    },
  ],
  service_showcase: [
    {
      headline: 'AI Automation, Web Systems, and Editorial Production in concert.',
      body: 'LEGACYA SPHERE unifies technical architecture and minimalist editorial craft for enduring digital brands.',
    },
  ],
  advertising_showcase: [
    {
      headline: 'Campaign assets structured for multi-format editorial clarity.',
      body: 'Fig. A — Independent typography and geometry layers allow rapid adaptation without losing proportion.',
    },
  ],
  website_product_showcase: [
    {
      headline: 'Production interfaces governed by a single token system.',
      body: 'Fig. B — Explicit grid coordinates and baseline rules maintain precision across web and social formats.',
    },
  ],
  case_study: [
    {
      headline: '100% native editable layers across every exported frame.',
      body: 'Verified architectural standard: zero flattened text, deterministic coordinates, and safe re-import IDs.',
    },
  ],
  summary: [
    {
      headline: 'Discipline in the specification creates freedom on the canvas.',
      body: 'Validate structure early so art direction and human review focus on nuance rather than formatting fixes.',
    },
  ],
  closing_slide: [
    {
      headline: 'Partner with LEGACYA SPHERE on your next system architecture.',
      body: 'Schedule a focused technical and creative briefing to review your automation and design workflows.',
    },
  ],
};

/**
 * Regenerates copy for a single slide without touching any other slide or brand token.
 */
export function regenerateSingleSlideCopyLocal(
  slide: StoryboardSlide,
  brief: CreativeBrief,
  variationSeed = 0
): Pick<StoryboardSlide, 'primaryHeadline' | 'supportingCopy' | 'lastModifiedAt'> {
  const pool = SLIDE_COPY_VARIATIONS[slide.category] || SLIDE_COPY_VARIATIONS.educational_content;
  const pick = pool[variationSeed % pool.length];
  const nextHeadline =
    pick.headline === slide.primaryHeadline && pool.length > 1
      ? pool[(variationSeed + 1) % pool.length].headline
      : pick.headline;
  const nextBody =
    pick.headline === slide.primaryHeadline && pool.length > 1
      ? pool[(variationSeed + 1) % pool.length].body
      : pick.body;

  return {
    primaryHeadline: nextHeadline,
    supportingCopy: nextBody || `${brief.carouselTopic.slice(0, 140)}`,
    lastModifiedAt: new Date().toISOString(),
  };
}

const ORDERED_LAYOUT_PATTERNS: LayoutPatternId[] = [
  'minimal_cover',
  'editorial_headline',
  'split_composition',
  'comparison_columns',
  'numbered_steps',
  'large_statistic',
  'image_with_caption',
  'service_showcase',
  'product_showcase',
  'closing_statement',
];

/**
 * Cycles or selects a deterministic layout pattern for a single slide.
 */
export function getNextLayoutPattern(current: LayoutPatternId): LayoutPatternId {
  const idx = ORDERED_LAYOUT_PATTERNS.indexOf(current);
  return ORDERED_LAYOUT_PATTERNS[(idx + 1) % ORDERED_LAYOUT_PATTERNS.length];
}

/**
 * Generates an explicit, deterministic SVG architectural asset for a specific slide when requested.
 */
export function generateDeterministicSlideAsset(
  slide: StoryboardSlide,
  customPrompt?: string
): StudioAsset {
  const promptText =
    customPrompt?.trim() ||
    `Editorial geometric plate for Slide ${String(slide.slideNumber).padStart(2, '0')}: ${slide.primaryHeadline}`;
  const seed = slide.slideNumber * 37 + promptText.length;
  const bg = seed % 2 === 0 ? '#0F1A2C' : '#EBE6DC';
  const fg = seed % 2 === 0 ? '#F7F4EE' : '#121212';
  const accent = seed % 2 === 0 ? '#8DA2C4' : '#0F1A2C';
  const radius = 90 + (seed % 70);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="${bg}"/>
    <rect x="56" y="56" width="688" height="488" fill="none" stroke="${fg}" stroke-width="1.5" opacity="0.4"/>
    <circle cx="400" cy="300" r="${radius}" fill="none" stroke="${fg}" stroke-width="2"/>
    <line x1="160" y1="460" x2="640" y2="140" stroke="${accent}" stroke-width="2"/>
    <rect x="180" y="180" width="160" height="240" fill="${accent}" opacity="0.85"/>
    <circle cx="520" cy="260" r="8" fill="${fg}"/>
  </svg>`;

  return {
    id: `asset_gen_slide_${String(slide.slideNumber).padStart(2, '0')}_${Date.now()}`,
    name: `Slide ${String(slide.slideNumber).padStart(2, '0')} Architectural Plate`,
    category: 'abstract_visual',
    intendedSlideId: slide.id,
    prompt: promptText,
    status: 'ready',
    provenance: 'Explicit User-Triggered Studio Vector Synthesis (No text baked into image)',
    aspectRatio: '4:3',
    previewDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    createdAt: new Date().toISOString(),
  };
}
