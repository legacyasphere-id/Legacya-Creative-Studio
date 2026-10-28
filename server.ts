import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateConceptLocal,
  generateDeterministicSlideAsset,
  generateStoryboardLocal,
  regenerateSingleSlideCopyLocal,
} from './src/services/creativeEngine.ts';
import {
  compileCampaignFromIntelligence,
  validateIntelligenceRecord,
} from './src/services/intelligenceBridge.ts';
import type {
  CreativeBrief,
  CreativeConcept,
  LayoutPatternId,
  MarketIntelligenceRecord,
  SlideCategory,
  StoryboardSlide,
  StudioAsset,
} from './src/types/studio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CATEGORIES = new Set<SlideCategory>([
  'cover_hook',
  'problem_statement',
  'educational_content',
  'comparison',
  'process_steps',
  'service_showcase',
  'advertising_showcase',
  'website_product_showcase',
  'case_study',
  'summary',
  'closing_slide',
]);

const ALLOWED_PATTERNS = new Set<LayoutPatternId>([
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
]);

const ALLOWED_BG_TREATMENTS = new Set<StoryboardSlide['backgroundTreatment']>([
  'warm_cream',
  'clean_white',
  'deep_navy',
  'ink_black',
]);

/**
 * Validates and merges AI-generated storyboard slides onto deterministic baseline slides,
 * ensuring stable IDs, valid categories, valid layout patterns, and character budgets.
 */
export function sanitizeGeminiStoryboardResponse(
  rawSlides: unknown,
  brief: CreativeBrief,
  concept: CreativeConcept
): StoryboardSlide[] {
  const baseline = generateStoryboardLocal(brief, concept);
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return baseline;
  }

  return baseline.map((baseSlide, idx) => {
    const candidate = rawSlides[idx] as Record<string, any> | undefined;
    if (!candidate || typeof candidate !== 'object') {
      return baseSlide;
    }

    const category = ALLOWED_CATEGORIES.has(candidate.category)
      ? (candidate.category as SlideCategory)
      : baseSlide.category;
    const layoutPattern = ALLOWED_PATTERNS.has(candidate.layoutPattern)
      ? (candidate.layoutPattern as LayoutPatternId)
      : baseSlide.layoutPattern;
    const backgroundTreatment = ALLOWED_BG_TREATMENTS.has(candidate.backgroundTreatment)
      ? (candidate.backgroundTreatment as StoryboardSlide['backgroundTreatment'])
      : baseSlide.backgroundTreatment;

    const primaryHeadline =
      typeof candidate.primaryHeadline === 'string' && candidate.primaryHeadline.trim().length >= 4
        ? candidate.primaryHeadline.trim().slice(0, 110)
        : baseSlide.primaryHeadline;
    const supportingCopy =
      typeof candidate.supportingCopy === 'string' && candidate.supportingCopy.trim().length >= 8
        ? candidate.supportingCopy.trim().slice(0, 260)
        : baseSlide.supportingCopy;
    const microcopy =
      typeof candidate.microcopy === 'string' && candidate.microcopy.trim().length >= 2
        ? candidate.microcopy.trim().slice(0, 48)
        : baseSlide.microcopy;
    const ctaText =
      typeof candidate.ctaText === 'string'
        ? candidate.ctaText.trim().slice(0, 64)
        : baseSlide.ctaText;
    const narrativePurpose =
      typeof candidate.narrativePurpose === 'string' && candidate.narrativePurpose.trim().length > 0
        ? candidate.narrativePurpose.trim().slice(0, 180)
        : baseSlide.narrativePurpose;

    return {
      ...baseSlide,
      category,
      layoutPattern,
      backgroundTreatment,
      primaryHeadline,
      supportingCopy,
      microcopy,
      ctaText,
      narrativePurpose,
      approved: false,
      lastModifiedAt: new Date().toISOString(),
    };
  });
}

export function createStudioApiApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const isGeminiConfigured = () =>
    Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim().length > 0
    );

  const createGeminiClient = () =>
    new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

  const formatGeminiFallbackReason = (error: unknown, fallbackTarget: string): string => {
    const raw = error instanceof Error ? error.message : '';
    if (
      raw.includes('429') ||
      raw.includes('RESOURCE_EXHAUSTED') ||
      raw.toLowerCase().includes('quota')
    ) {
      return `Gemini API quota/rate limit reached — fell back to deterministic ${fallbackTarget}.`;
    }
    if (raw.trim().startsWith('{') || raw.length > 140) {
      return `Gemini API unavailable — fell back to deterministic ${fallbackTarget}.`;
    }
    return raw
      ? `${raw} — fell back to deterministic ${fallbackTarget}.`
      : `Gemini API unavailable — fell back to deterministic ${fallbackTarget}.`;
  };

  app.get('/api/studio/status', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: isGeminiConfigured(),
      schemaVersion: '1.0.0',
    });
  });

  app.post('/api/gemini/concept', async (req, res) => {
    const brief = req.body?.brief as CreativeBrief | undefined;
    if (!brief || !brief.projectName || !brief.carouselTopic) {
      res.status(400).json({ error: 'Valid creative brief is required.' });
      return;
    }

    if (!isGeminiConfigured()) {
      const fallback = generateConceptLocal(brief);
      res.json({
        concept: fallback,
        source: 'local_deterministic',
        fallbackReason: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Creative Strategist for LEGACYA SPHERE, a minimalist editorial creative and systems studio.
Generate a structured carousel concept for this brief:
Project Name: ${brief.projectName}
Topic: ${brief.carouselTopic}
Audience: ${brief.targetAudience}
Objective: ${brief.communicationObjective}
Desired Slides: ${brief.desiredSlideCount}
Never invent statistics, fake client quotes, or unverified claims.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              creativeRationale: { type: Type.STRING },
              centralIdea: { type: Type.STRING },
              audienceInsight: { type: Type.STRING },
              intendedEmotionalResponse: { type: Type.STRING },
              narrativeArc: { type: Type.STRING },
              keyMessage: { type: Type.STRING },
              visualMetaphor: { type: Type.STRING },
              proposedArtDirection: { type: Type.STRING },
              recommendedCta: { type: Type.STRING },
            },
            required: [
              'creativeRationale',
              'centralIdea',
              'audienceInsight',
              'intendedEmotionalResponse',
              'narrativeArc',
              'keyMessage',
            ],
          },
        },
      });

      const baseLocal = generateConceptLocal(brief);
      const parsed = JSON.parse(response.text || '{}');
      res.json({
        concept: {
          ...baseLocal,
          ...parsed,
          source: 'gemini_api',
          approved: false,
        },
        source: 'gemini_api',
      });
    } catch (error) {
      const fallback = generateConceptLocal(brief);
      res.json({
        concept: fallback,
        source: 'local_deterministic',
        fallbackReason: formatGeminiFallbackReason(error, 'studio concept engine'),
      });
    }
  });

  app.post('/api/gemini/storyboard', async (req, res) => {
    const brief = req.body?.brief as CreativeBrief | undefined;
    const concept = req.body?.concept as CreativeConcept | undefined;
    if (!brief || !brief.projectName || !concept || !concept.centralIdea) {
      res.status(400).json({ error: 'Valid creative brief and concept are required.' });
      return;
    }

    if (!isGeminiConfigured()) {
      const fallback = generateStoryboardLocal(brief, concept);
      res.json({
        storyboard: fallback,
        source: 'local_deterministic',
        fallbackReason: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const ai = createGeminiClient();
      const targetCount = Math.max(3, Math.min(12, Number(brief.desiredSlideCount || 5)));
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Editorial Storyboard Director for LEGACYA SPHERE.
Generate a ${targetCount}-slide Instagram carousel storyboard (3:4 portrait, 1080x1440) for:
Project: ${brief.projectName}
Central Idea: ${concept.centralIdea}
Topic: ${brief.carouselTopic}
Audience: ${brief.targetAudience}
Objective: ${brief.communicationObjective}
Language: ${brief.language || 'English'}
Keep headlines concise (<72 chars) and supporting copy under 200 chars. Never invent fake statistics or client quotes.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slideNumber: { type: Type.INTEGER },
                    category: { type: Type.STRING },
                    layoutPattern: { type: Type.STRING },
                    backgroundTreatment: { type: Type.STRING },
                    narrativePurpose: { type: Type.STRING },
                    primaryHeadline: { type: Type.STRING },
                    supportingCopy: { type: Type.STRING },
                    microcopy: { type: Type.STRING },
                    ctaText: { type: Type.STRING },
                  },
                  required: ['primaryHeadline', 'supportingCopy'],
                },
              },
            },
            required: ['slides'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const storyboard = sanitizeGeminiStoryboardResponse(parsed.slides, brief, concept);
      res.json({
        storyboard,
        source: 'gemini_api',
      });
    } catch (error) {
      const fallback = generateStoryboardLocal(brief, concept);
      res.json({
        storyboard: fallback,
        source: 'local_deterministic',
        fallbackReason: formatGeminiFallbackReason(error, 'studio storyboard engine'),
      });
    }
  });

  app.post('/api/gemini/slide-copy', async (req, res) => {
    const slide = req.body?.slide as StoryboardSlide | undefined;
    const brief = req.body?.brief as CreativeBrief | undefined;
    const variationSeed = Number(req.body?.variationSeed || 0);

    if (!slide || !slide.id || !brief || !brief.projectName) {
      res.status(400).json({ error: 'Valid slide and brief are required.' });
      return;
    }

    if (!isGeminiConfigured()) {
      const fallback = regenerateSingleSlideCopyLocal(slide, brief, variationSeed);
      res.json({
        copy: fallback,
        source: 'local_deterministic',
        fallbackReason: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Senior Editorial Copywriter for LEGACYA SPHERE.
Rewrite ONLY Slide ${slide.slideNumber} (${slide.category}, layout: ${slide.layoutPattern}) for project "${brief.projectName}".
Current Headline: ${slide.primaryHeadline}
Current Supporting Copy: ${slide.supportingCopy}
Topic: ${brief.carouselTopic}
Audience: ${brief.targetAudience}
Provide a fresh, restrained editorial headline (<72 chars) and supporting copy (<200 chars). If layoutPattern is "comparison_columns", separate left and right column prose with " | ". Never invent statistics.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryHeadline: { type: Type.STRING },
              supportingCopy: { type: Type.STRING },
            },
            required: ['primaryHeadline', 'supportingCopy'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const fallback = regenerateSingleSlideCopyLocal(slide, brief, variationSeed);
      const primaryHeadline =
        typeof parsed.primaryHeadline === 'string' && parsed.primaryHeadline.trim().length >= 4
          ? parsed.primaryHeadline.trim().slice(0, 110)
          : fallback.primaryHeadline;
      const supportingCopy =
        typeof parsed.supportingCopy === 'string' && parsed.supportingCopy.trim().length >= 8
          ? parsed.supportingCopy.trim().slice(0, 260)
          : fallback.supportingCopy;

      res.json({
        copy: {
          primaryHeadline,
          supportingCopy,
          lastModifiedAt: new Date().toISOString(),
        },
        source: 'gemini_api',
      });
    } catch (error) {
      const fallback = regenerateSingleSlideCopyLocal(slide, brief, variationSeed);
      res.json({
        copy: fallback,
        source: 'local_deterministic',
        fallbackReason: formatGeminiFallbackReason(error, 'slide copy variation'),
      });
    }
  });

  app.post('/api/studio/intelligence-bridge', async (req, res) => {
    const intelligence = req.body?.intelligence as MarketIntelligenceRecord | undefined;
    if (!intelligence || typeof intelligence !== 'object') {
      res.status(400).json({ error: 'Valid market intelligence record is required.' });
      return;
    }

    const check = validateIntelligenceRecord(intelligence);
    if (!check.valid) {
      res.status(400).json({
        error: 'Market intelligence validation failed.',
        fieldErrors: check.fieldErrors,
      });
      return;
    }

    try {
      const compiled = compileCampaignFromIntelligence(intelligence);
      res.json({
        brief: compiled.brief,
        concept: compiled.concept,
        storyboard: compiled.storyboard,
        contract: compiled.contract,
        promptMatrix: compiled.promptMatrix,
        source: 'local_deterministic',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Intelligence campaign synthesis failed.',
      });
    }
  });

  app.post('/api/gemini/image', async (req, res) => {
    const slide = req.body?.slide as StoryboardSlide | undefined;
    const customPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const requestedRatio = req.body?.aspectRatio;
    const aspectRatio: StudioAsset['aspectRatio'] =
      requestedRatio === '1:1' ||
      requestedRatio === '3:4' ||
      requestedRatio === '4:3' ||
      requestedRatio === '16:9'
        ? requestedRatio
        : '4:3';

    if (!slide || !slide.id) {
      res.status(400).json({ error: 'Valid target slide is required for asset generation.' });
      return;
    }

    const baseDirection =
      customPrompt ||
      `Minimalist architectural editorial photography for Slide ${String(slide.slideNumber).padStart(2, '0')} (${slide.primaryHeadline}), warm cream #F7F4EE travertine and deep navy #0F1A2C structural steel, directional natural studio lighting`;
    const strictPrompt = `${baseDirection}. CRITICAL: Do NOT include any text, letters, numbers, words, watermarks, or logos inside the image.`;

    if (!isGeminiConfigured()) {
      const fallbackAsset = generateDeterministicSlideAsset(slide, baseDirection);
      res.json({
        asset: {
          ...fallbackAsset,
          aspectRatio,
        },
        source: 'local_deterministic',
        fallbackReason: 'GEMINI_API_KEY is not configured on the server; synthesized deterministic studio vector plate.',
      });
      return;
    }

    try {
      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: strictPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      let imageDataUrl = '';
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageDataUrl) {
        throw new Error('No inline image data returned from Gemini image model.');
      }

      const generatedAsset: StudioAsset = {
        id: `asset_gemini_slide_${String(slide.slideNumber).padStart(2, '0')}_${Date.now()}`,
        name: `Slide ${String(slide.slideNumber).padStart(2, '0')} Editorial Study`,
        category: 'editorial_photography',
        intendedSlideId: slide.id,
        prompt: baseDirection,
        status: 'ready',
        provenance: 'Gemini API (gemini-3.1-flash-lite-image · Zero Baked-In Text)',
        aspectRatio,
        previewDataUrl: imageDataUrl,
        createdAt: new Date().toISOString(),
      };

      res.json({
        asset: generatedAsset,
        source: 'gemini_api',
      });
    } catch (error) {
      const fallbackAsset = generateDeterministicSlideAsset(slide, baseDirection);
      res.json({
        asset: {
          ...fallbackAsset,
          aspectRatio,
        },
        source: 'local_deterministic',
        fallbackReason: formatGeminiFallbackReason(error, 'studio vector plate'),
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createStudioApiApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEGACYA SPHERE Creative Studio running on http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
