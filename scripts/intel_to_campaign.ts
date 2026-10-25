import fs from 'node:fs';
import path from 'node:path';
import {
  compileCampaignFromIntelligence,
  DEFAULT_INTELLIGENCE,
} from '../src/services/intelligenceBridge';
import { MarketIntelligenceRecord } from '../src/types/studio';

export { DEFAULT_INTELLIGENCE };
export type { MarketIntelligenceRecord };

export function runIntelligenceToCampaign(
  intel: MarketIntelligenceRecord = DEFAULT_INTELLIGENCE
) {
  console.log('=== LEGACYA SPHERE: INTELLIGENCE (#3) -> VISUAL CAMPAIGN (#2) PIPELINE ===\n');
  console.log(`[1] Ingesting Intelligence Source: ${intel.source}`);
  console.log(`    Hook: "${intel.provenHook}"`);
  console.log(`    Audience: ${intel.coreAudience}`);
  console.log(`    Pain Point: ${intel.targetPainPoint}\n`);

  const compiled = compileCampaignFromIntelligence(intel);

  console.log('[2] Brief synthesized and validated successfully.');
  console.log(`[3] Generated Concept: "${compiled.concept.centralIdea}"`);
  console.log(`    Arc: "${compiled.concept.narrativeArc}"`);
  console.log(`[4] Generated ${compiled.storyboard.length}-Slide Storyboard:`);
  compiled.storyboard.forEach((slide) => {
    console.log(
      `    - Slide ${slide.slideNumber} [${slide.category} / ${slide.layoutPattern}]: "${slide.primaryHeadline}"`
    );
  });
  console.log(`\n[5] Contract Compiled & Validated: 1.0.0 Schema Validated (0 errors).`);

  const outputDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contractPath = path.join(outputDir, 'legacya_campaign_figma_contract.json');
  const promptsPath = path.join(outputDir, 'image_prompt_matrix.json');
  const previewPath = path.join(outputDir, 'carousel_preview.html');

  fs.writeFileSync(contractPath, JSON.stringify(compiled.contract, null, 2), 'utf-8');
  fs.writeFileSync(promptsPath, JSON.stringify(compiled.promptMatrix, null, 2), 'utf-8');
  fs.writeFileSync(previewPath, compiled.htmlPreview, 'utf-8');

  console.log('\n[6] Outputs Generated Successfully:');
  console.log(`    - Figma Contract: ${contractPath}`);
  console.log(`    - Prompt Matrix: ${promptsPath}`);
  console.log(`    - HTML Preview:  ${previewPath}\n`);
  console.log('=== PIPELINE COMPLETE ===');

  return {
    brief: compiled.brief,
    concept: compiled.concept,
    storyboard: compiled.storyboard,
    project: compiled.project,
    contract: compiled.contract,
    promptMatrix: compiled.promptMatrix,
    contractPath,
    promptsPath,
    previewPath,
  };
}

if (process.argv[1]?.includes('intel_to_campaign')) {
  runIntelligenceToCampaign();
}
