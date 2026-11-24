import * as cheerio from 'cheerio';
import ZoneParser from './zone-parser.js';
import SpellParser from './spell-parser.js';
import JobParser from './job-parser.js';
import ItemParser from './item-parser.js';
import MissionParser from './mission-parser.js';
import QuestParser from './quest-parser.js';

/**
 * Generic parser that automatically routes to the appropriate content-specific parser
 * Now using Cheerio for better memory efficiency and performance
 */
export class GenericParser {
  constructor() {
    // Initialize all parsers
    this.parsers = {
      mission: new MissionParser(),
      quest: new QuestParser(),
      zone: new ZoneParser(),
      spell: new SpellParser(),
      job: new JobParser(),
      item: new ItemParser()
    };

    // Parser priority order (some content might match multiple)
    // Mission comes before quest since missions can have quest categories
    this.parserOrder = ['mission', 'quest', 'job', 'zone', 'spell', 'item'];
  }

  /**
   * Detect content type based on filename and content
   */
  detectContentType(html, filename) {
    const $ = cheerio.load(html);

    // Try each parser's detection method in priority order
    for (const parserType of this.parserOrder) {
      const parser = this.parsers[parserType];

      // Check if parser has a detection method
      if (typeof parser.isMissionPage === 'function' && parser.isMissionPage($, filename)) {
        return 'mission';
      }
      if (typeof parser.isQuestPage === 'function' && parser.isQuestPage($, filename)) {
        return 'quest';
      }
      if (typeof parser.isJobPage === 'function' && parser.isJobPage($, filename)) {
        return 'job';
      }
      if (typeof parser.isZonePage === 'function' && parser.isZonePage($, filename)) {
        return 'zone';
      }
      if (typeof parser.isSpellPage === 'function' && parser.isSpellPage($, filename)) {
        return 'spell';
      }
      if (typeof parser.isItemPage === 'function' && parser.isItemPage($, filename)) {
        return 'item';
      }
    }

    return 'unknown';
  }

  /**
   * Parse content using the appropriate parser
   */
  parse(html, sourceUrl, filename) {
    const contentType = this.detectContentType(html, filename);

    if (contentType === 'unknown') {
      return {
        type: 'unknown',
        name: filename.replace(/^(bgwiki|ffxiclopedia)-/, '').replace(/_/g, ' '),
        sourceUrl,
        metadata: {
          source: filename.startsWith('bgwiki') ? 'bgwiki' : 'ffxiclopedia',
          scrapedAt: new Date().toISOString(),
          rawFilename: filename
        }
      };
    }

    const parser = this.parsers[contentType];
    try {
      const result = parser.parse(html, sourceUrl, filename);
      if (result) {
        return { ...result, detectedType: contentType };
      }
    } catch (error) {
      console.error(`Error parsing ${filename} as ${contentType}:`, error.message);
      return null;
    }

    return null;
  }

  /**
   * Parse multiple files
   */
  async parseMultiple(files, options = {}) {
    const results = {
      missions: [],
      quests: [],
      zones: [],
      spells: [],
      jobs: [],
      items: [],
      unknown: [],
      errors: []
    };

    const { onProgress, limit } = options;
    const filesToProcess = limit ? files.slice(0, limit) : files;

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];

      try {
        const parsed = this.parse(file.html, file.url, file.filename);

        if (parsed) {
          const type = parsed.detectedType || parsed.type;

          switch (type) {
            case 'mission':
              results.missions.push(parsed);
              break;
            case 'quest':
              results.quests.push(parsed);
              break;
            case 'zone':
              results.zones.push(parsed);
              break;
            case 'spell':
              results.spells.push(parsed);
              break;
            case 'job':
              results.jobs.push(parsed);
              break;
            case 'item':
              results.items.push(parsed);
              break;
            default:
              results.unknown.push(parsed);
          }
        }

        if (onProgress) {
          onProgress(i + 1, filesToProcess.length, file.filename, parsed?.detectedType || 'unknown');
        }
      } catch (error) {
        results.errors.push({
          filename: file.filename,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get statistics about detected content types
   */
  getStats(results) {
    return {
      missions: results.missions.length,
      quests: results.quests.length,
      zones: results.zones.length,
      spells: results.spells.length,
      jobs: results.jobs.length,
      items: results.items.length,
      unknown: results.unknown.length,
      errors: results.errors.length,
      total: results.missions.length + results.quests.length + results.zones.length + 
             results.spells.length + results.jobs.length + results.items.length + results.unknown.length
    };
  }
}

export default GenericParser;
