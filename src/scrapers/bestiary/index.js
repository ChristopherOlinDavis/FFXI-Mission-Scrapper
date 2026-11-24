/**
 * Bestiary Scrapers - Main Export
 */

export {
  scrapeAllCategories,
  scrapeCategoryPage,
  loadFromSeed,
  loadConfig,
  generateId,
  extractFamilyName
} from './index-scraper.js';

export {
  scrapeFamilyPage,
  scrapeAllFamilies,
  parseResistance,
  extractResistances,
  extractAbilities,
  extractVariants
} from './family-scraper.js';

export {
  scrapeVariantPage,
  scrapeAllVariants,
  extractLevel,
  extractZone,
  isNotoriousMonster,
  extractSpawnInfo,
  extractRespawnTime,
  extractDrops,
  extractDetailedResistances
} from './variant-scraper.js';

import bestiaryScraperExports from './bestiary-scraper.js';

export const { scrapeBestiaryFromSeed, saveBestiaryData, loadBestiaryData } = bestiaryScraperExports;
