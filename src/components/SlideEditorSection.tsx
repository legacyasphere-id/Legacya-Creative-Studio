import React, { useState } from 'react';
import { LAYOUT_PATTERN_META, SLIDE_CATEGORY_META } from '../tokens/defaultTokens';
import {
  BrandSystemTokens,
  LayoutPatternId,
  SlideCategory,
  SlideSpecification,
  StoryboardSlide,
  StudioAsset,
} from '../types/studio';
import { SlideCanvasPreview } from './SlideCanvasPreview';

interface SlideEditorSectionProps {
  slides: StoryboardSlide[];
  specs: SlideSpecification[];
  brandTokens: BrandSystemTokens;
  assets: StudioAsset[];
  selectedSlideId: string;
  onSelectSlide: (slideId: string) => void;
  onUpdateSlide: (slideId: string, patch: Partial<StoryboardSlide>) => void;
  onReorderSlide: (slideId: string, direction: 'up' | 'down') => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onRegenerateSlideCopy: (slideId: string) => void;
  onRegenerateSlideLayout: (slideId: string) => void;
  onGenerateSlideAsset: (slideId: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export const SlideEditorSection: React.FC<SlideEditorSectionProps> = ({
  slides,
  specs,
  brandTokens,
  assets,
  selectedSlideId,
  onSelectSlide,
  onUpdateSlide,
  onReorderSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onRegenerateSlideCopy,
  onRegenerateSlideLayout,
  onGenerateSlideAsset,
  onUndo,
  canUndo,
}) => {
  const [showWireframeIds, setShowWireframeIds] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [confirmDeleteSlideId, setConfirmDeleteSlideId] = useState<string | null>(null);

  const activeSlide =
    slides.find((s) => s.id === selectedSlideId) || slides[0];
  const activeSpec =
    specs.find((sp) => sp.slideId === activeSlide?.id) || specs[0];

  if (!activeSlide || !activeSpec) {
    return null;
  }

  const selectedLayer = activeSpec.elements.find((el) => el.id === selectedLayerId);

  return (
    <div className="space-y-8">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            03 · Deterministic Slide Gallery & Native Layer Inspector
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Slide Editor & 3:4 Export Preview
          </h1>
          <p className="text-sm text-[#5C5852] mt-2">
            Every frame renders deterministically at {brandTokens.layout.canvasWidth}×{brandTokens.layout.canvasHeight} logical pixels. Single-slide operations never overwrite other slides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Undo Last Edit
          </button>

          <button
            type="button"
            onClick={() => setShowWireframeIds((v) => !v)}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showWireframeIds
                ? 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE]'
                : 'border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            {showWireframeIds ? 'Hide Layer IDs' : 'Inspect Stable Layer IDs'}
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Gallery Strip (Consistent 3:4 Framing) */}
      <section aria-label="Carousel Slide Gallery" className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#5C5852] font-mono-tabular">
          <span>
            CAROUSEL SEQUENCE · {slides.length} SLIDES ·{' '}
            {slides.filter((s) => s.approved).length} APPROVED
          </span>
          <span>ASPECT RATIO: {brandTokens.layout.aspectRatioLabel} ({brandTokens.layout.canvasWidth}×{brandTokens.layout.canvasHeight})</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {slides.map((slide) => {
            const spec = specs.find((sp) => sp.slideId === slide.id);
            const isSelected = slide.id === activeSlide.id;
            if (!spec) return null;
            return (
              <div
                key={slide.id}
                className={`bg-white border transition-colors p-2 flex flex-col gap-2 ${
                  isSelected
                    ? 'border-[#0F1A2C] ring-2 ring-[#0F1A2C]'
                    : 'border-[#D8D2C5] hover:border-[#121212]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectSlide(slide.id);
                    setSelectedLayerId(null);
                  }}
                  aria-label={`Select Slide ${slide.slideNumber}: ${slide.primaryHeadline}`}
                  className="text-left w-full cursor-pointer focus:outline-none"
                >
                  <SlideCanvasPreview spec={spec} showWireframeIds={false} />
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono-tabular text-[#5C5852]">
                    <span className="font-semibold text-[#121212]">
                      {String(slide.slideNumber).padStart(2, '0')}
                    </span>
                    <span className="truncate max-w-[110px]">
                      {slide.approved ? 'APPROVED' : 'DRAFT'}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Split Editor: Left Live 3:4 Canvas + Right Editorial & Layout Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: High-Resolution 3:4 Preview & Layer Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#D8D2C5] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-[#5C5852]">
              <span>
                FRAME ID: <strong className="text-[#121212]">{activeSpec.frameNodeId}</strong>
              </span>
              <span>CONTRAST: {activeSpec.computedContrastRatio}:1</span>
            </div>

            <SlideCanvasPreview
              spec={activeSpec}
              showWireframeIds={showWireframeIds}
              selectedLayerId={selectedLayerId}
              onSelectLayer={(id) => setSelectedLayerId(id)}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#5C5852] border-t border-[#D8D2C5]">
              <span>{activeSpec.elements.length} Native Figma Elements</span>
              <span aria-hidden="true">·</span>
              <span>Origin: Top-Left (0,0)</span>
              <span aria-hidden="true">·</span>
              <span>Click any canvas element to inspect</span>
            </div>
          </div>

          {activeSpec.estimatedTextOverflow && activeSpec.overflowRecommendation && (
            <div
              role="alert"
              className="p-4 bg-white border border-[#B45309] text-xs text-[#B45309] space-y-1"
            >
              <p className="font-semibold uppercase tracking-wider">
                Readability & Copy Density Advisory
              </p>
              <p>{activeSpec.overflowRecommendation}</p>
            </div>
          )}

          {selectedLayer && (
            <div className="bg-white border border-[#D8D2C5] p-4 space-y-2 text-xs font-mono-tabular">
              <div className="flex items-center justify-between border-b border-[#D8D2C5] pb-2">
                <span className="font-semibold text-[#121212]">
                  NATIVE LAYER INSPECTOR · {selectedLayer.type}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLayerId(null)}
                  className="text-[#5C5852] hover:text-[#121212] cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p>
                Stable Layer ID: <strong className="text-[#121212]">{selectedLayer.id}</strong>
              </p>
              <p>
                Layer Name: <strong className="text-[#121212]">{selectedLayer.name}</strong>
              </p>
              <p>
                Coordinates: X={selectedLayer.x}px · Y={selectedLayer.y}px · W={selectedLayer.width}px · H={selectedLayer.height}px
              </p>
              {selectedLayer.type === 'TEXT' && (
                <p>
                  Typography: {selectedLayer.fontFamily} ({selectedLayer.fontWeight}) · {selectedLayer.fontSize}px · Line {selectedLayer.lineHeight}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Slide Copy, Layout Variant, Single-Slide Actions & Approval */}
        <div className="lg:col-span-7 bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D8D2C5]">
            <div>
              <span className="text-xs font-mono-tabular text-[#5C5852] uppercase">
                SLIDE {String(activeSlide.slideNumber).padStart(2, '0')} OF {slides.length} · ID: {activeSlide.id}
              </span>
              <h2 className="text-2xl font-editorial font-semibold text-[#121212] mt-1">
                {SLIDE_CATEGORY_META[activeSlide.category].label}
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateSlide(activeSlide.id, { approved: !activeSlide.approved })
              }
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSlide.approved
                  ? 'border-[#15803D] bg-[#15803D] text-white'
                  : 'border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC]'
              }`}
            >
              {activeSlide.approved ? 'Slide Approved · Verified' : 'Mark Slide Approved'}
            </button>
          </div>

          {/* Independent Single-Slide Regeneration Bar */}
          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#121212]">
                Single-Slide Scoped Regeneration
              </span>
              <span className="text-[#5C5852] font-mono-tabular">
                Scoped strictly to {activeSlide.id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onRegenerateSlideCopy(activeSlide.id)}
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Regenerate Slide Copy
              </button>
              <button
                type="button"
                onClick={() => onRegenerateSlideLayout(activeSlide.id)}
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cycle Layout Variant
              </button>
              <button
                type="button"
                onClick={() => onGenerateSlideAsset(activeSlide.id)}
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Synthesize Vector Plate Asset
              </button>
            </div>
          </div>

          {/* Editable Slide Copy & Layout Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="editor-category"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Slide Category
              </label>
              <select
                id="editor-category"
                value={activeSlide.category}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, {
                    category: e.target.value as SlideCategory,
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              >
                {Object.entries(SLIDE_CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="editor-layout"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Approved Layout Pattern
              </label>
              <select
                id="editor-layout"
                value={activeSlide.layoutPattern}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, {
                    layoutPattern: e.target.value as LayoutPatternId,
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              >
                {Object.entries(LAYOUT_PATTERN_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="editor-bg"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Background Treatment Token
              </label>
              <select
                id="editor-bg"
                value={activeSlide.backgroundTreatment}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, {
                    backgroundTreatment: e.target.value as StoryboardSlide['backgroundTreatment'],
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              >
                <option value="warm_cream">Warm Cream (#F7F4EE)</option>
                <option value="clean_white">Clean White (#FFFFFF)</option>
                <option value="deep_navy">Deep Navy (#0F1A2C)</option>
                <option value="ink_black">Ink Black (#121212)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="editor-microcopy"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Section Kicker / Microcopy
              </label>
              <input
                id="editor-microcopy"
                type="text"
                value={activeSlide.microcopy}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, { microcopy: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="editor-headline"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212]"
                >
                  Primary Headline
                </label>
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  {activeSlide.primaryHeadline.length} / {LAYOUT_PATTERN_META[activeSlide.layoutPattern].maxHeadlineChars} chars
                </span>
              </div>
              <textarea
                id="editor-headline"
                rows={2}
                value={activeSlide.primaryHeadline}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, { primaryHeadline: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-base font-medium bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="editor-body"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212]"
                >
                  Supporting Copy
                </label>
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  {activeSlide.supportingCopy.length} / {LAYOUT_PATTERN_META[activeSlide.layoutPattern].maxBodyChars} chars
                </span>
              </div>
              <textarea
                id="editor-body"
                rows={4}
                value={activeSlide.supportingCopy}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, { supportingCopy: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label
                htmlFor="editor-cta"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Optional Call to Action (CTA)
              </label>
              <input
                id="editor-cta"
                type="text"
                value={activeSlide.ctaText}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, { ctaText: e.target.value })
                }
                placeholder="Leave blank if this slide has no CTA button"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label
                htmlFor="editor-asset"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Placed Asset Reference (For Showcase Layouts)
              </label>
              <select
                id="editor-asset"
                value={activeSlide.suggestedAssetId}
                onChange={(e) =>
                  onUpdateSlide(activeSlide.id, { suggestedAssetId: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              >
                <option value="">Default Studio Asset Slot</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Structural Slide Sequence Controls (Reorder, Duplicate, Delete with Confirmation) */}
          <div className="pt-4 border-t border-[#D8D2C5] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeSlide.slideNumber <= 1}
                onClick={() => onReorderSlide(activeSlide.id, 'up')}
                className="px-3 py-2 text-xs font-semibold uppercase border border-[#D8D2C5] bg-[#F7F4EE] text-[#121212] hover:border-[#121212] disabled:opacity-40 cursor-pointer"
              >
                ← Move Earlier
              </button>
              <button
                type="button"
                disabled={activeSlide.slideNumber >= slides.length}
                onClick={() => onReorderSlide(activeSlide.id, 'down')}
                className="px-3 py-2 text-xs font-semibold uppercase border border-[#D8D2C5] bg-[#F7F4EE] text-[#121212] hover:border-[#121212] disabled:opacity-40 cursor-pointer"
              >
                Move Later →
              </button>
              <button
                type="button"
                onClick={() => onDuplicateSlide(activeSlide.id)}
                className="px-3 py-2 text-xs font-semibold uppercase border border-[#D8D2C5] bg-[#F7F4EE] text-[#121212] hover:border-[#121212] cursor-pointer"
              >
                Duplicate Slide
              </button>
            </div>

            {confirmDeleteSlideId === activeSlide.id ? (
              <div className="flex items-center gap-2 bg-[#F7F4EE] p-1.5 border border-[#B91C1C]">
                <span className="text-xs text-[#B91C1C] font-semibold px-2">
                  Confirm delete {activeSlide.id}?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSlide(activeSlide.id);
                    setConfirmDeleteSlideId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold uppercase bg-[#B91C1C] text-white cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteSlideId(null)}
                  className="px-3 py-1.5 text-xs font-semibold uppercase border border-[#121212] bg-white text-[#121212] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={slides.length <= 1}
                onClick={() => setConfirmDeleteSlideId(activeSlide.id)}
                className="px-3 py-2 text-xs font-semibold uppercase border border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                Delete Slide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
