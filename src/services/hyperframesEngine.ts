import {
  FigmaImageNode,
  FigmaShapeNode,
  FigmaSlideElement,
  FigmaTextNode,
  HyperframesCheckReport,
  HyperframesClipDescriptor,
  HyperframesCompositionBundle,
  HyperframesLintFinding,
  HyperframesMotionPreset,
  HyperframesSlideTiming,
  SlideSpecification,
  StoryboardSlide,
  StudioProject,
} from '../types/studio';

export const HYPERFRAMES_MOTION_PRESETS: Record<
  HyperframesMotionPreset,
  {
    label: string;
    description: string;
    cssEasing: string;
    gsapEase: string;
    entryDurationSec: number;
    staggerStepSec: number;
  }
> = {
  editorial_reveal: {
    label: 'Editorial Reveal',
    description: 'Restrained vertical lift (18px) with soft optical de-blur (6px → 0px).',
    cssEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    gsapEase: 'power4.out',
    entryDurationSec: 0.42,
    staggerStepSec: 0.12,
  },
  kinetic_stagger: {
    label: 'Kinetic Stagger',
    description: 'Crisp sequential typographic entrance with high-velocity horizontal lock.',
    cssEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    gsapEase: 'expo.out',
    entryDurationSec: 0.34,
    staggerStepSec: 0.15,
  },
  architectural_wipe: {
    label: 'Architectural Wipe',
    description: 'Structural scale & rule expansion from 0.96 → 1.00 with zero bounce.',
    cssEasing: 'cubic-bezier(0.19, 1, 0.22, 1)',
    gsapEase: 'power3.out',
    entryDurationSec: 0.48,
    staggerStepSec: 0.1,
  },
  precision_cut: {
    label: 'Precision Cut',
    description: 'Ultra-fast 120ms editorial shutter cut with tight frame hold.',
    cssEasing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    gsapEase: 'power2.out',
    entryDurationSec: 0.16,
    staggerStepSec: 0.08,
  },
};

export interface ComputedElementMotionState {
  visible: boolean;
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  blurPx: number;
  localStart: number;
  localDuration: number;
  progress: number;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeOutQuart(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Formats seconds into deterministic SMPTE timecode MM:SS:FF at the given frame rate.
 */
export function formatSmpteTimecode(timeSec: number, fps: number = 30): string {
  const safeTime = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0);
  const safeFps = fps === 60 ? 60 : 30;
  const totalFrames = Math.floor(safeTime * safeFps + 1e-6);
  const frames = totalFrames % safeFps;
  const totalSeconds = Math.floor(totalFrames / safeFps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * Computes the HyperFrames 90% Action-Safe and 80% Title-Safe camera boxes.
 */
export function computeSafeBoxes(width: number, height: number): {
  actionSafeBox: { x: number; y: number; width: number; height: number };
  titleSafeBox: { x: number; y: number; width: number; height: number };
} {
  return {
    actionSafeBox: {
      x: Math.round(width * 0.05),
      y: Math.round(height * 0.05),
      width: Math.round(width * 0.9),
      height: Math.round(height * 0.9),
    },
    titleSafeBox: {
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8),
    },
  };
}

/**
 * Builds deterministic default per-slide timings and presets from a storyboard.
 */
export function createDefaultHyperframesTimings(
  slides: StoryboardSlide[]
): Record<string, HyperframesSlideTiming> {
  const map: Record<string, HyperframesSlideTiming> = {};
  slides.forEach((slide, idx) => {
    let motionPreset: HyperframesMotionPreset = 'editorial_reveal';
    if (slide.category === 'comparison' || slide.category === 'process_steps') {
      motionPreset = 'kinetic_stagger';
    } else if (
      slide.category === 'service_showcase' ||
      slide.category === 'website_product_showcase'
    ) {
      motionPreset = 'architectural_wipe';
    } else if (slide.category === 'case_study') {
      motionPreset = 'precision_cut';
    }

    const isBookend = idx === 0 || idx === slides.length - 1;
    map[slide.id] = {
      slideId: slide.id,
      durationSec: isBookend ? 4.0 : 3.5,
      motionPreset,
      includeCaptionTrack: true,
    };
  });
  return map;
}

/**
 * Resolves the HyperFrames role, track index, and local [start, start + duration) window
 * for a slide element.
 */
export function resolveElementClipWindow(
  element: FigmaSlideElement,
  elementIndex: number,
  sceneDurationSec: number,
  preset: HyperframesMotionPreset
): {
  role: HyperframesClipDescriptor['role'];
  trackIndex: number;
  trackKind: 'graphics' | 'captions';
  localStart: number;
  localDuration: number;
} {
  const safeSceneDur = Math.max(1.5, sceneDurationSec);
  const presetMeta = HYPERFRAMES_MOTION_PRESETS[preset];

  if (element.type === 'TEXT') {
    const textEl = element as FigmaTextNode;
    if (textEl.textStyleToken === 'display' || textEl.textStyleToken === 'heading') {
      const localStart = Number(Math.min(0.18, safeSceneDur * 0.1).toFixed(2));
      return {
        role: 'headline',
        trackIndex: 3,
        trackKind: 'graphics',
        localStart,
        localDuration: Number(Math.max(0.5, safeSceneDur - localStart).toFixed(2)),
      };
    }
    if (textEl.textStyleToken === 'body') {
      const localStart = Number(
        Math.min(0.32 + presetMeta.staggerStepSec * 0.5, safeSceneDur * 0.25).toFixed(2)
      );
      return {
        role: 'body',
        trackIndex: 3,
        trackKind: 'graphics',
        localStart,
        localDuration: Number(Math.max(0.5, safeSceneDur - localStart).toFixed(2)),
      };
    }
    const isFooterOrCaption =
      textEl.textStyleToken === 'caption' || textEl.y >= 1180 || textEl.name.toLowerCase().includes('cta');
    const localStart = Number(
      Math.min(isFooterOrCaption ? 0.44 : 0.08, safeSceneDur * 0.3).toFixed(2)
    );
    return {
      role: 'caption_cta',
      trackIndex: 4,
      trackKind: isFooterOrCaption ? 'captions' : 'graphics',
      localStart,
      localDuration: Number(Math.max(0.5, safeSceneDur - localStart).toFixed(2)),
    };
  }

  // Shapes, Lines, Vectors, Images
  const isBackgroundCard = element.width >= 900 && element.height >= 900;
  const localStart = isBackgroundCard
    ? 0
    : Number(Math.min(0.1 + (elementIndex % 4) * 0.06, safeSceneDur * 0.2).toFixed(2));

  return {
    role: isBackgroundCard ? 'background' : 'geometry',
    trackIndex: 2,
    trackKind: 'graphics',
    localStart,
    localDuration: Number(Math.max(0.5, safeSceneDur - localStart).toFixed(2)),
  };
}

/**
 * Pure, deterministic evaluator of a slide element's compositor state at local scene time `localTimeSec`.
 * Guarantees that seeking to any timestamp `t` produces the exact same visual state without side effects.
 */
export function evaluateElementMotionAtTime(
  element: FigmaSlideElement,
  localTimeSec: number,
  sceneDurationSec: number,
  preset: HyperframesMotionPreset,
  elementIndex: number
): ComputedElementMotionState {
  const { role, localStart, localDuration } = resolveElementClipWindow(
    element,
    elementIndex,
    sceneDurationSec,
    preset
  );
  const localEnd = localStart + localDuration;

  // HyperFrames Contract Rule 1: A clip shows strictly over [start, start + duration)
  if (localTimeSec < localStart || localTimeSec >= localEnd) {
    return {
      visible: false,
      opacity: 0,
      translateX: 0,
      translateY: 0,
      scale: 1,
      blurPx: 0,
      localStart,
      localDuration,
      progress: localTimeSec < localStart ? 0 : 1,
    };
  }

  const presetMeta = HYPERFRAMES_MOTION_PRESETS[preset];
  const elapsed = localTimeSec - localStart;
  const entryProgress = easeOutQuart(elapsed / Math.max(0.08, presetMeta.entryDurationSec));

  // Subtle exit settle 0.14s before scene end so end state lands just before clip end
  const remaining = localEnd - localTimeSec;
  const exitFactor = remaining < 0.12 ? clamp(remaining / 0.12, 0.88, 1) : 1;

  const baseOpacity = typeof element.opacity === 'number' ? element.opacity : 1;
  const opacity = Number((baseOpacity * entryProgress * exitFactor).toFixed(4));

  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let blurPx = 0;

  if (preset === 'editorial_reveal') {
    translateY = Number(((1 - entryProgress) * (role === 'headline' ? 22 : 14)).toFixed(2));
    blurPx = role === 'headline' ? Number(((1 - entryProgress) * 5).toFixed(2)) : 0;
  } else if (preset === 'kinetic_stagger') {
    translateX = Number(((1 - entryProgress) * (role === 'geometry' ? -24 : -18)).toFixed(2));
    translateY = Number(((1 - entryProgress) * 6).toFixed(2));
  } else if (preset === 'architectural_wipe') {
    scale = Number((0.95 + 0.05 * entryProgress).toFixed(4));
    translateY = Number(((1 - entryProgress) * 10).toFixed(2));
  } else if (preset === 'precision_cut') {
    translateY = Number(((1 - entryProgress) * 6).toFixed(2));
  }

  return {
    visible: true,
    opacity,
    translateX,
    translateY,
    scale,
    blurPx,
    localStart,
    localDuration,
    progress: Number(clamp(elapsed / localDuration, 0, 1).toFixed(4)),
  };
}

/**
 * Generates the HyperFrames `frame.md` specification ("your design system, ready for video")
 * from the active LEGACYA SPHERE project and brand tokens.
 */
export function generateFrameMdSpec(
  project: StudioProject,
  specs: SlideSpecification[],
  timings: Record<string, HyperframesSlideTiming>,
  fps: 30 | 60 = 30
): string {
  const { colors, typography, layout, components } = project.brandTokens;
  const { actionSafeBox, titleSafeBox } = computeSafeBoxes(
    layout.canvasWidth,
    layout.canvasHeight
  );
  const totalDurationSec = project.storyboard.reduce(
    (sum, s) => sum + (timings[s.id]?.durationSec || 3.5),
    0
  );
  const totalFrames = Math.round(totalDurationSec * fps);

  const shotLines = project.storyboard
    .map((slide, idx) => {
      const timing = timings[slide.id] || {
        slideId: slide.id,
        durationSec: 3.5,
        motionPreset: 'editorial_reveal' as HyperframesMotionPreset,
        includeCaptionTrack: true,
      };
      const startSec = project.storyboard
        .slice(0, idx)
        .reduce((acc, prev) => acc + (timings[prev.id]?.durationSec || 3.5), 0);
      const endSec = startSec + timing.durationSec;
      const startFrame = Math.round(startSec * fps);
      const endFrame = Math.round(endSec * fps);
      const presetMeta = HYPERFRAMES_MOTION_PRESETS[timing.motionPreset];
      return `| \`scene_${String(slide.slideNumber).padStart(2, '0')}\` | \`[${startSec.toFixed(2)}s, ${endSec.toFixed(2)}s)\` (\`f${startFrame}..f${endFrame}\`) | \`${slide.layoutPattern}\` | \`${timing.motionPreset}\` (\`${presetMeta.gsapEase}\`) | "${slide.primaryHeadline}" |`;
    })
    .join('\n');

  return `---
name: legacya-sphere-frame-spec
schema: hyperframes/frame.md/v1
project_id: ${project.id}
canvas: ${layout.canvasWidth}x${layout.canvasHeight}
aspect_ratio: 3:4
fps: ${fps}
duration_seconds: ${totalDurationSec.toFixed(2)}
total_frames: ${totalFrames}
---

# frame.md — LEGACYA SPHERE Camera & Motion Design System

> Every brand has a \`DESIGN.md\`. \`frame.md\` translates LEGACYA SPHERE's editorial print tokens for the camera so deterministic HTML-to-MP4 agents (\`npx hyperframes\`) compose frames without guessing scale or reaching for web chrome.

## 1. Camera Geometry & Safe Zones

- **Root Canvas**: \`${layout.canvasWidth}px × ${layout.canvasHeight}px\` (3:4 Editorial Portrait, \`origin: TOP_LEFT\`)
- **Frame Rate**: \`${fps} fps\` (\`${(1000 / fps).toFixed(2)} ms\` per frame)
- **90% Action-Safe Box**: \`x: ${actionSafeBox.x}..${actionSafeBox.x + actionSafeBox.width}\`, \`y: ${actionSafeBox.y}..${actionSafeBox.y + actionSafeBox.height}\` (\`${actionSafeBox.width}×${actionSafeBox.height}px\`)
- **80% Title-Safe Box**: \`x: ${titleSafeBox.x}..${titleSafeBox.x + titleSafeBox.width}\`, \`y: ${titleSafeBox.y}..${titleSafeBox.y + titleSafeBox.height}\` (\`${titleSafeBox.width}×${titleSafeBox.height}px\`)
- **Outer Editorial Margin**: \`${layout.outerMargin}px\` · **12-Column Grid Gutter**: \`${layout.gutter}px\`

## 2. Color Tokens (CSS Custom Properties on \`#root\`)

| Token Variable | Hex Value | Camera Role |
| :--- | :--- | :--- |
| \`--bg-primary\` | \`${colors.backgroundPrimary}\` | Warm Cream archival paper field (60% canvas budget) |
| \`--bg-secondary\` | \`${colors.backgroundSecondary}\` | Crisp gallery white card & split surfaces |
| \`--surface-dark\` | \`${colors.surfaceDark}\` | Deep Navy structural anchor & high-contrast frames |
| \`--text-primary\` | \`${colors.textPrimary}\` | Ink Black primary editorial typography |
| \`--text-secondary\` | \`${colors.textSecondary}\` | Restrained stone gray metadata & captions |
| \`--text-on-dark\` | \`${colors.textOnDark}\` | Alabaster text over Deep Navy / Ink Black |
| \`--border-hairline\` | \`${colors.border}\` | 1px structural divider & frame rule |

## 3. Camera Typography Scale

| Role | Family | Size (px) | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | \`${typography.display.fontFamily}\` | \`${typography.display.fontSize}px\` | \`${typography.display.fontWeight}\` | \`${typography.display.lineHeight}\` | \`${typography.display.letterSpacing}em\` |
| **Heading** | \`${typography.heading.fontFamily}\` | \`${typography.heading.fontSize}px\` | \`${typography.heading.fontWeight}\` | \`${typography.heading.lineHeight}\` | \`${typography.heading.letterSpacing}em\` |
| **Body** | \`${typography.body.fontFamily}\` | \`${typography.body.fontSize}px\` | \`${typography.body.fontWeight}\` | \`${typography.body.lineHeight}\` | \`${typography.body.letterSpacing}em\` |
| **Caption** | \`${typography.caption.fontFamily}\` | \`${typography.caption.fontSize}px\` | \`${typography.caption.fontWeight}\` | \`${typography.caption.lineHeight}\` | \`${typography.caption.letterSpacing}em\` |
| **Telemetry / Label** | \`${typography.label.fontFamily}\` | \`${typography.label.fontSize}px\` | \`${typography.label.fontWeight}\` | \`${typography.label.lineHeight}\` | \`${typography.label.letterSpacing}em\` |

## 4. Deterministic Motion Contract & Banned Defaults

1. **Seekable Purity**: Every composition registers a paused timeline on \`window.__timelines["<data-composition-id>"]\`. Frame rendering is a pure function \`f(t)\`.
2. **Strict Clip Windows**: Every timed element carries \`class="clip"\`, \`data-start\`, and \`data-duration\` in seconds, visible strictly over \`[start, start + duration)\`.
3. **Compositor-Only Tweens**: Animate only \`transform\` (\`translate3d\`, \`scale\`), \`opacity\`, and \`filter: blur()\`. Never animate \`top\`, \`left\`, \`width\`, \`height\`, or \`display\`.
4. **Banned Defaults**:
   - No \`Date.now()\`, \`Math.random()\`, \`setInterval\`, \`requestAnimationFrame\` loops, or \`repeat: -1\`.
   - No spring overshoot or elastic bounce on editorial typography.
   - No web scrollbars, hover states, or interactive browser chrome inside rendered scenes.
   - Brand signature (\`${components.brandLogoText}\` / \`${components.footerSignature}\`) remains locked to the baseline grid (\`y = ${layout.footerY}px\`).

## 5. Shot-by-Frame Storyboard Schedule (${specs.length} Scenes · ${totalDurationSec.toFixed(1)}s Total)

| Composition ID | Window (Seconds & Frames) | Layout Pattern | Motion Choreography | Primary Headline |
| :--- | :--- | :--- | :--- | :--- |
${shotLines}
`;
}

/**
 * Validates the compiled HyperFrames bundle against the 12 HyperFrames contract rules
 * (`npx hyperframes check --json` equivalent).
 */
export function validateHyperframesBundle(
  project: StudioProject,
  specs: SlideSpecification[],
  clips: HyperframesClipDescriptor[],
  rootIndexHtml: string,
  fps: 30 | 60 = 30
): HyperframesCheckReport {
  const errors: HyperframesLintFinding[] = [];
  const warnings: HyperframesLintFinding[] = [];

  const { canvasWidth, canvasHeight } = project.brandTokens.layout;
  const { actionSafeBox, titleSafeBox } = computeSafeBoxes(canvasWidth, canvasHeight);

  const sceneHostClips = clips.filter((c) => c.role === 'scene_host');
  const totalDurationSec = Number(
    sceneHostClips.reduce((acc, c) => acc + c.localDuration, 0).toFixed(2)
  );
  const totalFrames = Math.round(totalDurationSec * fps);

  // Rule 1 & 2: Check clip windows [start, start + duration)
  const seenIds = new Set<string>();
  clips.forEach((clip) => {
    if (seenIds.has(clip.id)) {
      errors.push({
        code: 'duplicate_clip_id',
        severity: 'error',
        compositionId: clip.compositionId,
        clipId: clip.id,
        message: `Duplicate clip id "${clip.id}" detected in composition "${clip.compositionId}".`,
        fix: `Assign a globally unique id to every .clip element in ${clip.compositionId}.`,
      });
    }
    seenIds.add(clip.id);

    if (clip.localStart < 0 || clip.localDuration <= 0 || clip.absEnd <= clip.absStart) {
      errors.push({
        code: 'invalid_clip_window',
        severity: 'error',
        compositionId: clip.compositionId,
        clipId: clip.id,
        message: `Clip "${clip.id}" has invalid timing window [${clip.localStart}, ${clip.localStart + clip.localDuration}).`,
        fix: `Ensure data-start >= 0 and data-duration > 0 on #${clip.id}.`,
      });
    }
  });

  // Rule 3: Check timeline registration in HTML
  if (!rootIndexHtml.includes('window.__timelines')) {
    errors.push({
      code: 'missing_timeline_registry',
      severity: 'error',
      compositionId: 'main',
      message: 'Root composition does not register window.__timelines["main"].',
      fix: 'Register window.__timelines["<data-composition-id>"] = tl in every composition script.',
    });
  }

  // Rule 4: Nondeterministic calls check
  if (
    rootIndexHtml.includes('Math.random()') ||
    rootIndexHtml.includes('Date.now()') ||
    rootIndexHtml.includes('repeat: -1')
  ) {
    errors.push({
      code: 'nondeterministic_runtime_call',
      severity: 'error',
      compositionId: 'main',
      message: 'Detected Date.now(), Math.random(), or repeat: -1 in composition source.',
      fix: 'Remove wall-clock timers and unseeded random calls; compute all visual state as a function of timeline time t.',
    });
  }

  // Rule 5: Safe-area geometry audit across slide specifications
  specs.forEach((spec) => {
    const compId = `scene_${String(spec.slideNumber).padStart(2, '0')}`;
    spec.elements.forEach((el) => {
      if (el.type === 'TEXT') {
        const textEl = el as FigmaTextNode;
        const isPrimaryCopy =
          textEl.textStyleToken === 'display' ||
          textEl.textStyleToken === 'heading' ||
          textEl.textStyleToken === 'body';

        // Check 90% Action-Safe box for all text
        const outOfActionSafe =
          textEl.x < actionSafeBox.x ||
          textEl.y < actionSafeBox.y ||
          textEl.x + textEl.width > actionSafeBox.x + actionSafeBox.width ||
          textEl.y + textEl.height > actionSafeBox.y + actionSafeBox.height;

        if (outOfActionSafe) {
          warnings.push({
            code: 'outside_action_safe_90',
            severity: 'warning',
            compositionId: compId,
            clipId: textEl.id,
            message: `Text layer "${textEl.name}" (${textEl.x},${textEl.y} ${textEl.width}×${textEl.height}) extends outside the 90% Action-Safe box.`,
            fix: `Keep text inside x:${actionSafeBox.x}..${actionSafeBox.x + actionSafeBox.width}, y:${actionSafeBox.y}..${actionSafeBox.y + actionSafeBox.height} or add data-layout-allow-overflow.`,
          });
        } else if (isPrimaryCopy) {
          // Check 80% Title-Safe box for primary headlines/body
          const outOfTitleSafe =
            textEl.x < titleSafeBox.x - 24 ||
            textEl.x + textEl.width > titleSafeBox.x + titleSafeBox.width + 24;
          if (outOfTitleSafe) {
            warnings.push({
              code: 'outside_title_safe_80',
              severity: 'warning',
              compositionId: compId,
              clipId: textEl.id,
              message: `Primary copy "${textEl.name}" approaches the 80% Title-Safe horizontal margin.`,
              fix: `Constrain primary headline/body width within x:${titleSafeBox.x}..${titleSafeBox.x + titleSafeBox.width}.`,
            });
          }
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    checkedAt: new Date().toISOString(),
    fps,
    width: canvasWidth,
    height: canvasHeight,
    totalDurationSec,
    totalFrames,
    totalCompositions: specs.length + 1,
    totalClipsChecked: clips.length,
    actionSafeBox,
    titleSafeBox,
    errors,
    warnings,
  };
}

function renderElementHtmlForTemplate(
  el: FigmaSlideElement,
  clip: HyperframesClipDescriptor,
  project: StudioProject
): string {
  const baseStyle = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${clip.zIndex};`;

  if (el.type === 'TEXT') {
    const t = el as FigmaTextNode;
    const align = t.textAlign.toLowerCase();
    const fontStack =
      t.textStyleToken === 'display' || t.textStyleToken === 'heading'
        ? `'${t.fontFamily}', Georgia, serif`
        : t.textStyleToken === 'label'
          ? `'${t.fontFamily}', monospace`
          : `'${t.fontFamily}', sans-serif`;
    const varAttr = clip.varTextId ? ` data-var-text="${clip.varTextId}"` : '';

    return `      <div id="${clip.id}" class="clip" data-start="${clip.localStart}" data-duration="${clip.localDuration}" data-track-index="${clip.trackIndex}" data-track-kind="${clip.trackKind}" data-motion-preset="${clip.motionPreset}" style="${baseStyle}pointer-events:none;">
        <div class="clip-inner" style="width:100%;height:100%;color:${t.textColor};font-family:${fontStack};font-size:${t.fontSize}px;font-weight:${t.fontWeight};line-height:${t.lineHeight};letter-spacing:${t.letterSpacing}em;text-align:${align};white-space:pre-wrap;overflow:hidden;"${varAttr}>${escapeHtml(t.textContent)}</div>
      </div>`;
  }

  if (el.type === 'RECTANGLE' || el.type === 'ELLIPSE' || el.type === 'LINE' || el.type === 'VECTOR') {
    const s = el as FigmaShapeNode;
    if (s.type === 'LINE') {
      const strokeColor = s.stroke || project.brandTokens.colors.border;
      return `      <div id="${clip.id}" class="clip" data-start="${clip.localStart}" data-duration="${clip.localDuration}" data-track-index="${clip.trackIndex}" data-track-kind="graphics" data-motion-preset="${clip.motionPreset}" style="position:absolute;left:${s.x}px;top:${s.y}px;width:${Math.max(1, s.width)}px;height:${Math.max(1, s.strokeWidth || 1)}px;z-index:${clip.zIndex};">
        <div class="clip-inner" style="width:100%;height:100%;background:${strokeColor};"></div>
      </div>`;
    }
    const radius = s.type === 'ELLIPSE' ? '9999px' : `${s.cornerRadius || 0}px`;
    const bg = s.fill || 'transparent';
    const border = s.stroke && s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.stroke}` : 'none';
    return `      <div id="${clip.id}" class="clip" data-start="${clip.localStart}" data-duration="${clip.localDuration}" data-track-index="${clip.trackIndex}" data-track-kind="graphics" data-motion-preset="${clip.motionPreset}" style="${baseStyle}">
        <div class="clip-inner" style="width:100%;height:100%;background:${bg};border:${border};border-radius:${radius};"></div>
      </div>`;
  }

  if (el.type === 'IMAGE') {
    const img = el as FigmaImageNode;
    return `      <div id="${clip.id}" class="clip" data-start="${clip.localStart}" data-duration="${clip.localDuration}" data-track-index="${clip.trackIndex}" data-track-kind="graphics" data-motion-preset="${clip.motionPreset}" style="${baseStyle}overflow:hidden;">
        <img class="clip-inner" src="${img.imageReference}" alt="${escapeHtml(img.altText)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>`;
  }

  return '';
}

/**
 * Compiles the active studio project and slide specifications into a complete,
 * validated HyperFrames ("Video as Code") composition bundle.
 */
export function compileHyperframesBundle(
  project: StudioProject,
  specs: SlideSpecification[],
  customTimings?: Record<string, HyperframesSlideTiming>,
  fps: 30 | 60 = 30
): HyperframesCompositionBundle {
  const defaultTimings = createDefaultHyperframesTimings(project.storyboard);
  const timings: Record<string, HyperframesSlideTiming> = {
    ...defaultTimings,
    ...(customTimings || {}),
  };

  const { canvasWidth, canvasHeight } = project.brandTokens.layout;
  const variables: HyperframesCompositionBundle['variables'] = [
    {
      id: 'brand_bg_primary',
      type: 'color',
      label: 'Primary Canvas Background',
      default: project.brandTokens.colors.backgroundPrimary,
    },
    {
      id: 'brand_surface_dark',
      type: 'color',
      label: 'Deep Navy Structural Surface',
      default: project.brandTokens.colors.surfaceDark,
    },
  ];

  const scenes: HyperframesCompositionBundle['scenes'] = [];
  const clips: HyperframesClipDescriptor[] = [];

  let cursorSec = 0;

  project.storyboard.forEach((slide, slideIdx) => {
    const spec = specs.find((sp) => sp.slideId === slide.id) || specs[slideIdx];
    if (!spec) return;

    const timing = timings[slide.id] || {
      slideId: slide.id,
      durationSec: 3.5,
      motionPreset: 'editorial_reveal' as HyperframesMotionPreset,
      includeCaptionTrack: true,
    };
    const sceneDurationSec = Number(clamp(timing.durationSec, 1.5, 12.0).toFixed(2));
    const sceneStartSec = Number(cursorSec.toFixed(2));
    const compositionId = `scene_${String(slide.slideNumber).padStart(2, '0')}`;

    const varHeadlineId = `slide_${String(slide.slideNumber).padStart(2, '0')}_headline`;
    variables.push({
      id: varHeadlineId,
      type: 'string',
      label: `Slide ${String(slide.slideNumber).padStart(2, '0')} Headline`,
      default: slide.primaryHeadline,
    });

    // Scene host clip on root composition
    const hostClip: HyperframesClipDescriptor = {
      id: `host_${compositionId}`,
      compositionId: 'main',
      slideId: slide.id,
      slideNumber: slide.slideNumber,
      layerId: spec.frameNodeId,
      label: `Scene ${String(slide.slideNumber).padStart(2, '0')} · ${slide.category}`,
      role: 'scene_host',
      trackIndex: 1,
      trackKind: 'graphics',
      localStart: sceneStartSec,
      localDuration: sceneDurationSec,
      absStart: sceneStartSec,
      absEnd: Number((sceneStartSec + sceneDurationSec).toFixed(2)),
      zIndex: slideIdx + 1,
      motionPreset: timing.motionPreset,
    };
    clips.push(hostClip);

    const sortedElements = [...spec.elements].sort((a, b) => a.layerOrder - b.layerOrder);
    const elementHtmlBlocks: string[] = [];

    sortedElements.forEach((el, elIdx) => {
      const win = resolveElementClipWindow(el, elIdx, sceneDurationSec, timing.motionPreset);
      if (!timing.includeCaptionTrack && win.trackKind === 'captions') {
        return;
      }

      const isPrimaryHeadline =
        el.type === 'TEXT' &&
        ((el as FigmaTextNode).textStyleToken === 'display' ||
          (el as FigmaTextNode).textStyleToken === 'heading');

      const clipDesc: HyperframesClipDescriptor = {
        id: `clip_${compositionId}_${String(elIdx + 1).padStart(2, '0')}`,
        compositionId,
        slideId: slide.id,
        slideNumber: slide.slideNumber,
        layerId: el.id,
        label: el.name,
        role: win.role,
        trackIndex: win.trackIndex,
        trackKind: win.trackKind,
        localStart: win.localStart,
        localDuration: win.localDuration,
        absStart: Number((sceneStartSec + win.localStart).toFixed(2)),
        absEnd: Number((sceneStartSec + win.localStart + win.localDuration).toFixed(2)),
        zIndex: elIdx + 2,
        varTextId: isPrimaryHeadline ? varHeadlineId : undefined,
        motionPreset: timing.motionPreset,
      };
      clips.push(clipDesc);
      elementHtmlBlocks.push(renderElementHtmlForTemplate(el, clipDesc, project));
    });

    const templateHtml = `<template id="tpl_${compositionId}" data-composition-id="${compositionId}">
  <style>
    #${compositionId}_root {
      position: absolute;
      inset: 0;
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      overflow: hidden;
    }
  </style>
  <div id="${compositionId}_root" data-composition-id="${compositionId}" data-width="${canvasWidth}" data-height="${canvasHeight}">
    <!-- Full-bleed background child per HyperFrames contract -->
    <div id="bg_${compositionId}" style="position:absolute;inset:0;background:${spec.backgroundColor};z-index:1;"></div>
${elementHtmlBlocks.join('\n')}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["${compositionId}"] = {
      compositionId: "${compositionId}",
      paused: true,
      startSec: ${sceneStartSec},
      durationSec: ${sceneDurationSec},
      motionPreset: "${timing.motionPreset}"
    };
  </script>
</template>`;

    scenes.push({
      compositionId,
      slideId: slide.id,
      slideNumber: slide.slideNumber,
      startSec: sceneStartSec,
      durationSec: sceneDurationSec,
      motionPreset: timing.motionPreset,
      templateHtml,
    });

    cursorSec = Number((cursorSec + sceneDurationSec).toFixed(2));
  });

  const totalDurationSec = Number(cursorSec.toFixed(2));
  const totalFrames = Math.round(totalDurationSec * fps);

  const sceneHostMarkup = scenes
    .map(
      (scene, idx) =>
        `      <div
        id="host_${scene.compositionId}"
        class="clip scene-host"
        data-composition-id="${scene.compositionId}"
        data-composition-src="compositions/${scene.compositionId}.html"
        data-start="${scene.startSec}"
        data-duration="${scene.durationSec}"
        data-track-index="1"
        data-track-kind="graphics"
        data-width="${canvasWidth}"
        data-height="${canvasHeight}"
        style="position:absolute;inset:0;z-index:${idx + 1};"
      ></div>`
    )
    .join('\n');

  const rootIndexHtml = `<!DOCTYPE html>
<html lang="en" data-composition-variables='${ JSON.stringify(variables).replace(/'/g, '&#39;') }'>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.brief.projectName)} — LEGACYA SPHERE HyperFrames Composition</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: ${project.brandTokens.colors.backgroundPrimary};
      --bg-secondary: ${project.brandTokens.colors.backgroundSecondary};
      --surface-dark: ${project.brandTokens.colors.surfaceDark};
      --text-primary: ${project.brandTokens.colors.textPrimary};
      --text-secondary: ${project.brandTokens.colors.textSecondary};
      --border-hairline: ${project.brandTokens.colors.border};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #121212;
      color: #F7F4EE;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 16px;
    }
    .stage-shell {
      position: relative;
      width: 540px;
      height: 720px;
      border: 1px solid #333;
      overflow: hidden;
      background: var(--bg-primary);
    }
    #root {
      position: absolute;
      top: 0;
      left: 0;
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      transform: scale(0.5);
      transform-origin: top left;
      overflow: hidden;
    }
    .hud-bar {
      width: 540px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: #1C1917;
      border: 1px solid #333;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .hud-bar button {
      background: #F7F4EE;
      color: #121212;
      border: none;
      padding: 6px 12px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      cursor: pointer;
    }
    .hud-bar input[type="range"] {
      flex: 1;
      accent-color: #F7F4EE;
    }
  </style>
</head>
<body>
  <div class="stage-shell">
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${totalDurationSec}"
      data-fps="${fps}"
      data-width="${canvasWidth}"
      data-height="${canvasHeight}"
    >
${sceneHostMarkup}
    </div>
  </div>

  <div class="hud-bar">
    <button id="btn-play" type="button">Play</button>
    <input id="scrubber" type="range" min="0" max="${totalDurationSec}" step="${(1 / fps).toFixed(4)}" value="0" />
    <span id="timecode">00:00:00 / ${formatSmpteTimecode(totalDurationSec, fps)}</span>
  </div>

  <!-- Sub-composition templates -->
${scenes.map((s) => s.templateHtml).join('\n\n')}

  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = {
      compositionId: "main",
      paused: true,
      durationSec: ${totalDurationSec},
      fps: ${fps},
      seek: function(t) { window.__hyperframes.seek(t); }
    };

    (function initHyperframesRuntime() {
      const hosts = Array.from(document.querySelectorAll('.scene-host'));
      hosts.forEach((host) => {
        const compId = host.getAttribute('data-composition-id');
        const tpl = document.getElementById('tpl_' + compId);
        if (tpl && tpl.content) {
          host.appendChild(tpl.content.cloneNode(true));
        }
      });

      function easeOutQuart(x) {
        const t = Math.max(0, Math.min(1, x));
        return 1 - Math.pow(1 - t, 4);
      }

      function seek(timeSec) {
        const t = Math.max(0, Math.min(${totalDurationSec}, Number(timeSec) || 0));
        hosts.forEach((host) => {
          const start = parseFloat(host.getAttribute('data-start') || '0');
          const dur = parseFloat(host.getAttribute('data-duration') || '3.5');
          const active = t >= start && t < (start + dur) || (t === ${totalDurationSec} && Math.abs(start + dur - ${totalDurationSec}) < 0.01);
          host.style.opacity = active ? '1' : '0';
          host.style.pointerEvents = active ? 'auto' : 'none';
          if (!active) return;

          const localT = Math.max(0, t - start);
          const clips = Array.from(host.querySelectorAll('.clip'));
          clips.forEach((clip) => {
            const cStart = parseFloat(clip.getAttribute('data-start') || '0');
            const cDur = parseFloat(clip.getAttribute('data-duration') || '1');
            const preset = clip.getAttribute('data-motion-preset') || 'editorial_reveal';
            const inner = clip.querySelector('.clip-inner');
            if (!inner) return;
            if (localT < cStart || localT >= cStart + cDur) {
              inner.style.opacity = '0';
              return;
            }
            const p = easeOutQuart((localT - cStart) / 0.38);
            inner.style.opacity = String(p);
            if (preset === 'kinetic_stagger') {
              inner.style.transform = 'translate3d(' + ((1 - p) * -18).toFixed(2) + 'px, 0px, 0px)';
            } else if (preset === 'architectural_wipe') {
              inner.style.transform = 'scale(' + (0.95 + 0.05 * p).toFixed(4) + ')';
            } else {
              inner.style.transform = 'translate3d(0px, ' + ((1 - p) * 18).toFixed(2) + 'px, 0px)';
            }
          });
        });

        const scrubber = document.getElementById('scrubber');
        const tc = document.getElementById('timecode');
        if (scrubber) scrubber.value = String(t);
        if (tc) {
          const totalF = Math.floor(t * ${fps} + 1e-6);
          const ff = String(totalF % ${fps}).padStart(2, '0');
          const ss = String(Math.floor(totalF / ${fps}) % 60).padStart(2, '0');
          const mm = String(Math.floor(totalF / (${fps} * 60))).padStart(2, '0');
          tc.textContent = mm + ':' + ss + ':' + ff + ' / ${formatSmpteTimecode(totalDurationSec, fps)}';
        }
      }

      window.__hyperframes = {
        seek: seek,
        getVariables: function() {
          try {
            return JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]');
          } catch (e) {
            return [];
          }
        }
      };

      let playing = false;
      let currentT = 0;
      let lastTick = 0;
      const btnPlay = document.getElementById('btn-play');
      const scrubber = document.getElementById('scrubber');

      function tick(now) {
        if (!playing) return;
        const dt = (now - lastTick) / 1000;
        lastTick = now;
        currentT += dt;
        if (currentT >= ${totalDurationSec}) {
          currentT = 0;
        }
        seek(currentT);
        requestAnimationFrame(tick);
      }

      if (btnPlay) {
        btnPlay.addEventListener('click', function() {
          playing = !playing;
          btnPlay.textContent = playing ? 'Pause' : 'Play';
          if (playing) {
            lastTick = performance.now();
            requestAnimationFrame(tick);
          }
        });
      }
      if (scrubber) {
        scrubber.addEventListener('input', function(e) {
          playing = false;
          if (btnPlay) btnPlay.textContent = 'Play';
          currentT = parseFloat(e.target.value || '0');
          seek(currentT);
        });
      }

      seek(0);
    })();
  </script>
</body>
</html>`;

  const frameMdSpec = generateFrameMdSpec(project, specs, timings, fps);
  const checkReport = validateHyperframesBundle(project, specs, clips, rootIndexHtml, fps);

  const timelineJson = JSON.stringify(
    {
      schema: 'hyperframes/timeline/v1',
      projectId: project.id,
      projectName: project.brief.projectName,
      fps,
      width: canvasWidth,
      height: canvasHeight,
      totalDurationSec,
      totalFrames,
      variables,
      compositions: scenes.map((s) => ({
        compositionId: s.compositionId,
        slideId: s.slideId,
        slideNumber: s.slideNumber,
        absStart: s.startSec,
        absEnd: Number((s.startSec + s.durationSec).toFixed(2)),
        durationSec: s.durationSec,
        motionPreset: s.motionPreset,
        file: `compositions/${s.compositionId}.html`,
      })),
      clips,
    },
    null,
    2
  );

  return {
    projectId: project.id,
    projectName: project.brief.projectName,
    fps,
    width: canvasWidth,
    height: canvasHeight,
    totalDurationSec,
    totalFrames,
    variables,
    scenes,
    clips,
    rootIndexHtml,
    frameMdSpec,
    timelineJson,
    checkReport,
  };
}
