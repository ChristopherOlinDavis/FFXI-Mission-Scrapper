/**
 * Enhanced URL Loader
 *
 * Provides easy access to unified and enhanced URL configurations.
 * Can load from both legacy url-list.json and new enhanced configs.
 */

import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const UNIFIED_URLS = path.join(ROOT_DIR, 'output/unified-urls.json');
const ENHANCED_CONFIG = path.join(ROOT_DIR, 'output/enhanced-url-config.json');
const LEGACY_URL_LIST = path.join(ROOT_DIR, 'url-list.json');

let cachedUnifiedUrls = null;
let cachedEnhancedConfig = null;

/**
 * Load unified URLs (with caching)
 */
export async function loadUnifiedUrls() {
  if (cachedUnifiedUrls) {
    return cachedUnifiedUrls;
  }

  try {
    const content = await fs.readFile(UNIFIED_URLS, 'utf-8');
    cachedUnifiedUrls = JSON.parse(content);
    return cachedUnifiedUrls;
  } catch (error) {
    console.warn('⚠️  Could not load unified URLs. Run `npm run urls:merge` first.');
    throw error;
  }
}

/**
 * Load enhanced configuration (with caching)
 */
export async function loadEnhancedConfig() {
  if (cachedEnhancedConfig) {
    return cachedEnhancedConfig;
  }

  try {
    const content = await fs.readFile(ENHANCED_CONFIG, 'utf-8');
    cachedEnhancedConfig = JSON.parse(content);
    return cachedEnhancedConfig;
  } catch (error) {
    console.warn('⚠️  Could not load enhanced config. Run `npm run urls:config` first.');
    throw error;
  }
}

/**
 * Get URLs by category
 */
export async function getUrlsByCategory(category) {
  const config = await loadEnhancedConfig();

  if (config.byCategory && config.byCategory[category]) {
    return config.byCategory[category];
  }

  return [];
}

/**
 * Get URLs by domain
 */
export async function getUrlsByDomain(domain) {
  const config = await loadEnhancedConfig();

  const domainKey = domain === 'ffxiclopedia.fandom.com' ? 'ffxiclopedia' :
                    domain === 'www.bg-wiki.com' ? 'bgwiki' : null;

  if (domainKey && config.byDomain && config.byDomain[domainKey]) {
    return config.byDomain[domainKey];
  }

  return [];
}

/**
 * Get mission set URLs (backwards compatible)
 */
export async function getMissionSetUrls(missionSetId) {
  try {
    const config = await loadEnhancedConfig();

    if (config.missionSets && config.missionSets[missionSetId]) {
      return {
        name: config.missionSets[missionSetId].name,
        source: config.missionSets[missionSetId].source,
        categoryPages: config.missionSets[missionSetId].categoryPages || [],
        missionPages: config.missionSets[missionSetId].missionPages || []
      };
    }
  } catch (error) {
    // Fall back to legacy
  }

  // Fall back to legacy url-list.json
  try {
    const content = await fs.readFile(LEGACY_URL_LIST, 'utf-8');
    const legacyData = JSON.parse(content);

    if (legacyData[missionSetId]) {
      return legacyData[missionSetId];
    }
  } catch (error) {
    console.error(`Could not load mission set: ${missionSetId}`);
  }

  return null;
}

/**
 * Get all mission sets
 */
export async function getAllMissionSets() {
  try {
    const config = await loadEnhancedConfig();

    if (config.missionSets) {
      return config.missionSets;
    }
  } catch (error) {
    // Fall back to legacy
  }

  // Fall back to legacy
  try {
    const content = await fs.readFile(LEGACY_URL_LIST, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Could not load mission sets');
    return {};
  }
}

/**
 * Get specialized URLs (missions, quests, bestiary, etc.)
 */
export async function getSpecializedUrls(type, domain = 'all') {
  const config = await loadEnhancedConfig();

  if (config.specialized && config.specialized[type]) {
    return config.specialized[type][domain] || [];
  }

  return [];
}

/**
 * Search URLs by filter criteria
 */
export async function searchUrls(criteria) {
  const data = await loadUnifiedUrls();
  const urls = data.urls;

  return urls.filter(url => {
    // Category filter
    if (criteria.category) {
      if (Array.isArray(criteria.category)) {
        if (!criteria.category.some(cat => url.categories.includes(cat))) {
          return false;
        }
      } else {
        if (!url.categories.includes(criteria.category)) {
          return false;
        }
      }
    }

    // Domain filter
    if (criteria.domain) {
      const urlDomain = new URL(url.url).hostname;
      if (Array.isArray(criteria.domain)) {
        if (!criteria.domain.includes(urlDomain)) return false;
      } else {
        if (urlDomain !== criteria.domain) return false;
      }
    }

    // Type filter
    if (criteria.type && url.type !== criteria.type) {
      return false;
    }

    // Source filter
    if (criteria.source) {
      if (Array.isArray(criteria.source)) {
        if (!criteria.source.some(src => url.sources.includes(src))) {
          return false;
        }
      } else {
        if (!url.sources.includes(criteria.source)) {
          return false;
        }
      }
    }

    // Title search
    if (criteria.titleContains) {
      if (!url.title.toLowerCase().includes(criteria.titleContains.toLowerCase())) {
        return false;
      }
    }

    // URL pattern
    if (criteria.urlPattern) {
      const regex = new RegExp(criteria.urlPattern, 'i');
      if (!regex.test(url.url)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get URL details by exact URL
 */
export async function getUrlDetails(targetUrl) {
  const data = await loadUnifiedUrls();
  const urls = data.urls;

  // Normalize URLs for comparison
  const normalizeUrl = (url) => url.trim().replace(/#.*$/, '').replace(/\/$/, '');
  const normalizedTarget = normalizeUrl(targetUrl);

  return urls.find(url => normalizeUrl(url.url) === normalizedTarget);
}

/**
 * Get statistics about URL data
 */
export async function getUrlStats() {
  const data = await loadUnifiedUrls();
  const config = await loadEnhancedConfig();

  return {
    totalUrls: data.urls.length,
    missionSets: Object.keys(config.missionSets || {}).length,
    categories: Object.keys(config.byCategory || {}).length,
    specialized: {
      missions: config.specialized?.missions?.all?.length || 0,
      quests: config.specialized?.quests?.all?.length || 0,
      bestiary: config.specialized?.bestiary?.all?.length || 0,
      roe: config.specialized?.roe?.all?.length || 0,
      zones: config.specialized?.zones?.all?.length || 0
    }
  };
}

/**
 * Clear cache (useful for testing or forcing reload)
 */
export function clearCache() {
  cachedUnifiedUrls = null;
  cachedEnhancedConfig = null;
}
