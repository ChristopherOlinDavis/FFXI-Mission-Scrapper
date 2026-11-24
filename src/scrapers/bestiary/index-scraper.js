/**
 * Bestiary Index Scraper
 * Scrapes monster category pages to discover monster families
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, 'bestiary-config.json');

/**
 * Load bestiary configuration
 */
async function loadConfig() {
  const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(configData);
}

/**
 * Extract family name from category URL
 * Example: "Category:Behemoth" => "Behemoth"
 */
function extractFamilyName(url) {
  const match = url.match(/Category:([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/_/g, ' '));
}

/**
 * Generate ID from family name
 * Example: "Bull Dhalmel" => "bull-dhalmel"
 */
function generateId(name) {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Scrape a category page for monster families
 * @param {string} html - HTML content of category page
 * @param {string} systemId - Monster system ID
 * @returns {Object} List of monster families
 */
export function scrapeCategoryPage(html, systemId) {
  const $ = cheerio.load(html);
  const families = [];
  const familyUrls = new Set();

  // Look for subcategory links (family pages)
  $('#mw-subcategories a').each((i, elem) => {
    const href = $(elem).attr('href');
    if (!href || !href.includes('Category:')) return;

    const fullUrl = href.startsWith('http')
      ? href
      : `https://www.bg-wiki.com${href}`;

    const familyName = extractFamilyName(fullUrl);
    if (!familyName) return;

    // Deduplicate
    if (familyUrls.has(fullUrl)) return;
    familyUrls.add(fullUrl);

    families.push({
      name: familyName,
      id: generateId(familyName),
      url: fullUrl,
      system: systemId
    });
  });

  // Also check the category members (direct page links)
  $('#mw-pages .mw-category-group a').each((i, elem) => {
    const href = $(elem).attr('href');
    if (!href || href.includes('Category:')) return;

    const fullUrl = href.startsWith('http')
      ? href
      : `https://www.bg-wiki.com${href}`;

    const familyName = $(elem).text().trim();
    if (!familyName) return;

    // Deduplicate
    if (familyUrls.has(fullUrl)) return;
    familyUrls.add(fullUrl);

    families.push({
      name: familyName,
      id: generateId(familyName),
      url: fullUrl,
      system: systemId,
      isDirect: true
    });
  });

  return {
    families,
    totalFound: families.length
  };
}

/**
 * Scrape all category pages for all monster systems
 * @param {Object} options - Scraping options
 * @param {Function} options.fetchHtml - Function to fetch HTML (url) => html
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} All discovered families
 */
export async function scrapeAllCategories(options = {}) {
  const { fetchHtml, onProgress, verbose = false } = options;

  if (!fetchHtml) {
    throw new Error('fetchHtml function is required');
  }

  const config = await loadConfig();
  const systems = config.systems;
  const allFamilies = [];
  const familyMap = new Map();

  if (verbose) {
    console.log(`\n📚 Scraping ${systems.length} monster systems...\n`);
  }

  for (let i = 0; i < systems.length; i++) {
    const system = systems[i];

    if (verbose) {
      console.log(`[${i + 1}/${systems.length}] ${system.name}...`);
    }

    try {
      const html = await fetchHtml(system.categoryUrl);
      const result = scrapeCategoryPage(html, system.id);

      if (verbose) {
        console.log(`   Found ${result.totalFound} families`);
      }

      // Deduplicate across systems
      result.families.forEach(family => {
        if (!familyMap.has(family.id)) {
          familyMap.set(family.id, family);
          allFamilies.push(family);
        }
      });

      if (onProgress) {
        onProgress(i + 1, systems.length, system);
      }
    } catch (error) {
      if (verbose) {
        console.error(`   Error scraping ${system.name}: ${error.message}`);
      }
    }
  }

  if (verbose) {
    console.log(`\n✅ Total unique families discovered: ${allFamilies.length}\n`);
  }

  return {
    systems: systems.map(s => ({
      id: s.id,
      name: s.name,
      characteristics: s.characteristics
    })),
    families: allFamilies,
    totalFamilies: allFamilies.length,
    totalSystems: systems.length
  };
}

/**
 * Scrape using the seed data from BeastiaryLinks
 * @param {string} seedFilePath - Path to enhanced BGWiki JSON
 * @returns {Promise<Object>} Families from seed data
 */
export async function loadFromSeed(seedFilePath) {
  const seedData = await fs.readFile(seedFilePath, 'utf-8');
  const data = JSON.parse(seedData);

  const families = data.monster_families.map(family => ({
    id: generateId(family.name),
    name: family.name,
    url: family.url,
    charmable: family.charmable,
    pankration: family.pankration,
    system: data.monster_system.toLowerCase()
  }));

  return {
    system: {
      id: data.monster_system.toLowerCase(),
      name: data.monster_system,
      characteristics: data.system_characteristics || []
    },
    families,
    variants: data.mobs_and_notorious_monsters.map(mob => ({
      id: generateId(mob.name),
      name: mob.name,
      familyId: 'unknown', // Will be determined by scraping
      source: 'bgwiki',
      sourceUrl: mob.url
    }))
  };
}

export { loadConfig, generateId, extractFamilyName };
