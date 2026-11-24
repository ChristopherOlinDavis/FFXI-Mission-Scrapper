import * as cheerio from 'cheerio';
import { itemSchema } from '../schemas/item.js';
import { cleanPageTitle } from '../utils/title-cleaner.js';

/**
 * Enhanced Item Parser with content-based detection
 * Parses item/equipment pages from BGWiki and FFXIClopedia
 */
export class ItemParserEnhanced {
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
   * Content-based item detection (doesn't rely on categories)
   */
  detectItemByContent($, text) {
    // Check for item-specific tables and sections
    const hasItemLevel = /Item\s+Level[:\s]+\d+/i.test(text);
    const hasStats = /(DEF|HP|MP|STR|DEX|VIT|AGI|INT|MND|CHR)[:\s]+[+-]?\d+/i.test(text);
    const hasSlot = /(Main|Sub|Range|Ammo|Head|Neck|Ear|Body|Hands|Ring|Back|Waist|Legs|Feet)(\s+Slot)?/i.test(text);
    const hasRareEx = /\b(Rare|Exclusive|Ex\s*Rare)\b/i.test(text);
    const hasStackSize = /Stack[:\s]+\d+/i.test(text);
    const hasDamageDelay = /(DMG|Damage)[:\s]+\d+.*Delay[:\s]+\d+/i.test(text);

    // Look for item infobox or table
    const hasItemTable = $('table').filter((i, el) => {
      const tableText = $(el).text();
      return /Item\s+Level|Statistics|Latent\s+Effect/i.test(tableText);
    }).length > 0;

    // Check for weapon/armor indicators
    const hasWeaponIndicators = /(DMG|Damage|Delay|D\s*\/\s*Delay)/i.test(text);
    const hasArmorIndicators = /(Defense|DEF)[:\s]+\d+/i.test(text);

    // Score-based detection
    let score = 0;
    if (hasItemLevel) score += 3;
    if (hasStats) score += 2;
    if (hasSlot) score += 2;
    if (hasRareEx) score += 1;
    if (hasStackSize) score += 1;
    if (hasDamageDelay) score += 3;
    if (hasItemTable) score += 2;
    if (hasWeaponIndicators) score += 2;
    if (hasArmorIndicators) score += 2;

    return score >= 3; // Threshold for item detection
  }

  /**
   * Enhanced detection - try categories first, then content
   */
  isItemPage($, filename) {
    // Exclude category pages and special pages immediately
    if (filename.includes('Category:') ||
        filename.startsWith('bgwiki-Category') ||
        filename.startsWith('ffxiclopedia-Category') ||
        filename.includes('Talk:') ||
        filename.includes('User:') ||
        filename.includes('Template:')) {
      return false;
    }

    const text = $('body').text();

    // Primary detection: Check page categories
    const categories = this.extractCategories($);

    // Exclude pages that are primarily non-item categories
    const nonItemCategories = ['Quests', 'Missions', 'Notorious Monsters', 'NPCs', 'Bestiary', 'Monsters'];
    const hasNonItemCategory = categories.some(cat =>
      nonItemCategories.some(nonItemCat => cat.includes(nonItemCat))
    );

    // If it's clearly a quest/mission/monster page, not an item
    if (hasNonItemCategory && categories.length <= 2 && !this.detectItemByContent($, text)) {
      return false;
    }

    // Category-based detection
    const itemCategories = [
      'Swords', 'Great Swords', 'Axes', 'Great Axes', 'Scythes',
      'Polearms', 'Katana', 'Great Katana', 'Clubs', 'Staves',
      'Daggers', 'Bows', 'Marksmanship', 'Guns', 'Hand-to-Hand',
      'Head Armor', 'Body Armor', 'Hands Armor', 'Legs Armor', 'Feet Armor',
      'Neck Armor', 'Earrings', 'Rings', 'Back Armor', 'Waist Armor',
      'Armor', 'Equipment', 'Items', 'Weapons', 'Medicine', 'Food',
      'Furnishings', 'Crystals', 'Currency', 'Key Items', 'Shields',
      'Relic Weapons', 'Relic Armor', 'Mythic Weapons', 'Empyrean Weapons',
      'Aeonic Weapons', 'Artifact Armor', 'Reforged Armor'
    ];

    const hasItemCategory = categories.some(cat =>
      itemCategories.some(itemCat => cat.includes(itemCat))
    );

    if (hasItemCategory) {
      return true;
    }

    // Secondary: Content-based detection
    if (this.detectItemByContent($, text)) {
      return true;
    }

    // Tertiary: Filename-based detection (weapons/armor naming patterns)
    const itemPatterns = [
      /_Ring$/i, /_Sword$/i, /_Staff$/i, /_Robe$/i, /_Armor$/i,
      /_Helmet$/i, /_Boots$/i, /_Gloves$/i, /_Culottes$/i, /_Tights$/i,
      /_Mace$/i, /_Axe$/i, /_Scythe$/i, /_Blade$/i, /_Dagger$/i,
      /_Wand$/i, /_Bow$/i, /_Gun$/i, /_Club$/i, /_Shield$/i,
      /_Cape$/i, /_Mantle$/i, /_Belt$/i, /_Earring$/i, /_Necklace$/i,
      /_Gorget$/i, /Kaja_/i, /Relic_/i, /Mythic_/i, /Empyrean_/i, /Aeonic_/i,
      /_\+1$/i, /_\+2$/i, /_\+3$/i, // Reforged armor/weapons
      /_%2B1$/i, /_%2B2$/i, /_%2B3$/i, // URL-encoded reforged
      /_Set$/i // Armor sets
    ];

    const matchesPattern = itemPatterns.some(p => p.test(filename));
    if (matchesPattern) {
      // Double-check with content to avoid false positives
      return this.detectItemByContent($, text);
    }

    return false;
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

        if (value.includes('%')) {
          stats[statKey] = value;
        } else {
          stats[statKey] = parseInt(value);
        }
      }
    }

    // Look for infobox with stats
    const tables = $('table');
    tables.each((i, table) => {
      const $table = $(table);
      const rows = $table.find('tr');

      rows.each((j, row) => {
        const $row = $(row);
        const header = $row.find('th, td').first();
        const value = $row.find('td').last();

        if (!header.length || !value.length) return;

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
      });
    });

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
    const levelMatch = text.match(/(?:Required\s+)?(?:Lv\.?|Level)[:\s]+(\d+)/i);
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
      const jobs = jobsText.match(/\b[A-Z]{3}\b/g);

      if (jobs && jobs.length > 0) {
        return { jobs: [...new Set(jobs)] };
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

    const effectsMatch = text.match(/(?:Effect|Enchantment)[:\s]+(.+?)(?:\n|$)/gi);

    if (effectsMatch) {
      effectsMatch.forEach(match => {
        const effect = match.replace(/(?:Effect|Enchantment)[:\s]+/i, '').trim();
        if (effect.length > 0 && effect.length < 200) {
          effects.push(effect);
        }
      });
    }

    // Deduplicate
    return effects.length > 0 ? [...new Set(effects)] : undefined;
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
      console.error(`Item validation error for ${filename}:`, result.error.errors.slice(0, 3).map(e => e.message));

      // Return data anyway with validation errors for debugging
      itemData.detectedType = 'item';
      itemData.validationErrors = result.error.errors.map(e => e.message);
      return itemData;
    }

    return result.data;
  }
}

export default ItemParserEnhanced;
