/**
 * Records of Eminence (ROE) Scraper
 * Scrapes ROE objectives from FFXI Wiki
 */

import * as cheerio from 'cheerio';

/**
 * Parse repeatable status
 */
function parseRepeatableStatus(text) {
  if (!text) return { repeatable: false };

  const normalized = text.trim().toLowerCase();

  if (normalized === 'yes') {
    return { repeatable: true, repeatType: 'unlimited' };
  } else if (normalized === 'no') {
    return { repeatable: false };
  } else if (normalized === 'd') {
    return { repeatable: true, repeatType: 'daily' };
  } else if (normalized === 'w') {
    return { repeatable: true, repeatType: 'weekly' };
  } else if (normalized === 'm') {
    return { repeatable: true, repeatType: 'monthly' };
  }

  return { repeatable: false };
}

/**
 * Parse number value (Sparks, EXP, Accolades, etc.)
 */
function parseNumber(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').trim();
  const num = parseInt(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Extract items from HTML cell
 */
function extractItems($, cell) {
  const items = [];

  $(cell).find('a').each((i, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    const name = $link.text().trim();

    if (name && href && href.startsWith('/ffxi/')) {
      items.push({
        name,
        url: `https://www.bg-wiki.com${href}`
      });
    }
  });

  // If no links, try plain text
  if (items.length === 0) {
    const text = $(cell).text().trim();
    if (text && text !== '-' && text !== '—') {
      items.push({ name: text });
    }
  }

  return items;
}

/**
 * Extract NPCs and locations from description
 */
function extractReferences($, descriptionCell) {
  const npcs = [];
  const locations = [];
  const items = [];

  $(descriptionCell).find('a').each((i, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    const name = $link.text().trim();

    if (!href || !href.startsWith('/ffxi/')) return;

    const url = `https://www.bg-wiki.com${href}`;

    // Check context to determine type
    const context = $link.parent().text().toLowerCase();

    if (context.includes('speak') || context.includes('talk') || context.includes('guide')) {
      npcs.push({ name, url });
    } else if (context.includes('zone') || context.includes('area') || context.includes('in ')) {
      locations.push({ name, url });
    } else {
      items.push({ name, url });
    }
  });

  return {
    npcs: npcs.length > 0 ? npcs : undefined,
    locations: locations.length > 0 ? locations : undefined,
    relatedItems: items.length > 0 ? items : undefined
  };
}

/**
 * Parse a single ROE objective row
 */
function parseObjectiveRow($, row, category, subcategory) {
  const cells = $(row).find('td');

  if (cells.length < 5) return null; // Invalid row

  const nameCell = cells.eq(0);
  const descCell = cells.eq(1);
  const objCell = cells.eq(2);
  const repeatCell = cells.eq(3);
  const sparksCell = cells.eq(4);
  const expCell = cells.eq(5);
  const accoCell = cells.eq(6);
  const itemCell = cells.eq(7);

  const name = nameCell.text().trim();
  const description = descCell.text().trim();
  const objectiveCount = parseNumber(objCell.text());
  const repeatStatus = parseRepeatableStatus(repeatCell.text());
  const references = extractReferences($, descCell);

  const objective = {
    name,
    category,
    subcategory,
    description,
    objectiveCount,
    ...repeatStatus,
    rewards: {
      sparks: parseNumber(sparksCell.text()),
      exp: parseNumber(expCell.text()),
      accolades: parseNumber(accoCell.text()),
      items: extractItems($, itemCell)
    },
    ...references
  };

  // Clean up empty arrays
  if (objective.rewards.items.length === 0) {
    delete objective.rewards.items;
  }

  return objective;
}

/**
 * Scrape ROE data from FFXI Wiki HTML
 * @param {string} html - HTML content of the ROE category page
 * @returns {Object} Complete ROE data
 */
export function scrapeROEPage(html) {
  const $ = cheerio.load(html);

  const categories = [];
  const objectives = [];
  let currentCategory = null;
  let currentSubcategory = null;

  // First, gather all categories and subcategories
  $('.mw-parser-output h2, .mw-parser-output h3').each((i, header) => {
    const $header = $(header);
    const headlineName = $header.find('.mw-headline').text().trim();

    if (!headlineName) return;

    if ($header.is('h2')) {
      // Skip non-category headers
      if (headlineName.toLowerCase().includes('contents') ||
          headlineName.toLowerCase().includes('notes') ||
          headlineName.toLowerCase().includes('locations') ||
          headlineName.toLowerCase().includes('see also')) {
        return;
      }

      currentCategory = headlineName;
      currentSubcategory = null;

      categories.push({
        name: currentCategory,
        subcategories: []
      });
    } else if ($header.is('h3')) {
      currentSubcategory = headlineName;

      if (currentCategory) {
        const categoryObj = categories.find(c => c.name === currentCategory);
        if (categoryObj && !categoryObj.subcategories.includes(currentSubcategory)) {
          categoryObj.subcategories.push(currentSubcategory);
        }
      }
    }
  });

  // Reset for table parsing
  currentCategory = null;
  currentSubcategory = null;

  // Now parse tables with their associated categories
  $('.mw-parser-output').find('*').each((i, elem) => {
    const $elem = $(elem);

    // Track category context
    if ($elem.is('h2')) {
      const headlineName = $elem.find('.mw-headline').text().trim();
      if (headlineName && !headlineName.toLowerCase().includes('contents') &&
          !headlineName.toLowerCase().includes('notes') &&
          !headlineName.toLowerCase().includes('locations')) {
        currentCategory = headlineName;
        currentSubcategory = null;
      }
    }

    if ($elem.is('h3')) {
      const headlineName = $elem.find('.mw-headline').text().trim();
      if (headlineName) {
        currentSubcategory = headlineName;
      }
    }

    // Parse objective tables
    if ($elem.is('table') && $elem.hasClass('sortable')) {
      // Parse each row in the table
      $elem.find('tr').each((j, row) => {
        const $row = $(row);

        // Skip header rows
        if ($row.find('th').length > 0) return;

        // Skip rows without the white background
        if ($row.attr('bgcolor') !== '#FFFFFF') return;

        const objective = parseObjectiveRow(
          $,
          row,
          currentCategory || 'Unknown',
          currentSubcategory || null
        );

        if (objective && objective.name) {
          objectives.push(objective);
        }
      });
    }
  });

  return {
    version: '1.0.0',
    source: 'bg-wiki',
    sourceUrl: 'https://www.bg-wiki.com/ffxi/Category:Records_of_Eminence',
    lastUpdated: new Date().toISOString(),
    categories,
    objectives,
    stats: {
      totalCategories: categories.length,
      totalObjectives: objectives.length,
      byCategory: categories.map(cat => ({
        name: cat.name,
        count: objectives.filter(obj => obj.category === cat.name).length
      }))
    }
  };
}

/**
 * Scrape ROE data from local HTML file
 * @param {string} filePath - Path to HTML file
 * @returns {Promise<Object>} ROE data
 */
export async function scrapeROEFromFile(filePath) {
  const fs = await import('fs/promises');
  const html = await fs.readFile(filePath, 'utf-8');
  return scrapeROEPage(html);
}

export default {
  scrapeROEPage,
  scrapeROEFromFile
};
