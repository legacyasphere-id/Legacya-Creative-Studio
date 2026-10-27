import { FigmaExportContract, HyperframesCompositionBundle, StudioProject } from '../types/studio';
import { buildFigmaExportContract } from './exportSerializer';
import { compileHyperframesBundle } from './hyperframesEngine';
import { generateStandaloneHtmlCarouselPreview } from './intelligenceBridge';
import { compileSlideSpecification } from './layoutEngine';

export interface SecretScanFinding {
  ruleId: string;
  severity: 'critical' | 'warning';
  location: string;
  description: string;
  redactedMatch: string;
}

export interface ArtifactSecurityAuditReport {
  passed: boolean;
  checkedAt: string;
  artifactsScanned: string[];
  findings: SecretScanFinding[];
}

const SECRET_PATTERNS: Array<{
  ruleId: string;
  description: string;
  regex: RegExp;
}> = [
  {
    ruleId: 'google_api_key',
    description: 'Google Cloud / Gemini API Key literal (AIza...)',
    regex: /AIza[0-9A-Za-z\-_]{25,}/g,
  },
  {
    ruleId: 'github_pat_classic',
    description: 'GitHub Personal Access Token (ghp_...)',
    regex: /ghp_[0-9A-Za-z]{25,}/g,
  },
  {
    ruleId: 'github_pat_fine_grained',
    description: 'GitHub Fine-Grained Token (github_pat_...)',
    regex: /github_pat_[0-9A-Za-z_]{25,}/g,
  },
  {
    ruleId: 'openai_or_secret_key',
    description: 'Secret key literal (sk-...)',
    regex: /\bsk-[0-9A-Za-z]{20,}\b/g,
  },
];

function redactToken(raw: string): string {
  if (raw.length <= 10) return '***REDACTED***';
  return `${raw.slice(0, 6)}...${raw.slice(-3)}`;
}

/**
 * Scans any string payload for high-entropy credential patterns or an explicit canary secret.
 */
export function scanContentForSecrets(
  content: string,
  location: string,
  canarySecret?: string
): SecretScanFinding[] {
  const findings: SecretScanFinding[] = [];
  if (!content) return findings;

  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      findings.push({
        ruleId: pattern.ruleId,
        severity: 'critical',
        location,
        description: pattern.description,
        redactedMatch: redactToken(matches[0]),
      });
    }
  }

  if (canarySecret && canarySecret.trim().length >= 8 && content.includes(canarySecret)) {
    findings.push({
      ruleId: 'canary_secret_leak',
      severity: 'critical',
      location,
      description: 'Server environment canary secret leaked into payload.',
      redactedMatch: redactToken(canarySecret),
    });
  }

  return findings;
}

/**
 * Audits client-side source code content to ensure:
 * 1. No direct @google/genai SDK imports in browser components.
 * 2. No process.env.GEMINI_API_KEY references in browser code.
 * 3. No secret literals embedded in source.
 */
export function auditClientSourceContent(
  sourceCode: string,
  filePath: string
): SecretScanFinding[] {
  if (filePath.endsWith('securityAudit.ts')) {
    return [];
  }
  const findings = scanContentForSecrets(sourceCode, filePath);
  const sdkImportSingle = ['from', "'@google/genai'"].join(' ');
  const sdkImportDouble = ['from', '"@google/genai"'].join(' ');
  const envKeyToken = ['process', 'env', 'GEMINI_API_KEY'].join('.');

  if (sourceCode.includes(sdkImportSingle) || sourceCode.includes(sdkImportDouble)) {
    findings.push({
      ruleId: 'client_side_genai_sdk_import',
      severity: 'critical',
      location: filePath,
      description:
        'Browser source file imports @google/genai directly; all Gemini calls must go through server-side /api/gemini/* routes.',
      redactedMatch: '@google/genai',
    });
  }

  if (sourceCode.includes(envKeyToken)) {
    findings.push({
      ruleId: 'client_side_env_key_access',
      severity: 'critical',
      location: filePath,
      description:
        'Browser source file references process.env.GEMINI_API_KEY; API keys must remain strictly server-side.',
      redactedMatch: envKeyToken,
    });
  }

  return findings;
}

/**
 * Compiles all studio export artifacts (Figma 1.0.0 JSON contract, HyperFrames HTML/frame.md/timeline.json,
 * and standalone HTML carousel preview) and verifies zero secret or canary exposure.
 */
export function auditExportedArtifactsForLeaks(
  project: StudioProject,
  canarySecret?: string
): ArtifactSecurityAuditReport {
  const specs = project.storyboard.map((slide) =>
    compileSlideSpecification(
      slide,
      project.storyboard.length,
      project.brandTokens,
      project.assets
    )
  );

  const figmaContract: FigmaExportContract = buildFigmaExportContract(project);
  const figmaContractJson = JSON.stringify(figmaContract, null, 2);

  const hyperframesBundle: HyperframesCompositionBundle = compileHyperframesBundle(
    project,
    specs,
    undefined,
    30
  );

  const standaloneHtml = generateStandaloneHtmlCarouselPreview(project);

  const artifacts: Array<{ name: string; content: string }> = [
    { name: 'figma_contract_v1.0.0.json', content: figmaContractJson },
    { name: 'hyperframes_index.html', content: hyperframesBundle.rootIndexHtml },
    { name: 'frame.md', content: hyperframesBundle.frameMdSpec },
    { name: 'timeline.json', content: hyperframesBundle.timelineJson },
    { name: 'carousel_preview.html', content: standaloneHtml },
  ];

  const findings: SecretScanFinding[] = [];
  for (const artifact of artifacts) {
    findings.push(...scanContentForSecrets(artifact.content, artifact.name, canarySecret));
  }

  return {
    passed: findings.length === 0,
    checkedAt: new Date().toISOString(),
    artifactsScanned: artifacts.map((a) => a.name),
    findings,
  };
}
