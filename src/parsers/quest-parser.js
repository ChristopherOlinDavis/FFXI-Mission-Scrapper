import * as cheerio from 'cheerio';
import { questSchema } from '../schemas/quest.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse quest pages from BGWiki and FFXIClopedia
 */
export class QuestParser {
  constructor() {
    this.questTypes = [
      'Nation Quest', 'Outlands Quest', 'Jeuno Quest', 'Aht Urhgan Quest',
      'Adoulin Quest', 'Abyssea Quest', 'Crystal War Quest', 'Job Quest',
      'Repeatable Quest', 'Trade Quest', 'Quest'
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
   * Determine if this page is a quest page
   */
  isQuestPage($, filename) {
    // Exclude category pages, templates, and talk pages
    if (filename.includes('Category:') || 
        filename.includes('Category_talk:') ||
        filename.includes('Template:') ||
        filename.includes('User_blog:') ||
        filename.includes('FFXIclopedia:Requests')) {
      return false;
    }

    // Primary detection: Check page categories
    const categories = this.extractCategories($);
    const questCategories = [
      'Quests', 'Quest', 'Bastok Quests', 'San d\'Oria Quests',
      'Windurst Quests', 'Jeuno Quests', 'Outlands Quests',
      'Aht Urhgan Quests', 'Adoulin Quests', 'Abyssea Quests',
      'Crystal War Quests', 'Nation Quests', 'Job Quests'
    ];

    const hasQuestCategory = categories.some(cat =>
      questCategories.some(questCat => cat.includes(questCat))
    );

    if (hasQuestCategory) {
      // Make sure it's not also a mission (missions take priority)
      const missionCategories = ['Missions', 'Mission'];
      const hasMissionCategory = categories.some(cat =>
        missionCategories.some(missionCat => cat.includes(missionCat))
      );
      // If it has both quest and mission categories, it's likely a mission page
      if (!hasMissionCategory) {
        return true;
      }
    }

    // Secondary: Check filename patterns
    const filenamePatterns = [
      /_Quest\)/, // Quest name ending with "(Quest)"
      /Quest\.html$/i
    ];

    if (filenamePatterns.some(pattern => pattern.test(filename))) {
      return true;
    }

    // Tertiary: Check for quest-specific indicators in content
    const text = $('body').text();
    const hasQuestIndicators =
      /Starting NPC|Quest Giver|Fame Required|Required Fame/i.test(text) ||
      (/Repeatable/i.test(text) && /Quest/i.test(text));

    // Check for quest infobox or table
    const hasQuestTable = $('table').length > 0;
    if (hasQuestTable && hasQuestIndicators) {
      // Look for quest-specific table headers
      const tableText = $('table').first().text();
      if (/Starting NPC|Fame|Quest Type|Repeatable/i.test(tableText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract quest type from categories or content
   */
  extractQuestType($, categories) {
    // Check categories first
    for (const cat of categories) {
      for (const questType of this.questTypes) {
        if (cat.includes(questType)) {
          return questType;
        }
      }
    }

    // Check table for quest type
    const rows = $('table tr');
    let questType = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Quest Type|Type/i.test(header)) {
        questType = $row.find('td').first().text().trim();
        return false; // break
      }
    });

    return questType || undefined;
  }

  /**
   * Extract quest chain information
   */
  extractQuestChain($) {
    // Look for "Quest Chain" or "Part of" in table
    const rows = $('table tr');
    let chain = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Quest Chain|Part of|Chain/i.test(header)) {
        chain = $row.find('td').first().text().trim();
        return false; // break
      }
    });

    return chain || undefined;
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
      if (/Starting NPC|Quest Giver|NPC/i.test(header)) {
        const cell = $row.find('td').first();
        // Get text, preferring link text if available
        const link = cell.find('a').first();
        npc = link.length > 0 ? link.text().trim() : cell.text().trim();
        return false; // break
      }
    });

    return npc || undefined;
  }

  /**
   * Extract starting location (zone name)
   */
  extractStartingLocation($) {
    const rows = $('table tr');
    let location = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Location|Zone/i.test(header)) {
        const cell = $row.find('td').first();
        const link = cell.find('a').first();
        location = link.length > 0 ? link.text().trim() : cell.text().trim();
        return false; // break
      }
    });

    return location || undefined;
  }

  /**
   * Extract required fame level
   */
  extractRequiredFame($) {
    const rows = $('table tr');
    let fame = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Required Fame|Fame Required|Fame/i.test(header)) {
        const cellText = $row.find('td').first().text().trim();
        const match = cellText.match(/(\d+)/);
        if (match) {
          fame = parseInt(match[1]);
          return false; // break
        }
      }
    });

    return fame !== null ? fame : undefined;
  }

  /**
   * Extract required rank
   */
  extractRequiredRank($) {
    const rows = $('table tr');
    let rank = null;

    rows.each((i, row) => {
      const $row = $(row);
      const header = $row.find('th').first().text().trim();
      if (/Required Rank|Rank Required|Rank/i.test(header)) {
        const cellText = $row.find('td').first().text().trim();
        const match = cellText.match(/(\d+)/);
        if (match) {
          rank = parseInt(match[1]);
          return false; // break
        }
      }
    });

    return rank !== null ? rank : undefined;
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

    return description || undefined;
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
   * Extract previous/next quest links (for quest chains)
   */
  extractQuestNavigation($) {
    const navigation = {};
    const rows = $('table tr');

    rows.each((i, row) => {
      const $row = $(row);
      const headers = $row.find('th');
      
      headers.each((j, header) => {
        const $header = $(header);
        const headerText = $header.text().trim();
        
        if (/Previous Quest/i.test(headerText)) {
          const cell = $row.find('td').eq(headers.index($header));
          const link = cell.find('a').first();
          if (link.length > 0) {
            navigation.previousQuest = link.text().trim();
          }
        } else if (/Next Quest/i.test(headerText)) {
          const cell = $row.find('td').eq(headers.index($header));
          const link = cell.find('a').first();
          if (link.length > 0) {
            navigation.nextQuest = link.text().trim();
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
        
        // Look for gil amount
        const gilMatch = rewardText.match(/(\d+)\s*gil/i);
        if (gilMatch) {
          rewards.gil = parseInt(gilMatch[1]);
        }
        
        // Look for fame points
        const fameMatch = rewardText.match(/(\d+)\s*fame/i);
        if (fameMatch) {
          rewards.fame = parseInt(fameMatch[1]);
        }
        
        // Look for experience
        const expMatch = rewardText.match(/(\d+)\s*exp/i);
        if (expMatch) {
          rewards.experience = parseInt(expMatch[1]);
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

    if (!this.isQuestPage($, filename)) {
      return null;
    }

    // Extract page title
    const titleTag = $('title');
    const rawTitle = titleTag.length > 0 ? titleTag.text() : '';
    const pageName = cleanPageTitle(rawTitle, filename);

    const questData = {
      name: pageName,
      type: 'quest',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Extract categories for quest type detection
    const categories = this.extractCategories($);

    // Extract quest details
    const questType = this.extractQuestType($, categories);
    if (questType) {
      questData.questType = questType;
    }

    const questChain = this.extractQuestChain($);
    if (questChain) {
      questData.questChain = questChain;
    }

    const startingNPC = this.extractStartingNPC($);
    if (startingNPC) {
      questData.startingNPC = startingNPC;
    }

    const startingLocation = this.extractStartingLocation($);
    if (startingLocation) {
      questData.startingLocation = startingLocation;
    }

    const requiredFame = this.extractRequiredFame($);
    if (requiredFame !== undefined) {
      questData.requiredFame = requiredFame;
    }

    const requiredRank = this.extractRequiredRank($);
    if (requiredRank !== undefined) {
      questData.requiredRank = requiredRank;
    }

    const description = this.extractDescription($);
    if (description) {
      questData.description = description;
    }

    const walkthrough = this.extractWalkthrough($);
    if (walkthrough) {
      questData.walkthrough = walkthrough;
    }

    const navigation = this.extractQuestNavigation($);
    if (navigation.previousQuest) {
      questData.previousQuest = navigation.previousQuest;
    }
    if (navigation.nextQuest) {
      questData.nextQuest = navigation.nextQuest;
    }

    const rewards = this.extractRewards($);
    if (rewards) {
      questData.rewards = rewards;
    }

    const repeatable = this.extractRepeatable($);
    if (repeatable !== null) {
      questData.repeatable = repeatable;
    }

    // Validate against schema
    const result = questSchema.safeParse(questData);
    if (!result.success) {
      console.error(`Quest validation error for ${filename}:`, result.error.message);
      return null;
    }

    return result.data;
  }
}

export default QuestParser;

