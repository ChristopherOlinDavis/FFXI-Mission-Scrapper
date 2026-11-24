/**
 * Monster Family Page Scraper
 * Scrapes individual family pages (e.g., Category:Dhalmel) for detailed family data
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateId } from './index-scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, 'bestiary-config.json');

/**
 * Load resistance rank map
 */
async function loadResistanceMap() {
  const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(configData);
  return config.rankResistanceMap;
}

/**
 * Parse resistance rank to multiplier
 */
function parseResistance(text, resistanceMap) {
  if (!text) return null;

  const normalized = text.toLowerCase().trim();

  if (normalized.includes('absorb')) return -1.0;
  if (normalized.includes('immune') || normalized.includes('null')) return 0.0;

  // Extract rank number
  const rankMatch = normalized.match(/(?:rank\s+)?(\d+)/);
  if (rankMatch) {
    const rank = rankMatch[1];
    return resistanceMap[rank] || 1.0;
  }

  // Extract percentage
  const percentMatch = normalized.match(/(\d+)%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    return percent / 100;
  }

  return 1.0;
}

/**
 * Extract resistances from bestiary table
 */
function extractResistances($, resistanceMap) {
  const elemental = {};
  const physical = {};

  const table = $('table.bestiary, table.horizontal-table').first();
  if (!table.length) return null;

  table.find('tr').each((i, row) => {
    const $row = $(row);
    const header = $row.find('th').first().text().trim().toLowerCase();
    const cells = $row.find('td');

    // Elemental resistances
    if (header.includes('fire')) {
      elemental.fire = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('ice')) {
      elemental.ice = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('wind')) {
      elemental.wind = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('earth')) {
      elemental.earth = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('lightning') || header.includes('thunder')) {
      elemental.lightning = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('water')) {
      elemental.water = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('light')) {
      elemental.light = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('dark')) {
      elemental.dark = parseResistance(cells.eq(0).text(), resistanceMap);
    }

    // Physical resistances
    if (header.includes('slashing') || header.includes('slash')) {
      physical.slashing = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('piercing') || header.includes('pierce')) {
      physical.piercing = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('blunt') || header.includes('impact')) {
      physical.blunt = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('h2h') || header.includes('hand-to-hand')) {
      physical.h2h = parseResistance(cells.eq(0).text(), resistanceMap);
    }
    if (header.includes('ranged')) {
      physical.ranged = parseResistance(cells.eq(0).text(), resistanceMap);
    }
  });

  const result = {};
  if (Object.keys(elemental).length > 0) result.elemental = elemental;
  if (Object.keys(physical).length > 0) result.physical = physical;

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract abilities from page
 */
function extractAbilities($) {
  const abilities = [];

  // Look for abilities section
  const abilitiesHeader = $('h2, h3').filter((i, el) =>
    $(el).text().toLowerCase().includes('abilities')
  ).first();

  if (!abilitiesHeader.length) return abilities;

  // Get the next table or list
  let current = abilitiesHeader.next();
  while (current.length && !current.is('h2, h3')) {
    if (current.is('table')) {
      current.find('tr').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length >= 1) {
          const name = cells.eq(0).text().trim();
          const description = cells.length > 1 ? cells.eq(1).text().trim() : '';

          if (name && !name.toLowerCase().includes('ability')) {
            abilities.push({
              name,
              description: description || undefined
            });
          }
        }
      });
    } else if (current.is('ul, ol')) {
      current.find('li').each((i, li) => {
        const text = $(li).text().trim();
        const parts = text.split(/[-:]/);
        if (parts.length >= 1) {
          abilities.push({
            name: parts[0].trim(),
            description: parts.length > 1 ? parts.slice(1).join(':').trim() : undefined
          });
        }
      });
    }

    current = current.next();
  }

  return abilities;
}

/**
 * Extract monster variants from category page
 */
function extractVariants($, familyId) {
  const variants = [];
  const variantUrls = new Set();

  // Look for category members (monsters)
  $('#mw-pages .mw-category-group li a').each((i, elem) => {
    const $link = $(elem);
    const name = $link.text().trim();
    const href = $link.attr('href');

    if (!href || !name) return;

    const fullUrl = href.startsWith('http')
      ? href
      : `https://www.bg-wiki.com${href}`;

    // Skip if duplicate
    if (variantUrls.has(fullUrl)) return;
    variantUrls.add(fullUrl);

    variants.push({
      id: generateId(name),
      name,
      familyId,
      source: 'bgwiki',
      sourceUrl: fullUrl
    });
  });

  return variants;
}

/**
 * Extract Japanese name from infobox
 */
function extractJapaneseName($) {
  const japaneseRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    return $row.find('th').text().toLowerCase().includes('japanese');
  }).first();

  if (!japaneseRow.length) return null;

  return japaneseRow.find('td').text().trim() || null;
}

/**
 * Scrape a monster family page
 * @param {string} html - HTML content
 * @param {Object} familyInfo - Basic family info (id, name, url)
 * @returns {Object} Complete family data
 */
export async function scrapeFamilyPage(html, familyInfo) {
  const $ = cheerio.load(html);
  const resistanceMap = await loadResistanceMap();

  // Extract data
  const japaneseName = extractJapaneseName($);
  const resistances = extractResistances($, resistanceMap);
  const abilities = extractAbilities($);
  const variants = extractVariants($, familyInfo.id);

  // Build family object
  const family = {
    id: familyInfo.id,
    name: familyInfo.name,
    japanese: japaneseName || undefined,
    type: familyInfo.type || 'Beast',
    charmable: familyInfo.charmable,
    pankration: familyInfo.pankration,
    resistances: resistances || undefined,
    abilities: abilities.length > 0 ? abilities : undefined,
    source: 'bgwiki',
    lastUpdated: new Date().toISOString()
  };

  return {
    family,
    variants
  };
}

/**
 * Scrape multiple family pages
 * @param {Array} families - Array of family info objects
 * @param {Object} options - Scraping options
 * @param {Function} options.fetchHtml - Function to fetch HTML
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} All family data
 */
export async function scrapeAllFamilies(families, options = {}) {
  const { fetchHtml, onProgress, verbose = false } = options;

  if (!fetchHtml) {
    throw new Error('fetchHtml function is required');
  }

  const allFamilies = [];
  const allVariants = [];

  if (verbose) {
    console.log(`\n📖 Scraping ${families.length} monster families...\n`);
  }

  for (let i = 0; i < families.length; i++) {
    const familyInfo = families[i];

    if (verbose) {
      const percentage = Math.round(((i + 1) / families.length) * 100);
      console.log(`[${i + 1}/${families.length}] (${percentage}%) Scraping family: ${familyInfo.name}`);
      console.log(`   URL: ${familyInfo.url}`);
    }

    try {
      const html = await fetchHtml(familyInfo.url);
      const result = await scrapeFamilyPage(html, familyInfo);

      allFamilies.push(result.family);
      allVariants.push(...result.variants);

      if (verbose) {
        console.log(`   ✓ Found ${result.variants.length} variants`);
        if (result.family.resistances) {
          const resCount = Object.keys(result.family.resistances).reduce((sum, type) =>
            sum + Object.keys(result.family.resistances[type]).length, 0);
          console.log(`   ✓ Parsed ${resCount} resistances`);
        }
        if (result.family.abilities && result.family.abilities.length > 0) {
          console.log(`   ✓ Found ${result.family.abilities.length} abilities`);
        }
        console.log('');
      }

      if (onProgress) {
        onProgress(i + 1, families.length, result);
      }
    } catch (error) {
      if (verbose) {
        console.error(`   ✗ Error: ${error.message}`);
        console.log('');
      }
    }
  }

  if (verbose) {
    console.log(`\n✅ Scraped ${allFamilies.length} families with ${allVariants.length} variants\n`);
  }

  return {
    families: allFamilies,
    variants: allVariants,
    totalFamilies: allFamilies.length,
    totalVariants: allVariants.length
  };
}

export { parseResistance, extractResistances, extractAbilities, extractVariants };
