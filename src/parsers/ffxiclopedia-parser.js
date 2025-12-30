/**
 * FFXIclopedia Parser
 * Parses mission HTML from FFXIclopedia (Fandom wiki)
 */

import { BaseParser } from './base-parser.js';
import { extractFFXIclopediaInfobox, extractRewards, estimateDifficulty } from './infobox-extractor.js';
import { extractPrerequisites } from './prerequisite-extractor.js';
import { parseWalkthroughToNodes } from './walkthrough-parser.js';

export class FFXIclopediaParser extends BaseParser {
  /**
   * Parse a mission from FFXIclopedia HTML
   * @param {string} url - Mission URL
   * @param {string} missionSetId - Mission set identifier
   * @returns {Object} Parsed mission object
   */
  async parseMission(url, missionSetId) {
    const $ = await this.readHTML(url);

    // Extract title
    const title = this.cleanText($('.page-header__title .mw-page-title-main').text()) ||
                  this.cleanText($('h1.page-header__title').text()) ||
                  this.cleanText($('h1#firstHeading').text());

    if (!title) {
      throw new Error(`Could not find mission title for ${url}`);
    }

    const missionId = this.generateId(missionSetId, title);

    // Extract metadata from infobox
    const infoboxMetadata = extractFFXIclopediaInfobox($, this.cleanText.bind(this));

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
   * Extract walkthrough steps from FFXIclopedia page
   * @param {Cheerio} $ - Cheerio instance
   * @returns {Array} Array of walkthrough steps
   */
  extractWalkthrough($) {
    const steps = [];

    // Find the Walkthrough section
    const walkthroughHeading = $('h2:contains("Walkthrough"), h2 #Walkthrough').parent();

    if (walkthroughHeading.length === 0) {
      return steps;
    }

    // Try ordered list first
    const orderedList = walkthroughHeading.nextAll('ol').first();
    if (orderedList.length > 0) {
      orderedList.find('> li').each((i, elem) => {
        const text = this.extractCleanText($(elem));
        const step = this.parseListItemToStep(text);
        if (step) {
          steps.push(step);
        }
      });
    }

    // If no ordered list, try unordered list
    if (steps.length === 0) {
      const unorderedList = walkthroughHeading.nextAll('ul').first();
      if (unorderedList.length > 0) {
        unorderedList.find('> li').each((i, elem) => {
          const text = this.extractCleanText($(elem));
          const step = this.parseListItemToStep(text);
          if (step) {
            steps.push(step);
          }
        });
      }
    }

    // Look for nested lists (mission with multiple parts)
    if (steps.length === 0) {
      walkthroughHeading.nextUntil('h2').find('li').each((i, elem) => {
        const text = this.extractCleanText($(elem));
        const step = this.parseListItemToStep(text);
        if (step) {
          steps.push(step);
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
