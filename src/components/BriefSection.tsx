import React, { useState } from 'react';
import { validateBriefForm } from '../services/creativeEngine';
import { CreativeBrief } from '../types/studio';

interface BriefSectionProps {
  brief: CreativeBrief;
  onSaveDraft: (updatedBrief: CreativeBrief) => void;
  onGenerateConcept: (updatedBrief: CreativeBrief) => void;
  onOpenIntelligenceDrawer: () => void;
  isGenerating: boolean;
  executionMode: 'local_deterministic' | 'gemini_api';
}

export const BriefSection: React.FC<BriefSectionProps> = ({
  brief,
  onSaveDraft,
  onGenerateConcept,
  onOpenIntelligenceDrawer,
  isGenerating,
  executionMode,
}) => {
  const [formData, setFormData] = useState<CreativeBrief>(brief);
  const [errors, setErrors] = useState<Partial<Record<keyof CreativeBrief, string>>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const updateField = <K extends keyof CreativeBrief>(key: K, value: CreativeBrief[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setSavedNotice(null);
  };

  const handleSaveDraftClick = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateBriefForm(formData);
    setErrors(check.fieldErrors);
    if (!check.valid) return;
    onSaveDraft(formData);
    setSavedNotice(`Draft saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. No API requests triggered.`);
  };

  const handleGenerateConceptClick = () => {
    const check = validateBriefForm(formData);
    setErrors(check.fieldErrors);
    if (!check.valid) return;
    onGenerateConcept(formData);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            01 · Creative Brief Specification
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Define Strategic & Editorial Parameters
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            Complete the required parameters below or ingest an upstream Market Intelligence record (#3 → #2). Saving a draft updates project state locally without invoking any generation model.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenIntelligenceDrawer}
            className="px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border border-[#0F1A2C] bg-[#EBE6DC] text-[#0F1A2C] hover:bg-[#0F1A2C] hover:text-[#F7F4EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ingest Market Intelligence (#3 → #2)
          </button>
          <button
            type="button"
            onClick={handleSaveDraftClick}
            className="px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Save Draft Brief
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateConceptClick}
            className="px-5 py-2.5 text-xs font-semibold tracking-wide uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGenerating
              ? 'Generating Concept...'
              : executionMode === 'gemini_api'
              ? 'Generate Concept (Gemini API)'
              : 'Generate Concept (Studio Engine)'}
          </button>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="p-4 bg-white border border-[#15803D] text-xs text-[#15803D] font-medium flex items-center justify-between"
        >
          <span>{savedNotice}</span>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="p-4 bg-white border border-[#B91C1C] text-xs text-[#B91C1C] space-y-1"
        >
          <p className="font-semibold uppercase tracking-wider">
            Brief Validation Failed — Please complete the required fields:
          </p>
          <ul className="list-disc list-inside">
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSaveDraftClick} className="space-y-10" noValidate>
        {/* Required Section */}
        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#D8D2C5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-editorial font-semibold text-[#121212]">
                Required Project Foundations
              </h2>
              <p className="text-xs text-[#5C5852] mt-1">
                Mandatory inputs validated before concept or storyboard synthesis.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-[#5C5852]">6 REQUIRED FIELDS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="brief-projectName"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Project Name *
              </label>
              <input
                id="brief-projectName"
                type="text"
                value={formData.projectName}
                onChange={(e) => updateField('projectName', e.target.value)}
                placeholder="e.g., Autonomous Systems Architecture — Q4 Series"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
              />
              {errors.projectName && (
                <p className="text-xs text-[#B91C1C] mt-1.5">{errors.projectName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="brief-language"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
                >
                  Language *
                </label>
                <input
                  id="brief-language"
                  type="text"
                  value={formData.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  placeholder="English"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
                />
                {errors.language && (
                  <p className="text-xs text-[#B91C1C] mt-1.5">{errors.language}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="brief-desiredSlideCount"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
                >
                  Desired Slides (3–12) *
                </label>
                <input
                  id="brief-desiredSlideCount"
                  type="number"
                  min={3}
                  max={12}
                  value={formData.desiredSlideCount}
                  onChange={(e) => updateField('desiredSlideCount', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
                />
                {errors.desiredSlideCount && (
                  <p className="text-xs text-[#B91C1C] mt-1.5">{errors.desiredSlideCount}</p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="brief-carouselTopic"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Carousel Topic *
              </label>
              <textarea
                id="brief-carouselTopic"
                rows={2}
                value={formData.carouselTopic}
                onChange={(e) => updateField('carouselTopic', e.target.value)}
                placeholder="Core subject and argument of the carousel..."
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
              />
              {errors.carouselTopic && (
                <p className="text-xs text-[#B91C1C] mt-1.5">{errors.carouselTopic}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="brief-targetAudience"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Target Audience *
              </label>
              <textarea
                id="brief-targetAudience"
                rows={2}
                value={formData.targetAudience}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                placeholder="Who is reading this carousel and what is their context?"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
              />
              {errors.targetAudience && (
                <p className="text-xs text-[#B91C1C] mt-1.5">{errors.targetAudience}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="brief-communicationObjective"
                className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2"
              >
                Communication Objective *
              </label>
              <textarea
                id="brief-communicationObjective"
                rows={2}
                value={formData.communicationObjective}
                onChange={(e) => updateField('communicationObjective', e.target.value)}
                placeholder="What shift in perspective or action should this achieve?"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
              />
              {errors.communicationObjective && (
                <p className="text-xs text-[#B91C1C] mt-1.5">{errors.communicationObjective}</p>
              )}
            </div>
          </div>
        </section>

        {/* Optional Strategic & Editorial Context */}
        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#D8D2C5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-editorial font-semibold text-[#121212]">
                Strategic, Editorial & Governance Directives (Optional)
              </h2>
              <p className="text-xs text-[#5C5852] mt-1">
                Supply supporting evidence, boundaries, and existing copy to constrain concept and storyboard generation.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-[#5C5852]">13 OPTIONAL FIELDS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="brief-product" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Product or Service
              </label>
              <input
                id="brief-product"
                type="text"
                value={formData.productOrService}
                onChange={(e) => updateField('productOrService', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-tone" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Tone of Voice
              </label>
              <input
                id="brief-tone"
                type="text"
                value={formData.toneOfVoice}
                onChange={(e) => updateField('toneOfVoice', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-painPoint" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Audience Pain Point
              </label>
              <textarea
                id="brief-painPoint"
                rows={2}
                value={formData.audiencePainPoint}
                onChange={(e) => updateField('audiencePainPoint', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-response" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Desired Audience Response
              </label>
              <textarea
                id="brief-response"
                rows={2}
                value={formData.desiredAudienceResponse}
                onChange={(e) => updateField('desiredAudienceResponse', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-keyMessage" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Key Message
              </label>
              <input
                id="brief-keyMessage"
                type="text"
                value={formData.keyMessage}
                onChange={(e) => updateField('keyMessage', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-cta" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Call to Action (CTA)
              </label>
              <input
                id="brief-cta"
                type="text"
                value={formData.callToAction}
                onChange={(e) => updateField('callToAction', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-facts" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Supporting Facts & Verified Evidence
              </label>
              <textarea
                id="brief-facts"
                rows={2}
                value={formData.supportingFacts}
                onChange={(e) => updateField('supportingFacts', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-existingCopy" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Existing Copy / Draft Notes
              </label>
              <textarea
                id="brief-existingCopy"
                rows={2}
                value={formData.existingCopy}
                onChange={(e) => updateField('existingCopy', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-visualDirection" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Preferred Visual Direction
              </label>
              <input
                id="brief-visualDirection"
                type="text"
                value={formData.preferredVisualDirection}
                onChange={(e) => updateField('preferredVisualDirection', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-excluded" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Content That Must Not Appear
              </label>
              <input
                id="brief-excluded"
                type="text"
                value={formData.excludedContent}
                onChange={(e) => updateField('excludedContent', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-links" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Reference Links
              </label>
              <input
                id="brief-links"
                type="text"
                value={formData.referenceLinks}
                onChange={(e) => updateField('referenceLinks', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div>
              <label htmlFor="brief-refImages" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Reference Asset IDs
              </label>
              <input
                id="brief-refImages"
                type="text"
                value={formData.referenceImages}
                onChange={(e) => updateField('referenceImages', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="brief-disclaimers" className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-2">
                Required Legal or Factual Disclaimers
              </label>
              <input
                id="brief-disclaimers"
                type="text"
                value={formData.legalDisclaimers}
                onChange={(e) => updateField('legalDisclaimers', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212]"
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
};
