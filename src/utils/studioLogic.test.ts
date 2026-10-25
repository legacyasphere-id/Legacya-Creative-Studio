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

  // Pairwise structural distinctness across all 10 patterns
  const patternSignatures = new Map<LayoutPatternId, string>();
  for (const pattern of allPatterns) {
    const spec = compileSlideSpecification(
      { ...baseSlide, layoutPattern: pattern },
      7,
      DEFAULT_BRAND_TOKENS,
      INITIAL_SAMPLE_PROJECT.assets
    );
    const sig = spec.elements
      .map((el) => `${el.id}:${el.type}@${el.x},${el.y},${el.width}x${el.height}`)
      .join('|');
    for (const [otherPattern, otherSig] of patternSignatures.entries()) {
      assert.notEqual(
        sig,
        otherSig,
        `Expected layout pattern "${pattern}" to have a distinct composition from "${otherPattern}"`
      );
    }
    patternSignatures.set(pattern, sig);
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

  // Type-specific node validation for TEXT, RECTANGLE, ELLIPSE, LINE, VECTOR, IMAGE, and GROUP
  const typeBrokenContract = structuredClone(contract) as any;
  typeBrokenContract.slides[0].layers.push(
    {
      id: 'bad_text_node',
      name: 'Malformed Text',
      type: 'TEXT',
      x: 84,
      y: 200,
      width: 200,
      height: 50,
      layerOrder: 50,
      opacity: 1,
      // Missing textContent, fontFamily, fontSize, etc.
    },
    {
      id: 'bad_rect_node',
      name: 'Colorless Shape',
      type: 'RECTANGLE',
      x: 84,
      y: 260,
      width: 200,
      height: 50,
      layerOrder: 51,
      opacity: 1,
      fill: null,
      stroke: null,
    },
    {
      id: 'bad_vector_node',
      name: 'Pathless Vector',
      type: 'VECTOR',
      x: 84,
      y: 320,
      width: 200,
      height: 50,
      layerOrder: 52,
      opacity: 1,
      stroke: '#121212',
      vectorSvgPath: '',
    },
    {
      id: 'bad_image_node',
      name: 'Unbound Image',
      type: 'IMAGE',
      x: 84,
      y: 380,
      width: 200,
      height: 100,
      layerOrder: 53,
      opacity: 1,
      assetId: '',
      imageReference: '',
      fitMode: 'INVALID_MODE',
    },
    {
      id: 'bad_group_node',
      name: 'Empty Group',
      type: 'GROUP',
      x: 84,
      y: 500,
      width: 200,
      height: 100,
      layerOrder: 54,
      opacity: 1,
      children: [],
    }
  );

  const typeReport = validateExportContractJson(typeBrokenContract);
  assert.equal(typeReport.valid, false);
  const typeErrorCodes = typeReport.errors.map((e) => e.code);
  assert.equal(typeErrorCodes.includes('INVALID_TEXT_NODE_PROPERTIES'), true);
  assert.equal(typeErrorCodes.includes('INVALID_SHAPE_NODE_PROPERTIES'), true);
  assert.equal(typeErrorCodes.includes('INVALID_VECTOR_NODE_PROPERTIES'), true);
  assert.equal(typeErrorCodes.includes('INVALID_IMAGE_NODE_PROPERTIES'), true);
  assert.equal(typeErrorCodes.includes('INVALID_GROUP_NODE_PROPERTIES'), true);
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

test('Figma plugin 3-way reconciliation preserves manual designer edits by default and supports explicit force-overwrite', async () => {
  const { runFigmaContractImport } = await import('../../figma-plugin/code');

  const createMockNode = (type: string) => {
    const pluginData = new Map<string, string>();
    const node: any = {
      id: `figma_${Math.random().toString(36).slice(2, 8)}`,
      type,
      name: '',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1,
      fills: [],
      strokes: [],
      children: [],
      removed: false,
      setPluginData: (k: string, v: string) => pluginData.set(k, String(v)),
      getPluginData: (k: string) => pluginData.get(k) || '',
      resize: (w: number, h: number) => {
        node.width = w;
        node.height = h;
      },
      appendChild: (child: any) => {
        node.children.push(child);
      },
      remove: () => {
        node.removed = true;
        for (const page of mockFigma.root.children) {
          for (const frame of page.children || []) {
            if (Array.isArray(frame.children)) {
              frame.children = frame.children.filter((c: any) => c !== node);
            }
          }
        }
      },
    };
    return node;
  };

  const mockFigma: any = {
    root: { children: [] as any[] },
    currentPage: null as any,
    viewport: { scrollAndZoomIntoView: () => {} },
    createPage: () => {
      const p = createMockNode('PAGE');
      mockFigma.root.children.push(p);
      return p;
    },
    setCurrentPageAsync: async (p: any) => {
      mockFigma.currentPage = p;
    },
    loadFontAsync: async () => {},
    createFrame: () => createMockNode('FRAME'),
    createText: () => createMockNode('TEXT'),
    createRectangle: () => createMockNode('RECTANGLE'),
    createEllipse: () => createMockNode('ELLIPSE'),
    createLine: () => createMockNode('LINE'),
    createNodeFromSvg: (svg: string) => {
      const v = createMockNode('VECTOR');
      v.svgSource = svg;
      return v;
    },
    createImage: (bytes: Uint8Array) => ({
      hash: `img_hash_${bytes.byteLength}`,
    }),
  };

  // Add a raster PNG data URL asset to test createImage fill
  const projectWithRaster = structuredClone(INITIAL_SAMPLE_PROJECT);
  projectWithRaster.assets.push({
    id: 'asset_raster_png_test',
    name: 'Test Raster PNG',
    category: 'editorial_photography',
    status: 'ready',
    provenance: 'Unit test PNG',
    aspectRatio: '4:3',
    previewDataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: new Date().toISOString(),
  });
  projectWithRaster.storyboard[4].suggestedAssetId = 'asset_raster_png_test';

  const contract = buildFigmaExportContract(projectWithRaster);

  // 1. Initial import
  const firstImport = await runFigmaContractImport(mockFigma, contract, {
    preserveManualEdits: true,
  });
  assert.equal(firstImport.createdFrames, 7);
  assert.equal(firstImport.updatedFrames, 0);
  assert.equal(firstImport.createdLayers > 25, true);
  assert.equal(firstImport.conflicts.length, 0);

  // Verify typography properties (textAlignHorizontal, lineHeight, letterSpacing) and SVG/raster nodes
  const draftPage = mockFigma.root.children[0];
  const slide1Frame = draftPage.children[0];
  const slideNumberNode = slide1Frame.children.find(
    (c: any) => c.getPluginData('legacya_stable_id') === 'slide_01_slide_number'
  );
  assert.ok(slideNumberNode);
  assert.equal(slideNumberNode.textAlignHorizontal, 'RIGHT');
  assert.equal(slideNumberNode.lineHeight.unit, 'PERCENT');
  assert.equal(slideNumberNode.letterSpacing.unit, 'PERCENT');

  const vectorDiagNode = slide1Frame.children.find(
    (c: any) => c.getPluginData('legacya_stable_id') === 'slide_01_geo_diagonal'
  );
  assert.ok(vectorDiagNode);
  assert.equal(Boolean(vectorDiagNode.svgSource?.startsWith('<svg')), true);

  const slide5Frame = draftPage.children[4];
  const imageNode = slide5Frame.children.find(
    (c: any) => c.getPluginData('legacya_stable_id') === 'slide_05_image_asset'
  );
  assert.ok(imageNode);
  assert.equal(imageNode.fills[0].type, 'IMAGE');
  assert.equal(Boolean(imageNode.fills[0].imageHash?.startsWith('img_hash_')), true);

  // 2. Simulate designer manually editing Slide 01 headline in Figma AND adding an unmanaged custom shape
  const headlineNode = slide1Frame.children.find(
    (c: any) => c.getPluginData('legacya_stable_id') === 'slide_01_headline'
  );
  assert.ok(headlineNode);
  headlineNode.characters = 'Designer Custom Manual Headline in Figma';
  headlineNode.x = 120;

  const unmanagedBadge = createMockNode('RECTANGLE');
  unmanagedBadge.name = 'Designer Custom Stamp';
  slide1Frame.appendChild(unmanagedBadge);

  // Also modify Slide 02 headline in the incoming contract (no manual edit in Figma on Slide 02)
  const updatedContract = structuredClone(contract);
  const slide2HeadlineSpec = updatedContract.slides[1].layers.find(
    (l: any) => l.id === 'slide_02_headline'
  ) as any;
  slide2HeadlineSpec.textContent = 'Updated Slide 02 Headline From Studio Contract';

  // 3. Re-import with preserveManualEdits: true (default)
  const secondImport = await runFigmaContractImport(mockFigma, updatedContract, {
    preserveManualEdits: true,
  });
  assert.equal(secondImport.createdFrames, 0);
  assert.equal(secondImport.updatedFrames, 7);
  // Slide 01 manual headline + unmanaged custom stamp should both be preserved
  assert.equal(secondImport.preservedLayers >= 2, true);
  assert.equal(secondImport.updatedLayers >= 1, true);
  assert.equal(headlineNode.characters, 'Designer Custom Manual Headline in Figma');
  assert.equal(headlineNode.x, 120);
  assert.equal(slide1Frame.children.includes(unmanagedBadge), true);

  const slide2Frame = draftPage.children[1];
  const slide2HeadlineNode = slide2Frame.children.find(
    (c: any) => c.getPluginData('legacya_stable_id') === 'slide_02_headline'
  );
  assert.equal(slide2HeadlineNode.characters, 'Updated Slide 02 Headline From Studio Contract');

  // 4. Re-import with preserveManualEdits: false (explicit force-overwrite)
  const forceImport = await runFigmaContractImport(mockFigma, updatedContract, {
    preserveManualEdits: false,
  });
  assert.equal(forceImport.updatedLayers >= 1, true);
  // Headline on Slide 01 is now overwritten back to the contract's headline, while unmanaged layer is still safe
  const originalSlide1Headline = (
    updatedContract.slides[0].layers.find((l: any) => l.id === 'slide_01_headline') as any
  ).textContent;
  assert.equal(headlineNode.characters, originalSlide1Headline);
  assert.equal(slide1Frame.children.includes(unmanagedBadge), true);
});

test('Server-side Gemini API routes (/api/gemini/concept, /api/gemini/storyboard, /api/gemini/slide-copy) validate inputs, sanitize AI payloads, and fall back cleanly when key is unconfigured', async () => {
  const { createStudioApiApp, sanitizeGeminiStoryboardResponse } = await import('../../server');
  const concept = generateConceptLocal(INITIAL_SAMPLE_PROJECT.brief);

  // 1. Verify sanitizeGeminiStoryboardResponse enforces stable IDs, allowed enums, and character bounds
  const sanitized = sanitizeGeminiStoryboardResponse(
    [
      {
        category: 'INVALID_CATEGORY',
        layoutPattern: 'INVALID_LAYOUT',
        backgroundTreatment: 'INVALID_BG',
        primaryHeadline: 'Custom Gemini Headline 01',
        supportingCopy: 'Custom Gemini supporting copy with architectural restraint.',
      },
    ],
    INITIAL_SAMPLE_PROJECT.brief,
    concept
  );
  assert.equal(sanitized.length, INITIAL_SAMPLE_PROJECT.brief.desiredSlideCount);
  assert.equal(sanitized[0].id, 'slide_01');
  assert.equal(sanitized[0].category, 'cover_hook');
  assert.equal(sanitized[0].layoutPattern, 'minimal_cover');
  assert.equal(sanitized[0].primaryHeadline, 'Custom Gemini Headline 01');

  // 2. Test Express endpoints over ephemeral local server without GEMINI_API_KEY
  const prevKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  const app = createStudioApiApp();
  const server = app.listen(0);
  try {
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    const statusRes = await fetch(`${baseUrl}/api/studio/status`);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.status, 'ok');
    assert.equal(statusJson.geminiConfigured, false);

    const conceptRes = await fetch(`${baseUrl}/api/gemini/concept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: INITIAL_SAMPLE_PROJECT.brief }),
    });
    const conceptJson = await conceptRes.json();
    assert.equal(conceptRes.status, 200);
    assert.equal(conceptJson.source, 'local_deterministic');
    assert.equal( Boolean(conceptJson.concept?.centralIdea), true);

    const storyboardRes = await fetch(`${baseUrl}/api/gemini/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: INITIAL_SAMPLE_PROJECT.brief, concept }),
    });
    const storyboardJson = await storyboardRes.json();
    assert.equal(storyboardRes.status, 200);
    assert.equal(storyboardJson.source, 'local_deterministic');
    assert.equal(storyboardJson.storyboard.length, INITIAL_SAMPLE_PROJECT.brief.desiredSlideCount);

    const slideCopyRes = await fetch(`${baseUrl}/api/gemini/slide-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide: INITIAL_SAMPLE_PROJECT.storyboard[0],
        brief: INITIAL_SAMPLE_PROJECT.brief,
        variationSeed: 1,
      }),
    });
    const slideCopyJson = await slideCopyRes.json();
    assert.equal(slideCopyRes.status, 200);
    assert.equal(slideCopyJson.source, 'local_deterministic');
    assert.equal(Boolean(slideCopyJson.copy?.primaryHeadline), true);

    const imageRes = await fetch(`${baseUrl}/api/gemini/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide: INITIAL_SAMPLE_PROJECT.storyboard[0],
        prompt: 'Architectural travertine study',
        aspectRatio: '4:3',
      }),
    });
    const imageJson = await imageRes.json();
    assert.equal(imageRes.status, 200);
    assert.equal(imageJson.source, 'local_deterministic');
    assert.equal(imageJson.asset.aspectRatio, '4:3');
    assert.equal(Boolean(imageJson.asset.previewDataUrl.startsWith('data:image/svg+xml')), true);

    const { DEFAULT_INTELLIGENCE } = await import('../services/intelligenceBridge');
    const intelBridgeRes = await fetch(`${baseUrl}/api/studio/intelligence-bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intelligence: DEFAULT_INTELLIGENCE }),
    });
    const intelBridgeJson = await intelBridgeRes.json();
    assert.equal(intelBridgeRes.status, 200);
    assert.equal(intelBridgeJson.storyboard.length, 5);
    assert.equal(intelBridgeJson.promptMatrix.length, 5);
    assert.equal(intelBridgeJson.contract.schemaVersion, '1.0.0');
  } finally {
    server.close();
    process.env.GEMINI_API_KEY = prevKey;
  }
});

test('Market Intelligence Bridge (#3 -> #2) validates inputs, synthesizes valid briefs, compiles 1.0.0 contracts, and generates Google Flow MCP prompt matrices', async () => {
  const {
    DEFAULT_INTELLIGENCE,
    INTELLIGENCE_PRESETS,
    validateIntelligenceRecord,
    synthesizeBriefFromIntelligence,
    buildImagePromptMatrix,
    compileCampaignFromIntelligence,
  } = await import('../services/intelligenceBridge');

  // 1. Reject invalid/empty intelligence records
  const invalidCheck = validateIntelligenceRecord({
    ...DEFAULT_INTELLIGENCE,
    source: '',
    provenHook: 'short',
  });
  assert.equal(invalidCheck.valid, false);
  assert.equal(Boolean(invalidCheck.fieldErrors.source), true);
  assert.equal(Boolean(invalidCheck.fieldErrors.provenHook), true);

  // 2. Compile every curated intelligence preset end-to-end
  for (const preset of INTELLIGENCE_PRESETS) {
    const validCheck = validateIntelligenceRecord(preset);
    assert.equal(validCheck.valid, true);

    const brief = synthesizeBriefFromIntelligence(preset);
    assert.equal(validateBriefForm(brief).valid, true);

    const compiled = compileCampaignFromIntelligence(preset);
    assert.equal(compiled.contractValidation.valid, true);
    assert.equal(compiled.contractValidation.errors.length, 0);
    assert.equal(compiled.storyboard.length, preset.desiredSlideCount || 5);
    assert.equal(compiled.promptMatrix.length, compiled.storyboard.length);

    for (const promptEntry of compiled.promptMatrix) {
      assert.equal(Boolean(promptEntry.flowMcpPrompt.includes('strictly no text')), true);
      assert.equal(Boolean(promptEntry.negativePrompt.includes('typography')), true);
    }
    assert.equal(Boolean(compiled.htmlPreview.includes('<!DOCTYPE html>')), true);
  }

  // 3. Direct prompt matrix check
  const sampleMatrix = buildImagePromptMatrix(INITIAL_SAMPLE_PROJECT.storyboard);
  assert.equal(sampleMatrix.length, 7);
  assert.equal(sampleMatrix[0].slideId, 'slide_01');
});



