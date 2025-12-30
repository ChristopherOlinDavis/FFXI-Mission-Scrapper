/**
 * BG Wiki Parser
 * Parses mission HTML from BG Wiki (www.bg-wiki.com)
 */

import { BaseParser } from './base-parser.js';
import { extractBGWikiInfobox, extractRewards, estimateDifficulty } from './infobox-extractor.js';
import { extractPrerequisites } from './prerequisite-extractor.js';
import { parseWalkthroughToNodes } from './walkthrough-parser.js';

export class BGWikiParser extends BaseParser {
  /**
   * Parse a mission from BG Wiki HTML
   * @param {string} url - Mission URL
   * @param {string} missionSetId - Mission set identifier
   * @returns {Object} Parsed mission object
   */
  async parseMission(url, missionSetId) {
    const $ = await this.readHTML(url);

    // Extract title
    const title = this.cleanText($('h1#firstHeading').text()) ||
                  this.cleanText($('h1.firstHeading').text());

    if (!title) {
      throw new Error(`Could not find mission title for ${url}`);
    }

    const missionId = this.generateId(missionSetId, title);

    // Extract metadata from infobox
    const infoboxMetadata = extractBGWikiInfobox($, this.cleanText.bind(this));

    // Extract walkthrough steps
    const walkthroughSteps = this.extractWalkthrough($);

    // Convert steps to nodes
    const nodes = parseWalkthroughToNodes(walkthroughSteps, missionId);

    // Extract prerequisites
    const prerequisites = extractPrerequisites(
      $,
      infoboxMetadata,
      missionId,
      this.cleanText.bind(this),
      this.generateId.bind(this)
    );

    // Extract rewards
    const rewards = extractRewards($, this.cleanText.bind(this));

    // Build mission metadata
    const metadata = {
      category: this.inferCategory(missionSetId),
      missionSet: missionSetId,
      minLevel: infoboxMetadata.level,
      difficulty: estimateDifficulty(infoboxMetadata.level),
      rewards: rewards.length > 0 ? rewards : undefined
    };

    return {
      id: missionId,
      title,
      number: infoboxMetadata.number,
      url,
      nodes: nodes.length > 0 ? nodes : this.createFallbackNode(missionId, title),
      prerequisites,
      previousMission: infoboxMetadata.previousMission,
      nextMission: infoboxMetadata.nextMission,
      metadata
    };
  }

  /**
   * Extract walkthrough steps from BG Wiki page
   * @param {Cheerio} $ - Cheerio instance
   * @returns {Array} Array of walkthrough steps
   */
  extractWalkthrough($) {
    const steps = [];

    // BG Wiki uses #Walkthrough anchor
    const walkthroughHeading = $('#Walkthrough').parent();

    if (walkthroughHeading.length === 0) {
      // Try alternative heading
      const altHeading = $('h2:contains("Walkthrough"), h3:contains("Walkthrough")').first();
      if (altHeading.length > 0) {
        return this.extractStepsFromHeading($, altHeading);
      }
      return steps;
    }

    return this.extractStepsFromHeading($, walkthroughHeading);
  }

  /**
   * Extract steps from a walkthrough heading
   * @param {Cheerio} $ - Cheerio instance
   * @param {Cheerio} heading - Walkthrough heading element
   * @returns {Array} Array of walkthrough steps
   */
  extractStepsFromHeading($, heading) {
    const steps = [];

    // Try ordered list first
    heading.nextAll('ol').first().find('> li').each((i, elem) => {
      const text = this.cleanText($(elem).text());
      const step = this.parseListItemToStep(text);
      if (step) {
        steps.push(step);
      }
    });

    // If no ordered list, try unordered list
    if (steps.length === 0) {
      heading.nextAll('ul').first().find('> li').each((i, elem) => {
        const text = this.cleanText($(elem).text());
        const step = this.parseListItemToStep(text);
        if (step) {
          steps.push(step);
        }
      });
    }

    // Look for paragraphs with numbered steps
    if (steps.length === 0) {
      heading.nextUntil('h2, h3').filter('p').each((i, elem) => {
        const text = this.cleanText($(elem).text());
        if (text && text.length > 10) {
          const step = this.parseListItemToStep(text);
          if (step) {
            steps.push(step);
          }
        }
      });
    }

    return steps;
  }

  /**
   * Create fallback node when no walkthrough is found
   * @param {string} missionId - Mission ID
   * @param {string} title - Mission title
   * @returns {Array} Array with single fallback node
   */
  createFallbackNode(missionId, title) {
    return [{
      id: `${missionId}-node-1`,
      orderIndex: 0,
      title: 'Complete mission',
      description: `Complete the mission: ${title}`,
      dependencies: [],
      location: undefined
    }];
  }

  /**
   * Infer category from mission set ID
   * @param {string} missionSetId - Mission set ID
   * @returns {string} Category
   */
  inferCategory(missionSetId) {
    const lowerSetId = missionSetId.toLowerCase();

    if (lowerSetId.includes('bastok') || lowerSetId.includes('sandoria') || lowerSetId.includes('windurst')) {
      return 'nation';
    }
    if (lowerSetId.includes('zilart') || lowerSetId.includes('promathia') || lowerSetId.includes('toau') ||
        lowerSetId.includes('wotg') || lowerSetId.includes('soa') || lowerSetId.includes('rov')) {
      return 'expansion';
    }
    if (lowerSetId.includes('addon') || lowerSetId.includes('asa') || lowerSetId.includes('amk') || lowerSetId.includes('acp')) {
      return 'addon';
    }

    return 'other';
  }
}
