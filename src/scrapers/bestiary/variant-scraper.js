/**
 * Monster Variant Page Scraper
 * Scrapes individual monster pages for detailed stats and resistances
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseResistance } from './family-scraper.js';

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
 * Extract level from infobox
 */
function extractLevel($) {
  const levelRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    const header = $row.find('th').text().toLowerCase();
    return header.includes('level') && !header.includes('cap');
  }).first();

  if (!levelRow.length) return null;

  const levelText = levelRow.find('td').text().trim();

  // Check for range
  const rangeMatch = levelText.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return {
      level: null,
      levelRange: `${rangeMatch[1]}-${rangeMatch[2]}`
    };
  }

  // Single level
  const levelMatch = levelText.match(/(\d+)/);
  if (levelMatch) {
    return {
      level: parseInt(levelMatch[1]),
      levelRange: null
    };
  }

  return null;
}

/**
 * Extract zone information
 */
function extractZone($) {
  const zoneRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    const header = $row.find('th').text().toLowerCase();
    return header.includes('found in') || header.includes('zone');
  }).first();

  if (!zoneRow.length) return null;

  const zoneTd = zoneRow.find('td');
  const zones = [];

  zoneTd.find('a').each((i, link) => {
    const zoneName = $(link).text().trim();
    if (zoneName) zones.push(zoneName);
  });

  if (zones.length === 0) {
    const zoneText = zoneTd.text().trim();
    if (zoneText) zones.push(zoneText);
  }

  return {
    zone: zones[0] || null,
    zones: zones.length > 1 ? zones : undefined
  };
}

/**
 * Determine if monster is NM
 */
function isNotoriousMonster($, name) {
  // Check page categories
  const categories = [];
  $('.mw-normal-catlinks a').each((i, link) => {
    categories.push($(link).text().toLowerCase());
  });

  if (categories.some(c => c.includes('notorious monster') || c.includes('nm'))) {
    return true;
  }

  // Check infobox
  const nmRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    const text = $row.text().toLowerCase();
    return text.includes('notorious') || text.includes('type') && text.includes('nm');
  }).first();

  if (nmRow.length) return true;

  // Name-based heuristics
  const nameLower = name.toLowerCase();
  if (nameLower.includes('king ') || nameLower.includes('queen ')) return true;
  if (nameLower.includes('arch ') || nameLower.includes('elder ')) return true;
  if (name.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) return true; // Proper name pattern

  return false;
}

/**
 * Extract spawn/pop information
 */
function extractSpawnInfo($) {
  const spawnRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    const header = $row.find('th').text().toLowerCase();
    return header.includes('spawn') || header.includes('pop') || header.includes('lottery');
  }).first();

  if (!spawnRow.length) return null;

  const spawnText = spawnRow.find('td').text().trim();
  return {
    spawnConditions: spawnText || undefined
  };
}

/**
 * Extract respawn time
 */
function extractRespawnTime($) {
  const respawnRow = $('table.infobox tr, table.wikitable tr').filter((i, row) => {
    const $row = $(row);
    const header = $row.find('th').text().toLowerCase();
    return header.includes('respawn') || header.includes('repop');
  }).first();

  if (!respawnRow.length) return null;

  return respawnRow.find('td').text().trim() || null;
}

/**
 * Extract drops
 */
function extractDrops($) {
  const drops = [];

  // Look for drops section
  const dropsHeader = $('h2, h3').filter((i, el) =>
    $(el).text().toLowerCase().includes('drops')
  ).first();

  if (!dropsHeader.length) return drops;

  // Get the next table or list
  let current = dropsHeader.next();
  while (current.length && !current.is('h2, h3')) {
    if (current.is('table')) {
      current.find('tr').each((i, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length >= 1) {
          const itemLink = cells.eq(0).find('a').first();
          const item = itemLink.length ? itemLink.text().trim() : cells.eq(0).text().trim();

          if (item && !item.toLowerCase().includes('item')) {
            const drop = { item };

            if (cells.length > 1) {
              const rateText = cells.eq(1).text().trim();
              if (rateText) drop.rate = rateText;
            }

            drops.push(drop);
          }
        }
      });
    } else if (current.is('ul, ol')) {
      current.find('li').each((i, li) => {
        const itemLink = $(li).find('a').first();
        const item = itemLink.length ? itemLink.text().trim() : $(li).text().trim();

        if (item) {
          drops.push({ item });
        }
      });
    }

    current = current.next();
  }

  return drops;
}

/**
 * Extract detailed resistances (variant-specific)
 */
async function extractDetailedResistances($) {
  const resistanceMap = await loadResistanceMap();
  const elemental = {};
  const physical = {};

  // Look for resistance table
  const resTable = $('table').filter((i, table) => {
    const $table = $(table);
    const text = $table.text().toLowerCase();
    return text.includes('resistance') || text.includes('elemental') || text.includes('physical');
  }).first();

  if (!resTable.length) return null;

  resTable.find('tr').each((i, row) => {
    const $row = $(row);
    const cells = $row.find('th, td');

    cells.each((j, cell) => {
      const $cell = $(cell);
      const text = $cell.text().toLowerCase().trim();

      if (text.includes('fire')) {
        const value = $row.find('td').eq(j).text();
        elemental.fire = parseResistance(value, resistanceMap);
      } else if (text.includes('ice')) {
        const value = $row.find('td').eq(j).text();
        elemental.ice = parseResistance(value, resistanceMap);
      } else if (text.includes('wind')) {
        const value = $row.find('td').eq(j).text();
        elemental.wind = parseResistance(value, resistanceMap);
      } else if (text.includes('earth')) {
        const value = $row.find('td').eq(j).text();
        elemental.earth = parseResistance(value, resistanceMap);
      } else if (text.includes('lightning') || text.includes('thunder')) {
        const value = $row.find('td').eq(j).text();
        elemental.lightning = parseResistance(value, resistanceMap);
      } else if (text.includes('water')) {
        const value = $row.find('td').eq(j).text();
        elemental.water = parseResistance(value, resistanceMap);
      } else if (text.includes('light')) {
        const value = $row.find('td').eq(j).text();
        elemental.light = parseResistance(value, resistanceMap);
      } else if (text.includes('dark')) {
        const value = $row.find('td').eq(j).text();
        elemental.dark = parseResistance(value, resistanceMap);
      } else if (text.includes('slashing') || text.includes('slash')) {
        const value = $row.find('td').eq(j).text();
        physical.slashing = parseResistance(value, resistanceMap);
      } else if (text.includes('piercing') || text.includes('pierce')) {
        const value = $row.find('td').eq(j).text();
        physical.piercing = parseResistance(value, resistanceMap);
      } else if (text.includes('blunt') || text.includes('impact')) {
        const value = $row.find('td').eq(j).text();
        physical.blunt = parseResistance(value, resistanceMap);
      }
    });
  });

  const result = {};
  if (Object.keys(elemental).length > 0) result.elemental = elemental;
  if (Object.keys(physical).length > 0) result.physical = physical;

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Scrape a monster variant page
 * @param {string} html - HTML content
 * @param {Object} variantInfo - Basic variant info (id, name, familyId, sourceUrl)
 * @returns {Object} Complete variant data
 */
export async function scrapeVariantPage(html, variantInfo) {
  const $ = cheerio.load(html);

  // Extract data
  const levelData = extractLevel($) || {};
  const zoneData = extractZone($) || {};
  const isNM = isNotoriousMonster($, variantInfo.name);
  const spawnInfo = extractSpawnInfo($) || {};
  const respawnTime = extractRespawnTime($);
  const drops = extractDrops($);
  const resistances = await extractDetailedResistances($);

  // Build variant object
  const variant = {
    id: variantInfo.id,
    name: variantInfo.name,
    familyId: variantInfo.familyId,
    isNM,
    level: levelData.level || undefined,
    levelRange: levelData.levelRange || undefined,
    zone: zoneData.zone || undefined,
    zones: zoneData.zones || undefined,
    spawnConditions: spawnInfo.spawnConditions || undefined,
    respawnTime: respawnTime || undefined,
    resistances: resistances || undefined,
    drops: drops.length > 0 ? drops : undefined,
    source: 'bgwiki',
    sourceUrl: variantInfo.sourceUrl,
    lastUpdated: new Date().toISOString()
  };

  return variant;
}

/**
 * Scrape multiple variant pages
 * @param {Array} variants - Array of variant info objects
 * @param {Object} options - Scraping options
 * @param {Function} options.fetchHtml - Function to fetch HTML
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @param {number} options.limit - Limit number of variants to scrape
 * @returns {Promise<Array>} All variant data
 */
export async function scrapeAllVariants(variants, options = {}) {
  const { fetchHtml, onProgress, verbose = false, limit } = options;

  if (!fetchHtml) {
    throw new Error('fetchHtml function is required');
  }

  const toScrape = limit ? variants.slice(0, limit) : variants;
  const scrapedVariants = [];

  if (verbose) {
    console.log(`\n🐉 Scraping ${toScrape.length} monster variants...\n`);
  }

  for (let i = 0; i < toScrape.length; i++) {
    const variantInfo = toScrape[i];

    if (verbose) {
      const percentage = Math.round(((i + 1) / toScrape.length) * 100);
      console.log(`[${i + 1}/${toScrape.length}] (${percentage}%) Scraping variant: ${variantInfo.name}`);
    }

    try {
      const html = await fetchHtml(variantInfo.sourceUrl);
      const variant = await scrapeVariantPage(html, variantInfo);

      scrapedVariants.push(variant);

      if (verbose) {
        const details = [];
        if (variant.isNM) details.push('NM');
        if (variant.level) details.push(`Lv${variant.level}`);
        if (variant.levelRange) details.push(`Lv${variant.levelRange}`);
        if (variant.zone) details.push(variant.zone);
        if (variant.drops && variant.drops.length > 0) details.push(`${variant.drops.length} drops`);
        console.log(`   ✓ ${details.join(' | ')}`);
        console.log('');
      }

      if (onProgress) {
        onProgress(i + 1, toScrape.length, variant);
      }
    } catch (error) {
      if (verbose) {
        console.error(`   ✗ Error: ${error.message}`);
        console.log('');
      }
    }
  }

  if (verbose) {
    console.log(`\n✅ Scraped ${scrapedVariants.length} variants\n`);
  }

  return scrapedVariants;
}

export {
  extractLevel,
  extractZone,
  isNotoriousMonster,
  extractSpawnInfo,
  extractRespawnTime,
  extractDrops,
  extractDetailedResistances
};
