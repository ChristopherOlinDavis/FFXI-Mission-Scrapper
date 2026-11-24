import * as cheerio from 'cheerio';
import { zoneSchema } from '../schemas/zone.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse zone/area pages from BGWiki and FFXIClopedia
 */
export class ZoneParser {
  constructor() {
    this.detectionKeywords = {
      sight: ['Sight'],
      sound: ['Sound'],
      scent: ['Scent'],
      magic: ['Magic'],
      low_hp: ['Low HP'],
      true_sight: ['True Sight'],
      true_sound: ['True Sound']
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
   * Determine if this page is a zone page
   */
  isZonePage($, filename) {
    

    // Primary detection: Check page categories
    const categories = this.extractCategories($);
    const zoneCategories = [
      'Areas', 'Zones', 'Field', 'Region', 'Dungeon', 'City',
      'Town', 'Stronghold', 'Sanctum', 'Battlefield',
      'Quon', 'Mindartia', 'Aradjiah', 'Ulbuka', 'Norvallen',
      'Kolshushu', 'Elshimo', 'Li\'Telor', 'Valdeaunia',
      'Fauregandi', 'Derfland', 'Sarutabaruta', 'Gustaberg',
      'Ronfaure', 'Zulkheim', 'Kuzotz', 'Aragoneu'
    ];

    const hasZoneCategory = categories.some(cat =>
      zoneCategories.some(zoneCat => cat.includes(zoneCat))
    );

    if (hasZoneCategory) {
      return true;
    }

    // Secondary detection: Check for zone-specific indicators
    const hasZoneAdversaries = $('[class*="Zone_Adversaries"]').length > 0;

    let hasConnectedAreas = false;
    $('h2, h3').each((i, h) => {
      if (/Connected Areas/i.test($(h).text())) {
        hasConnectedAreas = true;
        return false; // break
      }
    });

    let hasWeatherSection = false;
    $('h2, h3').each((i, h) => {
      if (/Weather/i.test($(h).text())) {
        hasWeatherSection = true;
        return false; // break
      }
    });

    // Tertiary: Check filename patterns (least reliable)
    const zonePatterns = [
      /_Range$/, /_Caverns?$/, /_Peaks?$/, /_Valley$/, /_Forest$/,
      /_Castle$/, /_Citadel$/, /Ru.Hmet/, /_Isle$/, /_Grounds$/,
      /_Downs$/, /_Coast$/, /_Cape$/, /_Highlands?$/, /_Lowlands?$/,
      /_Temple$/, /_Stronghold$/, /_Sanctum$/
    ];

    const matchesPattern = zonePatterns.some(p => p.test(filename));

    return hasZoneAdversaries || hasConnectedAreas || hasWeatherSection || matchesPattern;
  }

  /**
   * Parse detection methods from icon or text
   */
  parseDetectionMethods($, $cell) {
    const methods = [];
    const text = $cell.text().toLowerCase();

    for (const [method, keywords] of Object.entries(this.detectionKeywords)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        methods.push(method);
      }
    }

    // Check for icons/images
    const imgs = $cell.find('img');
    imgs.each((i, img) => {
      const $img = $(img);
      const alt = ($img.attr('alt') || '').toLowerCase();
      const src = ($img.attr('src') || '').toLowerCase();

      if (alt.includes('sight') || src.includes('sight')) methods.push('sight');
      if (alt.includes('sound') || src.includes('sound')) methods.push('sound');
      if (alt.includes('scent') || src.includes('scent')) methods.push('scent');
      if (alt.includes('magic') || src.includes('magic')) methods.push('magic');
      if (alt.includes('hp') || src.includes('hp')) methods.push('low_hp');
    });

    return [...new Set(methods)]; // Remove duplicates
  }

  /**
   * Parse monster table rows
   */
  parseMonsterTable($, $table) {
    const monsters = [];
    const rows = $table.find('tr');

    rows.each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length < 2) return; // Skip header or empty rows

      const monster = {};

      // Try to extract monster name (usually in a link)
      const cell0Link = cells.eq(0).find('a').first();
      const cell1Link = cells.eq(1).find('a').first();
      const nameLink = cell0Link.length > 0 ? cell0Link : cell1Link;

      if (nameLink.length > 0) {
        monster.name = nameLink.text().trim();
      } else {
        monster.name = (cells.eq(0).text() || cells.eq(1).text() || '').trim();
      }

      if (!monster.name || monster.name === '') return;

      // Extract level (usually in first or second cell)
      for (let i = 0; i < Math.min(cells.length, 3); i++) {
        const cellText = cells.eq(i).text().trim();
        const levelMatch = cellText.match(/(\d+)(?:-(\d+))?/);
        if (levelMatch) {
          monster.level = levelMatch[2] ? `${levelMatch[1]}-${levelMatch[2]}` : parseInt(levelMatch[1]);
          break;
        }
      }

      // Try to extract detection methods (usually in later cells)
      for (let i = 2; i < cells.length; i++) {
        const $cell = cells.eq(i);
        const methods = this.parseDetectionMethods($, $cell);
        if (methods.length > 0) {
          monster.detectionMethods = methods;

          // Check if aggressive
          const cellText = $cell.text().toLowerCase();
          if (cellText.includes('aggro') || cellText.includes('aggressive')) {
            monster.aggressive = true;
          }
        }
      }

      // Check for linking behavior
      const rowText = $row.text().toLowerCase();
      if (rowText.includes('link')) {
        monster.linking = true;
      }

      monsters.push(monster);
    });

    return monsters;
  }

  /**
   * Parse Named Monster (NM) table rows
   */
  parseNMTable($, $table) {
    const nms = [];
    const rows = $table.find('tr');

    rows.each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length < 2) return;

      const nm = {};

      // Extract NM name
      const cell0Link = cells.eq(0).find('a').first();
      const cell1Link = cells.eq(1).find('a').first();
      const nameLink = cell0Link.length > 0 ? cell0Link : cell1Link;

      if (nameLink.length > 0) {
        nm.name = nameLink.text().trim();
      } else {
        nm.name = (cells.eq(0).text() || cells.eq(1).text() || '').trim();
      }

      if (!nm.name || nm.name === '') return;

      // Extract level
      for (let i = 0; i < Math.min(cells.length, 3); i++) {
        const cellText = cells.eq(i).text().trim();
        const levelMatch = cellText.match(/(\d+)(?:-(\d+))?/);
        if (levelMatch) {
          nm.level = levelMatch[2] ? `${levelMatch[1]}-${levelMatch[2]}` : parseInt(levelMatch[1]);
          break;
        }
      }

      // Look for spawn condition mentions
      const rowText = $row.text();
      if (/lottery/i.test(rowText)) nm.spawnCondition = 'Lottery';
      if (/forced/i.test(rowText)) nm.spawnCondition = 'Forced';
      if (/timed/i.test(rowText)) nm.spawnCondition = 'Timed';
      if (/respawn/i.test(rowText)) {
        const timeMatch = rowText.match(/(\d+)\s*(min|hour|hr)/i);
        if (timeMatch) {
          nm.respawnTime = timeMatch[0];
        }
      }

      nms.push(nm);
    });

    return nms;
  }

  /**
   * Parse connected areas
   */
  parseConnectedAreas($) {
    const connected = [];

    // Look for "Connected Areas" section
    const headings = $('h2, h3, h4');
    let connectedHeading = null;

    headings.each((i, h) => {
      const $h = $(h);
      if (/Connected Areas/i.test($h.text())) {
        connectedHeading = $h;
        return false; // break
      }
    });

    if (connectedHeading) {
      let element = connectedHeading.next();

      // Find the list or table with connected areas
      while (element.length > 0 && !element.is('h2, h3, h4')) {
        if (element.is('ul, ol')) {
          const items = element.find('li');
          items.each((i, item) => {
            const link = $(item).find('a').first();
            if (link.length > 0) {
              connected.push({ name: link.text().trim() });
            }
          });
          break;
        }
        element = element.next();
      }
    }

    return connected;
  }

  /**
   * Main parse function
   */
  parse(html, sourceUrl, filename) {
    const $ = cheerio.load(html);
    

    if (!this.isZonePage($, filename)) {
      return null;
    }

    // Extract zone name from <title> tag
    const name = this.extractPageTitle($, filename);

    const zoneData = {
      name,
      type: 'zone',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Parse description
    const firstParagraph = $('.mw-parser-output > p').first();
    if (firstParagraph) {
      zoneData.description = firstParagraph.text().trim();
    }

    // Parse connected areas
    const connectedAreas = this.parseConnectedAreas($);
    if (connectedAreas.length > 0) {
      zoneData.connectedAreas = connectedAreas;
    }

    // Parse monster tables (exclude navigation/sidebar/infobox tables)
    const monsters = [];
    const namedMonsters = [];

    // Only parse tables from main content area, excluding navigation
    const contentTables = $('.mw-parser-output table, .content table, #mw-content-text table');

    contentTables.each((i, table) => {
      const $table = $(table);

      // Skip navigation, infobox, and sidebar tables
      const tableClass = $table.attr('class') || '';
      const tableParentClass = $table.parent().attr('class') || '';
      const skipPatterns = [
        'infobox', 'navbox', 'navigation', 'sidebar', 'mbox',
        'metadata', 'toc', 'vertical-navbox', 'nav',
        'zone-infobox', 'area-infobox', 'wikitable-info'
      ];

      const shouldSkip = skipPatterns.some(pattern =>
        tableClass.toLowerCase().includes(pattern) ||
        tableParentClass.toLowerCase().includes(pattern)
      );

      if (shouldSkip) return;

      const tableText = $table.text();

      // Check if this is a monster table
      if (/Level|Name|Aggro|Detection/i.test(tableText)) {
        const parsedMonsters = this.parseMonsterTable($, $table);

        // Filter out navigation-like monster names
        const validMonsters = parsedMonsters.filter(m => {
          const name = m.name.toLowerCase();
          const originalName = m.name;

          // Skip generic UI placeholders
          if (['none', 'npcs', '---', 'n/a'].includes(name)) {
            return false;
          }

          // Skip time patterns (HH:MM format)
          if (/^\d{2}:\d{2}$/.test(name)) {
            return false;
          }

          // Navigation and UI elements
          const navPatterns = [
            'japanese', 'english', 'timeline', 'requires', 'activities',
            'weather', 'zone type', 'survival guide', 'unity warp',
            'teleport', 'proto-waypoint', 'fields of valor', 'hunts',
            'goblin footprint', 'home point', 'plaiaude', 'quon', 'zulkheim',
            "san d'oria", 'bastok', 'windurst', 'jeuno', 'rusese',
            'fov:', 'elite training', 'explorer', 'footsteps', 'forge',
            'destiny', 'past perfect', 'tenshodo', 'mission',
            'map vendor', 'voidwatch warp', 'geomagnetic fount', 'garrison',
            'mog house', 'chocobo', 'auction house', 'vendor', 'guide',
            'valkurm', 'mindartia', 'sarutabaruta', 'expeditionary force'
          ];

          if (navPatterns.some(pattern => name.includes(pattern))) {
            return false;
          }

          // Zone name patterns (things that look like zone names)
          const zonePatterns = [
            'peninsula', 'highlands?', 'mountains?', 'cavern', 'castle',
            'temple', 'sanctuary', 'hall of', 'maze of', 'abyssea',
            'dynamis', 'reisenjima', 'aragoneu', 'kolshushu', "al'taieu",
            'mhoji', 'pucotte', 'mandragora-mad'
          ];

          if (zonePatterns.some(pattern => new RegExp(pattern, 'i').test(name))) {
            return false;
          }

          // Quest name patterns (capitalized words with "the", "a", "an")
          if (/^(the|a|an)\s+[A-Z]/i.test(originalName) && originalName.split(' ').length > 2) {
            return false;
          }

          // Skip very short names (likely UI elements)
          if (name.length < 3) {
            return false;
          }

          // Skip if it contains obvious quest keywords or phrases
          if (/quest|journey|adventure|always|twice|say it with|flowers/i.test(name)) {
            return false;
          }

          return true;
        });

        monsters.push(...validMonsters);
      }

      // Check if this is an NM table
      if (/Notorious Monster|Named Monster|NM/i.test(tableText) ||
          tableClass.includes('NM')) {
        const parsedNMs = this.parseNMTable($, $table);
        namedMonsters.push(...parsedNMs);
      }
    });

    if (monsters.length > 0) {
      zoneData.monsters = monsters;
    }

    if (namedMonsters.length > 0) {
      zoneData.namedMonsters = namedMonsters;
    }

    // Validate against schema
    const result = zoneSchema.safeParse(zoneData);
    if (!result.success) {
      console.error(`Zone validation error for ${filename}:`, result.error.message);
      return null;
    }

    return result.data;
  }
}

export default ZoneParser;
