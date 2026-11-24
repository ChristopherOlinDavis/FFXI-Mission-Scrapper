/**
 * Live HTML Fetcher
 * Fetches HTML directly from URLs (for bestiary scraping)
 */

import { chromium } from 'playwright';

let browser = null;
let context = null;

/**
 * Initialize browser
 */
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
  }
}

/**
 * Fetch HTML from URL
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} options.delay - Delay in ms between requests
 * @returns {Promise<string>} HTML content
 */
export async function fetchHtml(url, options = {}) {
  const { delay = 2000 } = options;

  await initBrowser();

  const page = await context.newPage();

  try {
    // Add delay to be respectful to the server
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();

    return html;
  } finally {
    await page.close();
  }
}

/**
 * Close browser
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
  }
}

/**
 * Create a rate-limited fetcher
 * @param {number} delayMs - Delay between requests in milliseconds
 * @returns {Function} Fetch function
 */
export function createRateLimitedFetcher(delayMs = 2000) {
  let lastFetchTime = 0;

  return async (url) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    if (timeSinceLastFetch < delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs - timeSinceLastFetch));
    }

    const html = await fetchHtml(url, { delay: 0 });
    lastFetchTime = Date.now();

    return html;
  };
}

export default {
  fetchHtml,
  closeBrowser,
  createRateLimitedFetcher
};
