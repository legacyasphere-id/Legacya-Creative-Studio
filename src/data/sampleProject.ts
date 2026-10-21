import { DEFAULT_BRAND_TOKENS } from '../tokens/defaultTokens';
import { StudioAsset, StudioProject } from '../types/studio';

function createArchitecturalSvgDataUrl(
  variant: 'monolith' | 'grid_matrix' | 'compass_arc' | 'wordmark_plate'
): string {
  let svg = '';
  if (variant === 'monolith') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#EBE6DC"/>
      <rect x="60" y="60" width="680" height="480" fill="none" stroke="#121212" stroke-width="1.5"/>
      <line x1="60" y1="300" x2="740" y2="300" stroke="#BDB6A8" stroke-width="1"/>
      <line x1="400" y1="60" x2="400" y2="540" stroke="#BDB6A8" stroke-width="1"/>
      <rect x="140" y="120" width="220" height="360" fill="#0F1A2C"/>
      <circle cx="540" cy="300" r="140" fill="none" stroke="#121212" stroke-width="2"/>
      <line x1="400" y1="440" x2="680" y2="160" stroke="#121212" stroke-width="1.5"/>
      <circle cx="540" cy="300" r="6" fill="#0F1A2C"/>
    </svg>`;
  } else if (variant === 'grid_matrix') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#0F1A2C"/>
      <rect x="64" y="64" width="672" height="472" fill="none" stroke="#364663" stroke-width="1.5"/>
      <line x1="288" y1="64" x2="288" y2="536" stroke="#364663" stroke-width="1"/>
      <line x1="512" y1="64" x2="512" y2="536" stroke="#364663" stroke-width="1"/>
      <line x1="64" y1="220" x2="736" y2="220" stroke="#364663" stroke-width="1"/>
      <line x1="64" y1="376" x2="736" y2="376" stroke="#364663" stroke-width="1"/>
      <circle cx="288" cy="220" r="76" fill="none" stroke="#F7F4EE" stroke-width="2"/>
      <rect x="330" y="252" width="148" height="92" fill="#F7F4EE"/>
      <line x1="64" y1="536" x2="736" y2="64" stroke="#F7F4EE" stroke-width="1" stroke-dasharray="6 6"/>
    </svg>`;
  } else if (variant === 'compass_arc') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#F7F4EE"/>
      <circle cx="400" cy="300" r="210" fill="none" stroke="#121212" stroke-width="1.5"/>
      <circle cx="400" cy="300" r="130" fill="none" stroke="#5C5852" stroke-width="1" stroke-dasharray="4 4"/>
      <path d="M 190 300 A 210 210 0 0 1 400 90 L 400 300 Z" fill="#0F1A2C"/>
      <line x1="120" y1="300" x2="680" y2="300" stroke="#121212" stroke-width="1"/>
      <line x1="400" y1="40" x2="400" y2="560" stroke="#121212" stroke-width="1"/>
    </svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
      <rect width="600" height="600" fill="#121212"/>
      <circle cx="300" cy="300" r="190" fill="none" stroke="#F7F4EE" stroke-width="2"/>
      <line x1="166" y1="434" x2="434" y2="166" stroke="#F7F4EE" stroke-width="2"/>
      <rect x="240" y="240" width="120" height="120" fill="none" stroke="#D8D2C5" stroke-width="1.5"/>
    </svg>`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_STUDIO_ASSETS: StudioAsset[] = [
  {
    id: 'asset_logo_sphere_mark',
    name: 'LEGACYA SPHERE Geometric Emblem (Provisional)',
    category: 'brand_logo',
    status: 'ready',
    provenance: 'Provisional Studio Identity Vector · Deterministic SVG',
    aspectRatio: '1:1',
    previewDataUrl: createArchitecturalSvgDataUrl('wordmark_plate'),
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'asset_arch_monolith_01',
    name: 'Architectural System Monolith & Proportion Study',
    category: 'editorial_photography',
    intendedSlideId: 'slide_05',
    prompt:
      'Minimalist architectural study contrasting solid deep navy structure with geometric circle and diagonal axis on warm stone.',
    status: 'ready',
    provenance: 'Studio Deterministic Architectural Plate · No external URL dependency',
    aspectRatio: '4:3',
    previewDataUrl: createArchitecturalSvgDataUrl('monolith'),
    createdAt: '2026-10-20T09:15:00.000Z',
  },
  {
    id: 'asset_system_matrix_02',
    name: 'Autonomous Pipeline Grid Topology',
    category: 'product_imagery',
    intendedSlideId: 'slide_06',
    prompt: 'High-contrast blueprint matrix illustrating deterministic workflow orchestration.',
    status: 'ready',
    provenance: 'Studio Deterministic System Diagram · Native SVG Plate',
    aspectRatio: '4:3',
    previewDataUrl: createArchitecturalSvgDataUrl('grid_matrix'),
    createdAt: '2026-10-20T09:20:00.000Z',
  },
  {
    id: 'asset_geo_compass_03',
    name: 'Quadrant Radial Measure & Baseline Arc',
    category: 'geometric_vector',
    status: 'ready',
    provenance: 'Studio Geometric Motif Library · Reusable Vector Plate',
    aspectRatio: '4:3',
    previewDataUrl: createArchitecturalSvgDataUrl('compass_arc'),
    createdAt: '2026-10-20T09:25:00.000Z',
  },
];

export const INITIAL_SAMPLE_PROJECT: StudioProject = {
  id: 'proj_legacya_q4_systems_01',
  status: 'Ready for review',
  createdAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-20T10:30:00.000Z',
  brief: {
    projectName: 'Autonomous Systems Architecture — Q4 Editorial Series',
    carouselTopic:
      'Why high-growth creative and technical organizations replace fragile prompt chains with deterministic, human-governed digital systems.',
    targetAudience:
      'Founders, COOs, VPs of Engineering, and Design Directors evaluating AI automation and custom web platforms.',
    communicationObjective:
      'Educate technical decision-makers on the difference between ad-hoc automation scripts and resilient architectural systems, positioning LEGACYA SPHERE as an authoritative engineering and creative partner.',
    language: 'English',
    desiredSlideCount: 7,
    productOrService:
      'AI Automation Architecture, Custom Web & Systems Engineering, and Editorial Creative Production.',
    audiencePainPoint:
      'Teams deploy disconnected AI tools and brittle no-code zaps that break silently in production and dilute brand rigor.',
    desiredAudienceResponse:
      'Audit their internal workflows for single points of failure and initiate an architectural review with LEGACYA SPHERE.',
    toneOfVoice: 'Editorial, understated, analytical, architecturally precise, confident without hype.',
    keyMessage:
      'Enduring leverage comes from deterministic system architecture and human editorial governance—never from unverified automation.',
    callToAction: 'REQUEST AN ARCHITECTURAL BRIEFING · LEGACYASPHERE.STUDIO',
    supportingFacts:
      'LEGACYA SPHERE separates creative reasoning from deterministic execution: AI drafts structured specifications, while schema validators and native design tools remain the source of truth.',
    referenceLinks: 'internal://legacya-sphere/architecture-principles-2026',
    existingCopy:
      'Automation without architecture only accelerates chaos. Build systems that remain inspectable, editable, and human-governed.',
    referenceImages: 'asset_arch_monolith_01, asset_system_matrix_02',
    preferredVisualDirection:
      'Warm cream paper field (#F7F4EE), deep navy structural anchor slides (#0F1A2C), crisp hairline rules, Fraunces editorial serif headings paired with Plus Jakarta Sans prose.',
    excludedContent:
      'No unverified ROI percentages, no fabricated client quotes, no neon cyberpunk gradients, no generic chatbot tropes.',
    legalDisclaimers:
      'Architectural examples illustrate LEGACYA SPHERE methodology; no third-party performance claims are implied.',
  },
  concept: {
    id: 'concept_legacya_q4_01',
    generatedAt: '2026-10-20T09:30:00.000Z',
    source: 'local_deterministic',
    approved: true,
    approvedAt: '2026-10-20T09:42:00.000Z',
    creativeRationale:
      'Decision-makers are fatigued by exaggerated AI promises. By framing automation as an architectural discipline—similar to structural engineering or editorial typography—the carousel earns immediate intellectual credibility.',
    centralIdea: 'Architecture Precedes Automation.',
    audienceInsight:
      'Senior operators do not fear new technology; they fear opaque black boxes that their teams cannot inspect, debug, or edit when business requirements change.',
    intendedEmotionalResponse:
      'Intellectual clarity, relief from hype, and trust in disciplined systems engineering.',
    narrativeArc:
      'Open with a sharp thesis on why fragile automation fails (Slides 1–2), contrast ad-hoc workflows against deterministic systems (Slide 3), outline the 3-layer studio methodology (Slide 4), demonstrate real system + creative deliverables (Slides 5–6), and close with a restrained briefing invitation (Slide 7).',
    keyMessage:
      'Pair generative intelligence with deterministic validation and native human-editable tools.',
    visualMetaphor:
      'Architectural blueprints and typographic grids: circles, diagonal axes, and strict 12-column margins that hold complex content in calm equilibrium.',
    recommendedSlideSequence: [
      {
        slideNumber: 1,
        category: 'cover_hook',
        roleSummary: 'Interrupt scrolling with the core thesis: Automation without architecture accelerates entropy.',
      },
      {
        slideNumber: 2,
        category: 'problem_statement',
        roleSummary: 'Diagnose why disconnected prompt chains and brittle glue scripts fail under operational load.',
      },
      {
        slideNumber: 3,
        category: 'comparison',
        roleSummary: 'Contrast ad-hoc prompt workflows against governed, schema-validated system architecture.',
      },
      {
        slideNumber: 4,
        category: 'process_steps',
        roleSummary: 'Present the three-stage LEGACYA SPHERE engineering cadence: Specify, Validate, Commit.',
      },
      {
        slideNumber: 5,
        category: 'website_product_showcase',
        roleSummary: 'Illustrate how custom web interfaces and backend pipelines share a single typed contract.',
      },
      {
        slideNumber: 6,
        category: 'service_showcase',
        roleSummary: 'Detail the three integrated studio pillars: AI Automation, Systems Development, Creative Production.',
      },
      {
        slideNumber: 7,
        category: 'closing_slide',
        roleSummary: 'Provide a clear synthesis and direct invitation for an architectural systems review.',
      },
    ],
    proposedArtDirection:
      '3:4 portrait (1080×1440) using Warm Cream (#F7F4EE) for analytical reading slides, Clean White (#FFFFFF) for structured comparisons, and Deep Navy (#0F1A2C) for cover/closing punctuation.',
    recommendedCta: 'REQUEST AN ARCHITECTURAL BRIEFING · LEGACYASPHERE.STUDIO',
    factualClaimsToVerify: [
      {
        claim: 'Separating probabilistic AI reasoning from deterministic schema validation prevents silent downstream corruption.',
        classification: 'established_fact',
        note: 'Grounded in standard software engineering practice (type-safe boundaries and schema validation).',
      },
      {
        claim: 'Unverified ad-hoc automations increase maintenance overhead as workflow complexity scales.',
        classification: 'reasonable_interpretation',
        note: 'Presented as an architectural principle rather than a numerical statistic; no external citation required.',
      },
    ],
  },
  storyboard: [
    {
      id: 'slide_01',
      slideNumber: 1,
      category: 'cover_hook',
      narrativePurpose: 'Establish the central editorial thesis and earn the initial swipe.',
      primaryHeadline: 'Automation without architecture only accelerates entropy.',
      supportingCopy:
        'Why enduring digital operations rely on deterministic systems, typed contracts, and human editorial governance.',
      microcopy: '01 · ARCHITECTURAL THESIS',
      ctaText: 'SWIPE FOR THE SYSTEM SPECIFICATION →',
      intendedReadingOrder: ['Brand Wordmark', 'Section Kicker', 'Primary Cover Display', 'Cover Deck Copy', 'CTA'],
      visualFocalPoint: 'Monumental Fraunces display headline balanced by upper-right geometric circle and diagonal axis.',
      layoutPattern: 'minimal_cover',
      suggestedAssetId: 'asset_geo_compass_03',
      backgroundTreatment: 'deep_navy',
      relationshipToPrevious: 'Opening frame of the 7-slide sequence.',
      relationshipToNext: 'Sets up the structural diagnosis unpacked on Slide 02.',
      accessibilityNotes: 'Warm Cream text (#F7F4EE) on Deep Navy (#0F1A2C) yields 14.3:1 contrast ratio.',
      readabilityRisks: [],
      approved: true,
      lastModifiedAt: '2026-10-20T09:45:00.000Z',
    },
    {
      id: 'slide_02',
      slideNumber: 2,
      category: 'problem_statement',
      narrativePurpose: 'Name the exact operational failure mode experienced by technical and creative leaders.',
      primaryHeadline: 'Most organizations confuse connected scripts with engineered systems.',
      supportingCopy:
        'Chaining prompts and third-party webhooks creates an illusion of speed. When an upstream payload drifts, brittle automations fail silently and leave teams debugging opaque outputs.',
      microcopy: '02 · THE STRUCTURAL FRICTION',
      ctaText: '',
      intendedReadingOrder: ['Section Kicker', 'Primary Editorial Headline', 'Supporting Editorial Prose'],
      visualFocalPoint: 'High-contrast serif problem statement underscored by a 160px measure rule.',
      layoutPattern: 'editorial_headline',
      suggestedAssetId: '',
      backgroundTreatment: 'warm_cream',
      relationshipToPrevious: 'Explains why the entropy named on Slide 01 occurs in practice.',
      relationshipToNext: 'Prepares the side-by-side architectural comparison on Slide 03.',
      accessibilityNotes: 'Ink Black (#121212) on Warm Cream (#F7F4EE) exceeds 15:1 contrast.',
      readabilityRisks: [],
      approved: true,
      lastModifiedAt: '2026-10-20T09:48:00.000Z',
    },
    {
      id: 'slide_03',
      slideNumber: 3,
      category: 'comparison',
      narrativePurpose: 'Contrast fragile ad-hoc workflows against LEGACYA SPHERE system architecture.',
      primaryHeadline: 'Two ways to deploy intelligence across an operation.',
      supportingCopy:
        'Unvalidated model outputs written directly to production databases, flattened raster graphics, and zero audit trail. | Schema-validated contracts, deterministic layout bounds, explicit human approval gates, and editable native files.',
      microcopy: '03 · ARCHITECTURAL CONTRAST',
      ctaText: '',
      intendedReadingOrder: ['Comparison Headline', 'Column A (Fragmented)', 'Column B (LEGACYA Architecture)'],
      visualFocalPoint: 'Dual vertical architectural columns separated by a 32px gutter.',
      layoutPattern: 'comparison_columns',
      suggestedAssetId: '',
      backgroundTreatment: 'clean_white',
      relationshipToPrevious: 'Translates the problem statement into a concrete side-by-side choice.',
      relationshipToNext: 'Leads into the step-by-step methodology on Slide 04.',
      accessibilityNotes: 'Distinct structural borders and numbered column headers avoid color-only signaling.',
      readabilityRisks: [],
      approved: false,
      lastModifiedAt: '2026-10-20T09:50:00.000Z',
    },
    {
      id: 'slide_04',
      slideNumber: 4,
      category: 'process_steps',
      narrativePurpose: 'Explain the three-part engineering rule that governs every studio system.',
      primaryHeadline: 'Reason with models. Validate with schemas. Commit to native tools.',
      supportingCopy:
        '1. Structured Reasoning: AI synthesizes strategy and drafts structured specifications.\n2. Deterministic Validation: Strict geometry and schema checks reject invalid bounds.\n3. Native Source of Truth: Final assets live in editable Figma canvases and typed codebases.',
      microcopy: '04 · OPERATIONAL METHODOLOGY',
      ctaText: '',
      intendedReadingOrder: ['Step Monumental Numeral', 'Step Headline', 'Step Methodology Body'],
      visualFocalPoint: '112px tabular numeral index anchored above a full-width hairline divider.',
      layoutPattern: 'numbered_steps',
      suggestedAssetId: '',
      backgroundTreatment: 'warm_cream',
      relationshipToPrevious: 'Shows how Column B from Slide 03 is implemented.',
      relationshipToNext: 'Demonstrates this methodology in a tangible system showcase on Slide 05.',
      accessibilityNotes: 'Generous 1.48x line height ensures clear separation between numbered lines.',
      readabilityRisks: [],
      approved: false,
      lastModifiedAt: '2026-10-20T09:55:00.000Z',
    },
    {
      id: 'slide_05',
      slideNumber: 5,
      category: 'website_product_showcase',
      narrativePurpose: 'Show how visual design and systems engineering share one deterministic contract.',
      primaryHeadline: 'Every layer remains independent, inspectable, and native.',
      supportingCopy:
        'Fig. 01 — Instead of flattening slides into dead pixels, our layout engine compiles validated coordinates, typography tokens, and stable layer IDs for native Figma import.',
      microcopy: '05 · SYSTEM SPECIFICATION',
      ctaText: '',
      intendedReadingOrder: ['Showcase Headline', 'Visual Asset Frame', 'Editorial Figure Caption'],
      visualFocalPoint: 'Framed 4:3 architectural plate with structured caption underneath.',
      layoutPattern: 'product_showcase',
      suggestedAssetId: 'asset_arch_monolith_01',
      backgroundTreatment: 'clean_white',
      relationshipToPrevious: 'Makes the abstract methodology on Slide 04 visually concrete.',
      relationshipToNext: 'Expands into the broader LEGACYA SPHERE studio capabilities on Slide 06.',
      accessibilityNotes: 'Includes descriptive altText metadata for the placed IMAGE node.',
      readabilityRisks: [],
      approved: false,
      lastModifiedAt: '2026-10-20T10:00:00.000Z',
    },
    {
      id: 'slide_06',
      slideNumber: 6,
      category: 'service_showcase',
      narrativePurpose: 'Present the three core disciplines of LEGACYA SPHERE without sales clutter.',
      primaryHeadline: 'Three integrated disciplines under one architectural standard.',
      supportingCopy:
        '01. AI Automation Systems — Human-in-the-loop workflows with strict schema boundaries.\n02. Web & Systems Development — Full-stack TypeScript platforms built for longevity.\n03. Creative Production — Editorial design systems engineered for native Figma handoff.',
      microcopy: '06 · STUDIO PRACTICE',
      ctaText: '',
      intendedReadingOrder: ['Section Kicker', 'Split Upper Thesis', 'Supporting Specification Copy'],
      visualFocalPoint: 'Split horizontal composition separating the studio standard from the three practice areas.',
      layoutPattern: 'split_composition',
      suggestedAssetId: 'asset_system_matrix_02',
      backgroundTreatment: 'warm_cream',
      relationshipToPrevious: 'Connects the product specification to the studio’s full client offering.',
      relationshipToNext: 'Sets up the closing synthesis and briefing invitation on Slide 07.',
      accessibilityNotes: 'High-contrast surface box provides clear visual grouping.',
      readabilityRisks: [],
      approved: false,
      lastModifiedAt: '2026-10-20T10:05:00.000Z',
    },
    {
      id: 'slide_07',
      slideNumber: 7,
      category: 'closing_slide',
      narrativePurpose: 'Conclude with editorial restraint and a clear, actionable next step.',
      primaryHeadline: 'Build systems your team can inspect, refine, and own.',
      supportingCopy:
        'LEGACYA SPHERE partners with select leadership teams to architect custom AI workflows, web platforms, and editorial design systems.',
      microcopy: '07 · INITIATE DIALOGUE',
      ctaText: 'REQUEST AN ARCHITECTURAL BRIEFING · LEGACYASPHERE.STUDIO',
      intendedReadingOrder: ['Section Kicker', 'Primary Editorial Headline', 'Supporting Editorial Prose', 'CTA Container'],
      visualFocalPoint: 'Deep Navy closing frame with geometric circle motif and high-contrast CTA block.',
      layoutPattern: 'closing_statement',
      suggestedAssetId: '',
      backgroundTreatment: 'deep_navy',
      relationshipToPrevious: 'Completes the 7-slide narrative arc.',
      relationshipToNext: 'Final slide in carousel.',
      accessibilityNotes: '14.3:1 contrast ratio on primary headline and CTA button.',
      readabilityRisks: [],
      approved: true,
      lastModifiedAt: '2026-10-20T10:10:00.000Z',
    },
  ],
  brandTokens: structuredClone(DEFAULT_BRAND_TOKENS),
  assets: structuredClone(SAMPLE_STUDIO_ASSETS),
  handoffState: {
    jsonGenerated: true,
    jsonValidated: true,
    figmaPluginImplemented: true,
    figmaImportCompleted: false, // Honest: requires running the plugin inside desktop/web Figma
    designReviewed: false,
    designApproved: false,
  },
  history: [
    {
      id: 'hist_01',
      timestamp: '2026-10-20T09:00:00.000Z',
      operation: 'brief_saved',
      mode: 'local_deterministic',
      summary: 'Initialized creative brief "Autonomous Systems Architecture — Q4 Editorial Series" (7 slides, 3:4 portrait).',
    },
    {
      id: 'hist_02',
      timestamp: '2026-10-20T09:30:00.000Z',
      operation: 'concept_generated',
      mode: 'local_deterministic',
      summary: 'Generated strategic concept "Architecture Precedes Automation" with 2 factual verification flags.',
    },
    {
      id: 'hist_03',
      timestamp: '2026-10-20T09:45:00.000Z',
      operation: 'storyboard_generated',
      mode: 'local_deterministic',
      summary: 'Compiled 7-slide narrative storyboard across 7 distinct slide categories and layout patterns.',
    },
    {
      id: 'hist_04',
      timestamp: '2026-10-20T10:15:00.000Z',
      operation: 'layout_compiled',
      mode: 'local_deterministic',
      summary: 'Validated deterministic 1080×1440 Figma node coordinates and WCAG AA contrast ratios.',
    },
  ],
};
