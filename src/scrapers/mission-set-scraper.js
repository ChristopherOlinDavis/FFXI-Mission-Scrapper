/**
 * Generic Mission Set Scraper
 * Config-driven scraper that replaces all hardcoded scrapers
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMissions } from '../parsers/index.js';
import { buildUnlocks, buildNavigation, buildDependencyEdges } from '../parsers/dependency-builder.js';
import { MissionSetSchema } from '../schemas/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL_LIST_PATH = path.join(process.cwd(), 'url-list.json');
const CONFIG_PATH = path.join(__dirname, 'mission-sets-config.json');

/**
 * Load mission set configuration
 */
async function loadConfig() {
  const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(configData);
}

/**
 * Load URL list
 */
async function loadUrlList() {
  const urlData = await fs.readFile(URL_LIST_PATH, 'utf-8');
  return JSON.parse(urlData);
}

/**
 * Scrape a mission set using config
 * @param {string} setId - Mission set ID from config
 * @param {Object} options - Options
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Mission set data
 */
export async function scrapeMissionSet(setId, options = {}) {
  const { onProgress, verbose = false } = options;

  // Load config and URL list
  const config = await loadConfig();
  const urlList = await loadUrlList();

  // Get mission set config
  const setConfig = config[setId];
  if (!setConfig) {
    throw new Error(`Mission set "${setId}" not found in config`);
  }

  if (verbose) {
    console.log(`\n📦 Scraping mission set: ${setConfig.name}`);
    console.log(`   Category: ${setConfig.category}`);
    console.log(`   Source: ${setConfig.sourceWiki}`);
  }

  // Get URLs for this mission set
  const urlData = urlList[setConfig.urlListKey];
  if (!urlData) {
    throw new Error(`URL list key "${setConfig.urlListKey}" not found in url-list.json`);
  }

  const urls = urlData.missionPages || [];
  if (urls.length === 0) {
    throw new Error(`No mission URLs found for "${setConfig.urlListKey}"`);
  }

  if (verbose) {
    console.log(`   Missions to parse: ${urls.length}\n`);
  }

  // Parse all missions
  const missions = await parseMissions(urls, setId, {
    onProgress: (current, total, mission) => {
      if (verbose && mission) {
        console.log(`   ✓ [${current}/${total}] ${mission.title}`);
      } else if (verbose) {
        console.log(`   ✗ [${current}/${total}] Failed`);
      }

      if (onProgress) {
        onProgress(current, total, mission);
      }
    }
  });

  if (verbose) {
    console.log(`\n   Successfully parsed: ${missions.length}/${urls.length} missions`);
  }

  // Enrich missions with unlocks and navigation
  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];

    // Build unlocks
    mission.unlocks = buildUnlocks(mission, missions);

    // Build navigation
    mission.navigation = buildNavigation(mission, missions, i);
  }

  // Build dependency edges
  const dependencyEdges = buildDependencyEdges(missions);

  // Sort missions by mission number (if available)
  const sortedMissions = [...missions].sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  // Create mission set object
  const missionSet = {
    id: setId,
    name: setConfig.name,
    category: setConfig.category,
    sourceUrl: urlData.categoryPages?.[0] || '',
    lastScraped: new Date().toISOString(),
    missions: sortedMissions.map(m => ({
      id: m.id,
      title: m.title,
      number: m.number,
      nodes: m.nodes,
      gates: m.gates,
      metadata: m.metadata
    }))
  };

  // Validate against schema
  try {
    MissionSetSchema.parse(missionSet);
    if (verbose) {
      console.log('   ✓ Schema validation passed');
    }
  } catch (error) {
    console.error('   ✗ Schema validation failed:', error.message);
    throw error;
  }

  return {
    missionSet,
    missions, // Full missions with prerequisites, unlocks, navigation
    dependencyEdges,
    stats: {
      total: urls.length,
      parsed: missions.length,
      failed: urls.length - missions.length
    }
  };
}

/**
 * Scrape all mission sets
 * @param {Object} options - Options
 * @returns {Promise<Array>} Array of mission set results
 */
export async function scrapeAllMissionSets(options = {}) {
  const config = await loadConfig();
  const results = [];

  for (const [setId, setConfig] of Object.entries(config)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scraping: ${setConfig.name}`);
    console.log('='.repeat(60));

    try {
      const result = await scrapeMissionSet(setId, { ...options, verbose: true });
      results.push(result);
    } catch (error) {
      console.error(`Failed to scrape ${setId}:`, error.message);
      results.push({
        setId,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get list of available mission sets
 * @returns {Promise<Object>} Mission sets configuration
 */
export async function getAvailableMissionSets() {
  return await loadConfig();
}
