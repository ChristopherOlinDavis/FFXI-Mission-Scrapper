import * as cheerio from 'cheerio';
import { fetchWithDelay } from '../utils/http.js';
import { cleanText, generateId, parseListItemToStep, parseWalkthroughToNodes, parsePrerequisitesToGates } from '../utils/parser.js';

const SANDORIA_MISSIONS_URL = 'https://ffxiclopedia.fandom.com/wiki/Category:San_d%27Oria_Missions';

/**
 * Scrapes a single San d'Oria mission page
 */
async function scrapeMission(missionUrl, missionTitle, missionIndex, useCache = true) {
  console.log(`Scraping mission: ${missionTitle}`);

  const html = await fetchWithDelay(missionUrl, 1000, useCache);
  const $ = cheerio.load(html);

  const missionId = generateId('sandoria-rank', `${missionIndex + 1}-${missionTitle}`);

  const walkthroughSteps = [];

  // Extract walkthrough
  $('h2:contains("Walkthrough")').next('ol, ul').find('li').each((i, elem) => {
    const step = parseListItemToStep($, elem);
    if (step.description.length > 5) {
      walkthroughSteps.push(step);
    }
  });

  if (walkthroughSteps.length === 0) {
    $('ol li, ul li').each((i, elem) => {
      const step = parseListItemToStep($, elem);
      if (step.description.length > 20) {
        walkthroughSteps.push(step);
      }
    });
  }

  const limitedSteps = walkthroughSteps.slice(0, 15);
  const nodes = parseWalkthroughToNodes(limitedSteps, missionId);

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
 * Main function to scrape all San d'Oria Rank Missions
 */
export async function scrapeSandoriaRankMissions(useCache = true) {
  console.log('Starting San d\'Oria Rank Missions scrape...');

  const missions = [];

  const knownMissions = [
    { title: 'San d\'Oria Mission 1-1', url: 'https://ffxiclopedia.fandom.com/wiki/Smash_the_Orcish_Scouts' },
    { title: 'San d\'Oria Mission 1-2', url: 'https://ffxiclopedia.fandom.com/wiki/Bat_Hunt' },
    { title: 'San d\'Oria Mission 1-3', url: 'https://ffxiclopedia.fandom.com/wiki/Save_the_Children' }
  ];

  const missionsToScrape = knownMissions.slice(0, 5);

  for (let i = 0; i < missionsToScrape.length; i++) {
    const { title, url } = missionsToScrape[i];

    try {
      const mission = await scrapeMission(url, title, i, useCache);
      missions.push(mission);
    } catch (error) {
      console.error(`Failed to scrape mission ${title}:`, error.message);
      const missionId = generateId('sandoria-rank', `${i + 1}-${title}`);
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
    id: 'sandoria-rank',
    name: 'San d\'Oria Rank Missions',
    category: 'nation',
    sourceUrl: SANDORIA_MISSIONS_URL,
    lastScraped: now,
    lastKnownUpdate: now,
    missions
  };
}
