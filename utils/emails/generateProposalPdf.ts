import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import {
  buildProposalDocumentFromQuotationId,
  type ProposalPdfDocument
} from './buildProposalDocument';
import { renderProposalPdfHtml } from './renderProposalPdfHtml';
import logger from '../../config/logger';

let browserPromise: Promise<Browser> | null = null;
const idlePages: Page[] = [];
const MAX_IDLE_PAGES = 2;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-default-apps',
  '--disable-translate',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--mute-audio',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--font-render-hinting=none',
  '--disable-features=AudioServiceOutOfProcess,TranslateUI'
];

/** Full launch options (LaunchOptions alone omits headless/args in puppeteer 22 types). */
type ChromeLaunchOptions = NonNullable<Parameters<typeof puppeteer.launch>[0]>;
type ChromeCandidate = { label: string; options: ChromeLaunchOptions };

const systemChromePaths = (): string[] => {
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ];
  }
  if (process.platform === 'linux') {
    return [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
  }
  if (process.platform === 'win32') {
    return [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
  }
  return [];
};

/**
 * Prefer system / env Chrome. Skip Puppeteer's broken cached "Chrome for Testing"
 * when a real Chrome binary is available (common failure on macOS arm64).
 */
const resolveChromeCandidates = (): ChromeCandidate[] => {
  const candidates: ChromeCandidate[] = [];
  const fromEnv = String(process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    candidates.push({
      label: `env:${fromEnv}`,
      options: { headless: true, executablePath: fromEnv, args: LAUNCH_ARGS }
    });
  }

  for (const executablePath of systemChromePaths()) {
    if (!fs.existsSync(executablePath)) continue;
    candidates.push({
      label: `system:${executablePath}`,
      options: { headless: true, executablePath, args: LAUNCH_ARGS }
    });
  }

  // Puppeteer can discover installed Chrome by channel without the broken cache binary.
  candidates.push({
    label: 'channel:chrome',
    options: { headless: true, channel: 'chrome', args: LAUNCH_ARGS }
  });

  // Last resort — bundled Chrome for Testing (often broken on arm64 / Alpine).
  candidates.push({
    label: 'puppeteer-bundled',
    options: { headless: true, args: LAUNCH_ARGS }
  });

  return candidates;
};

const launchBrowser = async (): Promise<Browser> => {
  const candidates = resolveChromeCandidates();
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const browser = await puppeteer.launch(candidate.options);
      return browser;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[generateProposalPdf] Chrome launch failed (${candidate.label}): ${message.split('\n')[0]}`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to launch Chrome for PDF generation');
};

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err: unknown) => {
      browserPromise = null;
      throw err;
    });
  }

  const browser = await browserPromise;
  if (!browser.connected) {
    browserPromise = null;
    idlePages.length = 0;
    return getBrowser();
  }
  return browser;
};

const closePageQuietly = async (page: Page): Promise<void> => {
  await page.close().catch((err: unknown) => {
    logger.warn('Failed to close Puppeteer page', {
      error: err instanceof Error ? err.message : String(err)
    });
  });
};

const acquirePage = async (): Promise<Page> => {
  const browser = await getBrowser();
  while (idlePages.length > 0) {
    const page = idlePages.pop();
    if (page && !page.isClosed() && page.browser().connected) return page;
  }
  const page = await browser.newPage();
  // Proposal HTML is static (inline CSS + data-URI images). Skipping JS avoids compile time.
  await page.setJavaScriptEnabled(false);
  return page;
};

const releasePage = async (page: Page): Promise<void> => {
  if (page.isClosed() || !page.browser().connected) return;
  if (idlePages.length >= MAX_IDLE_PAGES) {
    await closePageQuietly(page);
    return;
  }
  idlePages.push(page);
};

/** Launch Chrome once so the first approval email does not pay browser startup. */
export const warmProposalPdfBrowser = (): Promise<void> =>
  getBrowser()
    .then(() => undefined)
    .catch((err: unknown) => {
      logger.warn('Proposal PDF browser warmup failed', {
        error: err instanceof Error ? err.message : String(err)
      });
    });

const htmlToPdfBuffer = async (html: string): Promise<Buffer> => {
  const page = await acquirePage();
  let reusePage = true;
  try {
    // domcontentloaded is enough for inlined HTML/CSS/data-URI logos.
    // networkidle0 was waiting on idle network and made every email very slow in Docker.
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true
    });
    return Buffer.from(pdf);
  } catch (err) {
    reusePage = false;
    await closePageQuietly(page);
    throw err;
  } finally {
    if (reusePage) await releasePage(page);
  }
};

/** Render PDF from an already-loaded proposal document (built from quotation id). */
export const generateQuotationProposalPdfFromDocument = async (
  doc: ProposalPdfDocument
): Promise<Buffer> => htmlToPdfBuffer(renderProposalPdfHtml(doc));

/** Load quotation by id and render the FE-matching Solar Installation Proposal PDF. */
export const generateQuotationProposalPdf = async (
  quotationId: string
): Promise<Buffer> => {
  const doc = await buildProposalDocumentFromQuotationId(quotationId);
  return generateQuotationProposalPdfFromDocument(doc);
};
