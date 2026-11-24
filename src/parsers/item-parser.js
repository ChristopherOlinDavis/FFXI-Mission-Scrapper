import * as cheerio from 'cheerio';
import { itemSchema } from '../schemas/item.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Parse item/equipment pages from BGWiki and FFXIClopedia
 */
export class ItemParser {
  constructor() {
    this.slots = ['Main', 'Sub', 'Range', 'Ammo', 'Head', 'Neck', 'Ear', 'Body', 'Hands', 'Ring', 'Back', 'Waist', 'Legs', 'Feet'];
    this.stats = ['DEF', 'HP', 'MP', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR',
                  'Attack', 'Accuracy', 'Ranged Attack', 'Ranged Accuracy',
                  'Magic Attack', 'Magic Accuracy', 'Magic Defense', 'Evasion',
                  'Haste', 'Store TP', 'Dual Wield', 'Enmity', 'Critical Hit Rate'];
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
   * Determine if this page is an item page
   */
  isItemPage($, filename) {
    

    // Exclude category pages immediately
    if (filename.includes('Category:') || filename.startsWith('bgwiki-Category') || filename.startsWith('ffxiclopedia-Category')) {
      return false;
    }

    // Primary detection: Check page categories
    const categories = this.extractCategories($);

    // Exclude pages that are only categorized as quests, missions, monsters, etc.
    const nonItemCategories = ['Quests', 'Missions', 'Notorious Monsters', 'Monsters', 'NPCs', 'Bestiary'];
    const hasNonItemCategory = categories.some(cat =>
      nonItemCategories.some(nonItemCat => cat.includes(nonItemCat))
    );

    if (hasNonItemCategory && categories.length <= 3) {
      // If it's primarily a monster/quest/NPC page, not an item
      return false;
    }

    const itemCategories = [
      // Weapons
      'Swords', 'Great Swords', 'Axes', 'Great Axes', 'Scythes',
      'Polearms', 'Katana', 'Great Katana', 'Clubs', 'Staves',
      'Daggers', 'Bows', 'Marksmanship', 'Guns', 'Hand-to-Hand',
      // Armor
      'Head Armor', 'Body Armor', 'Hands Armor', 'Legs Armor', 'Feet Armor',
      'Neck Armor', 'Earrings', 'Rings', 'Back Armor', 'Waist Armor',
      'Armor', 'Equipment',
      // Item types
      'Items', 'Weapons', 'Medicine', 'Food', 'Furnishings',
      'Crystals', 'Currency', 'Key Items',
      // Special equipment
      'Relic Weapons', 'Relic Armor', 'Mythic Weapons', 'Empyrean Weapons',
      'Aeonic Weapons', 'Artifact Armor'
    ];

    const hasItemCategory = categories.some(cat =>
      itemCategories.some(itemCat => cat.includes(itemCat))
    );

    if (hasItemCategory) {
      return true;
    }

    // Secondary detection: Check for item-specific indicators
    const text = $('body').text();
    const hasItemIndicators =
      /Item Level|Statistics|Latent Effect|Enchantment|Augments/i.test(text) ||
      /Rare|Exclusive|Ex Rare|Stack Size/i.test(text) ||
      /(DEF|HP|MP|STR|DEX|VIT|AGI|INT|MND|CHR):\s*[+-]?\d+/i.test(text);

    // Check for item infobox
    const hasItemInfobox =
      $('.item-infobox, .itembox, [class*="Item"]').length > 0;

    // Tertiary: Check filename patterns for common items
    const itemPatterns = [
      /_Ring$/, /_Sword$/, /_Staff$/, /_Robe$/, /_Armor$/,
      /_Helmet$/, /_Boots$/, /_Gloves$/, /_Culottes$/, /_Tights$/,
      /_Mace$/, /_Axe$/, /_Scythe$/, /_Blade$/, /_Dagger$/,
      /_Wand$/, /_Bow$/, /_Gun$/, /_Club$/, /_Shield$/,
      /_Cape$/, /_Mantle$/, /_Belt$/, /_Earring$/, /_Necklace$/,
      /_Gorget$/, /Kaja_/, /Relic_/, /Mythic_/, /Empyrean_/, /Aeonic_/
    ];

    const matchesPattern = itemPatterns.some(p => p.test(filename));

    return hasItemIndicators || hasItemInfobox || matchesPattern;
  }

  /**
   * Parse item statistics from infobox or table
   */
  parseStats($) {
    const stats = {};
    const text = $('body').text();

    // Try to extract stats from text patterns
    for (const stat of this.stats) {
      const pattern = new RegExp(`${stat.replace(/\s+/g, '\\s+')}[:\\s]+([+-]?\\d+%?)`, 'i');
      const match = text.match(pattern);

      if (match) {
        const value = match[1];
        const statKey = stat.replace(/\s+/g, '_');

        // Parse as number if possible, otherwise keep as string
        if (value.includes('%')) {
          stats[statKey] = value;
        } else {
          stats[statKey] = parseInt(value);
        }
      }
    }

    // Look for infobox with stats
    const infobox = $('.item-infobox, .itembox, table').first();
    if (infobox) {
      const rows = $(infobox).find('tr');

      for (const row of rows) {
        const header = $(row).find('th, td:first-child').first();
        const value = $(row).find('td:last-child').first();

        if (!header || !value) continue;

        const key = header.text().trim();
        const val = value.text().trim();

        // Try to match known stats
        for (const stat of this.stats) {
          if (key.toLowerCase().includes(stat.toLowerCase())) {
            const statKey = stat.replace(/\s+/g, '_');
            const numMatch = val.match(/([+-]?\d+%?)/);
            if (numMatch) {
              stats[statKey] = numMatch[1].includes('%') ? numMatch[1] : parseInt(numMatch[1]);
            }
          }
        }
      }
    }

    return Object.keys(stats).length > 0 ? stats : undefined;
  }

  /**
   * Parse item level and requirements
   */
  parseRequirements($) {
    const reqs = {};
    const text = $('body').text();

    // Item Level
    const itemLevelMatch = text.match(/Item\s+Level[:\s]+(\d+)/i);
    if (itemLevelMatch) {
      reqs.itemLevel = parseInt(itemLevelMatch[1]);
    }

    // Required Level
    const levelMatch = text.match(/(?:Lv\.?|Level)[:\s]+(\d+)/i);
    if (levelMatch && !reqs.itemLevel) {
      reqs.level = parseInt(levelMatch[1]);
    }

    return reqs;
  }

  /**
   * Parse job restrictions
   */
  parseJobs($) {
    const text = $('body').text();

    // Look for job abbreviations
    const jobPattern = /(?:Jobs?|All Jobs)[:\s]+(.+?)(?:\n|$)/i;
    const jobMatch = text.match(jobPattern);

    if (jobMatch) {
      const jobsText = jobMatch[1];

      // Match all job abbreviations (WAR, MNK, WHM, etc.)
      const jobs = jobsText.match(/\b[A-Z]{3}\b/g);

      if (jobs && jobs.length > 0) {
        return { jobs: [...new Set(jobs)] }; // Remove duplicates
      }
    }

    return undefined;
  }

  /**
   * Parse item properties (rare, exclusive, etc.)
   */
  parseProperties($) {
    const props = {};
    const text = $('body').text();

    if (/\b(?:Rare|R)\b/i.test(text)) props.rare = true;
    if (/\b(?:Exclusive|Ex)\b/i.test(text)) props.exclusive = true;
    if (/\bEx\s*Rare\b/i.test(text)) props.exRare = true;

    // Stack size
    const stackMatch = text.match(/Stack[:\s]+(\d+)/i);
    if (stackMatch) {
      props.stackSize = parseInt(stackMatch[1]);
    }

    return Object.keys(props).length > 0 ? props : undefined;
  }

  /**
   * Parse equipment slot
   */
  parseSlot($) {
    const text = $('body').text();

    for (const slot of this.slots) {
      const pattern = new RegExp(`\\b${slot}\\b(?:\\s+Slot)?`, 'i');
      if (pattern.test(text)) {
        return slot;
      }
    }

    return undefined;
  }

  /**
   * Parse effects and enchantments
   */
  parseEffects($) {
    const effects = [];
    const text = $('body').text();

    // Look for effects section
    const effectsMatch = text.match(/(?:Effect|Enchantment)[:\s]+(.+?)(?:\n|$)/gi);

    if (effectsMatch) {
      effectsMatch.forEach(match => {
        const effect = match.replace(/(?:Effect|Enchantment)[:\s]+/i, '').trim();
        if (effect.length > 0) {
          effects.push(effect);
        }
      });
    }

    return effects.length > 0 ? effects : undefined;
  }

  /**
   * Parse weapon-specific data
   */
  parseWeaponData($) {
    const weaponData = {};
    const text = $('body').text();

    // Damage
    const dmgMatch = text.match(/(?:DMG|Damage)[:\s]+(\d+)/i);
    if (dmgMatch) {
      weaponData.damage = parseInt(dmgMatch[1]);
    }

    // Delay
    const delayMatch = text.match(/Delay[:\s]+(\d+)/i);
    if (delayMatch) {
      weaponData.delay = parseInt(delayMatch[1]);
    }

    // Calculate DPS
    if (weaponData.damage && weaponData.delay) {
      weaponData.dps = Math.round((weaponData.damage / weaponData.delay) * 60 * 100) / 100;
    }

    return Object.keys(weaponData).length > 0 ? weaponData : undefined;
  }

  /**
   * Parse description
   */
  parseDescription($) {
    const paragraphs = $('.mw-parser-output > p, .content > p');

    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs.eq(i).text().trim();
      if (text.length > 20) {
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
    

    if (!this.isItemPage($, filename)) {
      return null;
    }

    // Extract item name from <title> tag
    const name = this.extractPageTitle($, filename);

    const itemData = {
      name,
      type: 'item',
      sourceUrl,
      metadata: {
        source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
        scrapedAt: new Date().toISOString(),
        rawFilename: filename
      }
    };

    // Parse description
    const description = this.parseDescription($);
    if (description) {
      itemData.description = description;
    }

    // Parse stats
    const stats = this.parseStats($);
    if (stats) {
      itemData.stats = stats;
    }

    // Parse requirements
    const requirements = this.parseRequirements($);
    Object.assign(itemData, requirements);

    // Parse job restrictions
    const jobs = this.parseJobs($);
    if (jobs) {
      itemData.jobs = jobs;
    }

    // Parse properties
    const properties = this.parseProperties($);
    if (properties) {
      Object.assign(itemData, properties);
    }

    // Parse slot
    const slot = this.parseSlot($);
    if (slot) {
      itemData.slot = slot;
    }

    // Parse effects
    const effects = this.parseEffects($);
    if (effects) {
      itemData.effects = effects;
    }

    // Parse weapon data
    const weaponData = this.parseWeaponData($);
    if (weaponData) {
      Object.assign(itemData, weaponData);
    }

    // Validate against schema
    const result = itemSchema.safeParse(itemData);
    if (!result.success) {
      console.error(`Item validation error for ${filename}:`, result.error.message);
      return null;
    }

    return result.data;
  }
}

export default ItemParser;
