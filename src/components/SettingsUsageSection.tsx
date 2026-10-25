import React from 'react';
import { GenerationHistoryEntry } from '../types/studio';

interface SettingsUsageSectionProps {
  executionMode: 'local_deterministic' | 'gemini_api';
  onChangeExecutionMode: (mode: 'local_deterministic' | 'gemini_api') => void;
  serverGeminiConfigured: boolean;
  history: GenerationHistoryEntry[];
}

export const SettingsUsageSection: React.FC<SettingsUsageSectionProps> = ({
  executionMode,
  onChangeExecutionMode,
  serverGeminiConfigured,
  history,
}) => {
  return (
    <div className="space-y-10">
      <div className="pb-6 border-b border-[#D8D2C5]">
        <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
          07 · Cost Control, Execution Governance & Generation Ledger
        </p>
        <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
          Settings, Cost Guardrails & Audit Log
        </h1>
        <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
          All creative operations are deliberate and user-triggered. Private API credentials remain strictly server-side and are never embedded in client code or JSON exports.
        </p>
      </div>

      {/* Execution Engine Selector & Cost Control Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-5">
          <div className="border-b border-[#D8D2C5] pb-3">
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Creative Generation Engine Mode
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Milestone 1 operates completely without an API key using the Deterministic Studio Engine. Server-side Gemini API calls are optional.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 bg-[#F7F4EE] border border-[#D8D2C5] cursor-pointer">
              <input
                type="radio"
                name="executionMode"
                checked={executionMode === 'local_deterministic'}
                onChange={() => onChangeExecutionMode('local_deterministic')}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-semibold text-[#121212] block">
                  Deterministic Local Studio Engine (Recommended Default · $0 Cost)
                </span>
                <span className="text-xs text-[#5C5852]">
                  Uses structured editorial templates, deterministic geometry, and local schema validation with zero external network calls.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-[#F7F4EE] border border-[#D8D2C5] cursor-pointer">
              <input
                type="radio"
                name="executionMode"
                checked={executionMode === 'gemini_api'}
                onChange={() => onChangeExecutionMode('gemini_api')}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-semibold text-[#121212] block">
                  Server-Side Gemini Strategist (/api/gemini/*)
                </span>
                <span className="text-xs text-[#5C5852] block">
                  Routes explicit user-triggered Concept, Storyboard, and Single-Slide Copy requests through the Express backend using <code className="font-mono-tabular">gemini-3.8-flash</code> with structured JSON validation.
                </span>
                <span className="text-[11px] font-mono-tabular text-[#0F1A2C] mt-1 block">
                  Server Environment Status:{' '}
                  {serverGeminiConfigured
                    ? 'GEMINI_API_KEY detected on server (falls back safely if quota is reached)'
                    : 'No GEMINI_API_KEY configured — automatically falls back to Deterministic Studio Engine'}
                </span>
              </div>
            </label>
          </div>
        </section>

        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-5">
          <div className="border-b border-[#D8D2C5] pb-3">
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Active Cost-Control & Security Guardrails
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Enforced architectural invariants across the application.
            </p>
          </div>

          <ul className="space-y-2.5 text-xs text-[#121212]">
            <li className="p-3 bg-[#F7F4EE] border border-[#D8D2C5]">
              <strong>Zero Automatic Generation on Load or Keystroke:</strong> Editing brief fields, headlines, body copy, or tokens never triggers background AI requests.
            </li>
            <li className="p-3 bg-[#F7F4EE] border border-[#D8D2C5]">
              <strong>Scoped Single-Slide Operations:</strong> Regenerating copy or cycling layouts for one slide updates only that slide’s specification.
            </li>
            <li className="p-3 bg-[#F7F4EE] border border-[#D8D2C5]">
              <strong>Server-Side Secret Isolation:</strong> <code className="font-mono-tabular">GEMINI_API_KEY</code> is accessed exclusively inside <code className="font-mono-tabular">server.ts</code> and is never serialized into browser bundles or exported JSON contracts.
            </li>
            <li className="p-3 bg-[#F7F4EE] border border-[#D8D2C5]">
              <strong>Billing Verification Notice:</strong> Antigravity Pro does not automatically cover Google AI Studio API calls. Keep Demo/Deterministic mode active unless you have verified billing in Google AI Studio Secrets.
            </li>
          </ul>
        </section>
      </div>

      {/* Per-Project Generation History Log */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-4">
        <div className="border-b border-[#D8D2C5] pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Per-Project Operation & Generation History
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Chronological audit trail of user-triggered operations in the current project.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-[#5C5852]">
            {history.length} LOGGED EVENTS
          </span>
        </div>

        <div className="divide-y divide-[#D8D2C5] border border-[#D8D2C5]">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 bg-[#F7F4EE] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-mono-tabular font-semibold uppercase text-[#0F1A2C]">
                  {entry.operation.replace(/_/g, ' ')}
                  {entry.targetSlideId ? ` · ${entry.targetSlideId}` : ''}
                </span>
                <p className="text-[#121212]">{entry.summary}</p>
              </div>
              <div className="text-[11px] font-mono-tabular text-[#5C5852] shrink-0">
                <span>{entry.mode === 'gemini_api' ? 'GEMINI API' : 'LOCAL ENGINE'}</span>
                <span aria-hidden="true"> · </span>
                <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
