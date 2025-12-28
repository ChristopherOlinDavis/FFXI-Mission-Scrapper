import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fetches HTML content from a URL using Playwright (headless browser)
 * This bypasses most bot protection by behaving like a real browser
 */
export async function fetchHTML(url, useCache = true) {
  const cacheDir = path.join(process.cwd(), 'cache');
  const cacheKey = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
  const cachePath = path.join(cacheDir, `${cacheKey}.html`);

  // Try to use cache if enabled
  if (useCache) {
    try {
      const cachedContent = await fs.readFile(cachePath, 'utf-8');
      console.log(`Using cached content for: ${url}`);
      return cachedContent;
    } catch (err) {
      // Cache miss, continue to fetch
    }
  }

  // Fetch from URL using Playwright
  console.log(`Fetching with Playwright: ${url}`);

  let browser;
  try {
    // Launch browser in headless mode
    browser = await chromium.launch({
      headless: true,
      // Additional args to help avoid detection
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    // Create a new browser context with realistic settings
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Create a new page
    const page = await context.newPage();

    // Navigate to the URL with reasonable timeout
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000, // 60 second timeout
    });

    // Wait for the main content to load
    // For FFXIclopedia, wait for the article content
    try {
      await page.waitForSelector('.mw-parser-output', { timeout: 10000 });
    } catch (e) {
      console.warn('Main content selector not found, continuing anyway...');
    }

    // Get the full HTML content
    const html = await page.content();

    // Close browser
    await browser.close();

    // Save to cache
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cachePath, html, 'utf-8');

    console.log(`✓ Successfully fetched and cached: ${url}`);
    return html;

  } catch (error) {
    // Make sure to close browser on error
    if (browser) {
      await browser.close();
    }
    console.error(`Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

/**
 * Delays execution for a specified number of milliseconds
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch to be respectful to the wiki servers
 * Includes automatic retry with exponential backoff
 */
export async function fetchWithDelay(url, delayMs = 2000, useCache = true, retries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const html = await fetchHTML(url, useCache);

      // Wait before next request (unless we're using cache)
      if (!useCache || attempt > 0) {
        await delay(delayMs);
      }

      return html;
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt < retries) {
        const backoffDelay = delayMs * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${retries} after ${backoffDelay}ms...`);
        await delay(backoffDelay);
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError;
}

/**
 * Batch fetch multiple URLs with controlled concurrency
 */
export async function fetchBatch(urls, options = {}) {
  const {
    concurrency = 2,
    delayMs = 2000,
    useCache = true,
    onProgress = null,
  } = options;

  const results = [];
  const errors = [];

  // Process URLs in batches based on concurrency
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const batchPromises = batch.map(async (url, index) => {
      try {
        const html = await fetchWithDelay(url, delayMs, useCache);

        if (onProgress) {
          onProgress({
            completed: i + index + 1,
            total: urls.length,
            url,
            success: true,
          });
        }

        return { url, html, error: null };
      } catch (error) {
        if (onProgress) {
          onProgress({
            completed: i + index + 1,
            total: urls.length,
            url,
            success: false,
            error: error.message,
          });
        }

        return { url, html: null, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r.html !== null));
    errors.push(...batchResults.filter(r => r.error !== null));
  }

  return { results, errors };
}
