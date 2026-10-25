import React, { useMemo, useState } from 'react';
import { generateDeterministicSlideAsset } from '../services/creativeEngine';
import { buildImagePromptMatrix } from '../services/intelligenceBridge';
import {
  BrandSystemTokens,
  SlideImagePromptEntry,
  StoryboardSlide,
  StudioAsset,
} from '../types/studio';

interface AssetLibrarySectionProps {
  assets: StudioAsset[];
  slides: StoryboardSlide[];
  brandTokens: BrandSystemTokens;
  onAddAsset: (asset: StudioAsset) => void;
  onAssignAssetToSlide: (assetId: string, slideId: string) => void;
}

export const AssetLibrarySection: React.FC<AssetLibrarySectionProps> = ({
  assets,
  slides,
  brandTokens,
  onAddAsset,
  onAssignAssetToSlide,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'prompt_matrix'>('catalog');
  const [targetSlideId, setTargetSlideId] = useState<string>(slides[0]?.id || 'slide_01');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<StudioAsset['aspectRatio']>('4:3');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const promptMatrix = useMemo(
    () => buildImagePromptMatrix(slides, brandTokens),
    [slides, brandTokens]
  );

  const handleSynthesizeStudioPlate = (promptOverride?: string, slideIdOverride?: string) => {
    const resolvedSlideId = slideIdOverride || targetSlideId;
    const slide = slides.find((s) => s.id === resolvedSlideId) || slides[0];
    if (!slide) return;
    const newAsset = generateDeterministicSlideAsset(slide, promptOverride ?? customPrompt);
    onAddAsset({ ...newAsset, aspectRatio });
    if (!promptOverride) setCustomPrompt('');
    setStatusMessage(
      `Synthesized deterministic SVG plate "${newAsset.name}" (${newAsset.id}) with zero baked-in typography.`
    );
  };

  const handleGenerateGeminiEditorialImage = async (
    promptOverride?: string,
    slideIdOverride?: string
  ) => {
    if (isGeneratingImage) return;
    const resolvedSlideId = slideIdOverride || targetSlideId;
    const slide = slides.find((s) => s.id === resolvedSlideId) || slides[0];
    if (!slide) return;

    setIsGeneratingImage(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide,
          prompt: promptOverride ?? customPrompt,
          aspectRatio,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.asset) {
          onAddAsset(data.asset);
          if (!promptOverride) setCustomPrompt('');
          if (data.source === 'gemini_api') {
            setStatusMessage(
              `Generated editorial image "${data.asset.name}" via Gemini API (zero baked-in typography).`
            );
          } else {
            setStatusMessage(
              `${
                data.fallbackReason ||
                'Gemini image key unconfigured; synthesized deterministic studio vector plate.'
              } Added "${data.asset.name}" (${data.asset.id}).`
            );
          }
          return;
        }
      }
      handleSynthesizeStudioPlate(promptOverride, resolvedSlideId);
    } catch {
      handleSynthesizeStudioPlate(promptOverride, resolvedSlideId);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const uploaded: StudioAsset = {
          id: `asset_upload_${Date.now()}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          category: 'reference_image',
          intendedSlideId: targetSlideId,
          status: 'ready',
          provenance: `Local Browser FileReader (${file.type || 'image'}, kept in local state only)`,
          aspectRatio,
          previewDataUrl: reader.result,
          createdAt: new Date().toISOString(),
        };
        onAddAsset(uploaded);
        setStatusMessage(`Loaded local reference asset "${uploaded.name}" (${uploaded.id}).`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPromptMatrixJson = () => {
    const payload = JSON.stringify(promptMatrix, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image_prompt_matrix.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage(
      `Downloaded Google Flow MCP & Diffusion Prompt Matrix (image_prompt_matrix.json · ${promptMatrix.length} slides).`
    );
  };

  const handleCopyPromptEntry = async (entry: SlideImagePromptEntry) => {
    try {
      await navigator.clipboard.writeText(entry.flowMcpPrompt);
      setStatusMessage(`Copied Slide ${String(entry.slideNumber).padStart(2, '0')} Google Flow MCP prompt to clipboard.`);
    } catch {
      setStatusMessage('Clipboard write unavailable in this context; use Download image_prompt_matrix.json.');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            05 · Studio Asset Library, Gemini Synthesis & Flow MCP Prompt Matrix
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Visual Assets & Provenance Manifest
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            Every asset maintains an identifiable reference and explicit provenance. Headlines, body copy, and logos are never baked into raster images.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE]'
                : 'border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            01. Studio Assets ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt_matrix')}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'prompt_matrix'
                ? 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE]'
                : 'border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC]'
            }`}
          >
            02. Image Prompt Matrix ({promptMatrix.length} Slides)
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="p-4 bg-white border border-[#15803D] text-xs text-[#15803D] font-medium flex items-center justify-between"
        >
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

      {activeTab === 'catalog' ? (
        <>
          {/* Explicit Asset Synthesis & Local Upload Controls */}
          <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
            <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-editorial font-semibold text-[#121212]">
                  Explicit Visual Asset Creation & Local Reference Import
                </h2>
                <p className="text-xs text-[#5C5852] mt-1">
                  Image generation is strictly optional and user-triggered. Choose deterministic vector synthesis (free) or Gemini editorial synthesis (falls back cleanly when unconfigured).
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-[#5C5852]">
                ZERO BAKED-IN TYPOGRAPHY
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-3">
                <label
                  htmlFor="asset-target-slide"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
                >
                  Intended Slide
                </label>
                <select
                  id="asset-target-slide"
                  value={targetSlideId}
                  onChange={(e) => setTargetSlideId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                >
                  {slides.map((s) => (
                    <option key={s.id} value={s.id}>
                      Slide {String(s.slideNumber).padStart(2, '0')} — {s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="asset-aspect-ratio"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
                >
                  Aspect Ratio
                </label>
                <select
                  id="asset-aspect-ratio"
                  value={aspectRatio}
                  onChange={(e) =>
                    setAspectRatio(e.target.value as StudioAsset['aspectRatio'])
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                >
                  <option value="4:3">4:3 Showcase</option>
                  <option value="3:4">3:4 Portrait</option>
                  <option value="1:1">1:1 Emblem</option>
                  <option value="16:9">16:9 Wide</option>
                </select>
              </div>

              <div className="lg:col-span-7">
                <label
                  htmlFor="asset-custom-prompt"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
                >
                  Visual Direction / Prompt (No Text or Logos)
                </label>
                <input
                  id="asset-custom-prompt"
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Minimalist architectural proportion study in deep navy and stone..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
              </div>

              <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D8D2C5]">
                <span className="text-xs font-mono-tabular text-[#5C5852]">
                  Target: {targetSlideId} · Ratio: {aspectRatio}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSynthesizeStudioPlate()}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Synthesize Studio Vector Plate
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingImage}
                    onClick={() => handleGenerateGeminiEditorialImage()}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#0F1A2C] bg-[#EBE6DC] text-[#0F1A2C] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isGeneratingImage
                      ? 'Synthesizing Image...'
                      : 'Generate Editorial Image (Gemini API)'}
                  </button>

                  <label className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer">
                    Upload Local Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Asset Catalog Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white border border-[#D8D2C5] flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#EBE6DC] border-b border-[#D8D2C5] overflow-hidden flex items-center justify-center">
                    <img
                      src={asset.previewDataUrl}
                      alt={asset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] font-mono-tabular text-[#5C5852]">
                      <span>{asset.id}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{asset.aspectRatio}</span>
                    </div>
                    <h3 className="text-base font-editorial font-semibold text-[#121212]">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-[#5C5852]">{asset.provenance}</p>
                    {asset.prompt && (
                      <p className="text-xs text-[#5C5852] italic">Prompt: “{asset.prompt}”</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-3 border-t border-[#D8D2C5] mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-tabular text-[#5C5852]">
                    {asset.intendedSlideId ? `Linked: ${asset.intendedSlideId}` : 'Unassigned'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAssignAssetToSlide(asset.id, targetSlideId)}
                    className="px-3 py-1.5 text-xs font-semibold uppercase border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Assign to {targetSlideId}
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        /* Image Prompt Matrix (Google Flow MCP & Diffusion Export) */
        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-editorial font-semibold text-[#121212]">
                Slide-by-Slide Image Prompt Matrix (Google Flow MCP & Diffusion Ready)
              </h2>
              <p className="text-xs text-[#5C5852] mt-1">
                Compiled automatically from your active storyboard and brand tokens. Use these prompts with external diffusion pipelines or synthesize directly into the studio catalog.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadPromptMatrixJson}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Download image_prompt_matrix.json
            </button>
          </div>

          <div className="space-y-4">
            {promptMatrix.map((entry) => (
              <div
                key={entry.slideId}
                className="p-5 bg-[#F7F4EE] border border-[#D8D2C5] space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D2C5] pb-3">
                  <div className="text-xs font-mono-tabular text-[#5C5852] flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#121212]">
                      SLIDE {String(entry.slideNumber).padStart(2, '0')} ({entry.slideId})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Category: {entry.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Layout: {entry.layoutPattern}</span>
                    <span aria-hidden="true">·</span>
                    <span>Target Ratio: {entry.aspectRatio}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyPromptEntry(entry)}
                      className="px-3 py-1.5 text-xs font-semibold uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Copy Flow Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSlideId(entry.slideId);
                        handleSynthesizeStudioPlate(entry.flowMcpPrompt, entry.slideId);
                        setActiveTab('catalog');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Synthesize Plate for Slide {String(entry.slideNumber).padStart(2, '0')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                  <div className="lg:col-span-4 space-y-1">
                    <span className="font-mono-tabular uppercase text-[#5C5852]">
                      Slide Headline Context
                    </span>
                    <p className="text-sm font-editorial font-semibold text-[#121212]">
                      {entry.headline}
                    </p>
                    <p className="text-[#5C5852]">Focal Point: {entry.visualConcept}</p>
                  </div>

                  <div className="lg:col-span-8 space-y-2">
                    <div>
                      <span className="font-mono-tabular uppercase text-[#5C5852]">
                        Google Flow MCP Prompt
                      </span>
                      <p className="p-2.5 bg-white border border-[#D8D2C5] font-mono-tabular text-[#121212] mt-1">
                        {entry.flowMcpPrompt}
                      </p>
                    </div>
                    <p className="text-[11px] font-mono-tabular text-[#5C5852]">
                      Negative Guardrail: {entry.negativePrompt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
