import React, { useState } from 'react';
import { generateDeterministicSlideAsset } from '../services/creativeEngine';
import { StoryboardSlide, StudioAsset } from '../types/studio';

interface AssetLibrarySectionProps {
  assets: StudioAsset[];
  slides: StoryboardSlide[];
  onAddAsset: (asset: StudioAsset) => void;
  onAssignAssetToSlide: (assetId: string, slideId: string) => void;
}

export const AssetLibrarySection: React.FC<AssetLibrarySectionProps> = ({
  assets,
  slides,
  onAddAsset,
  onAssignAssetToSlide,
}) => {
  const [targetSlideId, setTargetSlideId] = useState<string>(slides[0]?.id || 'slide_01');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSynthesizeStudioPlate = () => {
    const slide = slides.find((s) => s.id === targetSlideId) || slides[0];
    if (!slide) return;
    const newAsset = generateDeterministicSlideAsset(slide, customPrompt);
    onAddAsset(newAsset);
    setCustomPrompt('');
    setStatusMessage(
      `Synthesized deterministic SVG plate "${newAsset.name}" (${newAsset.id}) with zero baked-in typography.`
    );
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
          aspectRatio: '4:3',
          previewDataUrl: reader.result,
          createdAt: new Date().toISOString(),
        };
        onAddAsset(uploaded);
        setStatusMessage(`Loaded local reference asset "${uploaded.name}" (${uploaded.id}).`);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            05 · Studio Asset Library & Optional Visual Synthesis
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Visual Assets & Provenance Manifest
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            Every asset maintains an identifiable reference and explicit provenance. Headlines, body copy, and logos are never baked into raster images.
          </p>
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

      {/* Explicit Asset Synthesis & Local Upload Controls */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4">
          <h2 className="text-xl font-editorial font-semibold text-[#121212]">
            Explicit Visual Asset Creation & Local Reference Import
          </h2>
          <p className="text-xs text-[#5C5852] mt-1">
            Image generation is strictly optional and user-triggered. Uploaded files remain in local browser memory and are never transmitted to external third-party storage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
              Intended Slide
            </label>
            <select
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

          <div className="lg:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
              Visual Direction / Prompt (No Text or Logos)
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Minimalist architectural proportion study in deep navy and stone..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
            />
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSynthesizeStudioPlate}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Synthesize Studio Vector Plate
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

            <div className="p-4 pt-0 border-t border-[#D8D2C5] mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono-tabular text-[#5C5852]">
                {asset.intendedSlideId ? `Linked: ${asset.intendedSlideId}` : 'Unassigned'}
              </span>
              <button
                type="button"
                onClick={() => onAssignAssetToSlide(asset.id, targetSlideId)}
                className="px-3 py-1.5 text-xs font-semibold uppercase border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] transition-colors cursor-pointer"
              >
                Assign to {targetSlideId}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
