import React from 'react';
import { SLIDE_CATEGORY_META } from '../tokens/defaultTokens';
import {
  SlideSpecification,
  StudioProject,
  ValidationReport,
  WorkspaceSection,
} from '../types/studio';
import { SlideCanvasPreview } from './SlideCanvasPreview';

interface DashboardSectionProps {
  project: StudioProject;
  specs: SlideSpecification[];
  validationReport: ValidationReport;
  onNavigate: (section: WorkspaceSection) => void;
  onOpenSlideInEditor: (slideId: string) => void;
  onCreateNewProject: () => void;
  onResetSampleProject: () => void;
  onOpenIntelligenceDrawer: () => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  project,
  specs,
  validationReport,
  onNavigate,
  onOpenSlideInEditor,
  onCreateNewProject,
  onResetSampleProject,
  onOpenIntelligenceDrawer,
}) => {
  const approvedCount = project.storyboard.filter((s) => s.approved).length;
  const totalSlides = project.storyboard.length;

  return (
    <div className="space-y-12">
      {/* Editorial Studio Marquee & Active Project Summary */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-10 space-y-8">
        <div className="space-y-6 pb-6 border-b border-[#D8D2C5]">
          <div className="space-y-3 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[#5C5852] uppercase">
              <span>ACTIVE STUDIO PROJECT</span>
              <span aria-hidden="true">·</span>
              <span>ID: {project.id}</span>
              <span aria-hidden="true">·</span>
              <span>STATUS: {project.status.toUpperCase()}</span>
              <span aria-hidden="true">·</span>
              <span>
                TOKENS: {project.brandTokens.isProvisional ? 'PROVISIONAL v1.0' : 'APPROVED'}
              </span>
            </div>

            <h1 className="text-3xl lg:text-5xl font-editorial font-semibold text-[#121212] tracking-tight leading-[1.12]">
              {project.brief.projectName}
            </h1>

            <p className="text-base text-[#5C5852] leading-relaxed max-w-3xl">
              {project.brief.carouselTopic}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenIntelligenceDrawer}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#0F1A2C] bg-[#EBE6DC] text-[#0F1A2C] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ingest Market Intelligence (#3 → #2)
            </button>
            <button
              type="button"
              onClick={onCreateNewProject}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Project Brief
            </button>
            <button
              type="button"
              onClick={onResetSampleProject}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#D8D2C5] bg-[#F7F4EE] text-[#121212] hover:border-[#121212] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Restore Sample Carousel
            </button>
            <button
              type="button"
              onClick={() => onNavigate('editor')}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Slide Editor & Previews →
            </button>
          </div>
        </div>

        {/* Full-Width 4-Column Operational Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
            <span className="text-xs font-mono-tabular uppercase text-[#5C5852]">
              01 · Carousel Geometry
            </span>
            <p className="text-2xl font-editorial font-semibold text-[#121212] font-mono-tabular">
              {totalSlides} Slides · 3:4
            </p>
            <p className="text-xs text-[#5C5852] font-mono-tabular">
              {project.brandTokens.layout.canvasWidth} × {project.brandTokens.layout.canvasHeight} logical px
            </p>
          </div>

          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
            <span className="text-xs font-mono-tabular uppercase text-[#5C5852]">
              02 · Editorial Review Gate
            </span>
            <p className="text-2xl font-editorial font-semibold text-[#121212] font-mono-tabular">
              {approvedCount} / {totalSlides} Approved
            </p>
            <p className="text-xs text-[#5C5852]">
              Concept: {project.concept?.approved ? 'Approved' : 'Pending approval'}
            </p>
          </div>

          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
            <span className="text-xs font-mono-tabular uppercase text-[#5C5852]">
              03 · JSON Contract Validation
            </span>
            <p className="text-2xl font-editorial font-semibold text-[#121212] font-mono-tabular">
              {validationReport.valid ? 'Valid v1.0.0' : `${validationReport.errors.length} Errors`}
            </p>
            <p className="text-xs text-[#5C5852] font-mono-tabular">
              {validationReport.totalLayersChecked} Native Figma Layers Verified
            </p>
          </div>

          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1">
            <span className="text-xs font-mono-tabular uppercase text-[#5C5852]">
              04 · Figma Handoff Status
            </span>
            <p className="text-2xl font-editorial font-semibold text-[#121212]">
              {project.handoffState.figmaImportCompleted
                ? 'Imported to Figma'
                : 'Contract Ready'}
            </p>
            <p className="text-xs text-[#5C5852]">
              Preview ≠ Direct Canvas Write
            </p>
          </div>
        </div>
      </section>

      {/* Complete 3:4 Carousel Preview Gallery */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D8D2C5] pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-1">
              Deterministic 3:4 Portrait Sequence
            </p>
            <h2 className="text-2xl font-editorial font-semibold text-[#121212]">
              Carousel Slide Previews ({totalSlides} Independent Frames)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('concept')}
              className="px-4 py-2 text-xs font-semibold uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors cursor-pointer"
            >
              Edit Storyboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="px-4 py-2 text-xs font-semibold uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors cursor-pointer"
            >
              Validate & Export JSON Contract →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {project.storyboard.map((slide) => {
            const spec = specs.find((sp) => sp.slideId === slide.id);
            if (!spec) return null;
            return (
              <div
                key={slide.id}
                className="bg-white border border-[#D8D2C5] p-4 flex flex-col justify-between space-y-4 hover:border-[#121212] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-[#5C5852]">
                    <span className="font-semibold text-[#121212]">
                      SLIDE {String(slide.slideNumber).padStart(2, '0')}
                    </span>
                    <span>{SLIDE_CATEGORY_META[slide.category].label}</span>
                  </div>

                  <SlideCanvasPreview spec={spec} />

                  <div className="space-y-1 pt-1">
                    <p className="text-sm font-semibold text-[#121212] line-clamp-2">
                      {slide.primaryHeadline}
                    </p>
                    <p className="text-xs text-[#5C5852] font-mono-tabular">
                      Layout: {slide.layoutPattern} · {spec.elements.length} layers
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#D8D2C5] flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-[#5C5852]">
                    {slide.approved ? 'STATUS: APPROVED' : 'STATUS: REVIEW'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenSlideInEditor(slide.id)}
                    className="px-3 py-1.5 text-xs font-semibold uppercase border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] transition-colors cursor-pointer"
                  >
                    Edit Slide {String(slide.slideNumber).padStart(2, '0')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow Architecture & Handoff Transparency */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              LEGACYA SPHERE End-to-End Pipeline Architecture
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Clear separation between creative reasoning, deterministic layout validation, JSON serialization, and native Figma import.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-[#5C5852]">
            MILESTONE 1 FOUNDATION + COMPANION PLUGIN READY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-2">
            <span className="font-mono-tabular font-semibold uppercase text-[#0F1A2C]">
              PHASE A · BRIEF, CONCEPT & STORYBOARD
            </span>
            <p className="text-[#121212] font-medium">
              Structured Brief → Approved Concept → Slide-by-Slide Narrative
            </p>
            <p className="text-[#5C5852] leading-relaxed">
              Validates required inputs inline, separates concept approval from storyboard generation, and flags factual claims requiring verification.
            </p>
          </div>

          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-2">
            <span className="font-mono-tabular font-semibold uppercase text-[#0F1A2C]">
              PHASE B · DETERMINISTIC LAYOUT & PREVIEW
            </span>
            <p className="text-[#121212] font-medium">
              Provisional Brand Tokens → 10 Layout Patterns → 1080×1440 Preview
            </p>
            <p className="text-[#5C5852] leading-relaxed">
              Compiles independent native layers (FRAME, TEXT, RECTANGLE, ELLIPSE, LINE, VECTOR, IMAGE) with WCAG contrast and bounds verification.
            </p>
          </div>

          <div className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-2">
            <span className="font-mono-tabular font-semibold uppercase text-[#0F1A2C]">
              PHASE C · VALIDATED JSON & FIGMA PLUGIN
            </span>
            <p className="text-[#121212] font-medium">
              1.0.0 Schema Contract → Companion Figma Importer → Editable Canvas
            </p>
            <p className="text-[#5C5852] leading-relaxed">
              Exports a validated JSON file with stable layer IDs (`legacya_stable_id`) for non-destructive imports into a dedicated Figma Draft page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
