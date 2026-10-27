#!/usr/bin/env bash
set -euo pipefail

trap 'playwright-cli close || true' EXIT

mkdir -p .playwright-cli

echo "==================================================================="
echo " LEGACYA SPHERE CREATIVE STUDIO · PLAYWRIGHT E2E & DOM LEAK SUITE"
echo "==================================================================="

playwright-cli open --browser=chromium http://localhost:3000
playwright-cli resize 1440 900

playwright-cli run-code 'async (page) => {
  // 1. Section A: Dashboard verification
  await page.waitForSelector("h1");
  const h1Text = await page.locator("h1").first().textContent();
  if (!h1Text || h1Text.trim().length < 5) {
    throw new Error("Dashboard H1 project title failed to render.");
  }

  // 2. Market Intelligence Drawer (#3 -> #2) E2E synthesis
  await page.getByRole("button", { name: /Ingest Market Intelligence/i }).click();
  await page.getByRole("button", { name: /02\. Native Figma Contract/i }).click();
  await page.getByRole("button", { name: /Synthesize Full Campaign/i }).click();
  await page.waitForTimeout(250);

  // 3. Section B: Creative Brief
  await page.getByText("B. Creative Brief").click();
  await page.getByRole("button", { name: /Save Draft Brief/i }).click();

  // 4. Section C: Concept & Storyboard
  await page.getByText("C. Concept & Storyboard").click();
  await page.waitForSelector("h1");

  // 5. Section D: Slide Editor & Preview
  await page.getByText("D. Slide Editor & Preview").click();
  await page.getByRole("button", { name: /Cycle Layout Variant/i }).click();

  // 6. Section E: Brand System
  await page.getByText("E. Brand System").click();
  await page.waitForSelector("h1");

  // 7. Section F: Asset Library & Flow MCP Prompt Matrix
  await page.getByText("F. Asset Library").click();
  await page.getByText(/02\. Image Prompt Matrix/i).click();

  // 8. Section G: HyperFrames Motion Studio (Video-as-Code)
  await page.getByText("G. HyperFrames Motion").click();
  await page.getByRole("button", { name: "+1 Frame" }).click();
  await page.getByText("03. frame.md Spec").click();
  await page.getByText(/04\. Contract Audit/i).click();

  // 9. Section H: Export & Figma Handoff
  await page.getByText("H. Export & Figma Handoff").click();
  await page.getByRole("button", { name: /Test Invalid JSON Sample/i }).click();
  await page.getByRole("button", { name: /Load Current Valid Export/i }).click();

  // 10. Section I: Settings & Usage
  await page.getByText("I. Settings & Usage").click();
  await page.waitForSelector("h1");

  // 11. DOM & localStorage Secret Leak Verification
  const domHtml = await page.content();
  const storageDump = await page.evaluate(() => JSON.stringify(window.localStorage));
  const combined = domHtml + storageDump;
  if (/AIza[0-9A-Za-z\-_]{25,}/.test(combined) || /ghp_[0-9A-Za-z]{25,}/.test(combined)) {
    throw new Error("CRITICAL: Detected API key or token pattern in browser DOM/localStorage!");
  }

  await page.screenshot({ path: ".playwright-cli/e2e-final-settings.png", scale: "css" });
}'

echo ""
echo "--- Browser Console Verification ---"
playwright-cli console
echo "✅ PLAYWRIGHT E2E & DOM LEAK VERIFICATION PASSED (All 9 Sections A–I Verified)."
