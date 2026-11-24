import * as cheerio from 'cheerio';
import { missionSchema } from '../schemas/mission.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse mission pages from BGWiki and FFXIClopedia
 */
export class MissionParser {
  constructor() {
    this.missionSeries = [
      'Republic of Bastok', 'Federation of Windurst', 'Kingdom of San d\'Oria',
      'Rise of the Zilart', 'Chains of Promathia', 'Treasures of Aht Urhgan',
      'Wings of the Goddess', 'A Crystalline Prophecy', 'A Moogle Kupo d\'Etat',
      'A Shantotto Ascension', 'Seekers of Adoulin', 'Rhapsodies of Vana\'diel'
    ];
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
   * Determine if this page is a mission page
   */
  isMissionPage($, filename) {
    // Primary detection: Check page categories
    const categories = this.extractCategories($);
    const missionCategories = [
      'Missions', 'Mission', 'Bastok Missions', 'San d\'Oria Missions',
      'Windurst Missions', 'Zilart Missions', 'Promathia Missions',
      'Aht Urhgan Missions', 'Wings of the Goddess Missions',
      'Seekers of Adoulin Missions', 'Rhapsodies of Vana\'diel'
    ];

    const hasMissionCategory = categories.some(cat =>
      missionCategories.some(missionCat => cat.includes(missionCat))
    );

    if (hasMissionCategory) {
      return true;
    }

    // Secondary: Check filename patterns
    const filenamePatterns = [
      /_Mission_\d/, // Bastok_Mission_1-1, etc.
      /Mission_\d-\d/, // Mission_1-1
      /_Ascension_Mission/, // A_Shantotto_Ascension_Mission_1
      /Rhapsodies_of_Vana'diel_Mission/,
      /Zilart_Mission/, /Promathia_Mission/, /Aht_Urhgan_Mission/
    ];

    if (filenamePatterns.some(pattern => pattern.test(filename))) {
      return true;
    }

    // Tertiary: Check for mission-specific table classes
    const hasMissionTable = $('.missions, [class*="mission"]').length > 0;
    if (hasMissionTable) {
      const text = $('body').text();
      if (/Starting NPC|Series|Previous Mission|Next Mission/i.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract mission series (nation or expansion)
   */
  extractSeries($) {
    // Look for "Series" row in mission table
    const rows = $('table tr');
    let series = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/^Series$/i.test(header)) {
        series = $row.find('td').first().text().trim();
        return false; // break
      }
    });

    return series;
  }

  /**
   * Extract mission number from filename or title
   */
  extractMissionNumber(filename, title) {
    // Try filename first: Bastok_Mission_1-1 or A_Shantotto_Ascension_Mission_1
    let match = filename.match(/Mission[_\s](\d+-\d+|\d+)/i);
    if (match) {
      return match[1];
    }

    // Try title
    if (title) {
      match = title.match(/Mission[_\s](\d+-\d+|\d+)/i);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract starting NPC
   */
  extractStartingNPC($) {
    const rows = $('table tr');
    let npc = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Starting NPC/i.test(header)) {
        const cell = $row.find('td').first();
        // Get text, preferring link text if available
        const link = cell.find('a').first();
        npc = link.length > 0 ? link.text().trim() : cell.text().trim();
        return false; // break
      }
    });

    return npc;
  }

  /**
   * Extract mission title (not the page title, but the actual mission title)
   */
  extractMissionTitle($) {
    // Mission title is usually in the first header of the mission table
    const header = $('table.missions th').first();
    if (header.length > 0) {
      const title = header.text().trim();
      // Make sure it's not a generic header like "Bastok Mission 1-1"
      if (title && !/^Mission \d|^Bastok Mission|^Windurst Mission|^San d'Oria Mission/i.test(title)) {
        return title;
      }
    }

    return undefined;
  }

  /**
   * Extract description
   */
  extractDescription($) {
    const rows = $('table tr');
    let description = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Description/i.test(header)) {
        description = $row.find('td').first().text().trim();
        return false; // break
      }
    });

    return description;
  }

  /**
   * Extract walkthrough steps
   */
  extractWalkthrough($) {
    const steps = [];
    
    // Look for "Walkthrough" heading
    const headings = $('h2, h3');
    let walkthroughSection = null;

    headings.each((i, h) => {
      const $h = $(h);
      if (/Walkthrough|Objective|Steps/i.test($h.text())) {
        walkthroughSection = $h;
        return false; // break
      }
    });

    if (!walkthroughSection) return undefined;

    // Get the list items after the walkthrough heading
    let current = $(walkthroughSection).next();
    while (current.length > 0 && !current.is('h2, h3, h4')) {
      if (current.is('ul, ol')) {
        current.find('> li').each((i, li) => {
          const $li = $(li);
          let text = $li.clone().children('ul, ol').remove().end().text().trim();
          if (text.length > 0) {
            steps.push(text);
          }
        });
      }
      current = current.next();
    }

    return steps.length > 0 ? steps : undefined;
  }

  /**
   * Extract previous/next mission links
   */
  extractMissionNavigation($) {
    const navigation = {};
    const rows = $('table tr');

    rows.each((i, row) => {
      const $row = $(row);
      const headers = $row.find('th');
      
      headers.each((j, header) => {
        const $header = $(header);
        const headerText = $header.text().trim();
        
        if (/Previous Mission/i.test(headerText)) {
          const cell = $row.find('td').eq(headers.index($header));
          const link = cell.find('a').first();
          if (link.length > 0) {
            navigation.previousMission = link.text().trim();
          }
        } else if (/Next Mission/i.test(headerText)) {
          const cell = $row.find('td').eq(headers.index($header));
          const link = cell.find('a').first();
          if (link.length > 0) {
            navigation.nextMission = link.text().trim();
          }
        }
      });
    });

    return navigation;
  }

  /**
   * Extract rewards
   */
  extractRewards($) {
    const rewards = {};
    
    // Look for rewards table or section
    const tables = $('table');
    tables.each((i, table) => {
      const $table = $(table);
      const headerText = $table.find('th').first().text().trim();
      
      if (/Rewards/i.test(headerText)) {
        const rewardText = $table.text().toLowerCase();
        
        if (/rank points/i.test(rewardText)) {
          rewards.rankPoints = true;
        }
        
        // Look for gil amount
        const gilMatch = rewardText.match(/(\d+)\s*gil/i);
        if (gilMatch) {
          rewards.gil = parseInt(gilMatch[1]);
        }
        
        // Look for item links
        const items = [];
        $table.find('a').each((j, link) => {
          const $link = $(link);
          const linkText = $link.text().trim();
          const href = $link.attr('href') || '';
          
          // Skip navigation links
          if (!href.includes('Category:') && !href.includes('Special:') && linkText.length > 0) {
            items.push(linkText);
          }
        });
        
        if (items.length > 0) {
          rewards.items = items;
        }
      }
    });

    return Object.keys(rewards).length > 0 ? rewards : undefined;
  }

  /**
   * Extract repeatable status
   */
  extractRepeatable($) {
    const rows = $('table tr');
    let repeatable = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Repeatable/i.test(header)) {
        const text = $row.find('td').first().text().trim().toLowerCase();
        repeatable = /yes|true/i.test(text);
        return false; // break
      }
    });

    return repeatable;
  }

  /**
   * Main parse function
   */
  parse(html, sourceUrl, filename) {
    const $ = cheerio.load(html);

    if (!this.isMissionPage($, filename)) {
      return null;
    }

    // Extract page title
    const titleTag = $('title');
    const rawTitle = titleTag.length > 0 ? titleTag.text() : '';
    const pageName = cleanPageTitle(rawTitle, filename);

    const missionData = {
      name: pageName,
      type: 'mission',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Extract mission details
    const series = this.extractSeries($);
    if (series) {
      missionData.series = series;
    }

    const missionNumber = this.extractMissionNumber(filename, pageName);
    if (missionNumber) {
      missionData.missionNumber = missionNumber;
    }

    const missionTitle = this.extractMissionTitle($);
    if (missionTitle) {
      missionData.title = missionTitle;
    }

    const startingNPC = this.extractStartingNPC($);
    if (startingNPC) {
      missionData.startingNPC = startingNPC;
    }

    const description = this.extractDescription($);
    if (description) {
      missionData.description = description;
    }

    const walkthrough = this.extractWalkthrough($);
    if (walkthrough) {
      missionData.walkthrough = walkthrough;
    }

    const navigation = this.extractMissionNavigation($);
    if (navigation.previousMission) {
      missionData.previousMission = navigation.previousMission;
    }
    if (navigation.nextMission) {
      missionData.nextMission = navigation.nextMission;
    }

    const rewards = this.extractRewards($);
    if (rewards) {
      missionData.rewards = rewards;
    }

    const repeatable = this.extractRepeatable($);
    if (repeatable !== null) {
      missionData.repeatable = repeatable;
    }

    // Validate against schema
    const result = missionSchema.safeParse(missionData);
    if (!result.success) {
      console.error(`Mission validation error for ${filename}:`, result.error.message);
      return null;
    }

    return result.data;
  }
}

export default MissionParser;
