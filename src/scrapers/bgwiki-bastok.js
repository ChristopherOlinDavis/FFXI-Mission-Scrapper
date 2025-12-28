import * as cheerio from 'cheerio';
import { fetchWithDelay } from '../utils/http.js';
import { cleanText, generateId, parseListItemToStep, parseWalkthroughToNodes } from '../utils/parser.js';

/**
 * Scraper for BG Wiki (alternative to FFXIClopedia)
 * BG Wiki often has better structured data and different bot protection
 */

const BGWIKI_BASTOK_URL = 'https://www.bg-wiki.com/ffxi/Category:Bastok_Missions';

/**
 * Scrapes Bastok missions from BG Wiki
 */
export async function scrapeBastokRankMissionsBGWiki(useCache = true) {
  console.log('Starting Bastok Rank Missions scrape from BG Wiki...');

  const missions = [];

  // BG Wiki URLs for known missions
  const knownMissions = [
    {
      title: 'The Zeruhn Report',
      url: 'https://www.bg-wiki.com/ffxi/The_Zeruhn_Report',
      rank: '1-1'
    },
    {
      title: 'The Emissary',
      url: 'https://www.bg-wiki.com/ffxi/The_Emissary_(Bastok)',
      rank: '1-2'
    },
    {
      title: 'The President\'s Gatekeepers',
      url: 'https://www.bg-wiki.com/ffxi/The_President%27s_Gatekeepers',
      rank: '1-3'
    }
  ];

  for (let i = 0; i < knownMissions.length; i++) {
    const { title, url, rank } = knownMissions[i];

    try {
      console.log(`Scraping: ${title}`);
      const html = await fetchWithDelay(url, 1000, useCache);
      const $ = cheerio.load(html);

      const missionId = generateId('bastok-rank', rank);

      // BG Wiki often uses specific div structures
      const walkthroughSteps = [];

      // Try to find walkthrough in structured format
      $('h2:contains("Walkthrough") ~ ol li, h3:contains("Walkthrough") ~ ol li').each((i, elem) => {
        const step = parseListItemToStep($, elem);
        if (step.description.length > 10) {
          walkthroughSteps.push(step);
        }
      });

      // Fallback: look for any ordered list
      if (walkthroughSteps.length === 0) {
        $('ol li').each((i, elem) => {
          const step = parseListItemToStep($, elem);
          if (step.description.length > 20) {
            walkthroughSteps.push(step);
          }
        });
      }

      const limitedSteps = walkthroughSteps.slice(0, 15);
      const nodes = parseWalkthroughToNodes(limitedSteps, missionId);

      missions.push({
        id: missionId,
        title: title,
        nodes: nodes.length > 0 ? nodes : [{
          id: `${missionId}-node-1`,
          orderIndex: 0,
          title: 'Complete mission',
          description: `Complete the mission: ${title}`,
          dependencies: []
        }],
        gates: []
      });

    } catch (error) {
      console.error(`Failed to scrape ${title}:`, error.message);
      const missionId = generateId('bastok-rank', rank);
      missions.push({
        id: missionId,
        title: title,
        nodes: [{
          id: `${missionId}-node-1`,
          orderIndex: 0,
          title: 'Complete mission',
          description: `Complete the mission: ${title}`,
          dependencies: []
        }],
        gates: []
      });
    }
  }

  const now = new Date().toISOString();

  return {
    id: 'bastok-rank-bgwiki',
    name: 'Bastok Rank Missions (BG Wiki)',
    category: 'nation',
    sourceUrl: BGWIKI_BASTOK_URL,
    lastScraped: now,
    lastKnownUpdate: now,
    missions
  };
}
