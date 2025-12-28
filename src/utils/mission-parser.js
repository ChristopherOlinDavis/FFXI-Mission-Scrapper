/**
 * Mission Data Parser - Extracts mission data from downloaded HTMLs
 */

import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { urlToFilename } from './download-manager.js';

const OUTPUT_DIR = path.join(process.cwd(), 'outputHTMLs');
const JSON_OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * Read HTML file from outputHTMLs/
 */
async function readHTML(url) {
  const filename = urlToFilename(url);
  const filepath = path.join(OUTPUT_DIR, filename);

  try {
    return await fs.readFile(filepath, 'utf-8');
  } catch (error) {
    throw new Error(`HTML not found for ${url}. Download it first.`);
  }
}

/**
 * Clean text - remove extra whitespace, newlines, etc.
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Generate mission ID from title
 */
function generateMissionId(missionSetId, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${missionSetId}-${slug}`;
}

/**
 * Parse FFXIclopedia mission page
 */
function parseFFXIclopediaMission(html, url, missionSetId) {
  const $ = cheerio.load(html);

  // Extract title
  const title = cleanText($('.page-header__title .mw-page-title-main').text()) ||
                cleanText($('h1.page-header__title').text());

  if (!title) {
    throw new Error('Could not find mission title');
  }

  const missionId = generateMissionId(missionSetId, title);

  // Extract mission number from infobox
  let missionNumber = null;
  $('.infobox-mission tr').each((i, row) => {
    const $row = $(row);
    const header = cleanText($row.find('th').text());
    if (header === 'Number') {
      missionNumber = cleanText($row.find('td').text());
    }
  });

  // Extract walkthrough steps
  const walkthroughSteps = [];

  // Find the Walkthrough section
  const walkthroughHeading = $('h2:contains("Walkthrough"), h2 #Walkthrough').parent();

  // Get the ordered list after the Walkthrough heading
  const walkthroughList = walkthroughHeading.next('ol');

  if (walkthroughList.length > 0) {
    walkthroughList.find('> li').each((i, elem) => {
      const $li = $(elem);
      const text = cleanText($li.text());

      if (text && text.length > 10) { // Filter out very short/empty steps
        walkthroughSteps.push({
          orderIndex: i,
          text: text,
        });
      }
    });
  }

  // If no ordered list, try to find any list under walkthrough
  if (walkthroughSteps.length === 0) {
    const anyList = walkthroughHeading.nextAll('ul, ol').first();
    if (anyList.length > 0) {
      anyList.find('> li').each((i, elem) => {
        const $li = $(elem);
        const text = cleanText($li.text());

        if (text && text.length > 10) {
          walkthroughSteps.push({
            orderIndex: i,
            text: text,
          });
        }
      });
    }
  }

  // Convert walkthrough steps to nodes
  const nodes = walkthroughSteps.map((step, i) => {
    const nodeId = `${missionId}-node-${i + 1}`;

    // Simple heuristic: first sentence is title, rest is description
    const sentences = step.text.split(/\.\s+/);
    const nodeTitle = sentences[0] + (sentences[0].endsWith('.') ? '' : '.');
    const nodeDescription = step.text;

    return {
      id: nodeId,
      orderIndex: i,
      title: nodeTitle.substring(0, 100), // Limit title length
      description: nodeDescription,
      dependencies: i > 0 ? [`${missionId}-node-${i}`] : [],
    };
  });

  // Extract prerequisites/requirements
  const gates = [];
  let gateIndex = 0;

  $('.infobox-mission tr').each((i, row) => {
    const $row = $(row);
    const header = cleanText($row.find('th').text());

    if (header === 'Requirements' || header === 'Prerequisites') {
      const reqText = cleanText($row.find('td').text());

      if (reqText && reqText.length > 5) {
        gates.push({
          id: `${missionId}-gate-${++gateIndex}`,
          type: 'other',
          afterNodeId: nodes[0]?.id || null,
          requirement: reqText,
          description: reqText,
        });
      }
    }
  });

  return {
    id: missionId,
    title: title,
    number: missionNumber,
    url: url,
    nodes: nodes.length > 0 ? nodes : [{
      id: `${missionId}-node-1`,
      orderIndex: 0,
      title: 'Complete mission',
      description: `Complete the mission: ${title}`,
      dependencies: [],
    }],
    gates: gates,
  };
}

/**
 * Parse BG Wiki mission page
 */
function parseBGWikiMission(html, url, missionSetId) {
  const $ = cheerio.load(html);

  // Extract title
  const title = cleanText($('h1#firstHeading').text()) ||
                cleanText($('.page-header__title').text());

  if (!title) {
    throw new Error('Could not find mission title');
  }

  const missionId = generateMissionId(missionSetId, title);

  // Extract walkthrough steps from BG Wiki
  const walkthroughSteps = [];

  // BG Wiki uses different structure - look for Walkthrough section
  const walkthroughHeading = $('#Walkthrough, #Walkthrough_2').parent();
  const walkthroughContent = walkthroughHeading.nextUntil('h2, h3');

  walkthroughContent.filter('ol, ul').each((i, list) => {
    $(list).find('> li').each((j, elem) => {
      const $li = $(elem);
      const text = cleanText($li.text());

      if (text && text.length > 10) {
        walkthroughSteps.push({
          orderIndex: walkthroughSteps.length,
          text: text,
        });
      }
    });
  });

  // Convert to nodes
  const nodes = walkthroughSteps.map((step, i) => {
    const nodeId = `${missionId}-node-${i + 1}`;
    const sentences = step.text.split(/\.\s+/);
    const nodeTitle = sentences[0] + (sentences[0].endsWith('.') ? '' : '.');

    return {
      id: nodeId,
      orderIndex: i,
      title: nodeTitle.substring(0, 100),
      description: step.text,
      dependencies: i > 0 ? [`${missionId}-node-${i}`] : [],
    };
  });

  return {
    id: missionId,
    title: title,
    number: null,
    url: url,
    nodes: nodes.length > 0 ? nodes : [{
      id: `${missionId}-node-1`,
      orderIndex: 0,
      title: 'Complete mission',
      description: `Complete the mission: ${title}`,
      dependencies: [],
    }],
    gates: [],
  };
}

/**
 * Parse a single mission page
 */
export async function parseMission(url, missionSetId) {
  console.log(`\n📖 Parsing mission: ${url}`);

  const html = await readHTML(url);

  let missionData;

  if (url.includes('ffxiclopedia.fandom.com')) {
    missionData = parseFFXIclopediaMission(html, url, missionSetId);
  } else if (url.includes('bg-wiki.com')) {
    missionData = parseBGWikiMission(html, url, missionSetId);
  } else {
    throw new Error('Unknown wiki source');
  }

  console.log(`   ✓ Found: ${missionData.title}`);
  console.log(`   ✓ Nodes: ${missionData.nodes.length}`);
  console.log(`   ✓ Gates: ${missionData.gates.length}`);

  return missionData;
}

/**
 * Parse all missions for a mission set
 */
export async function parseMissionSet(setId, urlList) {
  const setData = urlList[setId];

  if (!setData) {
    throw new Error(`Mission set "${setId}" not found`);
  }

  console.log(`\n🔍 Parsing missions for: ${setData.name}`);
  console.log(`   Total mission pages: ${setData.missionPages.length}\n`);

  const missions = [];

  for (const url of setData.missionPages) {
    try {
      const missionData = await parseMission(url, setId);
      missions.push(missionData);
    } catch (error) {
      console.error(`   ✗ Error parsing ${url}:`, error.message);
    }
  }

  const missionSetOutput = {
    id: setId,
    name: setData.name,
    category: 'nation', // TODO: Make this configurable
    source: setData.source,
    sourceUrl: setData.categoryPages[0] || '',
    lastScraped: new Date().toISOString(),
    lastKnownUpdate: new Date().toISOString(),
    missions: missions,
  };

  // Save to JSON file
  await fs.mkdir(JSON_OUTPUT_DIR, { recursive: true });
  const outputFile = path.join(JSON_OUTPUT_DIR, `${setId}.json`);
  await fs.writeFile(outputFile, JSON.stringify(missionSetOutput, null, 2), 'utf-8');

  console.log(`\n✓ Parsed ${missions.length} missions`);
  console.log(`✓ Saved to: ${outputFile}\n`);

  return missionSetOutput;
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  try {
    switch (command) {
      case 'parse':
        if (!param) {
          console.log('Usage: node src/utils/mission-parser.js parse <url> <mission-set-id>');
        } else {
          const setId = args[2] || 'test';
          const mission = await parseMission(param, setId);
          console.log('\nParsed mission:');
          console.log(JSON.stringify(mission, null, 2));
        }
        break;

      case 'parse-set':
        if (!param) {
          console.log('Usage: node src/utils/mission-parser.js parse-set <set-id>');
        } else {
          const urlListFile = path.join(process.cwd(), 'url-list.json');
          const urlListContent = await fs.readFile(urlListFile, 'utf-8');
          const urlList = JSON.parse(urlListContent);

          await parseMissionSet(param, urlList);
        }
        break;

      default:
        console.log('\n📝 Mission Parser\n');
        console.log('Commands:');
        console.log('  parse <url> <set-id>  - Parse a single mission page');
        console.log('  parse-set <set-id>    - Parse all missions in a set');
        console.log('\nExamples:');
        console.log('  node src/utils/mission-parser.js parse "https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report" bastok');
        console.log('  node src/utils/mission-parser.js parse-set ffxiclopedia-bastok');
        console.log('');
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}
