import * as cheerio from 'cheerio';
import { jobSchema } from '../schemas/job.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse job pages from BGWiki and FFXIClopedia
 */
export class JobParser {
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

    // Check for job template
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
   * Parse job abilities table
   */
  parseAbilities($) {
    const abilities = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerText = $table.text();

      // Check if this is an abilities table
      if (/Job Abilit(y|ies)|Level|Recast/i.test(headerText)) {
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
            ability.name = (cell0.text() || cell1.text() || '').trim();
          }

          if (!ability.name) return;

          // Try to find level
          cells.each((k, cell) => {
            const $cell = $(cell);
            const levelMatch = $cell.text().match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
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
      }
    });

    return abilities.length > 0 ? abilities : undefined;
  }

  /**
   * Parse job traits table
   */
  parseTraits($) {
    const traits = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerText = $table.text();

      // Check if this is a traits table
      if (/Job Traits?|Level|Tier/i.test(headerText) && /Trait/i.test(headerText)) {
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
            trait.name = (cell0.text() || cell1.text() || '').trim();
          }

          if (!trait.name) return;

          // Get level
          cells.each((k, cell) => {
            const $cell = $(cell);
            const levelMatch = $cell.text().match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
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
      }
    });

    return traits.length > 0 ? traits : undefined;
  }

  /**
   * Parse job points table
   */
  parseJobPoints($) {
    const jobPoints = [];
    const tables = $('table');

    tables.each((i, table) => {
      const $table = $(table);
      const headerText = $table.text();

      // Check if this is a job points table
      if (/Job Point|JP|Gift/i.test(headerText)) {
        const rows = $table.find('tr');

        rows.each((j, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          if (cells.length < 2) return;

          const jp = {};

          // Try to extract JP cost or points required
          cells.each((k, cell) => {
            const $cell = $(cell);
            const jpMatch = $cell.text().match(/(\d+)\s*(?:JP|Points?)/i);
            if (jpMatch) {
              jp.jpCost = parseInt(jpMatch[1]);
              return false; // break
            }
          });

          // Get effect description (usually the longest cell)
          let effectCell = cells.eq(0);
          cells.each((k, cell) => {
            const $cell = $(cell);
            if ($cell.text().length > effectCell.text().length) {
              effectCell = $cell;
            }
          });

          jp.effect = effectCell.text().trim();

          if (jp.effect) {
            jobPoints.push(jp);
          }
        });
      }
    });

    return jobPoints.length > 0 ? jobPoints : undefined;
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

    // Validate against schema
    const result = jobSchema.safeParse(jobData);
    if (!result.success) {
      console.error(`Job validation error for ${filename}: ${result.error.errors.length} errors`);
      return null;
    }

    return result.data;
  }
}

export default JobParser;
