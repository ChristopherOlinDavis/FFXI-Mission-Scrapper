/**
 * Parser Factory
 * Auto-detects wiki source and returns appropriate parser
 */

import { FFXIclopediaParser } from './ffxiclopedia-parser.js';
import { BGWikiParser } from './bgwiki-parser.js';

// Singleton instances
let ffxiclopediaParser = null;
let bgwikiParser = null;

/**
 * Get parser instance for a given URL
 * @param {string} url - Mission URL
 * @returns {BaseParser} Parser instance
 */
export function getParser(url) {
  const source = detectWikiSource(url);

  if (source === 'ffxiclopedia') {
    if (!ffxiclopediaParser) {
      ffxiclopediaParser = new FFXIclopediaParser();
    }
    return ffxiclopediaParser;
  } else if (source === 'bgwiki') {
    if (!bgwikiParser) {
      bgwikiParser = new BGWikiParser();
    }
    return bgwikiParser;
  }

  throw new Error(`Unknown wiki source for URL: ${url}`);
}

/**
 * Detect wiki source from URL
 * @param {string} url - Mission URL
 * @returns {string} Wiki source identifier
 */
function detectWikiSource(url) {
  if (url.includes('ffxiclopedia.fandom.com') || url.includes('ffxiclopedia.wikia.com')) {
    return 'ffxiclopedia';
  } else if (url.includes('bg-wiki.com')) {
    return 'bgwiki';
  }
  return 'unknown';
}

/**
 * Parse a single mission from URL
 * @param {string} url - Mission URL
 * @param {string} missionSetId - Mission set identifier
 * @returns {Promise<Object>} Parsed mission
 */
export async function parseMission(url, missionSetId) {
  const parser = getParser(url);
  return await parser.parseMission(url, missionSetId);
}

/**
 * Parse multiple missions from URL list
 * @param {Array} urls - Array of mission URLs
 * @param {string} missionSetId - Mission set identifier
 * @param {Object} options - Options
 * @param {Function} options.onProgress - Progress callback (current, total, mission)
 * @returns {Promise<Array>} Array of parsed missions
 */
export async function parseMissions(urls, missionSetId, options = {}) {
  const missions = [];
  const { onProgress } = options;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      const mission = await parseMission(url, missionSetId);
      missions.push(mission);

      if (onProgress) {
        onProgress(i + 1, urls.length, mission);
      }
    } catch (error) {
      console.error(`Failed to parse mission ${url}:`, error.message);
      if (onProgress) {
        onProgress(i + 1, urls.length, null);
      }
    }
  }

  return missions;
}

// Export parser classes for direct use
export { FFXIclopediaParser, BGWikiParser };

// Export sub-modules
export * from './dependency-builder.js';
export * from './walkthrough-parser.js';
export * from './prerequisite-extractor.js';
export * from './infobox-extractor.js';
