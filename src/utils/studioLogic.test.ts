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

test('HyperFrames Video-as-Code engine compiles deterministic HTML compositions, SMPTE timecodes, 90%/80% safe boxes, frame.md camera specs, and passes 12-rule contract audit', async () => {
  const {
    compileHyperframesBundle,
    computeSafeBoxes,
    evaluateElementMotionAtTime,
    formatSmpteTimecode,
  } = await import('../services/hyperframesEngine');

  // 1. SMPTE timecode accuracy at 30fps and 60fps
  assert.equal(formatSmpteTimecode(0, 30), '00:00:00');
  assert.equal(formatSmpteTimecode(1.5, 30), '00:01:15');
  assert.equal(formatSmpteTimecode(62.2, 30), '01:02:06');
  assert.equal(formatSmpteTimecode(1.5, 60), '00:01:30');

  // 2. 90% Action-Safe & 80% Title-Safe boxes on 1080x1440
  const { actionSafeBox, titleSafeBox } = computeSafeBoxes(1080, 1440);
  assert.deepEqual(actionSafeBox, { x: 54, y: 72, width: 972, height: 1296 });
  assert.deepEqual(titleSafeBox, { x: 108, y: 144, width: 864, height: 1152 });

  // 3. Compile full HyperFrames bundle from sample project
  const specs = INITIAL_SAMPLE_PROJECT.storyboard.map((slide) =>
    compileSlideSpecification(
      slide,
      INITIAL_SAMPLE_PROJECT.storyboard.length,
      DEFAULT_BRAND_TOKENS,
      INITIAL_SAMPLE_PROJECT.assets
    )
  );
  const bundle = compileHyperframesBundle(INITIAL_SAMPLE_PROJECT, specs, undefined, 30);

  assert.equal(bundle.fps, 30);
  assert.equal(bundle.width, 1080);
  assert.equal(bundle.height, 1440);
  assert.equal(bundle.scenes.length, 7);
  assert.equal(bundle.totalDurationSec, 25.5); // 2 bookends @ 4.0s + 5 interior @ 3.5s = 25.5s
  assert.equal(bundle.totalFrames, 765);
  assert.equal(bundle.checkReport.valid, true);
  assert.equal(bundle.checkReport.errors.length, 0);
  assert.equal(Boolean(bundle.rootIndexHtml.includes('window.__timelines["main"]')), true);
  assert.equal(Boolean(bundle.rootIndexHtml.includes('window.__hyperframes')), true);
  assert.equal(Boolean(bundle.frameMdSpec.includes('schema: hyperframes/frame.md/v1')), true);

  // 4. Deterministic f(t) evaluator purity and [start, start + duration) boundary check
  const sampleHeadline = specs[0].elements.find((e) => e.id === 'slide_01_headline')!;
  const beforeClip = evaluateElementMotionAtTime(sampleHeadline, 0.02, 4.0, 'editorial_reveal', 1);
  assert.equal(beforeClip.visible, false);
  assert.equal(beforeClip.opacity, 0);

  const midClipA = evaluateElementMotionAtTime(sampleHeadline, 1.2, 4.0, 'editorial_reveal', 1);
  const midClipB = evaluateElementMotionAtTime(sampleHeadline, 1.2, 4.0, 'editorial_reveal', 1);
  assert.deepEqual(midClipA, midClipB);
  assert.equal(midClipA.visible, true);
  assert.equal(midClipA.opacity, 1);

  const afterClip = evaluateElementMotionAtTime(sampleHeadline, 4.0, 4.0, 'editorial_reveal', 1);
  assert.equal(afterClip.visible, false);
});

test('API key & secret leak security audit verifies zero credential exposure across server endpoints, client source, and exported studio artifacts', async () => {
  const {
    auditClientSourceContent,
    auditExportedArtifactsForLeaks,
    scanContentForSecrets,
  } = await import('../services/securityAudit');
  const { createStudioApiApp } = await import('../../server');

  // 1. Secret scanner detects known token patterns and canary secrets
  const detectedGoogle = scanContentForSecrets(
    'const key = "AIzaSyD9876543210abcdefghijklmnopqrstuv";',
    'mock.ts'
  );
  assert.equal(detectedGoogle.length, 1);
  assert.equal(detectedGoogle[0].ruleId, 'google_api_key');

  const detectedGithub = scanContentForSecrets(
    'Authorization: token ghp_1234567890abcdefghijklmnopqrstuvwx',
    'mock.ts'
  );
  assert.equal(detectedGithub.length, 1);
  assert.equal(detectedGithub[0].ruleId, 'github_pat_classic');

  // 2. Client source guardrails catch direct @google/genai imports and process.env.GEMINI_API_KEY
  const badClientSource = `
    import { GoogleGenAI } from '@google/genai';
    const k = process.env.GEMINI_API_KEY;
  `;
  const clientFindings = auditClientSourceContent(badClientSource, 'src/BadComponent.tsx');
  assert.equal(clientFindings.length, 2);

  // 3. Exported studio artifacts (Figma 1.0.0 JSON, HyperFrames HTML/frame.md/timeline.json, Carousel HTML) contain zero leaks
  const canary = 'AIzaSyCANARY_TEST_SECRET_KEY_000111222333';
  const artifactReport = auditExportedArtifactsForLeaks(INITIAL_SAMPLE_PROJECT, canary);
  assert.equal(artifactReport.passed, true);
  assert.equal(artifactReport.findings.length, 0);
  assert.equal(artifactReport.artifactsScanned.length, 5);

  // 4. Live HTTP server endpoints never leak the canary GEMINI_API_KEY in responses or error fallback messages
  const prevKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = canary;
  const app = createStudioApiApp();
  const server = app.listen(0);

  try {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3098;
    const baseUrl = `http://127.0.0.1:${port}`;

    const statusRes = await fetch(`${baseUrl}/api/studio/status`);
    const statusText = await statusRes.text();
    assert.equal(statusText.includes(canary), false);
    const statusJson = JSON.parse(statusText);
    assert.equal(statusJson.geminiConfigured, true);
    assert.equal('apiKey' in statusJson, false);

    const conceptRes = await fetch(`${baseUrl}/api/gemini/concept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: INITIAL_SAMPLE_PROJECT.brief }),
    });
    const conceptText = await conceptRes.text();
    assert.equal(conceptRes.status, 200);
    assert.equal(conceptText.includes(canary), false);

    const imageRes = await fetch(`${baseUrl}/api/gemini/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide: INITIAL_SAMPLE_PROJECT.storyboard[0],
        prompt: 'Architectural travertine study',
        aspectRatio: '4:3',
      }),
    });
    const imageText = await imageRes.text();
    assert.equal(imageRes.status, 200);
    assert.equal(imageText.includes(canary), false);
  } finally {
    server.close();
    process.env.GEMINI_API_KEY = prevKey;
  }
});

test('End-to-End 9-stage studio lifecycle: Intelligence (#3 -> #2) -> Brief -> Concept -> Storyboard -> Scoped Slide Edit -> Layout -> Figma Reconciler -> HyperFrames Bundle', async () => {
  const { INTELLIGENCE_PRESETS, compileCampaignFromIntelligence } = await import(
    '../services/intelligenceBridge'
  );
  const {
    generateDeterministicSlideAsset,
    getNextLayoutPattern,
    regenerateSingleSlideCopyLocal,
  } = await import('../services/creativeEngine');
  const { compileHyperframesBundle } = await import('../services/hyperframesEngine');
  const { runFigmaContractImport } = await import('../../figma-plugin/code');

  // Stage 1 & 2: Ingest Market Intelligence preset (#3 -> #2) and synthesize campaign
  const intelPreset = INTELLIGENCE_PRESETS[1]; // 6-slide Native Figma Contract preset
  const compiledCampaign = compileCampaignFromIntelligence(intelPreset);
  assert.equal(compiledCampaign.storyboard.length, 6);
  assert.equal(compiledCampaign.concept.approved, true);
  assert.equal(compiledCampaign.contractValidation.valid, true);

  // Stage 3 & 4: Perform scoped single-slide copy regeneration, layout cycle, and SVG plate synthesis on Slide 02
  const targetSlide = structuredClone(compiledCampaign.storyboard[1]);
  const freshCopy = regenerateSingleSlideCopyLocal(targetSlide, compiledCampaign.brief, 2);
  targetSlide.primaryHeadline = freshCopy.primaryHeadline;
  targetSlide.supportingCopy = freshCopy.supportingCopy;
  targetSlide.layoutPattern = getNextLayoutPattern(targetSlide.layoutPattern);
  const generatedPlate = generateDeterministicSlideAsset(targetSlide, 'Editorial geometry study');
  targetSlide.suggestedAssetId = generatedPlate.id;

  const updatedProject = structuredClone(INITIAL_SAMPLE_PROJECT);
  updatedProject.brief = compiledCampaign.brief;
  updatedProject.concept = compiledCampaign.concept;
  updatedProject.storyboard = [
    compiledCampaign.storyboard[0],
    targetSlide,
    ...compiledCampaign.storyboard.slice(2),
  ];
  updatedProject.assets = [...updatedProject.assets, generatedPlate];

  // Stage 5 & 6: Compile 1080x1440 specifications and validate 1.0.0 schema
  const specs = updatedProject.storyboard.map((s) =>
    compileSlideSpecification(
      s,
      updatedProject.storyboard.length,
      updatedProject.brandTokens,
      updatedProject.assets
    )
  );
  const validation = validateProjectSpecifications(updatedProject, specs);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);

  // Stage 7: Export 1.0.0 contract and verify Figma plugin import
  const contract = buildFigmaExportContract(updatedProject);
  const contractCheck = validateExportContractJson(JSON.stringify(contract));
  assert.equal(contractCheck.valid, true);

  const mockPluginData = new Map<string, Map<string, string>>();
  let idSeq = 1;
  const makeNode = (type: string): any => {
    const nodeId = `n_${idSeq++}`;
    mockPluginData.set(nodeId, new Map());
    return {
      id: nodeId,
      type,
      name: '',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1,
      fills: [],
      strokes: [],
      children: [] as any[],
      removed: false,
      appendChild(c: any) {
        this.children.push(c);
      },
      resize(w: number, h: number) {
        this.width = w;
        this.height = h;
      },
      remove() {
        this.removed = true;
      },
      getPluginData(k: string) {
        return mockPluginData.get(nodeId)?.get(k) || '';
      },
      setPluginData(k: string, v: string) {
        mockPluginData.get(nodeId)?.set(k, v);
      },
    };
  };
  const mockFigma: any = {
    root: {
      children: [] as any[],
      appendChild(p: any) {
        this.children.push(p);
      },
    },
    currentPage: null,
    loadFontAsync: async () => {},
    createPage: () => makeNode('PAGE'),
    createFrame: () => makeNode('FRAME'),
    createText: () => makeNode('TEXT'),
    createRectangle: () => makeNode('RECTANGLE'),
    createEllipse: () => makeNode('ELLIPSE'),
    createLine: () => makeNode('LINE'),
    createNodeFromSvg: () => makeNode('FRAME'),
    createImage: () => ({ hash: 'h1' }),
  };
  const figmaSummary = await runFigmaContractImport(mockFigma, contract, {
    preserveManualEdits: true,
  });
  assert.equal(figmaSummary.createdFrames, 6);
  assert.equal(figmaSummary.conflicts.length, 0);

  // Stage 8 & 9: Compile HyperFrames Video-as-Code bundle and verify 0 contract errors
  const hfBundle = compileHyperframesBundle(updatedProject, specs, undefined, 30);
  assert.equal(hfBundle.scenes.length, 6);
  assert.equal(hfBundle.checkReport.valid, true);
  assert.equal(hfBundle.checkReport.errors.length, 0);
});





