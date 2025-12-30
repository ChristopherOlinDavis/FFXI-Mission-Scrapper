/**
 * Infobox Extractor
 * Extracts mission metadata from .infobox-mission HTML elements
 */

/**
 * Extract mission metadata from FFXIclopedia infobox
 * @param {Cheerio} $ - Cheerio instance
 * @param {Function} cleanText - Text cleaning function
 * @returns {Object} Mission metadata
 */
export function extractFFXIclopediaInfobox($, cleanText) {
  const metadata = {
    number: null,
    requirements: [],
    level: null,
    previousMission: null,
    nextMission: null
  };

  // Extract from .infobox-mission table
  $('.infobox-mission tr').each((i, row) => {
    const $row = $(row);
    const header = cleanText($row.find('th').text()).toLowerCase();
    const value = cleanText($row.find('td').text());

    if (header === 'number') {
      metadata.number = value;
    } else if (header === 'requirements' || header === 'prerequisite') {
      if (value) {
        metadata.requirements.push(value);
      }
    } else if (header === 'level') {
      const levelMatch = value.match(/(\d+)/);
      if (levelMatch) {
        metadata.level = parseInt(levelMatch[1]);
      }
    }
  });

  // Extract mission chain (previous/next) from dependencies table
  $('.infobox-mission-dependencies tr').each((i, row) => {
    if (i === 0) return; // Skip header row

    const $row = $(row);
    const cells = $row.find('td');

    if (cells.length >= 2) {
      // First cell is previous mission
      const prevLink = $(cells[0]).find('a').attr('href');
      if (prevLink && !prevLink.includes('Category:') && !prevLink.includes('Special:')) {
        metadata.previousMission = prevLink;
      }

      // Last cell is next mission
      const nextLink = $(cells[cells.length - 1]).find('a').attr('href');
      if (nextLink && !nextLink.includes('Category:') && !nextLink.includes('Special:')) {
        metadata.nextMission = nextLink;
      }
    }
  });

  return metadata;
}

/**
 * Extract mission metadata from BG Wiki infobox
 * @param {Cheerio} $ - Cheerio instance
 * @param {Function} cleanText - Text cleaning function
 * @returns {Object} Mission metadata
 */
export function extractBGWikiInfobox($, cleanText) {
  const metadata = {
    number: null,
    requirements: [],
    level: null,
    previousMission: null,
    nextMission: null
  };

  // BG Wiki uses different table structure
  $('table.toau-table tr, table.mission-table tr').each((i, row) => {
    const $row = $(row);
    const header = cleanText($row.find('th').text()).toLowerCase();
    const value = cleanText($row.find('td').text());

    if (header.includes('number')) {
      metadata.number = value;
    } else if (header.includes('requirement') || header.includes('prerequisite')) {
      if (value) {
        metadata.requirements.push(value);
      }
    } else if (header.includes('level')) {
      const levelMatch = value.match(/(\d+)/);
      if (levelMatch) {
        metadata.level = parseInt(levelMatch[1]);
      }
    }
  });

  // Extract previous/next from navigation
  const prevLink = $('a:contains("Previous Mission")').attr('href');
  const nextLink = $('a:contains("Next Mission")').attr('href');

  if (prevLink) metadata.previousMission = prevLink;
  if (nextLink) metadata.nextMission = nextLink;

  return metadata;
}

/**
 * Extract rewards from mission page
 * @param {Cheerio} $ - Cheerio instance
 * @param {Function} cleanText - Text cleaning function
 * @returns {Array} Array of reward strings
 */
export function extractRewards($, cleanText) {
  const rewards = [];

  // BGWiki: Look for rewards table (uses "Rewards" plural)
  $('th:contains("Rewards")').each((i, elem) => {
    const $th = $(elem);
    const $tr = $th.closest('tr');
    const $nextTr = $tr.next('tr');
    const $td = $nextTr.find('td');

    // Extract list items from rewards cell
    $td.find('li').each((j, liElem) => {
      const reward = cleanText($(liElem).text());
      if (reward && reward.length > 0 && reward.toLowerCase() !== 'none') {
        rewards.push(reward);
      }
    });

    // If no list items, check for direct text
    if (rewards.length === 0) {
      const directText = cleanText($td.text());
      if (directText && directText.length > 0 && directText.toLowerCase() !== 'none') {
        rewards.push(directText);
      }
    }
  });

  // FFXIclopedia: Look for rewards in infobox (uses "Reward" singular)
  if (rewards.length === 0) {
    $('.infobox-mission tr').each((i, row) => {
      const $row = $(row);
      const header = cleanText($row.find('th').text()).toLowerCase();

      if (header === 'reward' || header === 'rewards') {
        const $td = $row.find('td');
        // Replace <br> with a delimiter before extracting text
        const $clone = $td.clone();
        $clone.find('br').replaceWith('|||');
        const value = cleanText($clone.text());

        if (value && value.length > 0 && value.toLowerCase() !== 'none') {
          // Split by delimiter or newlines
          const rewardParts = value.split(/\s*\|\|\|\s*/);
          rewardParts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed && trimmed.toLowerCase() !== 'none') {
              rewards.push(trimmed);
            }
          });
        }
      }
    });
  }

  return rewards;
}

/**
 * Estimate mission difficulty from level and text indicators
 * @param {number} level - Minimum level requirement
 * @param {string} description - Mission description
 * @returns {string} Difficulty rating
 */
export function estimateDifficulty(level, description = '') {
  const text = description.toLowerCase();

  // Text-based indicators
  if (text.includes('very hard') || text.includes('extremely difficult')) {
    return 'very_hard';
  } else if (text.includes('hard') || text.includes('difficult') || text.includes('challenging')) {
    return 'hard';
  } else if (text.includes('easy') || text.includes('simple') || text.includes('straightforward')) {
    return 'easy';
  } else if (text.includes('trivial') || text.includes('quick')) {
    return 'trivial';
  }

  // Level-based estimation
  if (!level) return 'medium';

  if (level >= 75) return 'hard';
  if (level >= 50) return 'medium';
  if (level >= 20) return 'easy';
  return 'trivial';
}
