import React from 'react';
import { computeContrastRatio } from '../services/layoutEngine';
import { DEFAULT_BRAND_TOKENS } from '../tokens/defaultTokens';
import { BrandSystemTokens, TypographyStyleToken } from '../types/studio';

interface BrandSystemSectionProps {
  tokens: BrandSystemTokens;
  onUpdateTokens: (next: BrandSystemTokens) => void;
  onResetTokens: () => void;
}

export const BrandSystemSection: React.FC<BrandSystemSectionProps> = ({
  tokens,
  onUpdateTokens,
  onResetTokens,
}) => {
  const updateColor = (key: keyof BrandSystemTokens['colors'], value: string) => {
    onUpdateTokens({
      ...tokens,
      colors: { ...tokens.colors, [key]: value },
    });
  };

  const updateLayout = <K extends keyof BrandSystemTokens['layout']>(
    key: K,
    value: BrandSystemTokens['layout'][K]
  ) => {
    onUpdateTokens({
      ...tokens,
      layout: { ...tokens.layout, [key]: value },
    });
  };

  const updateTypography = (
    role: keyof BrandSystemTokens['typography'],
    patch: Partial<TypographyStyleToken>
  ) => {
    onUpdateTokens({
      ...tokens,
      typography: {
        ...tokens.typography,
        [role]: { ...tokens.typography[role], ...patch },
      },
    });
  };

  const updateComponents = <K extends keyof BrandSystemTokens['components']>(
    key: K,
    value: BrandSystemTokens['components'][K]
  ) => {
    onUpdateTokens({
      ...tokens,
      components: { ...tokens.components, [key]: value },
    });
  };

  const creamInkContrast = computeContrastRatio(
    tokens.colors.backgroundPrimary,
    tokens.colors.textPrimary
  );
  const navyCreamContrast = computeContrastRatio(
    tokens.colors.surfaceDark,
    tokens.colors.textOnDark
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C5]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C5852] font-mono-tabular mb-2">
            04 · Editable Design-System Manager & Provisional Brand Tokens
          </p>
          <h1 className="text-3xl lg:text-4xl font-editorial font-semibold text-[#121212]">
            LEGACYA SPHERE Brand System
          </h1>
          <p className="text-sm text-[#5C5852] mt-2 max-w-2xl">
            {tokens.provisionalNote}
          </p>
        </div>

        <button
          type="button"
          onClick={onResetTokens}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#121212] bg-white text-[#121212] hover:bg-[#EBE6DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Reset to Provisional Defaults
        </button>
      </div>

      {/* Color Tokens & WCAG Contrast Matrix */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Color Tokens (60-30-10 Editorial Palette)
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Changes propagate immediately across all slide previews and the exported Figma token snapshot.
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-[#5C5852]">
            Cream/Ink Contrast: <strong className="text-[#121212]">{creamInkContrast}:1</strong> · Navy/Cream Contrast: <strong className="text-[#121212]">{navyCreamContrast}:1</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(
            [
              ['backgroundPrimary', 'Background Primary (Warm Cream)'],
              ['backgroundSecondary', 'Background Secondary (Clean White)'],
              ['surfaceDark', 'Surface Dark (Deep Navy)'],
              ['textPrimary', 'Text Primary (Ink Black)'],
              ['textSecondary', 'Text Secondary (Restrained Gray)'],
              ['textOnDark', 'Text on Dark Surface'],
              ['accent', 'Editorial Accent'],
              ['border', 'Structural Hairline Border'],
            ] as Array<[keyof BrandSystemTokens['colors'], string]>
          ).map(([key, label]) => (
            <div key={key} className="p-4 bg-[#F7F4EE] border border-[#D8D2C5] space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212]">
                {label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={label}
                  value={tokens.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value.toUpperCase())}
                  className="w-10 h-10 border border-[#D8D2C5] bg-white cursor-pointer"
                />
                <input
                  type="text"
                  value={tokens.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-[#D8D2C5] text-[#121212]"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Scale & Figma Font Fallback Disclosure */}
      <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#D8D2C5] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Typography Scale & Font Substitution Policy
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              If a primary font is not installed in the target Figma workstation, the plugin logs a substitution warning and falls back gracefully rather than failing silently.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-[#5C5852]">
            LOGICAL PIXELS ON {tokens.layout.canvasWidth}×{tokens.layout.canvasHeight}
          </span>
        </div>

        <div className="divide-y divide-[#D8D2C5] border border-[#D8D2C5]">
          {(Object.keys(tokens.typography) as Array<keyof BrandSystemTokens['typography']>).map(
            (role) => {
              const t = tokens.typography[role];
              return (
                <div
                  key={role}
                  className="p-4 bg-[#F7F4EE] grid grid-cols-1 md:grid-cols-6 gap-4 items-center"
                >
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#121212] block">
                      {role} Token
                    </span>
                    <span className="text-[11px] font-mono-tabular text-[#5C5852]">
                      Fallback: {t.localFallbackFamily}
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase text-[#5C5852] mb-1">
                      Font Family
                    </label>
                    <input
                      type="text"
                      value={t.fontFamily}
                      onChange={(e) =>
                        updateTypography(role, { fontFamily: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D2C5] text-[#121212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase text-[#5C5852] mb-1">
                      Size (px)
                    </label>
                    <input
                      type="number"
                      min={14}
                      max={160}
                      value={t.fontSize}
                      onChange={(e) =>
                        updateTypography(role, { fontSize: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-[#D8D2C5] text-[#121212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase text-[#5C5852] mb-1">
                      Weight
                    </label>
                    <select
                      value={t.fontWeight}
                      onChange={(e) =>
                        updateTypography(role, { fontWeight: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-[#D8D2C5] text-[#121212]"
                    >
                      <option value={400}>400 Regular</option>
                      <option value={500}>500 Medium</option>
                      <option value={600}>600 SemiBold</option>
                      <option value={700}>700 Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase text-[#5C5852] mb-1">
                      Line Height
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      min={0.9}
                      max={2.2}
                      value={t.lineHeight}
                      onChange={(e) =>
                        updateTypography(role, { lineHeight: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border border-[#D8D2C5] text-[#121212]"
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* Layout Geometry & Component Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-5">
          <div className="border-b border-[#D8D2C5] pb-3">
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Canvas & Grid Geometry
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Default Instagram 3:4 portrait specification (1080×1440 logical pixels).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Canvas Width (px)
              </label>
              <input
                type="number"
                min={600}
                max={2160}
                value={tokens.layout.canvasWidth}
                onChange={(e) => updateLayout('canvasWidth', Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Canvas Height (px)
              </label>
              <input
                type="number"
                min={600}
                max={2880}
                value={tokens.layout.canvasHeight}
                onChange={(e) => updateLayout('canvasHeight', Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Outer Safe Margin (px)
              </label>
              <input
                type="number"
                min={40}
                max={160}
                value={tokens.layout.outerMargin}
                onChange={(e) => updateLayout('outerMargin', Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Column Count
              </label>
              <input
                type="number"
                min={4}
                max={24}
                value={tokens.layout.columnCount}
                onChange={(e) => updateLayout('columnCount', Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#D8D2C5] p-6 lg:p-8 space-y-5">
          <div className="border-b border-[#D8D2C5] pb-3">
            <h2 className="text-xl font-editorial font-semibold text-[#121212]">
              Reusable Component Rules
            </h2>
            <p className="text-xs text-[#5C5852] mt-1">
              Header wordmark, footer colophon, slide numbering, and geometric accents.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Header Brand Wordmark
              </label>
              <input
                type="text"
                value={tokens.components.brandLogoText}
                onChange={(e) => updateComponents('brandLogoText', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#121212] mb-1.5">
                Footer Studio Colophon
              </label>
              <input
                type="text"
                value={tokens.components.footerSignature}
                onChange={(e) => updateComponents('footerSignature', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F4EE] border border-[#D8D2C5]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[#121212] cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokens.components.showGeometricAccents}
                  onChange={(e) =>
                    updateComponents('showGeometricAccents', e.target.checked)
                  }
                />
                <span>Include Editorial Geometric Circles & Diagonal Axes</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-[#121212] cursor-pointer">
                <input
                  type="checkbox"
                  checked={tokens.components.showHeaderRule}
                  onChange={(e) => updateComponents('showHeaderRule', e.target.checked)}
                />
                <span>Show Header & Footer Hairline Rules</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
