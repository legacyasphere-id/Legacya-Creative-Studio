import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateConceptLocal } from './src/services/creativeEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 0
  );

  app.get('/api/studio/status', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: hasGeminiKey,
      schemaVersion: '1.0.0',
    });
  });

  app.post('/api/gemini/concept', async (req, res) => {
    const brief = req.body?.brief;
    if (!brief || !brief.projectName || !brief.carouselTopic) {
      res.status(400).json({ error: 'Valid creative brief is required.' });
      return;
    }

    if (!hasGeminiKey) {
      const fallback = generateConceptLocal(brief);
      res.json({ concept: fallback, source: 'local_deterministic' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

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

startServer();
