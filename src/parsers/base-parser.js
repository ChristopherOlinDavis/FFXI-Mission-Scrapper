import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

/**
 * Base parser class with shared utilities
 * Provides common functionality for both FFXIclopedia and BG Wiki parsers
 */
export class BaseParser {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'outputHTMLs');
  }

  /**
   * Read HTML file from outputHTMLs/ directory
   */
  async readHTML(url) {
    const filename = this.urlToFilename(url);
    const filepath = path.join(this.outputDir, filename);

    try {
      const html = await fs.readFile(filepath, 'utf-8');
      return cheerio.load(html);
    } catch (error) {
      throw new Error(`HTML not found for ${url}. Download it first using download-manager.`);
    }
  }

  /**
   * Convert URL to filename (synced with download-manager.js logic)
   */
  urlToFilename(url) {
    // Remove protocol
    let filename = url.replace(/^https?:\/\//, '');
    // Replace special characters with underscores (matches download-manager.js)
    filename = filename.replace(/[^a-zA-Z0-9]/g, '_');
    // Add .html extension
    return `${filename}.html`;
  }

  /**
   * Clean text - remove extra whitespace, newlines, etc.
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  /**
   * Extract clean text from HTML element, removing images and other non-text elements
   * @param {CheerioElement} $elem - Cheerio element
   * @returns {string} Clean text content
   */
  extractCleanText($elem) {
    // Clone the element to avoid modifying the original
    const $clone = $elem.clone();

    // Remove figure/img/figcaption tags (these contain map images and captions)
    $clone.find('figure, figcaption, img').remove();

    // Remove nested lists (they are usually warnings/notes)
    $clone.find('ul, ol').remove();

    // Get the text and clean it
    return this.cleanText($clone.text());
  }

  /**
   * Generate a unique ID from a prefix and title
   */
  generateId(prefix, title) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${prefix}-${slug}`;
  }

  /**
   * Extract location coordinates from text (e.g., "(H-9)")
   * Also extracts zone name from patterns like "(Bastok Mines)" or "in Bastok Mines"
   */
  extractLocation(text) {
    const location = {};

    // Extract coordinates like (H-9)
    const coordMatch = text.match(/\(([A-Z]-\d+)\)/);
    if (coordMatch) {
      location.coordinates = coordMatch[1];
    }

    // Extract zone from parentheses at start like "(Bastok Mines)"
    const zoneParenMatch = text.match(/^\(([^)]+?)\)/);
    if (zoneParenMatch && !zoneParenMatch[1].match(/[A-Z]-\d+/)) {
      location.zone = this.cleanText(zoneParenMatch[1]);
    }

    // Extract zone from "in [zone]" or "to [zone]" patterns
    if (!location.zone) {
      const zoneMatch = text.match(/(?:in|to)\s+([\w\s'-]+?)(?:\s*\(|$|,|\.|:)/i);
      if (zoneMatch && !zoneMatch[1].match(/talk|speak|see/i)) {
        location.zone = this.cleanText(zoneMatch[1]);
      }
    }

    // Extract NPC name from "talk to [NPC]" or "speak with [NPC]"
    const npcMatch = text.match(/(?:talk to|speak (?:with|to)|see|deliver.*?to)\s+([A-Z][\w\s'-]+?)(?:\s*\(|$|,|\s+at|\s+in)/);
    if (npcMatch) {
      location.npc = this.cleanText(npcMatch[1]);
    }

    return Object.keys(location).length > 0 ? location : undefined;
  }

  /**
   * Parse a list item into a walkthrough step with title and description
   * Intelligently splits into title and description, extracting first 1-2 sentences
   */
  parseListItemToStep(text) {
    const cleanedText = this.cleanText(text);

    if (!cleanedText || cleanedText.length < 10) {
      return null;
    }

    let title = cleanedText;
    let description = cleanedText;

    // Split text into sentences (handling periods that may be part of abbreviations)
    const sentences = cleanedText.split(/\.\s+(?=[A-Z])/);

    // Try to split into title and description
    // Pattern 1: Use first sentence as title if it's a reasonable length
    if (sentences.length > 1 && sentences[0].length < 120 && sentences[0].length > 15) {
      title = sentences[0];
      // Description is first 1-2 sentences
      description = sentences.slice(0, 2).join('. ');
      if (!description.endsWith('.')) {
        description += '.';
      }
    }
    // Pattern 2: If first sentence is too short, use full text for both
    else if (sentences[0].length <= 15) {
      title = cleanedText;
      description = cleanedText;
    }
    // Pattern 3: If first sentence is very long, keep it as both title and description
    else {
      title = sentences[0];
      description = sentences[0] + '.';
    }

    // Ensure title doesn't get cut off mid-word - only truncate if absolutely necessary
    if (title.length > 150) {
      // Find last complete word before 150 chars
      const lastSpace = title.substring(0, 150).lastIndexOf(' ');
      title = lastSpace > 100 ? title.substring(0, lastSpace) + '...' : title.substring(0, 150);
    }

    return {
      title: title,
      description: description,
      location: this.extractLocation(cleanedText)
    };
  }

  /**
   * Extract title from mission URL
   */
  extractTitleFromURL(url) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart.replace(/_/g, ' '));
  }

  /**
   * Detect wiki source from URL
   */
  detectWikiSource(url) {
    if (url.includes('ffxiclopedia.fandom.com') || url.includes('ffxiclopedia.wikia.com')) {
      return 'ffxiclopedia';
    } else if (url.includes('bg-wiki.com')) {
      return 'bgwiki';
    }
    return 'unknown';
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  async parseMission(url, missionSetId) {
    throw new Error('parseMission() must be implemented by subclass');
  }

  /**
   * Extract the last modified date from wiki page
   */
  extractLastModified($) {
    // Try to find the last modified date in footer
    const footerText = $('#footer-info-lastmod').text();
    if (footerText) {
      const match = footerText.match(/(\d{1,2}\s+\w+\s+\d{4})/);
      if (match) {
        try {
          return new Date(match[1]).toISOString();
        } catch (e) {
          // Invalid date, fall through
        }
      }
    }

    // Default to current date if not found
    return new Date().toISOString();
  }
}
