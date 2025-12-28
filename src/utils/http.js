import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fetches HTML content from a URL with caching support
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

  // Fetch from URL
  console.log(`Fetching: ${url}`);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'FFXI-Mission-Scraper/1.0 (Educational Project)'
      },
      timeout: 30000
    });

    const html = response.data;

    // Save to cache
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cachePath, html, 'utf-8');

    return html;
  } catch (error) {
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
 */
export async function fetchWithDelay(url, delayMs = 1000, useCache = true) {
  const html = await fetchHTML(url, useCache);
  await delay(delayMs);
  return html;
}
