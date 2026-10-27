import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createStudioApiApp } from '../server.ts';
import { INITIAL_SAMPLE_PROJECT } from '../src/data/sampleProject.ts';
import { DEFAULT_INTELLIGENCE } from '../src/services/intelligenceBridge.ts';
import {
  auditClientSourceContent,
  auditExportedArtifactsForLeaks,
  scanContentForSecrets,
  SecretScanFinding,
} from '../src/services/securityAudit.ts';

function collectFilesRecursively(dirPath: string, extensions: Set<string>): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.playwright-cli' ||
      entry.name === '.aistudio'
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, extensions));
    } else if (extensions.has(path.extname(entry.name)) && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function runQaAndSecurityAudit() {
  console.log('===================================================================');
  console.log(' LEGACYA SPHERE CREATIVE STUDIO · QA & API LEAK SECURITY AUDIT');
  console.log('===================================================================\n');

  const rootDir = process.cwd();
  const allFindings: SecretScanFinding[] = [];

  // 1. Audit all client-side files in src/
  const srcFiles = collectFilesRecursively(
    path.join(rootDir, 'src'),
    new Set(['.ts', '.tsx', '.css', '.json'])
  );
  for (const file of srcFiles) {
    const relPath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, 'utf-8');
    allFindings.push(...auditClientSourceContent(content, relPath));
  }
  console.log(`[1/5] Client Source Isolation Audit: Scanned ${srcFiles.length} files in src/`);

  // 2. Audit figma-plugin/, scripts/, output/, and dist/ (if built)
  const extraDirs = ['figma-plugin', 'scripts', 'output', 'dist'];
  let extraCount = 0;
  for (const d of extraDirs) {
    const files = collectFilesRecursively(
      path.join(rootDir, d),
      new Set(['.ts', '.js', '.html', '.json', '.md'])
    );
    for (const file of files) {
      extraCount++;
      const relPath = path.relative(rootDir, file);
      const content = fs.readFileSync(file, 'utf-8');
      allFindings.push(...scanContentForSecrets(content, relPath));
    }
  }
  console.log(`[2/5] Build & Deliverable Scan: Scanned ${extraCount} files across figma-plugin/, scripts/, output/, dist/`);

  // 3. Audit exported studio artifacts with a canary secret
  const canarySecret = ['AIzaSy', 'CANARY_SECRET_PROBER_DO_NOT_LEAK_999888777'].join('');
  const artifactAudit = auditExportedArtifactsForLeaks(INITIAL_SAMPLE_PROJECT, canarySecret);
  allFindings.push(...artifactAudit.findings);
  console.log(
    `[3/5] Exported Artifact Audit: Verified ${artifactAudit.artifactsScanned.join(', ')}`
  );

  // 4. Live Server API Canary Leak Probe across all 6 endpoints
  const prevKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = canarySecret;
  const app = createStudioApiApp();
  const server = app.listen(0);

  try {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3099;
    const baseUrl = `http://127.0.0.1:${port}`;

    const endpoints: Array<{
      name: string;
      method: 'GET' | 'POST';
      path: string;
      body?: Record<string, unknown>;
    }> = [
      { name: 'GET /api/studio/status', method: 'GET', path: '/api/studio/status' },
      {
        name: 'POST /api/gemini/concept',
        method: 'POST',
        path: '/api/gemini/concept',
        body: { brief: INITIAL_SAMPLE_PROJECT.brief },
      },
      {
        name: 'POST /api/gemini/storyboard',
        method: 'POST',
        path: '/api/gemini/storyboard',
        body: {
          brief: INITIAL_SAMPLE_PROJECT.brief,
          concept: INITIAL_SAMPLE_PROJECT.concept,
        },
      },
      {
        name: 'POST /api/gemini/slide-copy',
        method: 'POST',
        path: '/api/gemini/slide-copy',
        body: {
          slide: INITIAL_SAMPLE_PROJECT.storyboard[0],
          brief: INITIAL_SAMPLE_PROJECT.brief,
          variationSeed: 1,
        },
      },
      {
        name: 'POST /api/gemini/image',
        method: 'POST',
        path: '/api/gemini/image',
        body: {
          slide: INITIAL_SAMPLE_PROJECT.storyboard[0],
          prompt: 'Minimalist architectural travertine study',
          aspectRatio: '4:3',
        },
      },
      {
        name: 'POST /api/studio/intelligence-bridge',
        method: 'POST',
        path: '/api/studio/intelligence-bridge',
        body: { intelligence: DEFAULT_INTELLIGENCE },
      },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      const textBody = await res.text();
      const headerDump = JSON.stringify(Object.fromEntries(res.headers.entries()));

      allFindings.push(...scanContentForSecrets(textBody, `${ep.name} (response body)`, canarySecret));
      allFindings.push(...scanContentForSecrets(headerDump, `${ep.name} (response headers)`, canarySecret));
    }

    console.log(
      `[4/5] Live Server Canary Leak Probe: Verified ${endpoints.length} HTTP endpoints against canary GEMINI_API_KEY`
    );
  } finally {
    server.close();
    process.env.GEMINI_API_KEY = prevKey;
  }

  // 5. Git Remote & .gitignore Hygiene Check
  const gitignoreContent = fs.existsSync(path.join(rootDir, '.gitignore'))
    ? fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8')
    : '';
  const requiredIgnored = ['.env*', '.aistudio/', 'bun.lock', 'metadata.json', '.playwright-cli/'];
  for (const item of requiredIgnored) {
    if (!gitignoreContent.includes(item)) {
      allFindings.push({
        ruleId: 'missing_gitignore_entry',
        severity: 'warning',
        location: '.gitignore',
        description: `Missing recommended ignore pattern "${item}" in .gitignore`,
        redactedMatch: item,
      });
    }
  }

  try {
    const remotes = execSync('git remote -v', { encoding: 'utf-8' });
    allFindings.push(...scanContentForSecrets(remotes, 'git remote -v'));
  } catch {
    // Ignore if git is unavailable
  }
  console.log('[5/5] Git Remote & .gitignore Hygiene: Verified clean remote URLs and ignore rules\n');

  if (allFindings.length > 0) {
    console.error(`❌ AUDIT FAILED: ${allFindings.length} security finding(s) detected:`);
    for (const f of allFindings) {
      console.error(`  - [${f.severity.toUpperCase()}] ${f.ruleId} @ ${f.location}: ${f.description} (${f.redactedMatch})`);
    }
    process.exit(1);
  }

  console.log('✅ QA & API LEAK SECURITY AUDIT PASSED: 0 secret leaks, 0 client key exposures, 0 remote token leaks.');
}

runQaAndSecurityAudit();
