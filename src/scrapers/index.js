/**
 * Scraper Registry
 * Loads mission sets dynamically from configuration
 */

import { scrapeMissionSet, scrapeAllMissionSets, getAvailableMissionSets } from './mission-set-scraper.js';

/**
 * Get all available mission sets from configuration
 * @returns {Promise<Object>} Mission sets configuration
 */
export async function getScrapers() {
  const config = await getAvailableMissionSets();
  const scrapers = {};

  for (const [setId, setConfig] of Object.entries(config)) {
    scrapers[setId] = {
      name: setConfig.name,
      category: setConfig.category,
      scraper: async (options) => {
        const result = await scrapeMissionSet(setId, options);
        return result.missionSet;
      }
    };
  }

  return scrapers;
}

/**
 * Gets all available mission set IDs
 * @returns {Promise<Array>} Array of mission set IDs
 */
export async function getAvailableSets() {
  const config = await getAvailableMissionSets();
  return Object.keys(config);
}

/**
 * Checks if a mission set ID is valid
 * @param {string} setId - Mission set ID
 * @returns {Promise<boolean>} True if valid
 */
export async function isValidSet(setId) {
  const sets = await getAvailableSets();
  return sets.includes(setId);
}

/**
 * Gets scraper for a specific mission set
 * @param {string} setId - Mission set ID
 * @returns {Promise<Object>} Scraper object
 */
export async function getScraper(setId) {
  const scrapers = await getScrapers();

  if (!scrapers[setId]) {
    const available = Object.keys(scrapers).join(', ');
    throw new Error(`Invalid mission set: ${setId}. Available: ${available}`);
  }

  return scrapers[setId];
}

// Export main scraping functions
export { scrapeMissionSet, scrapeAllMissionSets, getAvailableMissionSets };
