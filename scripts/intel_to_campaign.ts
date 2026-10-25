import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BRAND_TOKENS } from '../src/tokens/defaultTokens';
import { SAMPLE_STUDIO_ASSETS } from '../src/data/sampleProject';
import {
  generateConceptLocal,
  generateStoryboardLocal,
  validateBriefForm,
} from '../src/services/creativeEngine';
import { buildFigmaExportContract } from '../src/services/exportSerializer';
import { validateExportContractJson } from '../src/services/schemaValidator';
import { CreativeBrief, StudioProject } from '../src/types/studio';

// Intelligence Input Record (Simulating Market & Competitor Intel from #3)
export interface MarketIntelligenceRecord {
  source: string;
  industrySector: string;
  coreAudience: string;
  targetPainPoint: string;
  provenHook: string;
  marketProofMetric: string;
  strategicSolution: string;
}

// Default Intelligence: The Shift from Traditional Agency Retainers to Autonomous AI-Native Systems
export const DEFAULT_INTELLIGENCE: MarketIntelligenceRecord = {
  source: 'Agency Market Analysis 2026 / Founder Intelligence Briefing',
  industrySector: 'B2B Creative & Operations Automation',
  coreAudience: 'Founders, Agency Owners & Enterprise Brand Directors',
  targetPainPoint: 'Traditional retainers burn $5k-$15k/month on manual design and ops bottlenecks that take weeks to deliver simple campaign assets.',
  provenHook: 'Why High-Performing Brands Are Firing Traditional Retainers for Autonomous Studio Infrastructure.',
  marketProofMetric: '85% faster campaign velocity with 100% deterministic brand consistency.',
  strategicSolution: 'Deploying autonomous creative workflows and Figma-linked token systems (LEGACYA SPHERE Method).',
};

export function runIntelligenceToCampaign(intel: MarketIntelligenceRecord = DEFAULT_INTELLIGENCE) {
  console.log('=== LEGACYA SPHERE: INTELLIGENCE (#3) -> VISUAL CAMPAIGN (#2) PIPELINE ===\n');
  console.log(`[1] Ingesting Intelligence Source: ${intel.source}`);
  console.log(`    Hook: "${intel.provenHook}"`);
  console.log(`    Audience: ${intel.coreAudience}`);
  console.log(`    Pain Point: ${intel.targetPainPoint}\n`);

  // Step 1: Synthesize into Creative Brief
  const brief: CreativeBrief = {
    projectName: 'LEGACYA SPHERE — Autonomous Studio Engine',
    carouselTopic: `${intel.provenHook} How autonomous infrastructure eliminates agency bloat.`,
    targetAudience: intel.coreAudience,
    communicationObjective: `Demonstrate authority in B2B systems automation and brand campaign architecture. Metric: ${intel.marketProofMetric}.`,
    language: 'English',
    desiredSlideCount: 5,
    designStyleNotes: 'Warm Cream (#F7F4EE) with Deep Navy (#0F1A2C), architectural geometric layout, Fraunces serif headlines, Plus Jakarta Sans body.',
  };

  const validation = validateBriefForm(brief);
  if (!validation.valid) {
    throw new Error(`Invalid brief generated from intelligence: ${JSON.stringify(validation.fieldErrors)}`);
  }
  console.log('[2] Brief synthesized and validated successfully.');

  // Step 2: Generate Concept
  const concept = generateConceptLocal(brief);
  console.log(`[3] Generated Concept: "${concept.centralIdea}"`);
  console.log(`    Arc: "${concept.narrativeArc}"`);

  // Step 3: Generate 5-Slide Storyboard
  const storyboard = generateStoryboardLocal(brief, concept);
  console.log(`[4] Generated ${storyboard.length}-Slide Storyboard:`);
  storyboard.forEach((slide) => {
    console.log(`    - Slide ${slide.slideNumber} [${slide.category} / ${slide.layoutPattern}]: "${slide.primaryHeadline}"`);
  });

  // Step 4: Assemble StudioProject
  const project: StudioProject = {
    id: `project_intel_${Date.now()}`,
    status: 'review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief,
    concept,
    storyboard,
    brandTokens: DEFAULT_BRAND_TOKENS,
    assets: SAMPLE_STUDIO_ASSETS,
    handoffState: 'ready',
    history: [],
  };

  // Step 5: Compile Figma Export Contract (1.0.0)
  const contract = buildFigmaExportContract(project);
  const contractValidation = validateExportContractJson(contract);

  if (!contractValidation.valid) {
    throw new Error(`Export contract validation failed: ${JSON.stringify(contractValidation.errors)}`);
  }
  console.log(`\n[5] Contract Compiled & Validated: 1.0.0 Schema Validated (0 errors).`);

  // Step 6: Create Image Prompt Matrix (Formatted for Google Flow MCP & Diffusion Models)
  const promptMatrix = storyboard.map((slide) => ({
    slideNumber: slide.slideNumber,
    category: slide.category,
    headline: slide.primaryHeadline,
    visualConcept: slide.visualFocalPoint,
    flowMcpPrompt: `Minimal architectural composition, editorial photography, high-end studio lighting, deep navy #0F1A2C accents on warm cream #F7F4EE textured background, ultra-sharp detail, 3:4 aspect ratio, subtle geometric structure reflecting ${slide.primaryHeadline.toLowerCase()}`,
    aspectRatio: '3:4',
  }));

  // Step 7: Generate Standalone HTML Carousel Preview
  const htmlPreview = generateHtmlPreview(project, storyboard);

  // Write output files
  const outputDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contractPath = path.join(outputDir, 'legacya_campaign_figma_contract.json');
  const promptsPath = path.join(outputDir, 'image_prompt_matrix.json');
  const previewPath = path.join(outputDir, 'carousel_preview.html');

  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), 'utf-8');
  fs.writeFileSync(promptsPath, JSON.stringify(promptMatrix, null, 2), 'utf-8');
  fs.writeFileSync(previewPath, htmlPreview, 'utf-8');

  console.log('\n[6] Outputs Generated Successfully:');
  console.log(`    - Figma Contract: ${contractPath}`);
  console.log(`    - Prompt Matrix: ${promptsPath}`);
  console.log(`    - HTML Preview:  ${previewPath}\n`);
  console.log('=== PIPELINE COMPLETE ===');

  return { contract, promptMatrix, contractPath, promptsPath, previewPath };
}

function generateHtmlPreview(project: StudioProject, storyboard: typeof project.storyboard): string {
  const slidesHtml = storyboard
    .map(
      (s) => `
      <div class="slide-card">
        <div class="slide-badge">Slide ${s.slideNumber} · ${s.category.toUpperCase()}</div>
        <div class="slide-layout">Pattern: <code>${s.layoutPattern}</code></div>
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
  <title>LEGACYA SPHERE — Carousel Preview</title>
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #F7F4EE;
      color: #121212;
      margin: 0;
      padding: 32px;
    }
    .header {
      max-width: 1200px;
      margin: 0 auto 32px auto;
      border-bottom: 2px solid #0F1A2C;
      padding-bottom: 16px;
    }
    h1 {
      font-family: 'Fraunces', serif;
      font-size: 32px;
      color: #0F1A2C;
      margin: 0 0 8px 0;
    }
    .meta {
      font-size: 14px;
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
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(15, 26, 44, 0.05);
      display: flex;
      flex-direction: column;
    }
    .slide-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0F1A2C;
      background: #EBE6DC;
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 12px;
      align-self: flex-start;
    }
    .slide-layout {
      font-size: 12px;
      color: #5C5852;
      margin-bottom: 12px;
    }
    .slide-headline {
      font-family: 'Fraunces', serif;
      font-size: 20px;
      color: #0F1A2C;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .slide-body {
      font-size: 14px;
      line-height: 1.6;
      color: #333333;
      margin-bottom: 16px;
      flex-grow: 1;
    }
    .slide-visual {
      font-size: 12px;
      background: #F7F4EE;
      border-left: 3px solid #0F1A2C;
      padding: 8px 12px;
      color: #5C5852;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEGACYA SPHERE — Campaign Storyboard</h1>
    <div class="meta">Project: ${project.brief.projectName} · Ratio: 3:4 (1080×1440) · Contract: v1.0.0</div>
  </div>
  <div class="grid">
    ${slidesHtml}
  </div>
</body>
</html>`;
}

if (process.argv[1]?.includes('intel_to_campaign')) {
  runIntelligenceToCampaign();
}
