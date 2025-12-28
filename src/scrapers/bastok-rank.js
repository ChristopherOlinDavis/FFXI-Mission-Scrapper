import * as cheerio from 'cheerio';
import { fetchWithDelay } from '../utils/http.js';
import { cleanText, generateId, parseListItemToStep, parseWalkthroughToNodes, parsePrerequisitesToGates, extractLastModified } from '../utils/parser.js';

const BASTOK_MISSIONS_URL = 'https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions';

/**
 * Scrapes the main Bastok Missions category page to get individual mission links
 */
async function getMissionLinks(useCache = true) {
  const html = await fetchWithDelay(BASTOK_MISSIONS_URL, 1000, useCache);
  const $ = cheerio.load(html);

  const missionLinks = [];

  // Find all mission links in the category
  $('.category-page__member-link').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const title = cleanText($link.text());

    // Filter for actual mission pages (typically start with "Bastok Mission")
    if (title.includes('Mission') && href) {
      const fullUrl = href.startsWith('http') ? href : `https://ffxiclopedia.fandom.com${href}`;
      missionLinks.push({
        title,
        url: fullUrl
      });
    }
  });

  return missionLinks;
}

/**
 * Scrapes a single Bastok mission page
 */
async function scrapeMission(missionUrl, missionTitle, missionIndex, useCache = true) {
  console.log(`Scraping mission: ${missionTitle}`);

  const html = await fetchWithDelay(missionUrl, 1000, useCache);
  const $ = cheerio.load(html);

  const missionId = generateId('bastok-rank', `${missionIndex + 1}-${missionTitle}`);

  // Extract walkthrough steps
  const walkthroughSteps = [];

  // Look for walkthrough section (this varies by wiki structure)
  // Try to find ordered or unordered lists in the main content
  $('h2:contains("Walkthrough")').next('ol, ul').find('li').each((i, elem) => {
    const step = parseListItemToStep($, elem);
    if (step.description.length > 5) {
      walkthroughSteps.push(step);
    }
  });

  // If no walkthrough found with that method, try alternative structures
  if (walkthroughSteps.length === 0) {
    $('ol li, ul li').each((i, elem) => {
      const step = parseListItemToStep($, elem);
      // Only include substantial steps
      if (step.description.length > 20) {
        walkthroughSteps.push(step);
      }
    });
  }

  // Limit to reasonable number of steps
  const limitedSteps = walkthroughSteps.slice(0, 15);

  // Convert steps to nodes
  const nodes = parseWalkthroughToNodes(limitedSteps, missionId);

  // Extract prerequisites
  const prerequisiteSection = $('h2:contains("Requirements"), h3:contains("Requirements")').next('p, ul').text();
  const gates = parsePrerequisitesToGates(prerequisiteSection, missionId, nodes[0]?.id);

  return {
    id: missionId,
    title: missionTitle,
    nodes: nodes.length > 0 ? nodes : [{
      id: `${missionId}-node-1`,
      orderIndex: 0,
      title: 'Complete mission',
      description: `Complete the mission: ${missionTitle}`,
      dependencies: []
    }],
    gates
  };
}

/**
 * Main function to scrape all Bastok Rank Missions
 */
export async function scrapeBastokRankMissions(useCache = true) {
  console.log('Starting Bastok Rank Missions scrape...');

  const missions = [];

  // For now, we'll create a simplified version with known missions
  // In production, you'd scrape the category page first
  const knownMissions = [
    { title: 'Bastok Mission 1-1', url: 'https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report' },
    { title: 'Bastok Mission 1-2', url: 'https://ffxiclopedia.fandom.com/wiki/The_Emissary_(Bastok)' },
    { title: 'Bastok Mission 1-3', url: 'https://ffxiclopedia.fandom.com/wiki/The_President%27s_Gatekeepers' }
  ];

  // Try to get real missions from category page, fallback to known missions
  let missionLinks;
  try {
    missionLinks = await getMissionLinks(useCache);
    if (missionLinks.length === 0) {
      missionLinks = knownMissions;
    }
  } catch (error) {
    console.warn('Failed to fetch mission links, using known missions:', error.message);
    missionLinks = knownMissions;
  }

  // Scrape each mission (limit to first 5 for now)
  const missionsToScrape = missionLinks.slice(0, 5);

  for (let i = 0; i < missionsToScrape.length; i++) {
    const { title, url } = missionsToScrape[i];

    try {
      const mission = await scrapeMission(url, title, i, useCache);
      missions.push(mission);
    } catch (error) {
      console.error(`Failed to scrape mission ${title}:`, error.message);
      // Add placeholder mission
      const missionId = generateId('bastok-rank', `${i + 1}-${title}`);
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
    id: 'bastok-rank',
    name: 'Bastok Rank Missions',
    category: 'nation',
    sourceUrl: BASTOK_MISSIONS_URL,
    lastScraped: now,
    lastKnownUpdate: now,
    missions
  };
}
