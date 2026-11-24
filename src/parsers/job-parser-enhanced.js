import * as cheerio from 'cheerio';
import { jobSchema } from '../schemas/job.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Enhanced Job Parser with proper deduplication and categorization
 * Parses job pages from BGWiki and FFXIClopedia
 */
export class JobParserEnhanced {
  constructor() {
    this.jobNames = [
      'Warrior', 'Monk', 'White Mage', 'Black Mage', 'Red Mage', 'Thief',
      'Paladin', 'Dark Knight', 'Beastmaster', 'Bard', 'Ranger', 'Samurai',
      'Ninja', 'Dragoon', 'Summoner', 'Blue Mage', 'Corsair', 'Puppetmaster',
      'Dancer', 'Scholar', 'Geomancer', 'Rune Fencer'
    ];

    this.jobAbbreviations = {
      'WAR': 'Warrior', 'MNK': 'Monk', 'WHM': 'White Mage', 'BLM': 'Black Mage',
      'RDM': 'Red Mage', 'THF': 'Thief', 'PLD': 'Paladin', 'DRK': 'Dark Knight',
      'BST': 'Beastmaster', 'BRD': 'Bard', 'RNG': 'Ranger', 'SAM': 'Samurai',
      'NIN': 'Ninja', 'DRG': 'Dragoon', 'SMN': 'Summoner', 'BLU': 'Blue Mage',
      'COR': 'Corsair', 'PUP': 'Puppetmaster', 'DNC': 'Dancer', 'SCH': 'Scholar',
      'GEO': 'Geomancer', 'RUN': 'Rune Fencer'
    };
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
   * Determine if this page is a job page
   */
  isJobPage($, filename) {
    // Primary detection: Check page categories
    const categories = this.extractCategories($);
    const hasJobCategory = categories.some(cat => cat === 'Jobs');

    if (hasJobCategory) {
      return true;
    }

    // Secondary: Check if filename exactly matches a job name
    const filenameMatches = this.jobNames.some(job => {
      const pattern = new RegExp(`^(bgwiki|ffxiclopedia)-${job.replace(/\s+/g, '_')}$`, 'i');
      return pattern.test(filename.replace('.html', ''));
    });

    if (!filenameMatches) {
      return false;
    }

    // Tertiary: Check for job-specific indicators (only if filename matches)
    const text = $('body').text();
    const hasJobIndicators =
      /Job Abilities|Job Traits|Weapon Skills|Job Points|Job Point Gifts/i.test(text) ||
      /Equipable Weapons|Equipable Armor|Skill Ratings/i.test(text);

    const hasJobTemplate =
      $('[class*="Job_Page"]').length > 0 ||
      $('[class*="JobPoint"]').length > 0;

    return hasJobIndicators || hasJobTemplate;
  }

  /**
   * Get job abbreviation from name
   */
  getAbbreviation(jobName) {
    for (const [abbr, name] of Object.entries(this.jobAbbreviations)) {
      if (name.toLowerCase() === jobName.toLowerCase()) {
        return abbr;
      }
    }
    return undefined;
  }

  /**
   * Deduplicate items based on a composite key
   */
  deduplicateItems(items, keyFields = ['name', 'level']) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      // Create composite key
      const key = keyFields
        .map(field => (item[field] || '').toString().toLowerCase().trim())
        .join('||');

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Parse job abilities table (ONLY the Job Abilities section)
   */
  parseAbilities($) {
    const abilities = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);

      // Check if this is specifically a Job Abilities table
      const headerRow = $table.find('tr').first();
      const headerText = headerRow.text();

      // Only parse if it explicitly says "Job Ability" (not Job Points, not Gifts)
      if (!/Job Abilit(y|ies)/i.test(headerText)) {
        return; // Skip this table
      }

      // Skip if it contains "Job Point" or "Gift"
      if (/Job Point|Gift|Category/i.test(headerText)) {
        return; // Skip this table
      }

      const rows = $table.find('tr');

      rows.each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length < 2) return;

        const ability = {};

        // Try to find ability name (usually in a link)
        const nameLink = $row.find('a[title]').first();
        if (nameLink.length > 0) {
          ability.name = nameLink.text().trim();
        } else {
          // Try first or second cell
          const cell0 = cells.eq(0);
          const cell1 = cells.eq(1);
          ability.name = (cell1.text() || cell0.text() || '').trim();
        }

        if (!ability.name || ability.name.length < 2) return;

        // Skip header rows
        if (/^(name|level|lvl|recast|description)$/i.test(ability.name)) return;

        // Try to find level
        cells.each((k, cell) => {
          const $cell = $(cell);
          const levelMatch = $cell.text().match(/^\s*(\d{1,2})\s*$/);
          if (levelMatch && parseInt(levelMatch[1]) <= 99) {
            ability.level = parseInt(levelMatch[1]);
            return false; // break
          }
        });

        // Try to find recast time
        cells.each((k, cell) => {
          const $cell = $(cell);
          const recastMatch = $cell.text().match(/(\d+:\d+|\d+\s*(?:sec|min))/i);
          if (recastMatch) {
            ability.recast = recastMatch[1];
            return false; // break
          }
        });

        // Get description (usually last cell)
        const lastCell = cells.last();
        if (lastCell.length > 0 && lastCell.text().length > ability.name.length) {
          ability.description = lastCell.text().trim();
        }

        abilities.push(ability);
      });
    });

    // Deduplicate based on name and level
    const unique = this.deduplicateItems(abilities, ['name', 'level']);
    return unique.length > 0 ? unique : undefined;
  }

  /**
   * Parse job traits table
   */
  parseTraits($) {
    const traits = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerRow = $table.find('tr').first();
      const headerText = headerRow.text();

      // Check if this is a traits table (must have "Trait" in header)
      if (!/Traits?/i.test(headerText)) {
        return; // Skip this table
      }

      // Skip if it's a Job Point table
      if (/Job Point|Gift/i.test(headerText)) {
        return; // Skip this table
      }

      const rows = $table.find('tr');

      rows.each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length < 2) return;

        const trait = {};

        // Get trait name
        const nameLink = $row.find('a[title]').first();
        if (nameLink.length > 0) {
          trait.name = nameLink.text().trim();
        } else {
          const cell0 = cells.eq(0);
          const cell1 = cells.eq(1);
          trait.name = (cell1.text() || cell0.text() || '').trim();
        }

        if (!trait.name || trait.name.length < 2) return;

        // Skip header rows
        if (/^(name|level|lvl|tier|effect)$/i.test(trait.name)) return;

        // Get level
        cells.each((k, cell) => {
          const $cell = $(cell);
          const levelMatch = $cell.text().match(/^\s*(\d{1,2})\s*$/);
          if (levelMatch && parseInt(levelMatch[1]) <= 99) {
            trait.level = parseInt(levelMatch[1]);
            return false; // break
          }
        });

        // Get tier if mentioned
        const tierMatch = $row.text().match(/(?:Tier|Rank)\s*(\d+)/i);
        if (tierMatch) {
          trait.tier = parseInt(tierMatch[1]);
        }

        // Get effect/description
        const lastCell = cells.last();
        if (lastCell.length > 0) {
          trait.effect = lastCell.text().trim();
        }

        traits.push(trait);
      });
    });

    // Deduplicate based on name and level
    const unique = this.deduplicateItems(traits, ['name', 'level']);
    return unique.length > 0 ? unique : undefined;
  }

  /**
   * Parse job points table
   */
  parseJobPoints($) {
    const jobPoints = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerRow = $table.find('tr').first();
      const headerText = headerRow.text();

      // Check if this is specifically a Job Point table
      if (!/Job Point|JP Category/i.test(headerText)) {
        return; // Skip this table
      }

      // Skip if it's a Gift table
      if (/Gift[^s]|Required Total/i.test(headerText)) {
        return; // Skip this table
      }

      const rows = $table.find('tr');

      rows.each((j, row) => {
        const $row = $(row);

        // Skip rows with only th elements (header rows)
        const thCount = $row.find('th').length;
        if (thCount > 0) return;

        const cells = $row.find('td');
        if (cells.length < 2) return;

        const jp = {};

        // Get category name (first column)
        const firstCell = cells.eq(0);
        const category = firstCell.text().trim();

        if (!category || category.length < 3) return;

        // Skip header rows
        if (/^(category|description|effect|tier)$/i.test(category)) return;

        jp.category = category;

        // Get description (second column)
        const secondCell = cells.eq(1);
        jp.description = secondCell.text().trim();

        // Get effect per tier (third column if exists)
        if (cells.length >= 3) {
          const thirdCell = cells.eq(2);
          jp.effectPerTier = thirdCell.text().trim();
        }

        if (jp.category && jp.description) {
          jobPoints.push(jp);
        }
      });
    });

    // Deduplicate based on category
    const unique = this.deduplicateItems(jobPoints, ['category']);
    return unique.length > 0 ? unique : undefined;
  }

  /**
   * Parse Job Point Gifts (separate from regular job points)
   */
  parseJobPointGifts($) {
    const gifts = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerRow = $table.find('tr').first();
      const headerText = headerRow.text();

      // Check if this is a Gifts table
      if (!/Gift|Required Total/i.test(headerText)) {
        return; // Skip this table
      }

      const rows = $table.find('tr');

      rows.each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length < 2) return;

        const gift = {};

        // Get gift name/description (first column)
        const firstCell = cells.eq(0);
        const name = firstCell.text().trim();

        if (!name || name.length < 3) return;

        // Skip header rows
        if (/^(gift|name|description|points?)$/i.test(name)) return;

        gift.name = name;

        // Get description (second column)
        const secondCell = cells.eq(1);
        gift.description = secondCell.text().trim();

        // Get required JP (third column if exists)
        if (cells.length >= 3) {
          const thirdCell = cells.eq(2);
          const jpMatch = thirdCell.text().match(/(\d+)/);
          if (jpMatch) {
            gift.requiredJP = parseInt(jpMatch[1]);
          }
        }

        if (gift.name && gift.description) {
          gifts.push(gift);
        }
      });
    });

    // Deduplicate based on name
    const unique = this.deduplicateItems(gifts, ['name']);
    return unique.length > 0 ? unique : undefined;
  }

  /**
   * Parse description
   */
  parseDescription($) {
    const paragraphs = $('.mw-parser-output > p, .content > p');

    for (let i = 0; i < paragraphs.length; i++) {
      const text = $(paragraphs[i]).text().trim();
      if (text.length > 30) {
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

    if (!this.isJobPage($, filename)) {
      return null;
    }

    // Extract job name from <title> tag
    const name = this.extractPageTitle($, filename);

    const jobData = {
      name,
      type: 'job',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Get abbreviation
    const abbreviation = this.getAbbreviation(name);
    if (abbreviation) {
      jobData.abbreviation = abbreviation;
    }

    // Parse description
    const description = this.parseDescription($);
    if (description) {
      jobData.description = description;
    }

    // Parse abilities
    const abilities = this.parseAbilities($);
    if (abilities) {
      jobData.abilities = abilities;
    }

    // Parse traits
    const traits = this.parseTraits($);
    if (traits) {
      jobData.traits = traits;
    }

    // Parse job points
    const jobPoints = this.parseJobPoints($);
    if (jobPoints) {
      jobData.jobPoints = jobPoints;
    }

    // Parse job point gifts
    const gifts = this.parseJobPointGifts($);
    if (gifts) {
      jobData.jobPointGifts = gifts;
    }

    // Validate against schema
    const result = jobSchema.safeParse(jobData);
    if (!result.success) {
      console.error(`Job validation error for ${filename}: ${result.error.errors.length} errors`);
      console.error('First error:', result.error.errors[0]);

      // Return data anyway for debugging (but mark as invalid)
      jobData.detectedType = 'job';
      jobData.validationErrors = result.error.errors.map(e => e.message);
      return jobData;
    }

    return result.data;
  }
}

export default JobParserEnhanced;
