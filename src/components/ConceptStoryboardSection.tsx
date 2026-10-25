import React from 'react';
import { LAYOUT_PATTERN_META, SLIDE_CATEGORY_META } from '../tokens/defaultTokens';
import {
  CreativeConcept,
  LayoutPatternId,
  SlideCategory,
  StoryboardSlide,
} from '../types/studio';

interface ConceptStoryboardSectionProps {
  concept: CreativeConcept | null;
  storyboard: StoryboardSlide[];
  onGenerateConcept: () => void;
  onApproveConcept: (approved: boolean) => void;
  onUpdateConceptField: <K extends keyof CreativeConcept>(
    key: K,
    value: CreativeConcept[K]
  ) => void;
  onGenerateStoryboard: () => void;
  onUpdateStoryboardSlide: (
    slideId: string,
    patch: Partial<StoryboardSlide>
  ) => void;
  onProceedToSlideEditor: () => void;
  isGenerating: boolean;
}

export const ConceptStoryboardSection: React.FC<ConceptStoryboardSectionProps> = ({
  concept,
  storyboard,
  onGenerateConcept,
  onApproveConcept,
  onUpdateConceptField,
  onGenerateStoryboard,
  onUpdateStoryboardSlide,
  onProceedToSlideEditor,
  isGenerating,
}) => {
  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            02 · Creative Strategist & Narrative Storyboard
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Concept Direction & Slide-by-Slide Sequence
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            Review and approve the strategic concept before generating or modifying the slide storyboard. Claims without supplied evidence are flagged explicitly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onGenerateConcept}
            className="px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {concept ? 'Regenerate Concept' : 'Generate Concept'}
          </button>

          {concept && (
            <button
              type="button"
              onClick={() => onApproveConcept(!concept.approved)}
              className={`px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                concept.approved
                  ? 'border-[#15803D] bg-[#15803D] text-white'
                  : 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A]'
              }`}
            >
              {concept.approved ? 'Concept Approved (Unlock to Revise)' : 'Approve Concept'}
            </button>
          )}

          {concept && concept.approved && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={onGenerateStoryboard}
              className="px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rebuild Storyboard from Concept
            </button>
          )}
        </div>
      </div>

      {!concept ? (
        <div className="bg-white border border-[#D8D2C5] p-10 text-center space-y-4">
          <h2 className="text-2xl font-editorial font-semibold text-[#121212]">
            No Creative Concept Generated Yet
          </h2>
          <p className="text-sm text-[#5C5852] max-w-xl mx-auto">
            The strategist never generates slides automatically on page load. Trigger concept synthesis from your brief when ready.
          </p>
          <button
            type="button"
            onClick={onGenerateConcept}
            className="px-5 py-2.5 text-xs font-semibold tracking-wide uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors cursor-pointer"
          >
            Synthesize Strategic Concept
          </button>
        </div>
      ) : (
        <>
          {/* Strategic Concept Architecture */}
          <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
            <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-editorial font-semibold text-[#121212]">
                  Creative Strategist Thesis
                </h2>
                <p className="text-xs text-[#5C5852] mt-1 font-mono-tabular">
                  Status: {concept.approved ? 'APPROVED FOR STORYBOARDING' : 'PENDING REVIEW'} · Source:{' '}
                  {concept.source === 'gemini_api' ? 'Server-Side Gemini API' : 'Deterministic Studio Strategist'}
                </p>
              </div>
              {!concept.approved && (
                <p className="text-xs text-[#B45309] font-medium">
                  Approve the concept above to unlock full storyboard regeneration.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Central Idea
                </label>
                <input
                  type="text"
                  value={concept.centralIdea}
                  onChange={(e) => onUpdateConceptField('centralIdea', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-medium bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Key Message
                </label>
                <input
                  type="text"
                  value={concept.keyMessage}
                  onChange={(e) => onUpdateConceptField('keyMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Creative Rationale
                </label>
                <textarea
                  rows={3}
                  value={concept.creativeRationale}
                  onChange={(e) => onUpdateConceptField('creativeRationale', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Audience Insight & Intended Emotional Response
                </label>
                <textarea
                  rows={3}
                  value={`${concept.audienceInsight}\nResponse: ${concept.intendedEmotionalResponse}`}
                  onChange={(e) => onUpdateConceptField('audienceInsight', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Narrative Arc
                </label>
                <textarea
                  rows={2}
                  value={concept.narrativeArc}
                  onChange={(e) => onUpdateConceptField('narrativeArc', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                  Visual Metaphor & Proposed Art Direction
                </label>
                <textarea
                  rows={2}
                  value={concept.proposedArtDirection}
                  onChange={(e) => onUpdateConceptField('proposedArtDirection', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>
            </div>

            {/* Factual Claims & Epistemic Verification */}
            <div className="pt-4 border-t border-[#D8D2C5]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#121212] mb-3">
                Epistemic & Factual Claims Verification Log
              </h3>
              <div className="divide-y divide-[#D8D2C5] border border-[#D8D2C5] bg-[#F7F4EE]">
                {concept.factualClaimsToVerify.map((flag, i) => (
                  <div key={i} className="p-3.5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-[#121212]">{flag.claim}</p>
                      <p className="text-[#5C5852]">{flag.note}</p>
                    </div>
                    <span className="font-mono-tabular uppercase text-[11px] text-[#0F1A2C] shrink-0">
                      {flag.classification.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Storyboard Sequence Editor */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-editorial font-semibold text-[#121212]">
                  Slide-by-Slide Storyboard ({storyboard.length} Slides)
                </h2>
                <p className="text-xs text-[#5C5852] mt-1">
                  Each slide carries one dominant mobile message. Edit narrative fields here or open the interactive Slide Editor & Preview.
                </p>
              </div>
              <button
                type="button"
                onClick={onProceedToSlideEditor}
                className="px-5 py-2.5 text-xs font-semibold tracking-wide uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Interactive Slide Editor & Previews →
              </button>
            </div>

            <div className="space-y-4">
              {storyboard.map((slide) => (
                <div
                  key={slide.id}
                  className="bg-white border border-[#D8D2C5] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#D8D2C5]">
                    <div className="flex items-center gap-3 text-xs font-mono-tabular text-[#5C5852]">
                      <span className="font-semibold text-[#121212]">
                        SLIDE {String(slide.slideNumber).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>ID: {slide.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{SLIDE_CATEGORY_META[slide.category].label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{slide.approved ? 'APPROVED' : 'READY FOR REVIEW'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        aria-label={`Slide ${slide.slideNumber} category`}
                        value={slide.category}
                        onChange={(e) =>
                          onUpdateStoryboardSlide(slide.id, {
                            category: e.target.value as SlideCategory,
                          })
                        }
                        className="px-2.5 py-1.5 text-xs bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                      >
                        {Object.entries(SLIDE_CATEGORY_META).map(([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.label}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label={`Slide ${slide.slideNumber} layout pattern`}
                        value={slide.layoutPattern}
                        onChange={(e) =>
                          onUpdateStoryboardSlide(slide.id, {
                            layoutPattern: e.target.value as LayoutPatternId,
                          })
                        }
                        className="px-2.5 py-1.5 text-xs bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                      >
                        {Object.entries(LAYOUT_PATTERN_META).map(([key, meta]) => (
                          <option key={key} value={key}>
                            Layout: {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                        Primary Headline
                      </label>
                      <textarea
                        rows={2}
                        value={slide.primaryHeadline}
                        onChange={(e) =>
                          onUpdateStoryboardSlide(slide.id, {
                            primaryHeadline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-medium bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                        Supporting Copy
                      </label>
                      <textarea
                        rows={2}
                        value={slide.supportingCopy}
                        onChange={(e) =>
                          onUpdateStoryboardSlide(slide.id, {
                            supportingCopy: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                      />
                    </div>

                    <div className="space-y-2 text-xs text-[#5C5852]">
                      <p>
                        <strong className="text-[#121212]">Narrative Role:</strong>{' '}
                        {slide.narrativePurpose}
                      </p>
                      <p>
                        <strong className="text-[#121212]">Focal Point:</strong>{' '}
                        {slide.visualFocalPoint}
                      </p>
                      <p>
                        <strong className="text-[#121212]">Accessibility:</strong>{' '}
                        {slide.accessibilityNotes}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
