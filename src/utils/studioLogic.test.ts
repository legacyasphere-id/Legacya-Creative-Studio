import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_SAMPLE_PROJECT } from '../data/sampleProject';
import { DEFAULT_BRAND_TOKENS } from '../tokens/defaultTokens';
import { compileSlideSpecification, computeContrastRatio } from '../services/layoutEngine';
import {
  validateExportContractJson,
  validateProjectSpecifications,
} from '../services/schemaValidator';
import { buildFigmaExportContract } from '../services/exportSerializer';
import {
  generateConceptLocal,
  generateStoryboardLocal,
  validateBriefForm,
} from '../services/creativeEngine';
import { LayoutPatternId } from '../types/studio';

test('WCAG contrast calculation returns accurate ratios for LEGACYA SPHERE tokens', () => {
  const navyOnCream = computeContrastRatio(
    DEFAULT_BRAND_TOKENS.colors.backgroundPrimary,
    DEFAULT_BRAND_TOKENS.colors.surfaceDark
  );
  assert.equal(navyOnCream >= 12, true);

  const inkOnWhite = computeContrastRatio(
    DEFAULT_BRAND_TOKENS.colors.backgroundSecondary,
    DEFAULT_BRAND_TOKENS.colors.textPrimary
  );
  assert.equal(inkOnWhite >= 15, true);
});

test('Layout engine produces deterministic coordinates and stays strictly within 1080x1440 bounds across all 10 patterns', () => {
  const allPatterns: LayoutPatternId[] = [
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

  const baseSlide = INITIAL_SAMPLE_PROJECT.storyboard[0];

  for (const pattern of allPatterns) {
    const slideVariant = { ...baseSlide, layoutPattern: pattern };
    const specA = compileSlideSpecification(
      slideVariant,
      7,
      DEFAULT_BRAND_TOKENS,
      INITIAL_SAMPLE_PROJECT.assets
    );
    const specB = compileSlideSpecification(
      slideVariant,
      7,
      DEFAULT_BRAND_TOKENS,
      INITIAL_SAMPLE_PROJECT.assets
    );

    // Determinism check
    assert.deepEqual(specA, specB);
    assert.equal(specA.width, 1080);
    assert.equal(specA.height, 1440);
    assert.equal(specA.elements.length > 0, true);

    // Bounds check for every native layer
    for (const el of specA.elements) {
      assert.equal(
        el.x >= 0 && el.y >= 0,
        true,
        `Pattern ${pattern} layer ${el.id} has negative origin (${el.x}, ${el.y})`
      );
      assert.equal(
        el.x + el.width <= specA.width && el.y + el.height <= specA.height,
        true,
        `Pattern ${pattern} layer ${el.id} exceeds 1080x1440 canvas (${el.x + el.width}x${el.y + el.height})`
      );
    }
  }
});

test('Export serializer builds valid 1.0.0 contract with globally unique stable layer IDs', () => {
  const contract = buildFigmaExportContract(INITIAL_SAMPLE_PROJECT);
  assert.equal(contract.schemaVersion, '1.0.0');
  assert.equal(contract.coordinateSystem.origin, 'TOP_LEFT');
  assert.equal(contract.slides.length, 7);

  const report = validateExportContractJson(JSON.stringify(contract));
  assert.equal(report.valid, true, `Expected valid contract, got errors: ${JSON.stringify(report.errors)}`);
  assert.equal(report.errors.length, 0);
  assert.equal(report.totalSlidesChecked, 7);
  assert.equal(report.totalLayersChecked > 25, true);
});

test('Schema validator rejects malformed JSON, invalid schemaVersion, duplicate layer IDs, and out-of-bounds coordinates', () => {
  const syntaxReport = validateExportContractJson('{ invalid json ');
  assert.equal(syntaxReport.valid, false);
  assert.equal(syntaxReport.errors[0].code, 'INVALID_JSON_SYNTAX');

  const contract = buildFigmaExportContract(INITIAL_SAMPLE_PROJECT);
  const brokenContract = structuredClone(contract) as any;
  brokenContract.schemaVersion = '0.9.0';
  // Force duplicate layer ID and out-of-bounds width
  brokenContract.slides[1].layers[0].id = brokenContract.slides[0].layers[0].id;
  brokenContract.slides[0].layers[0].width = 2400;

  const brokenReport = validateExportContractJson(brokenContract);
  assert.equal(brokenReport.valid, false);
  const codes = brokenReport.errors.map((e) => e.code);
  assert.equal(codes.includes('UNSUPPORTED_SCHEMA_VERSION'), true);
  assert.equal(codes.includes('DUPLICATE_LAYER_ID'), true);
  assert.equal(codes.includes('LAYER_OUT_OF_BOUNDS'), true);
});

test('Brief validation enforces required fields and deterministic concept/storyboard generation works without API key', () => {
  const emptyValidation = validateBriefForm({
    ...INITIAL_SAMPLE_PROJECT.brief,
    projectName: '',
    carouselTopic: 'short',
  });
  assert.equal(emptyValidation.valid, false);
  assert.equal(Boolean(emptyValidation.fieldErrors.projectName), true);
  assert.equal(Boolean(emptyValidation.fieldErrors.carouselTopic), true);

  const validCheck = validateBriefForm(INITIAL_SAMPLE_PROJECT.brief);
  assert.equal(validCheck.valid, true);

  const concept = generateConceptLocal(INITIAL_SAMPLE_PROJECT.brief);
  assert.equal(concept.recommendedSlideSequence.length, INITIAL_SAMPLE_PROJECT.brief.desiredSlideCount);
  assert.equal(concept.approved, false);

  const storyboard = generateStoryboardLocal(INITIAL_SAMPLE_PROJECT.brief, concept);
  assert.equal(storyboard.length, INITIAL_SAMPLE_PROJECT.brief.desiredSlideCount);

  const specReport = validateProjectSpecifications({
    ...INITIAL_SAMPLE_PROJECT,
    storyboard,
  });
  assert.equal(specReport.valid, true);
});
