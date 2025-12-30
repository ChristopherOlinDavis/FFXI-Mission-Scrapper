/**
 * Mission Data Parser - Extracts mission data from downloaded HTMLs
 */

import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { urlToFilename } from './download-manager.js';
import { isMissionInSet, getMissionOrderIndex } from './mission-sets-reference.js';

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
 * Determine category from set ID
 */
function determineCategoryFromSetId(setId) {
  if (setId.includes('bastok') || setId.includes('sandoria') || setId.includes('windurst')) {
    return setId.includes('quests') ? 'quest' : 'nation';
  }
  if (setId.includes('zilart')) return 'expansion';
  if (setId.includes('promathia')) return 'expansion';
  if (setId.includes('aht-urhgan')) return setId.includes('quests') ? 'quest' : 'expansion';
  if (setId.includes('wings-goddess')) return 'expansion';
  if (setId.includes('seekers-adoulin')) return 'expansion';
  if (setId.includes('rhapsodies')) return 'expansion';
  if (setId.includes('voracious-resurgence')) return 'expansion';
  if (setId.includes('assault')) return 'assault';
  if (setId.includes('campaign')) return 'campaign';
  if (setId.includes('coalition')) return 'coalition';
  if (setId.includes('quest')) return 'quest';
  return 'other';
}

/**
 * Filter missions based on set type and mission number
 * Returns true if the mission should be included in the set
 */
function shouldIncludeMission(mission, setId) {
  const missionNumber = mission.number;

  // Check against official reference lists first (for all mission sets that have them)
  const inReferenceList = isMissionInSet(mission.title, setId);
  if (inReferenceList !== null) {
    return inReferenceList;
  }

  // If no reference list exists, use number-based filtering as fallback

  // Nation missions (Bastok, San d'Oria, Windurst) - should have been handled by reference
  if (setId.includes('bastok') || setId.includes('sandoria') || setId.includes('windurst')) {
    if (!setId.includes('quests')) {
      // Fallback to number-based filtering if we have a mission number
      if (missionNumber) {
        return /^\d+-\d+$/.test(missionNumber);
      }
      // If no mission number and not in reference list, exclude it
      return false;
    }
  }

  // If no mission number for other types, include it (we'll fix this manually later)
  if (!missionNumber) return true;

  // Zilart missions - should have been handled by reference
  if (setId === 'ffxiclopedia-zilart') {
    return /^(ZM\d+|\d+-\d+)$/.test(missionNumber) && !missionNumber.startsWith('PM');
  }

  // Promathia missions - should have been handled by reference
  if (setId === 'ffxiclopedia-promathia') {
    return /^(PM\d+-\d+|Chapter \d+)$/i.test(missionNumber);
  }

  // Aht Urhgan missions - should have been handled by reference
  if (setId === 'ffxiclopedia-aht-urhgan') {
    return /^\d+$/.test(missionNumber) && parseInt(missionNumber) >= 1 && parseInt(missionNumber) <= 48;
  }

  // Wings of the Goddess missions - should have been handled by reference
  if (setId === 'ffxiclopedia-wings-goddess') {
    return /^\d+$/.test(missionNumber) && parseInt(missionNumber) >= 1 && parseInt(missionNumber) <= 60;
  }

  // Seekers of Adoulin missions - should have been handled by reference
  if (setId === 'ffxiclopedia-seekers-adoulin') {
    return /^(\d+-\d+-\d+|Chapter \d+)$/i.test(missionNumber);
  }

  // Rhapsodies missions - should have been handled by reference
  if (setId === 'ffxiclopedia-rhapsodies') {
    return /^\d+-\d+-\d+$/.test(missionNumber);
  }

  // Voracious Resurgence - should have been handled by reference
  if (setId === 'ffxiclopedia-voracious-resurgence') {
    // No specific number pattern fallback, include all if not in reference
    return true;
  }

  // Default: include all for other sets (quests, assault, campaign, etc.)
  return true;
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
  let errorCount = 0;
  let filteredCount = 0;

  for (const url of setData.missionPages) {
    try {
      const missionData = await parseMission(url, setId);

      // Apply filtering based on mission type and number
      if (shouldIncludeMission(missionData, setId)) {
        missions.push(missionData);
      } else {
        filteredCount++;
        console.log(`   ⊗ Filtered out: ${missionData.title} (Number: ${missionData.number || 'N/A'}) - Not a ${setId} mission`);
      }
    } catch (error) {
      console.error(`   ✗ Error parsing ${url}:`, error.message);
      errorCount++;
    }
  }

  // Sort missions according to reference table order (if available)
  const sortedMissions = missions.sort((a, b) => {
    const orderA = getMissionOrderIndex(a.title, setId);
    const orderB = getMissionOrderIndex(b.title, setId);

    // If both have order indices, sort by them
    if (orderA !== -1 && orderB !== -1) {
      return orderA - orderB;
    }

    // If only one has an order index, it comes first
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;

    // If neither has an order index, maintain original order (stable sort)
    return 0;
  });

  const missionSetOutput = {
    id: setId,
    name: setData.name,
    category: determineCategoryFromSetId(setId),
    source: setData.source,
    sourceUrl: setData.categoryPages[0] || '',
    lastScraped: new Date().toISOString(),
    lastKnownUpdate: new Date().toISOString(),
    totalMissions: sortedMissions.length,
    missions: sortedMissions,
  };

  // Save to JSON file
  await fs.mkdir(JSON_OUTPUT_DIR, { recursive: true });
  const outputFile = path.join(JSON_OUTPUT_DIR, `${setId}.json`);
  await fs.writeFile(outputFile, JSON.stringify(missionSetOutput, null, 2), 'utf-8');

  console.log(`\n✓ Parsed ${missions.length} missions`);
  if (filteredCount > 0) {
    console.log(`⊗ Filtered out: ${filteredCount} missions (not belonging to this set)`);
  }
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount}`);
  }
  console.log(`✓ Saved to: ${outputFile}\n`);

  return missionSetOutput;
}

/**
 * Parse all mission sets and create a root file
 */
export async function parseAllSets(urlList) {
  console.log('\n🚀 Parsing all mission sets...\n');

  const allSets = [];
  const stats = {
    totalSets: 0,
    totalMissions: 0,
    errors: 0,
  };

  for (const setId of Object.keys(urlList)) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      const setOutput = await parseMissionSet(setId, urlList);
      allSets.push(setOutput);
      stats.totalSets++;
      stats.totalMissions += setOutput.totalMissions;
    } catch (error) {
      console.error(`\n✗ Error parsing set ${setId}:`, error.message);
      stats.errors++;
    }
  }

  // Create root file with all mission sets
  const rootOutput = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    stats: {
      totalSets: stats.totalSets,
      totalMissions: stats.totalMissions,
      categories: {},
    },
    missionSets: allSets.map(set => ({
      id: set.id,
      name: set.name,
      category: set.category,
      source: set.source,
      totalMissions: set.totalMissions,
      file: `${set.id}.json`,
    })),
  };

  // Calculate category stats
  for (const set of allSets) {
    if (!rootOutput.stats.categories[set.category]) {
      rootOutput.stats.categories[set.category] = {
        sets: 0,
        missions: 0,
      };
    }
    rootOutput.stats.categories[set.category].sets++;
    rootOutput.stats.categories[set.category].missions += set.totalMissions;
  }

  // Save root file
  const rootFile = path.join(JSON_OUTPUT_DIR, 'missions.json');
  await fs.writeFile(rootFile, JSON.stringify(rootOutput, null, 2), 'utf-8');

  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📊 Final Summary:');
  console.log(`  Total sets parsed: ${stats.totalSets}`);
  console.log(`  Total missions: ${stats.totalMissions}`);
  if (stats.errors > 0) {
    console.log(`  Errors: ${stats.errors}`);
  }
  console.log(`\n✓ Root file saved to: ${rootFile}`);
  console.log(`✓ Individual set files in: ${JSON_OUTPUT_DIR}/\n`);

  return rootOutput;
}

/**
 * Load URL list from file
 */
async function loadURLListFile() {
  const urlListFile = path.join(process.cwd(), 'url-list.json');

  try {
    const urlListContent = await fs.readFile(urlListFile, 'utf-8');
    return JSON.parse(urlListContent);
  } catch (error) {
    console.error(`\n✗ Error: ${urlListFile} not found.`);
    console.error('Please run the download and discover workflow first:');
    console.error('  1. npm run download:all');
    console.error('  2. npm run download:discover:all');
    process.exit(1);
  }
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
          const urlList = await loadURLListFile();
          await parseMissionSet(param, urlList);
        }
        break;

      case 'parse-all':
        const urlList = await loadURLListFile();
        await parseAllSets(urlList);
        break;

      default:
        console.log('\n📝 Mission Parser\n');
        console.log('Commands:');
        console.log('  parse <url> <set-id>  - Parse a single mission page');
        console.log('  parse-set <set-id>    - Parse all missions in a set');
        console.log('  parse-all             - Parse all mission sets and create root file');
        console.log('\nExamples:');
        console.log('  node src/utils/mission-parser.js parse "https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report" ffxiclopedia-bastok');
        console.log('  node src/utils/mission-parser.js parse-set ffxiclopedia-bastok');
        console.log('  node src/utils/mission-parser.js parse-all');
        console.log('');
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
