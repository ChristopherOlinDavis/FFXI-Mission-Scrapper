import { scrapeBastokRankMissions } from './bastok-rank.js';
import { scrapeSandoriaRankMissions } from './sandoria-rank.js';
import { scrapeBastokRankMissionsDemo } from './bastok-rank-demo.js';
import { scrapeBastokRankMissionsBGWiki } from './bgwiki-bastok.js';

/**
 * Registry of all available scrapers
 */
export const SCRAPERS = {
  'bastok-rank': {
    name: 'Bastok Rank Missions',
    scraper: scrapeBastokRankMissions,
    category: 'nation'
  },
  'bastok-rank-demo': {
    name: 'Bastok Rank Missions (Demo Data)',
    scraper: scrapeBastokRankMissionsDemo,
    category: 'nation'
  },
  'bastok-rank-bgwiki': {
    name: 'Bastok Rank Missions (BG Wiki)',
    scraper: scrapeBastokRankMissionsBGWiki,
    category: 'nation'
  },
  'sandoria-rank': {
    name: 'San d\'Oria Rank Missions',
    scraper: scrapeSandoriaRankMissions,
    category: 'nation'
  }
  // Add more scrapers here as they're implemented:
  // 'windurst-rank': { ... },
  // 'zilart': { ... },
  // 'promathia': { ... },
};

/**
 * Gets all available mission set IDs
 */
export function getAvailableSets() {
  return Object.keys(SCRAPERS);
}

/**
 * Checks if a mission set ID is valid
 */
export function isValidSet(setId) {
  return setId in SCRAPERS;
}

/**
 * Gets scraper for a specific mission set
 */
export function getScraper(setId) {
  if (!isValidSet(setId)) {
    throw new Error(`Invalid mission set: ${setId}. Available: ${getAvailableSets().join(', ')}`);
  }
  return SCRAPERS[setId];
}
