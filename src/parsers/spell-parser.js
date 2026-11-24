import * as cheerio from 'cheerio';
import { spellSchema } from '../schemas/spell.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse spell/magic pages from BGWiki and FFXIClopedia
 */
export class SpellParser {
  constructor() {
    this.spellTypes = ['White Magic', 'Black Magic', 'Blue Magic', 'Summoning Magic', 'Ninjutsu', 'Geomancy', 'Song', 'Trust'];
    this.elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Thunder', 'Water', 'Light', 'Dark'];
  }

  /**
   * Extract page categories from MediaWiki metadata
   */
  extractCategories($) {
    const scripts = $('script');
    for (let i = 0; i < scripts.length; i++) {
      const content = $(scripts[i]).html() || '';
      const match = content.match(/wgCategories":\[(.*?)\]/);
      if (match) {
        try {
          // Parse the JSON array
          const categoriesStr = '[' + match[1] + ']';
          return JSON.parse(categoriesStr);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return [];
  }

  /**
   * Extract page title from <title> tag
   */
  extractPageTitle($, filename) {
    const titleTag = $('title');
    const titleText = titleTag.length > 0 ? titleTag.text() : '';
    return cleanPageTitle(titleText, filename);
  }

  /**
   * Determine if this page is a spell page
   */
  isSpellPage($, filename) {
    // Primary detection: Check page categories
    const categories = this.extractCategories($);
    const spellCategories = [
      'Spells', 'White Magic', 'Black Magic', 'Blue Magic',
      'Summoning Magic', 'Ninjutsu', 'Geomancy', 'Songs',
      'Trust Magic', 'Divine Magic', 'Elemental Magic',
      'Enfeebling Magic', 'Dark Magic', 'Healing Magic',
      'Enhancing Magic'
    ];

    const hasSpellCategory = categories.some(cat =>
      spellCategories.some(spellCat => cat.includes(spellCat))
    );

    if (hasSpellCategory) {
      return true;
    }

    // Secondary detection: Check for spell templates
    const hasSpellTemplate =
      $('[class*="Standard_Magic"]').length > 0 ||
      $('[class*="Spell"]').length > 0;

    // Tertiary: Check filename patterns (least reliable)
    const spellPatterns = [
      /^(bgwiki|ffxiclopedia)-(Fire|Blizzard|Thunder|Water|Aero|Stone|Cure|Raise|Protect|Shell)/,
      /_II$/, /_III$/, /_IV$/, /_V$/, /_VI$/
    ];

    const matchesPattern = spellPatterns.some(p => p.test(filename));

    return hasSpellTemplate || matchesPattern;
  }

  /**
   * Extract spell name from title
   */
  extractSpellName($, filename) {
    return this.extractPageTitle($, filename);
  }

  /**
   * Parse spell info box/table
   */
  parseSpellInfo($) {
    const info = {};

    // Look for infobox or spell info table
    const infobox = $('.infobox, [class*="Standard_Magic"], table').first();
    if (infobox.length === 0) return info;

    const rows = infobox.find('tr');

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th, td:first-child').first();
      const value = $row.find('td:last-child').first();

      if (header.length === 0 || value.length === 0) return;

      const key = header.text().trim().toLowerCase();
      const val = value.text().trim();

      // Parse different fields
      if (key.includes('mp cost') || key === 'mp') {
        const mpMatch = val.match(/(\d+)/);
        if (mpMatch) info.mpCost = parseInt(mpMatch[1]);
      } else if (key.includes('cast time') || key === 'casting time') {
        info.castTime = val;
      } else if (key.includes('recast') || key === 'recast time') {
        info.recastTime = val;
      } else if (key.includes('duration')) {
        info.duration = val;
      } else if (key.includes('range')) {
        info.range = val;
      } else if (key.includes('target')) {
        info.target = val;
      } else if (key.includes('magic type') || key === 'type') {
        info.magicType = val;
      } else if (key.includes('element')) {
        const element = this.elements.find(e => val.includes(e));
        if (element) info.element = element;
      } else if (key.includes('skill')) {
        info.skillType = val;
      }
    });

    return info;
  }

  /**
   * Parse job level requirements
   */
  parseJobLevels($) {
    const levels = {};

    // Look for job level table or list
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text();
      if (!/Job|Level/i.test(tableText)) return;

      const rows = $table.find('tr');
      rows.each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        if (cells.length < 2) return;

        const jobText = $(cells[0]).text().trim();
        const levelText = $(cells[1]).text().trim();

        // Match job abbreviations (WHM, BLM, etc.)
        const jobMatch = jobText.match(/\b([A-Z]{3})\b/);
        const levelMatch = levelText.match(/(\d+)/);

        if (jobMatch && levelMatch) {
          levels[jobMatch[1]] = parseInt(levelMatch[1]);
        }
      });
    });

    // Also check inline text like "WHM 5, BLM 10"
    const bodyText = $('body').text();
    const inlineMatches = bodyText.matchAll(/\b([A-Z]{3})\s+(\d+)/g);
    for (const match of inlineMatches) {
      if (!levels[match[1]]) {
        levels[match[1]] = parseInt(match[2]);
      }
    }

    return Object.keys(levels).length > 0 ? levels : undefined;
  }

  /**
   * Parse equipment that modifies the spell
   */
  parseEquipmentModifiers($) {
    const equipment = [];

    // Look for equipment tables
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text();

      // Check if this is an equipment modification table
      if (/Equipment|Enhances|Augments|Effect/i.test(tableText)) {
        const rows = $table.find('tr');

        rows.each((j, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          if (cells.length < 2) return;

          const itemLink = $row.find('a[title]').first();
          if (itemLink.length === 0) return;

          const itemName = itemLink.text().trim();
          const effectCell = $(cells[cells.length - 1]);
          const effect = effectCell.text().trim();

          if (itemName && effect) {
            equipment.push({
              itemName,
              effect
            });
          }
        });
      }
    });

    return equipment.length > 0 ? equipment : undefined;
  }

  /**
   * Parse NPC vendors
   */
  parseVendors($) {
    const vendors = [];

    // Look for vendor/NPC tables
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text();

      if (/NPC|Vendor|Merchant|Shop|Purchase/i.test(tableText)) {
        const rows = $table.find('tr');

        rows.each((j, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          if (cells.length < 2) return;

          const npcLink = $row.find('a[title]').first();
          if (npcLink.length === 0) return;

          const npcName = npcLink.text().trim();

          // Try to extract location
          let location;
          const locationCell = $(cells[cells.length - 1]);
          const locationLink = locationCell.find('a').first();
          if (locationLink.length > 0) {
            location = locationLink.text().trim();
          }

          // Try to extract cost
          let cost;
          const costMatch = $row.text().match(/(\d+)\s*(gil|points?)/i);
          if (costMatch) {
            cost = parseInt(costMatch[1]);
          }

          vendors.push({
            npcName,
            location,
            cost
          });
        });
      }
    });

    return vendors.length > 0 ? vendors : undefined;
  }

  /**
   * Parse description/effect
   */
  parseDescription($) {
    // Look for the first substantial paragraph
    const paragraphs = $('.mw-parser-output > p, .content > p');

    for (let i = 0; i < paragraphs.length; i++) {
      const text = $(paragraphs[i]).text().trim();
      if (text.length > 20) { // Minimum length to avoid short snippets
        return text;
      }
    }

    return undefined;
  }

  /**
   * Main parse function
   */
  parse(html, sourceUrl, filename) {
    const $ = cheerio.load(html);

    if (!this.isSpellPage($, filename)) {
      return null;
    }

    const name = this.extractSpellName($, filename);

    const spellData = {
      name,
      type: 'spell',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Parse spell information
    const info = this.parseSpellInfo($);
    Object.assign(spellData, info);

    // Parse job levels
    const levels = this.parseJobLevels($);
    if (levels) {
      spellData.level = levels;
    }

    // Parse description
    const description = this.parseDescription($);
    if (description) {
      spellData.description = description;
    }

    // Parse equipment modifiers
    const equipment = this.parseEquipmentModifiers($);
    if (equipment) {
      spellData.equipmentModifiers = equipment;
    }

    // Parse vendors
    const vendors = this.parseVendors($);
    if (vendors) {
      spellData.vendors = vendors;
    }

    // Validate against schema
    const result = spellSchema.safeParse(spellData);
    if (!result.success) {
      console.error(`Spell validation error for ${filename}:`, result.error.message);
      return null;
    }

    return result.data;
  }
}

export default SpellParser;
