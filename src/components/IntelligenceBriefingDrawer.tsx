import React, { useState } from 'react';
import {
  DEFAULT_INTELLIGENCE,
  INTELLIGENCE_PRESETS,
  validateIntelligenceRecord,
} from '../services/intelligenceBridge';
import { MarketIntelligenceRecord } from '../types/studio';

interface IntelligenceBriefingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSynthesizeBriefOnly: (intel: MarketIntelligenceRecord) => void;
  onSynthesizeFullCampaign: (intel: MarketIntelligenceRecord) => void;
  isGenerating?: boolean;
}

export const IntelligenceBriefingDrawer: React.FC<IntelligenceBriefingDrawerProps> = ({
  isOpen,
  onClose,
  onSynthesizeBriefOnly,
  onSynthesizeFullCampaign,
  isGenerating = false,
}) => {
  const [formData, setFormData] = useState<MarketIntelligenceRecord>(() => ({
    ...DEFAULT_INTELLIGENCE,
  }));
  const [errors, setErrors] = useState<
    Partial<Record<keyof MarketIntelligenceRecord, string>>
  >({});

  if (!isOpen) return null;

  const updateField = <K extends keyof MarketIntelligenceRecord>(
    key: K,
    value: MarketIntelligenceRecord[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleLoadPreset = (preset: MarketIntelligenceRecord) => {
    setFormData({ ...preset });
    setErrors({});
  };

  const handleBriefOnlyClick = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateIntelligenceRecord(formData);
    setErrors(check.fieldErrors);
    if (!check.valid) return;
    onSynthesizeBriefOnly(formData);
  };

  const handleFullCampaignClick = () => {
    const check = validateIntelligenceRecord(formData);
    setErrors(check.fieldErrors);
    if (!check.valid) return;
    onSynthesizeFullCampaign(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intel-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
    >
      <div className="w-full max-w-3xl bg-[#F7F4EE] border-l border-[#D8D2C5] h-full overflow-y-auto flex flex-col justify-between">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#D8D2C5]">
            <div className="space-y-1">
              <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#5C5852]">
                Pipeline Bridge · Market Intelligence (#3) → Visual Campaign (#2)
              </p>
              <h2
                id="intel-drawer-title"
                className="text-2xl lg:text-3xl font-editorial font-semibold text-[#121212]"
              >
                Ingest Market & Competitor Intelligence
              </h2>
              <p className="text-xs text-[#5C5852] max-w-xl">
                Transform upstream market research, competitor pain points, and verified hooks directly into a structured Creative Brief, Approved Concept, Storyboard, and 1.0.0 Figma Contract.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Market Intelligence Drawer"
              className="px-3.5 py-2 text-xs font-semibold uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Close Drawer
            </button>
          </div>

          {/* Preset Selector */}
          <div className="bg-white border border-[#D8D2C5] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121212]">
                Curated B2B Intelligence Briefing Presets
              </span>
              <span className="text-xs font-mono-tabular text-[#5C5852]">
                3 VERIFIED RECORDS
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {INTELLIGENCE_PRESETS.map((preset) => {
                const isSelected = formData.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className={`p-3 text-left border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE]'
                        : 'border-[#D8D2C5] bg-[#F7F4EE] text-[#121212] hover:border-[#121212]'
                    }`}
                  >
                    <p className="text-xs font-semibold line-clamp-1">
                      {preset.title || preset.source}
                    </p>
                    <p
                      className={`text-[11px] mt-1 font-mono-tabular ${
                        isSelected ? 'text-[#D8D2C5]' : 'text-[#5C5852]'
                      }`}
                    >
                      {preset.desiredSlideCount || 5} Slides · {preset.industrySector}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="p-4 bg-white border border-[#B91C1C] text-xs text-[#B91C1C] space-y-1"
            >
              <p className="font-semibold uppercase tracking-wider">
                Intelligence Validation Failed — Please complete all required fields:
              </p>
              <ul className="list-disc list-inside">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Intelligence Form */}
          <form onSubmit={handleBriefOnlyClick} className="bg-white border border-[#D8D2C5] p-6 space-y-5" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label
                  htmlFor="intel-source"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Intelligence Source *
                </label>
                <input
                  id="intel-source"
                  type="text"
                  value={formData.source}
                  onChange={(e) => updateField('source', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.source && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.source}</p>
                )}
              </div>

              <div className="md:col-span-4">
                <label
                  htmlFor="intel-sector"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Industry Sector *
                </label>
                <input
                  id="intel-sector"
                  type="text"
                  value={formData.industrySector}
                  onChange={(e) => updateField('industrySector', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.industrySector && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.industrySector}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="intel-slides"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Slides *
                </label>
                <input
                  id="intel-slides"
                  type="number"
                  min={3}
                  max={12}
                  value={formData.desiredSlideCount ?? 5}
                  onChange={(e) => updateField('desiredSlideCount', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.desiredSlideCount && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.desiredSlideCount}</p>
                )}
              </div>

              <div className="md:col-span-12">
                <label
                  htmlFor="intel-hook"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Proven Editorial Hook *
                </label>
                <input
                  id="intel-hook"
                  type="text"
                  value={formData.provenHook}
                  onChange={(e) => updateField('provenHook', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.provenHook && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.provenHook}</p>
                )}
              </div>

              <div className="md:col-span-6">
                <label
                  htmlFor="intel-audience"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Core Decision-Maker Audience *
                </label>
                <textarea
                  id="intel-audience"
                  rows={2}
                  value={formData.coreAudience}
                  onChange={(e) => updateField('coreAudience', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.coreAudience && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.coreAudience}</p>
                )}
              </div>

              <div className="md:col-span-6">
                <label
                  htmlFor="intel-metric"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Verified Market Proof Metric *
                </label>
                <textarea
                  id="intel-metric"
                  rows={2}
                  value={formData.marketProofMetric}
                  onChange={(e) => updateField('marketProofMetric', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.marketProofMetric && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.marketProofMetric}</p>
                )}
              </div>

              <div className="md:col-span-12">
                <label
                  htmlFor="intel-pain"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Target Operational Pain Point *
                </label>
                <textarea
                  id="intel-pain"
                  rows={2}
                  value={formData.targetPainPoint}
                  onChange={(e) => updateField('targetPainPoint', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.targetPainPoint && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.targetPainPoint}</p>
                )}
              </div>

              <div className="md:col-span-12">
                <label
                  htmlFor="intel-solution"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5"
                >
                  Strategic Architectural Solution *
                </label>
                <textarea
                  id="intel-solution"
                  rows={2}
                  value={formData.strategicSolution}
                  onChange={(e) => updateField('strategicSolution', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
                />
                {errors.strategicSolution && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.strategicSolution}</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-[#D8D2C5] flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-mono-tabular text-[#5C5852]">
            Compiles Brief · Concept · Storyboard · Flow MCP Matrix · v1.0.0 Contract
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBriefOnlyClick}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Populate Brief Only
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleFullCampaignClick}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isGenerating
                ? 'Synthesizing Campaign...'
                : 'Synthesize Full Campaign (#3 → #2)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
