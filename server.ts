import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateConceptLocal,
  generateStoryboardLocal,
  regenerateSingleSlideCopyLocal,
} from './src/services/creativeEngine.ts';
import {
  CreativeBrief,
  CreativeConcept,
  LayoutPatternId,
  SlideCategory,
  StoryboardSlide,
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
        fallbackReason: error instanceof Error ? error.message : 'Gemini call failed',
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
        fallbackReason: error instanceof Error ? error.message : 'Gemini storyboard call failed',
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
        fallbackReason: error instanceof Error ? error.message : 'Gemini slide-copy call failed',
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createStudioApiApp();

  if (process.env.NODE_ENV !== 'production') {
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

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEGACYA SPHERE Creative Studio running on http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
