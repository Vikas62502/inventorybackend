// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — Proposal PDF uses system Chrome (consent / approval email)
 * =============================================================================
 * Nov 24–25 2026 · HANDOFF §91 · REQUIRED §CJ  (FE notes §77 / their §CE)
 *
 * Problem: Puppeteer's cached "Chrome for Testing" often fails (esp. macOS arm64 /
 * Alpine). Consent / approval emails need a real Chrome/Chromium binary.
 *
 * Fix (utils/emails/generateProposalPdf.ts):
 *   1. PUPPETEER_EXECUTABLE_PATH if set and exists
 *   2. System Chrome paths (macOS / Linux / Windows)
 *   3. puppeteer channel: 'chrome'
 *   4. Bundled Chromium only if nothing else available
 *
 * Docker (Alpine runner):
 *   apk add chromium …
 *   ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
 *   ENV PUPPETEER_SKIP_DOWNLOAD=true
 *
 * Local .env example (macOS):
 *   PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 *
 * Checklist
 * [x] generateProposalPdf prefers env + system Chrome
 * [x] Dockerfile installs chromium + sets PUPPETEER_EXECUTABLE_PATH
 * [x] Approval / consent email attach PDF without launch crash
 */

export {}
