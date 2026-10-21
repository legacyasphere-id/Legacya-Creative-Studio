import React, { useState } from 'react';
import {
  FIGMA_PLUGIN_CODE_TS,
  FIGMA_PLUGIN_MANIFEST,
  FIGMA_PLUGIN_UI_HTML,
} from '../data/figmaPluginSource';
import { buildFigmaExportContract } from '../services/exportSerializer';
import {
  validateExportContractJson,
  validateProjectSpecifications,
} from '../services/schemaValidator';
import { HandoffStageStatus, StudioProject, ValidationReport } from '../types/studio';

interface ExportHandoffSectionProps {
  project: StudioProject;
  onRecordExport: () => void;
  onUpdateHandoffStage: (patch: Partial<HandoffStageStatus>) => void;
}

export const ExportHandoffSection: React.FC<ExportHandoffSectionProps> = ({
  project,
  onRecordExport,
  onUpdateHandoffStage,
}) => {
  const contract = buildFigmaExportContract(project);
  const contractJsonString = JSON.stringify(contract, null, 2);
  const projectValidation = validateProjectSpecifications(project);

  const [validatorInput, setValidatorInput] = useState<string>(contractJsonString);
  const [customValidationReport, setCustomValidationReport] = useState<ValidationReport>(() =>
    validateExportContractJson(contractJsonString)
  );
  const [activePluginTab, setActivePluginTab] = useState<'manifest' | 'code' | 'ui'>('manifest');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const handleDownloadValidatedJson = () => {
    const check = validateExportContractJson(contractJsonString);
    setCustomValidationReport(check);
    if (!check.valid) return;

    const blob = new Blob([contractJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_figma_contract_v1.0.0.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onRecordExport();
    setCopiedNotice(
      `Exported validated 1.0.0 JSON file (${project.id}_figma_contract_v1.0.0.json). Note: This downloads the JSON contract; import it into Figma using the companion plugin below.`
    );
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(contractJsonString);
      setCopiedNotice('Copied validated 1.0.0 Figma Export JSON contract to clipboard.');
    } catch {
      setCopiedNotice('Clipboard write unavailable in this context; use Download JSON Contract.');
    }
  };

  const handleRunCustomValidator = () => {
    const report = validateExportContractJson(validatorInput);
    setCustomValidationReport(report);
  };

  const handleLoadInvalidSampleForTesting = () => {
    const brokenSample = JSON.stringify(
      {
        schemaVersion: '0.9-invalid',
        projectId: '',
        coordinateSystem: { origin: 'CENTER', units: 'PERCENT' },
        slides: [
          {
            slideId: 'slide_01',
            slideNumber: 1,
            frameNode: {
              id: 'slide_01_frame',
              type: 'FRAME',
              width: 1080,
              height: 1440,
            },
            layers: [
              {
                id: 'dup_layer_id',
                name: 'Out of Bounds Layer',
                type: 'TEXT',
                x: 900,
                y: 1200,
                width: 500,
                height: 400,
              },
              {
                id: 'dup_layer_id',
                name: 'Unsupported Node Type',
                type: 'CANVAS_BLOB_3D',
                x: 84,
                y: 84,
                width: 200,
                height: 100,
              },
            ],
          },
        ],
      },
      null,
      2
    );
    setValidatorInput(brokenSample);
    setCustomValidationReport(validateExportContractJson(brokenSample));
  };

  const handleRestoreValidContractInValidator = () => {
    setValidatorInput(contractJsonString);
    setCustomValidationReport(validateExportContractJson(contractJsonString));
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            06 · Versioned 1.0.0 JSON Contract & Custom Figma Plugin Handoff
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            Validated Export & Native Figma Handoff
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            Google AI Studio generates and validates the machine-readable 1.0.0 design specification. Figma remains the editable canvas and source of truth via the companion plugin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Copy Contract JSON
          </button>
          <button
            type="button"
            disabled={!projectValidation.valid}
            onClick={handleDownloadValidatedJson}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Download Validated JSON Contract (v1.0.0)
          </button>
        </div>
      </div>

      {copiedNotice && (
        <div
          role="status"
          className="p-4 bg-white border border-[#15803D] text-xs text-[#15803D] font-medium flex items-center justify-between"
        >
          <span>{copiedNotice}</span>
          <button
            type="button"
            onClick={() => setCopiedNotice(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Honest 6-Stage Handoff Pipeline Status */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-5">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Explicit 6-Stage Verification & Figma Handoff Ledger
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Stages 1–3 are verified automatically in this workspace. Stages 4–6 require importing the JSON inside Figma via the companion plugin and human art director review.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-[#5C5852]">
            NO DIRECT CANVAS WRITE CLAIMED WITHOUT PLUGIN RUN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            {
              stage: '01',
              label: 'JSON Generated',
              done: project.handoffState.jsonGenerated,
              auto: true,
              note: `${contract.slides.length} slides serialized`,
            },
            {
              stage: '02',
              label: 'JSON Validated',
              done: projectValidation.valid,
              auto: true,
              note: projectValidation.valid
                ? `${projectValidation.totalLayersChecked} layers passed`
                : `${projectValidation.errors.length} errors found`,
            },
            {
              stage: '03',
              label: 'Plugin Implemented',
              done: project.handoffState.figmaPluginImplemented,
              auto: true,
              note: 'manifest.json + code.ts + ui.html ready',
            },
            {
              stage: '04',
              label: 'Figma Import Completed',
              done: project.handoffState.figmaImportCompleted,
              key: 'figmaImportCompleted' as const,
              auto: false,
              note: 'Confirm after running plugin in Figma',
            },
            {
              stage: '05',
              label: 'Design Reviewed',
              done: project.handoffState.designReviewed,
              key: 'designReviewed' as const,
              auto: false,
              note: 'Human typography & spacing check',
            },
            {
              stage: '06',
              label: 'Design Approved',
              done: project.handoffState.designApproved,
              key: 'designApproved' as const,
              auto: false,
              note: 'Final creative director sign-off',
            },
          ].map((item) => (
            <div
              key={item.stage}
              className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-[#5C5852]">
                  <span>STAGE {item.stage}</span>
                  <span
                    className={
                      item.done
                        ? 'text-[#15803D] font-semibold'
                        : 'text-[#5C5852]'
                    }
                  >
                    {item.done ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#121212] mt-1">
                  {item.label}
                </h3>
                <p className="text-[11px] text-[#5C5852] mt-1">{item.note}</p>
              </div>

              {!item.auto && item.key && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateHandoffStage({ [item.key!]: !item.done })
                  }
                  className="w-full py-1.5 text-[11px] font-semibold uppercase border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors cursor-pointer"
                >
                  {item.done ? 'Reset Stage' : 'Mark Verified'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Schema & Bounds Validator (Supports Testing Both Valid & Invalid JSON) */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              JSON Schema & Coordinate Bounds Validator
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Inspect the live 1.0.0 export payload or load an invalid test payload to verify human-readable schema error reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRestoreValidContractInValidator}
              className="px-3.5 py-2 text-xs font-semibold uppercase border border-[#121212] bg-[#F7F4EE] text-[#121212] hover:bg-[#EBE6DC] cursor-pointer"
            >
              Load Current Valid Export
            </button>
            <button
              type="button"
              onClick={handleLoadInvalidSampleForTesting}
              className="px-3.5 py-2 text-xs font-semibold uppercase border border-[#B45309] bg-white text-[#B45309] hover:bg-[#F7F4EE] cursor-pointer"
            >
              Test Invalid JSON Sample
            </button>
            <button
              type="button"
              onClick={handleRunCustomValidator}
              className="px-4 py-2 text-xs font-semibold uppercase bg-[#0F1A2C] text-[#F7F4EE] hover:bg-[#1C2D4A] cursor-pointer"
            >
              Validate JSON Payload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-2">
            <label
              htmlFor="json-contract-inspector"
              className="block text-xs font-semibold uppercase tracking-wider text-[#121212]"
            >
              JSON Contract Payload (v1.0.0)
            </label>
            <textarea
              id="json-contract-inspector"
              rows={14}
              value={validatorInput}
              onChange={(e) => setValidatorInput(e.target.value)}
              className="w-full p-4 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5] text-[#121212] focus:outline-none focus:border-[#0F1A2C]"
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div
              className={`p-5 border ${
                customValidationReport.valid
                  ? 'border-[#15803D] bg-[#F7F4EE]'
                  : 'border-[#B91C1C] bg-white'
              } space-y-3`}
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className="font-semibold uppercase">
                  VALIDATION RESULT:{' '}
                  {customValidationReport.valid ? 'PASSED (VALID 1.0.0)' : 'FAILED'}
                </span>
                <span>Schema: {customValidationReport.schemaVersion}</span>
              </div>
              <p className="text-xs text-[#5C5852] font-mono-tabular">
                Slides Checked: {customValidationReport.totalSlidesChecked} · Layers Checked:{' '}
                {customValidationReport.totalLayersChecked} · Errors:{' '}
                {customValidationReport.errors.length}
              </p>

              {customValidationReport.errors.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-[#D8D2C5]">
                  <p className="text-xs font-semibold uppercase text-[#B91C1C]">
                    Human-Readable Validation Errors:
                  </p>
                  <ul className="space-y-2 text-xs">
                    {customValidationReport.errors.map((err) => (
                      <li
                        key={err.id}
                        className="p-2.5 bg-[#F7F4EE] border border-[#D8D2C5] space-y-1"
                      >
                        <div className="font-mono-tabular font-semibold text-[#B91C1C]">
                          [{err.code}] {err.slideId ? `(${err.slideId})` : ''}
                        </div>
                        <p className="text-[#121212]">{err.message}</p>
                        <p className="text-[#5C5852]">Fix: {err.remediation}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-[#15803D] pt-2 border-t border-[#D8D2C5] space-y-1">
                  <p className="font-semibold">
                    All frame dimensions, top-left coordinates, native node types, and stable layer IDs passed verification.
                  </p>
                  <p className="text-[#5C5852]">
                    Re-import mode: {contract.reimportStrategy.mode} via key "{contract.reimportStrategy.pluginDataKey}".
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Separate Custom Figma Plugin Deliverable */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Companion Figma Plugin Deliverable (/figma-plugin/)
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Complete source files included in the repository for importing the 1.0.0 JSON contract into native editable Figma frames without duplicating layers on re-import.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                ['manifest', 'manifest.json'],
                ['code', 'code.ts'],
                ['ui', 'ui.html'],
              ] as const
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActivePluginTab(tabKey)}
                className={`px-3.5 py-1.5 text-xs font-mono-tabular border transition-colors cursor-pointer ${
                  activePluginTab === tabKey
                    ? 'border-[#0F1A2C] bg-[#0F1A2C] text-[#F7F4EE]'
                    : 'border-[#D8D2C5] bg-[#F7F4EE] text-[#121212]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3 text-xs text-[#5C5852]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#121212]">
              Plugin Handoff Protocol
            </h3>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>
                Compile <code className="font-mono-tabular text-[#121212]">figma-plugin/code.ts</code> to{' '}
                <code className="font-mono-tabular text-[#121212]">figma-plugin/code.js</code> via{' '}
                <code className="font-mono-tabular text-[#121212]">npm run build:plugin</code>.
              </li>
              <li>
                In Figma Desktop, open <strong>Plugins → Development → Import plugin from manifest…</strong> and select{' '}
                <code className="font-mono-tabular text-[#121212]">figma-plugin/manifest.json</code>.
              </li>
              <li>
                Paste the validated 1.0.0 JSON export into the plugin window and click{' '}
                <strong>1. Validate & Preview</strong>.
              </li>
              <li>
                Click <strong>2. Confirm & Write to Draft Page</strong>. The plugin creates a dedicated draft page and binds every frame and layer with{' '}
                <code className="font-mono-tabular text-[#121212]">setPluginData('legacya_stable_id', id)</code> so future re-imports update existing frames in place.
              </li>
            </ol>
          </div>

          <div className="lg:col-span-8">
            <pre className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] text-xs font-mono-tabular text-[#121212] overflow-x-auto max-h-80">
              {activePluginTab === 'manifest'
                ? FIGMA_PLUGIN_MANIFEST
                : activePluginTab === 'code'
                ? FIGMA_PLUGIN_CODE_TS
                : FIGMA_PLUGIN_UI_HTML}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
