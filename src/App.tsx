import { useEffect, useMemo, useRef, useState } from 'react';
import { AssetLibrarySection } from './components/AssetLibrarySection';
import { BrandSystemSection } from './components/BrandSystemSection';
import { BriefSection } from './components/BriefSection';
import { ConceptStoryboardSection } from './components/ConceptStoryboardSection';
import { DashboardSection } from './components/DashboardSection';
import { ExportHandoffSection } from './components/ExportHandoffSection';
import { HyperframesSection } from './components/HyperframesSection';
import { IntelligenceBriefingDrawer } from './components/IntelligenceBriefingDrawer';
import { SettingsUsageSection } from './components/SettingsUsageSection';
import { SlideEditorSection } from './components/SlideEditorSection';
import { INITIAL_SAMPLE_PROJECT } from './data/sampleProject';
import {
  generateConceptLocal,
  generateDeterministicSlideAsset,
  generateStoryboardLocal,
  getNextLayoutPattern,
  regenerateSingleSlideCopyLocal,
} from './services/creativeEngine';
import {
  compileCampaignFromIntelligence,
  synthesizeBriefFromIntelligence,
} from './services/intelligenceBridge';
import { compileSlideSpecification } from './services/layoutEngine';
import { validateProjectSpecifications } from './services/schemaValidator';
import { DEFAULT_BRAND_TOKENS } from './tokens/defaultTokens';
import {
  BrandSystemTokens,
  CreativeBrief,
  CreativeConcept,
  GenerationHistoryEntry,
  HandoffStageStatus,
  MarketIntelligenceRecord,
  StoryboardSlide,
  StudioAsset,
  StudioProject,
  WorkspaceSection,
} from './types/studio';

const STORAGE_KEY = 'legacya_sphere_studio_project_v1';

export default function App() {
  const [project, setProject] = useState<StudioProject>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && Array.isArray(parsed.storyboard)) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return structuredClone(INITIAL_SAMPLE_PROJECT);
  });

  const [activeSection, setActiveSection] = useState<WorkspaceSection>('dashboard');
  const [selectedSlideId, setSelectedSlideId] = useState<string>(
    project.storyboard[0]?.id || 'slide_01'
  );
  const [undoStack, setUndoStack] = useState<StoryboardSlide[][]>([]);
  const [executionMode, setExecutionMode] = useState<'local_deterministic' | 'gemini_api'>(
    'local_deterministic'
  );
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isIntelligenceDrawerOpen, setIsIntelligenceDrawerOpen] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const copyVariationSeedRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Ignore storage quota errors
    }
  }, [project]);

  useEffect(() => {
    fetch('/api/studio/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.geminiConfigured === 'boolean') {
          setServerGeminiConfigured(data.geminiConfigured);
        }
      })
      .catch(() => {
        setServerGeminiConfigured(false);
      });
  }, []);

  const compiledSpecs = useMemo(() => {
    return project.storyboard.map((slide) =>
      compileSlideSpecification(
        slide,
        project.storyboard.length,
        project.brandTokens,
        project.assets
      )
    );
  }, [project.storyboard, project.brandTokens, project.assets]);

  const validationReport = useMemo(() => {
    return validateProjectSpecifications(project, compiledSpecs);
  }, [project, compiledSpecs]);

  const appendHistory = (
    operation: GenerationHistoryEntry['operation'],
    summary: string,
    targetSlideId?: string,
    modeOverride?: 'local_deterministic' | 'gemini_api'
  ): GenerationHistoryEntry => ({
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    operation,
    mode: modeOverride || executionMode,
    targetSlideId,
    summary,
  });

  const pushUndoSnapshot = (currentSlides: StoryboardSlide[]) => {
    setUndoStack((prev) => [...prev.slice(-14), structuredClone(currentSlides)]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousSlides = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      storyboard: previousSlides,
    }));
  };

  const handleSaveBriefDraft = (updatedBrief: CreativeBrief) => {
    setProject((prev) => ({
      ...prev,
      status: prev.status === 'Exported' ? 'Ready for review' : prev.status,
      updatedAt: new Date().toISOString(),
      brief: updatedBrief,
      history: [
        appendHistory(
          'brief_saved',
          `Saved brief draft "${updatedBrief.projectName}" (${updatedBrief.desiredSlideCount} target slides).`,
          undefined,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
  };

  const handleSynthesizeBriefFromIntelligence = (intel: MarketIntelligenceRecord) => {
    const synthesizedBrief = synthesizeBriefFromIntelligence(intel);
    setProject((prev) => ({
      ...prev,
      id: `proj_intel_${Date.now().toString().slice(-5)}`,
      status: 'Draft',
      updatedAt: new Date().toISOString(),
      brief: synthesizedBrief,
      history: [
        appendHistory(
          'intelligence_ingested',
          `Ingested market intelligence "${intel.source}" into 19-field Creative Brief (${synthesizedBrief.desiredSlideCount} slides).`,
          undefined,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
    setIsIntelligenceDrawerOpen(false);
    setBannerMessage(
      `Populated Creative Brief from intelligence source "${intel.source}". Review and click Generate Concept when ready.`
    );
    setActiveSection('brief');
  };

  const handleSynthesizeFullCampaignFromIntelligence = (intel: MarketIntelligenceRecord) => {
    pushUndoSnapshot(project.storyboard);
    const compiled = compileCampaignFromIntelligence(
      intel,
      project.brandTokens,
      project.assets
    );
    setProject((prev) => ({
      ...compiled.project,
      history: [
        appendHistory(
          'intelligence_ingested',
          `Compiled full ${compiled.storyboard.length}-slide campaign from intelligence "${intel.source}" (#3 → #2 Bridge).`,
          undefined,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
    if (compiled.storyboard[0]) {
      setSelectedSlideId(compiled.storyboard[0].id);
    }
    setIsIntelligenceDrawerOpen(false);
    setBannerMessage(
      `Synthesized ${compiled.storyboard.length}-slide campaign, approved concept, Flow MCP prompt matrix, and v1.0.0 contract from "${intel.source}".`
    );
    setActiveSection('dashboard');
  };

  const handleGenerateConcept = async (briefInput?: CreativeBrief) => {
    if (isGenerating) return;
    const targetBrief = briefInput || project.brief;
    setIsGenerating(true);
    setBannerMessage(null);

    try {
      let generatedConcept: CreativeConcept | null = null;
      let usedMode: 'local_deterministic' | 'gemini_api' = 'local_deterministic';

      if (executionMode === 'gemini_api') {
        try {
          const res = await fetch('/api/gemini/concept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brief: targetBrief }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.concept && data.concept.centralIdea) {
              generatedConcept = data.concept;
              usedMode =
                data.source === 'gemini_api' || data.concept.source === 'gemini_api'
                  ? 'gemini_api'
                  : 'local_deterministic';
              if (usedMode === 'local_deterministic') {
                setBannerMessage(
                  'Gemini API unavailable or unconfigured; synthesized concept via Deterministic Studio Engine.'
                );
              }
            }
          }
        } catch {
          // Fall back cleanly to deterministic studio engine
        }
      }

      if (!generatedConcept) {
        generatedConcept = generateConceptLocal(targetBrief);
        if (executionMode === 'gemini_api') {
          setBannerMessage(
            'Gemini API unavailable or quota reached; synthesized concept via Deterministic Studio Engine.'
          );
        }
      }

      setProject((prev) => ({
        ...prev,
        status: 'Ready for review',
        updatedAt: new Date().toISOString(),
        brief: targetBrief,
        concept: generatedConcept,
        history: [
          appendHistory(
            'concept_generated',
            `Synthesized concept "${generatedConcept.centralIdea}" (${generatedConcept.recommendedSlideSequence.length} slides).`,
            undefined,
            usedMode
          ),
          ...prev.history,
        ],
      }));
      setActiveSection('concept');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveConcept = (approved: boolean) => {
    if (!project.concept) return;
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      concept: prev.concept
        ? {
            ...prev.concept,
            approved,
            approvedAt: approved ? new Date().toISOString() : undefined,
          }
        : null,
    }));
  };

  const handleUpdateConceptField = <K extends keyof CreativeConcept>(
    key: K,
    value: CreativeConcept[K]
  ) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      concept: prev.concept ? { ...prev.concept, [key]: value } : null,
    }));
  };

  const handleGenerateStoryboard = async () => {
    if (!project.concept || isGenerating) return;
    const activeConcept = project.concept;
    const activeBrief = project.brief;
    pushUndoSnapshot(project.storyboard);
    setIsGenerating(true);
    setBannerMessage(null);

    try {
      let nextSlides: StoryboardSlide[] | null = null;
      let usedMode: 'local_deterministic' | 'gemini_api' = 'local_deterministic';

      if (executionMode === 'gemini_api') {
        try {
          const res = await fetch('/api/gemini/storyboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brief: activeBrief, concept: activeConcept }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.storyboard) && data.storyboard.length > 0) {
              nextSlides = data.storyboard;
              usedMode = data.source === 'gemini_api' ? 'gemini_api' : 'local_deterministic';
              if (usedMode === 'local_deterministic') {
                setBannerMessage(
                  'Gemini API unavailable or unconfigured; synthesized storyboard via Deterministic Studio Engine.'
                );
              }
            }
          }
        } catch {
          // Fall back cleanly to deterministic studio engine
        }
      }

      if (!nextSlides) {
        nextSlides = generateStoryboardLocal(activeBrief, activeConcept);
        if (executionMode === 'gemini_api') {
          setBannerMessage(
            'Gemini API unavailable or quota reached; synthesized storyboard via Deterministic Studio Engine.'
          );
        }
      }

      setProject((prev) => ({
        ...prev,
        status: 'Ready for review',
        updatedAt: new Date().toISOString(),
        storyboard: nextSlides!,
        history: [
          appendHistory(
            'storyboard_generated',
            `Generated ${nextSlides!.length}-slide storyboard from approved concept "${activeConcept.centralIdea}".`,
            undefined,
            usedMode
          ),
          ...prev.history,
        ],
      }));
      if (nextSlides[0]) setSelectedSlideId(nextSlides[0].id);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSlide = (slideId: string, patch: Partial<StoryboardSlide>) => {
    pushUndoSnapshot(project.storyboard);
    setProject((prev) => {
      const nextStoryboard = prev.storyboard.map((s) =>
        s.id === slideId
          ? {
              ...s,
              ...patch,
              // Editing copy resets automatic approval so human reviews updated slide
              approved:
                patch.approved !== undefined
                  ? patch.approved
                  : patch.primaryHeadline !== undefined || patch.supportingCopy !== undefined
                  ? false
                  : s.approved,
              lastModifiedAt: new Date().toISOString(),
            }
          : s
      );
      const allApproved =
        nextStoryboard.length > 0 && nextStoryboard.every((s) => s.approved);
      return {
        ...prev,
        status: allApproved ? 'Approved' : 'Ready for review',
        updatedAt: new Date().toISOString(),
        storyboard: nextStoryboard,
      };
    });
  };

  const handleReorderSlide = (slideId: string, direction: 'up' | 'down') => {
    const idx = project.storyboard.findIndex((s) => s.id === slideId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= project.storyboard.length) return;

    pushUndoSnapshot(project.storyboard);
    const copy = [...project.storyboard];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    const renumbered = copy.map((s, i) => ({
      ...s,
      slideNumber: i + 1,
    }));

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      storyboard: renumbered,
    }));
  };

  const handleDuplicateSlide = (slideId: string) => {
    const idx = project.storyboard.findIndex((s) => s.id === slideId);
    if (idx === -1) return;
    pushUndoSnapshot(project.storyboard);
    const source = project.storyboard[idx];
    const newId = `slide_${String(project.storyboard.length + 1).padStart(2, '0')}_${Date.now()
      .toString()
      .slice(-3)}`;
    const duplicated: StoryboardSlide = {
      ...structuredClone(source),
      id: newId,
      approved: false,
      lastModifiedAt: new Date().toISOString(),
    };
    const next = [...project.storyboard];
    next.splice(idx + 1, 0, duplicated);
    const renumbered = next.map((s, i) => ({ ...s, slideNumber: i + 1 }));

    setProject((prev) => ({
      ...prev,
      status: 'Ready for review',
      updatedAt: new Date().toISOString(),
      storyboard: renumbered,
    }));
    setSelectedSlideId(newId);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (project.storyboard.length <= 1) return;
    pushUndoSnapshot(project.storyboard);
    const filtered = project.storyboard
      .filter((s) => s.id !== slideId)
      .map((s, i) => ({ ...s, slideNumber: i + 1 }));

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      storyboard: filtered,
    }));
    if (selectedSlideId === slideId && filtered[0]) {
      setSelectedSlideId(filtered[0].id);
    }
  };

  const handleRegenerateSlideCopy = async (slideId: string) => {
    const target = project.storyboard.find((s) => s.id === slideId);
    if (!target || isGenerating) return;
    pushUndoSnapshot(project.storyboard);
    copyVariationSeedRef.current += 1;
    const seed = copyVariationSeedRef.current;

    let nextCopy: Pick<StoryboardSlide, 'primaryHeadline' | 'supportingCopy' | 'lastModifiedAt'> | null =
      null;
    let usedMode: 'local_deterministic' | 'gemini_api' = 'local_deterministic';

    if (executionMode === 'gemini_api') {
      setIsGenerating(true);
      try {
        const res = await fetch('/api/gemini/slide-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slide: target,
            brief: project.brief,
            variationSeed: seed,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.copy && data.copy.primaryHeadline) {
            nextCopy = data.copy;
            usedMode = data.source === 'gemini_api' ? 'gemini_api' : 'local_deterministic';
            if (usedMode === 'local_deterministic') {
              setBannerMessage(
                `Gemini API unavailable or unconfigured; regenerated ${slideId} copy via Deterministic Studio Engine.`
              );
            }
          }
        }
      } catch {
        // Fall back cleanly to deterministic studio engine
      } finally {
        setIsGenerating(false);
      }
    }

    if (!nextCopy) {
      nextCopy = regenerateSingleSlideCopyLocal(target, project.brief, seed);
    }

    setProject((prev) => ({
      ...prev,
      status: 'Ready for review',
      updatedAt: new Date().toISOString(),
      storyboard: prev.storyboard.map((s) =>
        s.id === slideId
          ? { ...s, ...nextCopy!, approved: false }
          : s
      ),
      history: [
        appendHistory(
          'slide_copy_regenerated',
          `Regenerated headline and supporting copy for ${slideId} without modifying other slides.`,
          slideId,
          usedMode
        ),
        ...prev.history,
      ],
    }));
  };

  const handleRegenerateSlideLayout = (slideId: string) => {
    const target = project.storyboard.find((s) => s.id === slideId);
    if (!target) return;
    pushUndoSnapshot(project.storyboard);
    const nextPattern = getNextLayoutPattern(target.layoutPattern);

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      storyboard: prev.storyboard.map((s) =>
        s.id === slideId
          ? { ...s, layoutPattern: nextPattern, lastModifiedAt: new Date().toISOString() }
          : s
      ),
      history: [
        appendHistory(
          'slide_layout_regenerated',
          `Switched ${slideId} layout pattern from "${target.layoutPattern}" to "${nextPattern}".`,
          slideId,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
  };

  const handleGenerateSlideAsset = (slideId: string) => {
    const target = project.storyboard.find((s) => s.id === slideId);
    if (!target) return;
    const asset = generateDeterministicSlideAsset(target);
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      assets: [asset, ...prev.assets],
      storyboard: prev.storyboard.map((s) =>
        s.id === slideId ? { ...s, suggestedAssetId: asset.id } : s
      ),
      history: [
        appendHistory(
          'asset_generated',
          `Synthesized studio geometric vector plate (${asset.id}) for ${slideId}.`,
          slideId,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
  };

  const handleUpdateBrandTokens = (nextTokens: BrandSystemTokens) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      brandTokens: nextTokens,
    }));
  };

  const handleResetBrandTokens = () => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      brandTokens: structuredClone(DEFAULT_BRAND_TOKENS),
    }));
  };

  const handleAddAsset = (asset: StudioAsset) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      assets: [asset, ...prev.assets],
      history: [
        appendHistory(
          'asset_generated',
          `Added asset "${asset.name}" (${asset.id}) to Asset Library.`,
          asset.intendedSlideId,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
  };

  const handleAssignAssetToSlide = (assetId: string, slideId: string) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      storyboard: prev.storyboard.map((s) =>
        s.id === slideId
          ? {
              ...s,
              suggestedAssetId: assetId,
              layoutPattern:
                s.layoutPattern === 'image_with_caption' ||
                s.layoutPattern === 'product_showcase'
                  ? s.layoutPattern
                  : 'image_with_caption',
            }
          : s
      ),
    }));
    setSelectedSlideId(slideId);
    setActiveSection('editor');
  };

  const handleRecordExport = () => {
    setProject((prev) => ({
      ...prev,
      status: 'Exported',
      updatedAt: new Date().toISOString(),
      handoffState: {
        ...prev.handoffState,
        jsonGenerated: true,
        jsonValidated: true,
      },
      history: [
        appendHistory(
          'json_exported',
          `Exported validated 1.0.0 Figma JSON contract (${prev.storyboard.length} slides).`,
          undefined,
          'local_deterministic'
        ),
        ...prev.history,
      ],
    }));
  };

  const handleUpdateHandoffStage = (patch: Partial<HandoffStageStatus>) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      handoffState: { ...prev.handoffState, ...patch },
    }));
  };

  const handleCreateNewProject = () => {
    const blankProject: StudioProject = {
      id: `proj_legacya_${Date.now().toString().slice(-5)}`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      brief: {
        projectName: '',
        carouselTopic: '',
        targetAudience: '',
        communicationObjective: '',
        language: 'English',
        desiredSlideCount: 5,
        productOrService: '',
        audiencePainPoint: '',
        desiredAudienceResponse: '',
        toneOfVoice: 'Editorial, restrained, architecturally precise',
        keyMessage: '',
        callToAction: 'LEGACYASPHERE.STUDIO',
        supportingFacts: '',
        referenceLinks: '',
        existingCopy: '',
        referenceImages: '',
        preferredVisualDirection: 'Warm Cream (#F7F4EE), Deep Navy (#0F1A2C), Fraunces + Plus Jakarta Sans',
        excludedContent: '',
        legalDisclaimers: '',
      },
      concept: null,
      storyboard: INITIAL_SAMPLE_PROJECT.storyboard.slice(0, 5).map((s, i) => ({
        ...structuredClone(s),
        slideNumber: i + 1,
        approved: false,
      })),
      brandTokens: structuredClone(DEFAULT_BRAND_TOKENS),
      assets: structuredClone(INITIAL_SAMPLE_PROJECT.assets),
      handoffState: {
        jsonGenerated: false,
        jsonValidated: true,
        figmaPluginImplemented: true,
        figmaImportCompleted: false,
        designReviewed: false,
        designApproved: false,
      },
      history: [
        appendHistory(
          'brief_saved',
          'Initialized new draft project workspace.',
          undefined,
          'local_deterministic'
        ),
      ],
    };
    setProject(blankProject);
    setUndoStack([]);
    setActiveSection('brief');
  };

  const handleResetSampleProject = () => {
    const restored = structuredClone(INITIAL_SAMPLE_PROJECT);
    setProject(restored);
    setSelectedSlideId(restored.storyboard[0].id);
    setUndoStack([]);
    setActiveSection('dashboard');
  };

  const handleRecordHyperframesExport = (summary: string) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      history: [
        appendHistory('hyperframes_compiled', summary, undefined, 'local_deterministic'),
        ...prev.history,
      ],
    }));
  };

  const workspaceTabs: Array<{ id: WorkspaceSection; code: string; label: string }> = [
    { id: 'dashboard', code: 'A', label: 'Dashboard' },
    { id: 'brief', code: 'B', label: 'Creative Brief' },
    { id: 'concept', code: 'C', label: 'Concept & Storyboard' },
    { id: 'editor', code: 'D', label: 'Slide Editor & Preview' },
    { id: 'brand', code: 'E', label: 'Brand System' },
    { id: 'assets', code: 'F', label: 'Asset Library' },
    { id: 'hyperframes', code: 'G', label: 'HyperFrames Motion' },
    { id: 'export', code: 'H', label: 'Export & Figma Handoff' },
    { id: 'settings', code: 'I', label: 'Settings & Usage' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#121212]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 lg:px-10 py-4 bg-white border-b border-[#D8D2C5]">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('dashboard');
          }}
          className="text-base sm:text-lg font-editorial font-semibold tracking-tight text-[#121212] whitespace-nowrap shrink-0"
        >
          LEGACYA SPHERE
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-[#5C5852]"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('dashboard');
            }}
            className={`hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'dashboard' ? 'text-[#121212] underline underline-offset-4' : ''
            }`}
          >
            Dashboard
          </a>
          <a
            href="#brief"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('brief');
            }}
            className={`hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'brief' ? 'text-[#121212] underline underline-offset-4' : ''
            }`}
          >
            Creative Brief
          </a>
          <a
            href="#concept"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('concept');
            }}
            className={`hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'concept' ? 'text-[#121212] underline underline-offset-4' : ''
            }`}
          >
            Storyboard
          </a>
          <a
            href="#editor"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('editor');
            }}
            className={`hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'editor' ? 'text-[#121212] underline underline-offset-4' : ''
            }`}
          >
            Slide Editor
          </a>
          <a
            href="#brand"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('brand');
            }}
            className={`hover:text-[#121212] transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'brand' ? 'text-[#121212] underline underline-offset-4' : ''
            }`}
          >
            Brand System
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('export')}
            className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export Handoff
          </button>
        </div>
      </header>

      {/* Secondary Operational Studio Ribbon: All 9 Sections (A–I) + Unboxed Project Status Metadata */}
      <div className="bg-[#EBE6DC] border-b border-[#D8D2C5] px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="All Studio Sections A through I"
          className="flex flex-wrap items-center gap-1"
        >
          {workspaceTabs.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-2.5 py-1.5 text-[11px] font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0F1A2C] text-[#F7F4EE] font-semibold'
                    : 'bg-transparent text-[#121212] hover:bg-white'
                }`}
              >
                {tab.code}. {tab.label}
              </button>
            );
          })}
        </div>

        {/* Clean Unboxed Status Metadata (Zero-Pill Discipline) */}
        <div className="text-xs font-mono-tabular text-[#5C5852] flex flex-wrap items-center gap-2">
          <span className="text-[#121212] font-semibold">
            {project.brief.projectName || 'Untitled Brief'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Status: {project.status}</span>
          <span aria-hidden="true">·</span>
          <span>{project.storyboard.length} Slides</span>
          <span aria-hidden="true">·</span>
          <span>
            {project.storyboard.filter((s) => s.approved).length} Approved
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Schema: {validationReport.valid ? 'v1.0.0 Valid' : 'Needs Review'}
          </span>
        </div>
      </div>

      {bannerMessage && (
        <div className="bg-white border-b border-[#B45309] px-6 lg:px-10 py-2.5 text-xs text-[#B45309] flex items-center justify-between">
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-8 lg:py-10">
        {activeSection === 'dashboard' && (
          <DashboardSection
            project={project}
            specs={compiledSpecs}
            validationReport={validationReport}
            onNavigate={setActiveSection}
            onOpenSlideInEditor={(slideId) => {
              setSelectedSlideId(slideId);
              setActiveSection('editor');
            }}
            onCreateNewProject={handleCreateNewProject}
            onResetSampleProject={handleResetSampleProject}
            onOpenIntelligenceDrawer={() => setIsIntelligenceDrawerOpen(true)}
          />
        )}

        {activeSection === 'brief' && (
          <BriefSection
            key={`${project.id}_${project.brief.projectName}`}
            brief={project.brief}
            onSaveDraft={handleSaveBriefDraft}
            onGenerateConcept={handleGenerateConcept}
            onOpenIntelligenceDrawer={() => setIsIntelligenceDrawerOpen(true)}
            isGenerating={isGenerating}
            executionMode={executionMode}
          />
        )}

        {activeSection === 'concept' && (
          <ConceptStoryboardSection
            concept={project.concept}
            storyboard={project.storyboard}
            onGenerateConcept={() => handleGenerateConcept()}
            onApproveConcept={handleApproveConcept}
            onUpdateConceptField={handleUpdateConceptField}
            onGenerateStoryboard={handleGenerateStoryboard}
            onUpdateStoryboardSlide={handleUpdateSlide}
            onProceedToSlideEditor={() => setActiveSection('editor')}
            isGenerating={isGenerating}
          />
        )}

        {activeSection === 'editor' && (
          <SlideEditorSection
            slides={project.storyboard}
            specs={compiledSpecs}
            brandTokens={project.brandTokens}
            assets={project.assets}
            selectedSlideId={selectedSlideId}
            onSelectSlide={setSelectedSlideId}
            onUpdateSlide={handleUpdateSlide}
            onReorderSlide={handleReorderSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onRegenerateSlideCopy={handleRegenerateSlideCopy}
            onRegenerateSlideLayout={handleRegenerateSlideLayout}
            onGenerateSlideAsset={handleGenerateSlideAsset}
            onUndo={handleUndo}
            canUndo={undoStack.length > 0}
          />
        )}

        {activeSection === 'brand' && (
          <BrandSystemSection
            tokens={project.brandTokens}
            onUpdateTokens={handleUpdateBrandTokens}
            onResetTokens={handleResetBrandTokens}
          />
        )}

        {activeSection === 'assets' && (
          <AssetLibrarySection
            assets={project.assets}
            slides={project.storyboard}
            brandTokens={project.brandTokens}
            onAddAsset={handleAddAsset}
            onAssignAssetToSlide={handleAssignAssetToSlide}
          />
        )}

        {activeSection === 'hyperframes' && (
          <HyperframesSection
            project={project}
            specs={compiledSpecs}
            onRecordHyperframesExport={handleRecordHyperframesExport}
          />
        )}

        {activeSection === 'export' && (
          <ExportHandoffSection
            project={project}
            onRecordExport={handleRecordExport}
            onUpdateHandoffStage={handleUpdateHandoffStage}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsUsageSection
            executionMode={executionMode}
            onChangeExecutionMode={setExecutionMode}
            serverGeminiConfigured={serverGeminiConfigured}
            history={project.history}
          />
        )}
      </main>

      <IntelligenceBriefingDrawer
        isOpen={isIntelligenceDrawerOpen}
        onClose={() => setIsIntelligenceDrawerOpen(false)}
        onSynthesizeBriefOnly={handleSynthesizeBriefFromIntelligence}
        onSynthesizeFullCampaign={handleSynthesizeFullCampaignFromIntelligence}
        isGenerating={isGenerating}
      />

      {/* Quiet Editorial Footer */}
      <footer className="bg-white border-t border-[#D8D2C5] px-6 lg:px-10 py-5 text-xs text-[#5C5852] flex flex-wrap items-center justify-between gap-4">
        <span>
          LEGACYA SPHERE CREATIVE STUDIO · Editorial Carousel Architecture & Native Figma Specification Workspace
        </span>
        <span className="font-mono-tabular">
          Default Format: 3:4 Portrait (1080×1440) · Schema Contract v1.0.0
        </span>
      </footer>
    </div>
  );
}
