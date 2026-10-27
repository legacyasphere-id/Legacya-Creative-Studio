import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  compileHyperframesBundle,
  computeSafeBoxes,
   createDefaultHyperframesTimings,
  evaluateElementMotionAtTime,
  formatSmpteTimecode,
  HYPERFRAMES_MOTION_PRESETS,
} from '../services/hyperframesEngine';
import {
  FigmaImageNode,
  FigmaShapeNode,
  FigmaSlideElement,
  FigmaTextNode,
  HyperframesMotionPreset,
  HyperframesSlideTiming,
  SlideSpecification,
  StudioProject,
} from '../types/studio';

interface HyperframesSectionProps {
  project: StudioProject;
  specs: SlideSpecification[];
  onRecordHyperframesExport: (summary: string) => void;
}

type StudioSubView = 'stage' | 'html_source' | 'frame_md' | 'contract_check';

export const HyperframesSection: React.FC<HyperframesSectionProps> = ({
  project,
  specs,
  onRecordHyperframesExport,
}) => {
  const [subView, setSubView] = useState<StudioSubView>('stage');
  const [fps, setFps] = useState<30 | 60>(30);
  const [timings, setTimings] = useState<Record<string, HyperframesSlideTiming>>(() =>
    createDefaultHyperframesTimings(project.storyboard)
  );
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0.85);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(true);
  const [selectedSceneCompositionId, setSelectedSceneCompositionId] =
    useState<string>('scene_01');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const playStateRef = useRef<{ isPlaying: boolean; lastTimestamp: number; duration: number }>({
    isPlaying: false,
    lastTimestamp: 0,
    duration: 20,
  });

  // Ensure timings stay synced when storyboard slides change
  useEffect(() => {
    setTimings((prev) => {
      const defaults = createDefaultHyperframesTimings(project.storyboard);
      const merged: Record<string, HyperframesSlideTiming> = {};
      project.storyboard.forEach((slide) => {
        merged[slide.id] = prev[slide.id] || defaults[slide.id];
      });
      return merged;
    });
  }, [project.storyboard]);

  const bundle = useMemo(
    () => compileHyperframesBundle(project, specs, timings, fps),
    [project, specs, timings, fps]
  );

  useEffect(() => {
    playStateRef.current.duration = bundle.totalDurationSec;
    if (currentTimeSec > bundle.totalDurationSec) {
      setCurrentTimeSec(0);
    }
  }, [bundle.totalDurationSec, currentTimeSec]);

  // RequestAnimationFrame loop for live preview playback
  useEffect(() => {
    playStateRef.current.isPlaying = isPlaying;
    if (!isPlaying) return;

    let rafId = 0;
    playStateRef.current.lastTimestamp = performance.now();

    const step = (now: number) => {
      if (!playStateRef.current.isPlaying) return;
      const dt = (now - playStateRef.current.lastTimestamp) / 1000;
      playStateRef.current.lastTimestamp = now;

      setCurrentTimeSec((prev) => {
        const next = prev + dt;
        if (next >= playStateRef.current.duration) {
          return 0;
        }
        return Number(next.toFixed(4));
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Determine active scene at `currentTimeSec`
  const activeScene = useMemo(() => {
    if (bundle.scenes.length === 0) return null;
    const found = bundle.scenes.find(
      (s) =>
        currentTimeSec >= s.startSec &&
        currentTimeSec < s.startSec + s.durationSec
    );
    return found || bundle.scenes[bundle.scenes.length - 1];
  }, [bundle.scenes, currentTimeSec]);

  const activeSpec = useMemo(() => {
    if (!activeScene) return specs[0] || null;
    return specs.find((sp) => sp.slideId === activeScene.slideId) || specs[0] || null;
  }, [activeScene, specs]);

  const localSceneTimeSec = useMemo(() => {
    if (!activeScene) return 0;
    return Math.max(0, Number((currentTimeSec - activeScene.startSec).toFixed(4)));
  }, [activeScene, currentTimeSec]);

  const currentFrameIndex = Math.floor(currentTimeSec * fps + 1e-6);
  const { actionSafeBox, titleSafeBox } = useMemo(
    () => computeSafeBoxes(bundle.width, bundle.height),
    [bundle.width, bundle.height]
  );

  const handleStepFrames = (deltaFrames: number) => {
    setIsPlaying(false);
    setCurrentTimeSec((prev) => {
      const nextFrame = Math.max(
        0,
        Math.min(bundle.totalFrames - 1, Math.round(prev * fps) + deltaFrames)
      );
      return Number((nextFrame / fps).toFixed(4));
    });
  };

  const handleJumpToScene = (startSec: number, compositionId: string) => {
    setIsPlaying(false);
    setCurrentTimeSec(Number((startSec + 0.85).toFixed(2)));
    setSelectedSceneCompositionId(compositionId);
  };

  const handleUpdateSlideTiming = (
    slideId: string,
    patch: Partial<HyperframesSlideTiming>
  ) => {
    setTimings((prev) => ({
      ...prev,
      [slideId]: {
        ...(prev[slideId] || {
          slideId,
          durationSec: 3.5,
          motionPreset: 'editorial_reveal',
          includeCaptionTrack: true,
        }),
        ...patch,
      },
    }));
  };

  const handleApplyPresetToAll = (preset: HyperframesMotionPreset) => {
    setTimings((prev) => {
      const updated: Record<string, HyperframesSlideTiming> = {};
      Object.keys(prev).forEach((slideId) => {
        updated[slideId] = {
          ...prev[slideId],
          motionPreset: preset,
        };
      });
      return updated;
    });
    setStatusMessage(
      `Applied "${HYPERFRAMES_MOTION_PRESETS[preset].label}" choreography across all ${bundle.scenes.length} scenes.`
    );
  };

  const triggerDownload = (content: string, filename: string, mimeType: string, label: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${label} (${filename}).`);
    onRecordHyperframesExport(`Exported HyperFrames ${label} (${filename}) at ${fps}fps.`);
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(`Copied ${label} to clipboard.`);
    } catch {
      setStatusMessage(`Unable to access clipboard; use Download instead.`);
    }
  };

  const renderAnimatedElement = (
    el: FigmaSlideElement,
    index: number,
    sceneDurationSec: number,
    preset: HyperframesMotionPreset,
    includeCaptionTrack: boolean
  ) => {
    const motion = evaluateElementMotionAtTime(
      el,
      localSceneTimeSec,
      sceneDurationSec,
      preset,
      index
    );

    if (!includeCaptionTrack && el.type === 'TEXT') {
      const t = el as FigmaTextNode;
      if (t.textStyleToken === 'caption' || t.y >= 1180) {
        return null;
      }
    }

    if (!motion.visible) {
      return null;
    }

    const commonPosition: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${el.height}px`,
      opacity: motion.opacity,
      transform: `translate3d(${motion.translateX}px, ${motion.translateY}px, 0px) scale(${motion.scale})`,
      filter: motion.blurPx > 0.05 ? `blur(${motion.blurPx}px)` : undefined,
      zIndex: el.layerOrder + 2,
      pointerEvents: 'none',
    };

    if (el.type === 'TEXT') {
      const t = el as FigmaTextNode;
      const fontFamily =
        t.textStyleToken === 'display' || t.textStyleToken === 'heading'
          ? 'var(--font-editorial)'
          : t.textStyleToken === 'label'
            ? 'var(--font-mono)'
            : 'var(--font-sans)';

      return (
        <div
          key={t.id}
          style={{
            ...commonPosition,
            color: t.textColor,
            fontFamily,
            fontSize: `${t.fontSize}px`,
            fontWeight: t.fontWeight,
            lineHeight: t.lineHeight,
            letterSpacing: `${t.letterSpacing}em`,
            textAlign: t.textAlign.toLowerCase() as 'left' | 'center' | 'right',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {t.textContent}
        </div>
      );
    }

    if (
      el.type === 'RECTANGLE' ||
      el.type === 'ELLIPSE' ||
      el.type === 'LINE' ||
      el.type === 'VECTOR'
    ) {
      const s = el as FigmaShapeNode;
      if (s.type === 'LINE') {
        return (
          <div
            key={s.id}
            style={{
              ...commonPosition,
              width: `${Math.max(1, s.width)}px`,
              height: `${Math.max(1, s.strokeWidth || 1)}px`,
              backgroundColor: s.stroke || '#D8D2C5',
            }}
          />
        );
      }

      return (
        <div
          key={s.id}
          style={{
            ...commonPosition,
            backgroundColor: s.fill || 'transparent',
            border:
              s.stroke && s.strokeWidth > 0
                ? `${s.strokeWidth}px solid ${s.stroke}`
                : 'none',
            borderRadius: s.type === 'ELLIPSE' ? '9999px' : `${s.cornerRadius || 0}px`,
          }}
        />
      );
    }

    if (el.type === 'IMAGE') {
      const img = el as FigmaImageNode;
      return (
        <div key={img.id} style={{ ...commonPosition, overflow: 'hidden' }}>
          <img
            src={img.imageReference}
            alt={img.altText}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        </div>
      );
    }

    return null;
  };

  const activeSlideTiming = activeScene
    ? timings[activeScene.slideId] || {
        slideId: activeScene.slideId,
        durationSec: activeScene.durationSec,
        motionPreset: activeScene.motionPreset,
        includeCaptionTrack: true,
      }
    : null;

  const inspectedScene =
    bundle.scenes.find((s) => s.compositionId === selectedSceneCompositionId) ||
    bundle.scenes[0];

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="border-b border-[#D8D2C5] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#5C5852] mb-1">
            07 · HYPERFRAMES VIDEO-AS-CODE ENGINE (HTML / CSS / SEEKABLE TIMELINE → MP4)
          </p>
          <h1 className="text-3xl font-editorial font-semibold text-[#121212]">
            HyperFrames Motion Composition & Camera Spec
          </h1>
          <p className="text-sm text-[#5C5852] mt-1 max-w-3xl">
            Compiles your 3:4 carousel into frame-deterministic HTML scenes (
            <span className="font-mono-tabular">window.__timelines</span>,{' '}
            <span className="font-mono-tabular">.clip</span> timing windows, 90% Action-Safe / 80%
            Title-Safe camera guides, and <span className="font-mono-tabular">frame.md</span>) ready
            for <span className="font-mono-tabular">npx hyperframes</span> rendering.
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('stage')}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'stage'
                ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                : 'bg-white text-[#121212] border-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            01. Motion Stage & Timeline
          </button>
          <button
            type="button"
            onClick={() => setSubView('html_source')}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'html_source'
                ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                : 'bg-white text-[#121212] border-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            02. HyperFrames HTML
          </button>
          <button
            type="button"
            onClick={() => setSubView('frame_md')}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'frame_md'
                ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                : 'bg-white text-[#121212] border-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            03. frame.md Spec
          </button>
          <button
            type="button"
            onClick={() => setSubView('contract_check')}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'contract_check'
                ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                : 'bg-white text-[#121212] border-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            04. Contract Audit ({bundle.checkReport.valid ? 'Valid' : 'Issues'})
          </button>
        </div>
      </div>

      {/* Export & Bundle Action Strip */}
      <div className="bg-white border border-[#D8D2C5] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-[#5C5852]">
          <span className="text-[#121212] font-semibold">
            ROOT COMPOSITION: data-composition-id=&quot;main&quot;
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {bundle.width}×{bundle.height} @ {bundle.fps} FPS
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Duration: {bundle.totalDurationSec.toFixed(2)}s ({bundle.totalFrames} frames)
          </span>
          <span aria-hidden="true">·</span>
          <span>{bundle.clips.length} Timed .clip Elements</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                bundle.rootIndexHtml,
                `${project.id}_hyperframes_index.html`,
                'text/html',
                'HyperFrames HTML Composition'
              )
            }
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Download hyperframes_index.html
          </button>
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                bundle.frameMdSpec,
                'frame.md',
                'text/markdown',
                'frame.md Camera Specification'
              )
            }
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Download frame.md
          </button>
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                bundle.timelineJson,
                `${project.id}_timeline.json`,
                'application/json',
                'HyperFrames Timeline JSON'
              )
            }
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Download timeline.json
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-white border border-[#15803D] text-xs text-[#15803D] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 01: SEEKABLE MOTION STAGE & MULTI-TRACK TIMELINE */}
      {subView === 'stage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Frame-Accurate Motion Stage */}
          <div className="lg:col-span-5 bg-white border border-[#D8D2C5] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2C5] pb-3">
              <div className="text-xs font-mono-tabular text-[#121212]">
                <span className="font-semibold">
                  {activeScene ? activeScene.compositionId.toUpperCase() : 'SCENE_01'}
                </span>
                <span className="text-[#5C5852]">
                  {' '}
                  · Frame {String(currentFrameIndex).padStart(4, '0')} /{' '}
                  {String(bundle.totalFrames).padStart(4, '0')}
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs font-mono-tabular text-[#5C5852] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSafeGuides}
                  onChange={(e) => setShowSafeGuides(e.target.checked)}
                  className="accent-[#0F1A2C]"
                />
                <span>90% / 80% Safe Guides</span>
              </label>
            </div>

            {/* Scaled 3:4 Stage Container */}
            <div
              data-testid="hyperframes-motion-stage"
              data-frame={currentFrameIndex}
              data-composition-id={activeScene?.compositionId || 'scene_01'}
              className="relative w-full aspect-[3/4] bg-[#EBE6DC] border border-[#D8D2C5] overflow-hidden select-none"
            >
              {activeSpec && activeScene && activeSlideTiming && (
                <div
                  className="w-full h-full relative"
                  style={{ backgroundColor: activeSpec.backgroundColor }}
                >
                  <svg
                    viewBox={`0 0 ${bundle.width} ${bundle.height}`}
                    className="w-full h-full block"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <foreignObject x={0} y={0} width={bundle.width} height={bundle.height}>
                      <div
                        style={{
                          position: 'relative',
                          width: `${bundle.width}px`,
                          height: `${bundle.height}px`,
                          backgroundColor: activeSpec.backgroundColor,
                          overflow: 'hidden',
                        }}
                      >
                        {[...activeSpec.elements]
                          .sort((a, b) => a.layerOrder - b.layerOrder)
                          .map((el, idx) =>
                            renderAnimatedElement(
                              el,
                              idx,
                              activeScene.durationSec,
                              activeSlideTiming.motionPreset,
                              activeSlideTiming.includeCaptionTrack
                            )
                          )}
                      </div>
                    </foreignObject>

                    {/* Studio-drawn 90% Action-Safe & 80% Title-Safe Camera Guides */}
                    {showSafeGuides && (
                      <g pointerEvents="none">
                        <rect
                          x={actionSafeBox.x}
                          y={actionSafeBox.y}
                          width={actionSafeBox.width}
                          height={actionSafeBox.height}
                          fill="none"
                          stroke="#0F1A2C"
                          strokeWidth={2}
                          strokeDasharray="10 6"
                          opacity={0.45}
                        />
                        <text
                          x={actionSafeBox.x + 12}
                          y={actionSafeBox.y + 24}
                          fill="#0F1A2C"
                          fontSize="18"
                          fontFamily="JetBrains Mono, monospace"
                          opacity={0.65}
                        >
                          90% ACTION-SAFE ({actionSafeBox.width}×{actionSafeBox.height})
                        </text>

                        <rect
                          x={titleSafeBox.x}
                          y={titleSafeBox.y}
                          width={titleSafeBox.width}
                          height={titleSafeBox.height}
                          fill="none"
                          stroke="#B45309"
                          strokeWidth={2}
                          strokeDasharray="6 6"
                          opacity={0.5}
                        />
                        <text
                          x={titleSafeBox.x + 12}
                          y={titleSafeBox.y + 24}
                          fill="#B45309"
                          fontSize="18"
                          fontFamily="JetBrains Mono, monospace"
                          opacity={0.75}
                        >
                          80% TITLE-SAFE ({titleSafeBox.width}×{titleSafeBox.height})
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Deterministic Scrubber & SMPTE Transport Controls */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-[#121212]">
                <span>
                  SMPTE: <strong>{formatSmpteTimecode(currentTimeSec, fps)}</strong>
                </span>
                <span className="text-[#5C5852]">
                  t = {currentTimeSec.toFixed(2)}s / {bundle.totalDurationSec.toFixed(2)}s
                </span>
              </div>

              <input
                aria-label="HyperFrames timeline scrubber"
                type="range"
                min={0}
                max={bundle.totalDurationSec}
                step={Number((1 / fps).toFixed(4))}
                value={currentTimeSec}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentTimeSec(Number(e.target.value));
                }}
                className="w-full accent-[#0F1A2C] cursor-pointer"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepFrames(-1)}
                    className="px-2.5 py-2 text-xs font-mono-tabular font-semibold border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    -1 Frame
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepFrames(1)}
                    className="px-2.5 py-2 text-xs font-mono-tabular font-semibold border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    +1 Frame
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentTimeSec(0);
                    }}
                    className="px-2.5 py-2 text-xs font-mono-tabular border border-[#D8D2C5] bg-white text-[#5C5852] hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    00:00:00
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="hyperframes-fps-select" className="text-xs font-mono-tabular text-[#5C5852]">
                    FPS:
                  </label>
                  <select
                    id="hyperframes-fps-select"
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value) === 60 ? 60 : 30)}
                    className="px-2.5 py-1.5 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scene Selector, Choreography Controls & Multi-Track Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* Scene Strip */}
            <div className="bg-white border border-[#D8D2C5] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2C5] pb-3">
                <h2 className="text-base font-editorial font-semibold text-[#121212]">
                  Sub-Composition Scenes ({bundle.scenes.length} Mounts on #root)
                </h2>
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  Click any scene to seek playhead
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {bundle.scenes.map((scene) => {
                  const isCurrent = activeScene?.compositionId === scene.compositionId;
                  return (
                    <button
                      key={scene.compositionId}
                      type="button"
                      onClick={() => handleJumpToScene(scene.startSec, scene.compositionId)}
                      className={`p-3 text-left border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                          : 'bg-[#F7F4EE] text-[#121212] border-[#D8D2C5] hover:border-[#121212]'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-semibold">
                        {scene.compositionId}
                      </div>
                      <div
                        className={`text-[11px] font-mono-tabular mt-0.5 ${
                          isCurrent ? 'text-[#D8D2C5]' : 'text-[#5C5852]'
                        }`}
                      >
                        [{scene.startSec.toFixed(1)}s – {(scene.startSec + scene.durationSec).toFixed(1)}s)
                      </div>
                      <div
                        className={`text-[11px] mt-1 truncate ${
                          isCurrent ? 'text-[#F7F4EE]' : 'text-[#121212]'
                        }`}
                      >
                        {HYPERFRAMES_MOTION_PRESETS[scene.motionPreset].label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Scene Choreography Configuration */}
            {activeScene && activeSlideTiming && (
              <div className="bg-white border border-[#D8D2C5] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2C5] pb-3">
                  <div>
                    <h2 className="text-base font-editorial font-semibold text-[#121212]">
                      Active Scene Choreography — {activeScene.compositionId} (Slide{' '}
                      {String(activeScene.slideNumber).padStart(2, '0')})
                    </h2>
                    <p className="text-xs text-[#5C5852]">
                      Adjust duration, GSAP/CSS easing preset, and caption track visibility.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetToAll(activeSlideTiming.motionPreset)}
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Apply Preset to All Scenes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4">
                    <label
                      htmlFor="scene-duration-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                    >
                      Scene Slot Duration (s)
                    </label>
                    <input
                      id="scene-duration-input"
                      type="number"
                      min={1.5}
                      max={12}
                      step={0.5}
                      value={activeSlideTiming.durationSec}
                      onChange={(e) =>
                        handleUpdateSlideTiming(activeScene.slideId, {
                          durationSec: Math.max(1.5, Math.min(12, Number(e.target.value) || 3.5)),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label
                      htmlFor="scene-preset-select"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                    >
                      Motion Choreography Preset
                    </label>
                    <select
                      id="scene-preset-select"
                      value={activeSlideTiming.motionPreset}
                      onChange={(e) =>
                        handleUpdateSlideTiming(activeScene.slideId, {
                          motionPreset: e.target.value as HyperframesMotionPreset,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                    >
                      {(Object.keys(HYPERFRAMES_MOTION_PRESETS) as HyperframesMotionPreset[]).map(
                        (presetKey) => (
                          <option key={presetKey} value={presetKey}>
                            {HYPERFRAMES_MOTION_PRESETS[presetKey].label} (
                            {HYPERFRAMES_MOTION_PRESETS[presetKey].gsapEase})
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#121212] py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSlideTiming.includeCaptionTrack}
                        onChange={(e) =>
                          handleUpdateSlideTiming(activeScene.slideId, {
                            includeCaptionTrack: e.target.checked,
                          })
                        }
                        className="accent-[#0F1A2C]"
                      />
                      <span>Captions Track</span>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-[#5C5852] font-mono-tabular">
                  Easing: {HYPERFRAMES_MOTION_PRESETS[activeSlideTiming.motionPreset].cssEasing} ·{' '}
                  {HYPERFRAMES_MOTION_PRESETS[activeSlideTiming.motionPreset].description}
                </p>
              </div>
            )}

            {/* Multi-Track .clip Timeline Visualizer */}
            <div className="bg-white border border-[#D8D2C5] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2C5] pb-3">
                <div>
                  <h2 className="text-base font-editorial font-semibold text-[#121212]">
                    Multi-Track .clip Timeline ([start, start + duration))
                  </h2>
                  <p className="text-xs text-[#5C5852]">
                    Click any timed .clip bar to seek the playhead to its exact entry frame.
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  Playhead: {(currentTimeSec / Math.max(0.1, bundle.totalDurationSec) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { trackIndex: 1, title: 'Track 1 · Scene Hosts (data-track-kind="graphics")' },
                  { trackIndex: 2, title: 'Track 2 · Architectural Geometry & Frames' },
                  { trackIndex: 3, title: 'Track 3 · Editorial Headlines & Body Prose' },
                  { trackIndex: 4, title: 'Track 4 · Microcopy & Caption Track (captions)' },
                ].map((lane) => {
                  const laneClips = bundle.clips.filter((c) => c.trackIndex === lane.trackIndex);
                  const playheadPct = Math.min(
                    100,
                    Math.max(0, (currentTimeSec / Math.max(0.1, bundle.totalDurationSec)) * 100)
                  );

                  return (
                    <div key={lane.trackIndex} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono-tabular text-[#5C5852]">
                        <span>{lane.title}</span>
                        <span>{laneClips.length} clips</span>
                      </div>
                      <div className="relative h-8 bg-[#F7F4EE] border border-[#D8D2C5] overflow-hidden">
                        {laneClips.map((clip) => {
                          const leftPct =
                            (clip.absStart / Math.max(0.1, bundle.totalDurationSec)) * 100;
                          const widthPct =
                            ((clip.absEnd - clip.absStart) /
                              Math.max(0.1, bundle.totalDurationSec)) *
                            100;
                          const isClipActive =
                            currentTimeSec >= clip.absStart && currentTimeSec < clip.absEnd;

                          return (
                            <button
                              key={clip.id}
                              type="button"
                              title={`${clip.id} (${clip.label}) [${clip.absStart.toFixed(2)}s, ${clip.absEnd.toFixed(2)}s)`}
                              onClick={() => {
                                setIsPlaying(false);
                                setCurrentTimeSec(Number((clip.absStart + 0.05).toFixed(2)));
                              }}
                              style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(1.2, widthPct)}%`,
                              }}
                              className={`absolute top-1 bottom-1 border text-[10px] font-mono-tabular px-1 truncate text-left transition-colors cursor-pointer ${
                                isClipActive
                                  ? 'bg-[#0F1A2C] text-[#F7F4EE] border-[#0F1A2C]'
                                  : 'bg-white text-[#121212] border-[#121212]/40 hover:border-[#121212]'
                              }`}
                            >
                              {clip.label}
                            </button>
                          );
                        })}

                        {/* Playhead vertical marker */}
                        <div
                          style={{ left: `${playheadPct}%` }}
                          className="absolute top-0 bottom-0 w-0.5 bg-[#B91C1C] pointer-events-none z-10"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent & CLI Production Loop Reference */}
            <div className="bg-white border border-[#D8D2C5] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-editorial font-semibold text-[#121212]">
                  HyperFrames CLI & Agent Production Loop
                </h3>
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  npx skills add heygen-com/hyperframes
                </span>
              </div>
              <pre className="p-3 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto">
{`# 1. Validate composition contract, .clip bounds, and 90%/80% safe zones
npx hyperframes check --json

# 2. Preview seekable HTML composition with live reload
npx hyperframes preview

# 3. Render deterministic frame-by-frame MP4 via headless Chrome + FFmpeg
npx hyperframes render --fps ${fps} --output ${project.id}_carousel.mp4`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 02: HYPERFRAMES HTML SOURCE (ROOT INDEX.HTML & SCENE TEMPLATES) */}
      {subView === 'html_source' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#D8D2C5] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D2C5] pb-4">
              <div>
                <h2 className="text-lg font-editorial font-semibold text-[#121212]">
                  Sub-Composition Scene Inspector (&lt;template&gt; + window.__timelines)
                </h2>
                <p className="text-xs text-[#5C5852]">
                  Every scene puts its styles, markup, and paused timeline registration inside a{' '}
                  <span className="font-mono-tabular">&lt;template&gt;</span> block.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Select scene template to inspect"
                  value={inspectedScene?.compositionId || 'scene_01'}
                  onChange={(e) => setSelectedSceneCompositionId(e.target.value)}
                  className="px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                >
                  {bundle.scenes.map((s) => (
                    <option key={s.compositionId} value={s.compositionId}>
                      compositions/{s.compositionId}.html (Slide {String(s.slideNumber).padStart(2, '0')})
                    </option>
                  ))}
                </select>
                {inspectedScene && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        inspectedScene.templateHtml,
                        `${inspectedScene.compositionId}.html`
                      )
                    }
                    className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors cursor-pointer"
                  >
                    Copy Scene HTML
                  </button>
                )}
              </div>
            </div>

            {inspectedScene && (
              <pre className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto max-h-80">
                {inspectedScene.templateHtml}
              </pre>
            )}
          </div>

          <div className="bg-white border border-[#D8D2C5] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D2C5] pb-4">
              <div>
                <h2 className="text-lg font-editorial font-semibold text-[#121212]">
                  Root Composition Source (index.html)
                </h2>
                <p className="text-xs text-[#5C5852]">
                  Declares <span className="font-mono-tabular">data-composition-variables</span>,
                  mounts scene hosts, and exposes{' '}
                  <span className="font-mono-tabular">window.__hyperframes.seek(t)</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(bundle.rootIndexHtml, 'root index.html')}
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors cursor-pointer"
              >
                Copy Root index.html
              </button>
            </div>

            <pre className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto max-h-96">
              {bundle.rootIndexHtml}
            </pre>
          </div>
        </div>
      )}

      {/* VIEW 03: FRAME.MD CAMERA DESIGN SYSTEM SPEC */}
      {subView === 'frame_md' && (
        <div className="bg-white border border-[#D8D2C5] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D2C5] pb-4">
            <div>
              <h2 className="text-lg font-editorial font-semibold text-[#121212]">
                frame.md — LEGACYA SPHERE Design System Translated for the Camera
              </h2>
              <p className="text-xs text-[#5C5852]">
                Inverts web design tokens into camera safe zones, deterministic easing rules, and
                shot-by-frame schedules for AI video agents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(bundle.frameMdSpec, 'frame.md specification')}
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors cursor-pointer"
              >
                Copy frame.md
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerDownload(
                    bundle.frameMdSpec,
                    'frame.md',
                    'text/markdown',
                    'frame.md Camera Specification'
                  )
                }
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors cursor-pointer"
              >
                Download frame.md
              </button>
            </div>
          </div>

          <pre className="p-5 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {bundle.frameMdSpec}
          </pre>
        </div>
      )}

      {/* VIEW 04: HYPERFRAMES CONTRACT LINTER (npx hyperframes check --json) */}
      {subView === 'contract_check' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#D8D2C5] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8D2C5] pb-4">
              <div>
                <h2 className="text-lg font-editorial font-semibold text-[#121212]">
                  HyperFrames Deterministic Contract Audit (hyperframes check --json)
                </h2>
                <p className="text-xs text-[#5C5852]">
                  Verifies clip timing windows, unique IDs, paused timeline registries, absence of
                  wall-clock timers, and 90%/80% safe-area geometry.
                </p>
              </div>
              <span className="text-xs font-mono-tabular font-semibold uppercase text-[#121212]">
                STATUS: {bundle.checkReport.valid ? 'PASSED · 0 ERRORS' : 'FAILED · FIX REQUIRED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
                <span className="text-xs font-mono-tabular text-[#5C5852] uppercase">
                  01 · Compositions Verified
                </span>
                <p className="text-xl font-editorial font-semibold text-[#121212] font-mono-tabular">
                  {bundle.checkReport.totalCompositions} Registered
                </p>
                <p className="text-xs text-[#5C5852] font-mono-tabular">
                  1 Root + {bundle.scenes.length} Scene Templates
                </p>
              </div>

              <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
                <span className="text-xs font-mono-tabular text-[#5C5852] uppercase">
                  02 · Timed .clip Nodes
                </span>
                <p className="text-xl font-editorial font-semibold text-[#121212] font-mono-tabular">
                  {bundle.checkReport.totalClipsChecked} Clips Valid
                </p>
                <p className="text-xs text-[#5C5852] font-mono-tabular">
                  Strict [start, start + duration)
                </p>
              </div>

              <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
                <span className="text-xs font-mono-tabular text-[#5C5852] uppercase">
                  03 · Deterministic Clock
                </span>
                <p className="text-xl font-editorial font-semibold text-[#121212] font-mono-tabular">
                  Pure f(t) Verified
                </p>
                <p className="text-xs text-[#5C5852] font-mono-tabular">
                  0 Date.now() / Math.random() calls
                </p>
              </div>

              <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
                <span className="text-xs font-mono-tabular text-[#5C5852] uppercase">
                  04 · Safe-Zone Warnings
                </span>
                <p className="text-xl font-editorial font-semibold text-[#121212] font-mono-tabular">
                  {bundle.checkReport.warnings.length} Advisory Notes
                </p>
                <p className="text-xs text-[#5C5852] font-mono-tabular">
                  90% Action-Safe / 80% Title-Safe
                </p>
              </div>
            </div>

            {bundle.checkReport.errors.length === 0 &&
              bundle.checkReport.warnings.length === 0 && (
                <div className="p-4 bg-[#F7F4EE] border border-[#15803D] text-xs text-[#15803D] font-mono-tabular">
                  All {bundle.checkReport.totalClipsChecked} clips across{' '}
                  {bundle.checkReport.totalCompositions} compositions pass the HyperFrames contract
                  with zero errors and zero safe-area warnings.
                </div>
              )}

            {bundle.checkReport.warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono-tabular uppercase font-semibold text-[#B45309]">
                  Layout & Safe-Zone Advisories ({bundle.checkReport.warnings.length})
                </h3>
                {bundle.checkReport.warnings.map((w, idx) => (
                  <div
                    key={`${w.code}_${idx}`}
                    className="p-3 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular space-y-1"
                  >
                    <div className="text-[#121212] font-semibold">
                      [{w.compositionId}] {w.code}: {w.message}
                    </div>
                    <div className="text-[#5C5852]">Fix: {w.fix}</div>
                  </div>
                ))}
              </div>
            )}

            <pre className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto max-h-80">
              {JSON.stringify(bundle.checkReport, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
