#!/usr/bin/env node

/**
 * URL Configuration Generator
 *
 * Generates enhanced mission set configurations from the unified URL list.
 * Creates category-based, domain-specific, and filtered URL sets.
 */

import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const UNIFIED_URLS = path.join(ROOT_DIR, 'output/unified-urls.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const CONFIG_OUTPUT = path.join(OUTPUT_DIR, 'enhanced-url-config.json');

/**
 * Load unified URLs
 */
async function loadUnifiedUrls() {
  console.log('📖 Loading unified URLs...');

  try {
    const content = await fs.readFile(UNIFIED_URLS, 'utf-8');
    const data = JSON.parse(content);

    console.log(`   Found ${data.urls.length} URLs`);
    return data.urls;

  } catch (error) {
    console.error(`   ❌ Error loading unified URLs: ${error.message}`);
    throw error;
  }
}

/**
 * Filter URLs by criteria
 */
function filterUrls(urls, criteria) {
  return urls.filter(url => {
    // Domain filter
    if (criteria.domain) {
      const urlDomain = new URL(url.url).hostname;
      if (Array.isArray(criteria.domain)) {
        if (!criteria.domain.includes(urlDomain)) return false;
      } else {
        if (urlDomain !== criteria.domain) return false;
      }
    }

    // Category filter
    if (criteria.category) {
      if (Array.isArray(criteria.category)) {
        if (!criteria.category.some(cat => url.categories.includes(cat))) return false;
      } else {
        if (!url.categories.includes(criteria.category)) return false;
      }
    }

    // Type filter
    if (criteria.type && url.type !== criteria.type) {
      return false;
    }

    // Source filter
    if (criteria.source) {
      if (Array.isArray(criteria.source)) {
        if (!criteria.source.some(src => url.sources.includes(src))) return false;
      } else {
        if (!url.sources.includes(criteria.source)) return false;
      }
    }

    // Mission set filter
    if (criteria.missionSet && url.missionSet !== criteria.missionSet) {
      return false;
    }

    // Custom filter function
    if (criteria.custom && !criteria.custom(url)) {
      return false;
    }

    return true;
  });
}

/**
 * Group URLs by mission sets
 */
function groupByMissionSets(urls) {
  const sets = {};

  for (const url of urls) {
    if (url.missionSet) {
      if (!sets[url.missionSet]) {
        sets[url.missionSet] = {
          id: url.missionSet,
          name: url.metadata?.setName || url.missionSet,
          source: url.metadata?.wikiSource || url.source,
          categoryPages: [],
          missionPages: [],
          allUrls: []
        };
      }

      sets[url.missionSet].allUrls.push(url.url);

      if (url.type === 'category') {
        sets[url.missionSet].categoryPages.push(url.url);
      } else if (url.type === 'mission') {
        sets[url.missionSet].missionPages.push(url.url);
      }
    }
  }

  return sets;
}

/**
 * Create enhanced configurations
 */
function createEnhancedConfigs(urls) {
  console.log('\n🔧 Creating enhanced configurations...');

  const configs = {
    metadata: {
      generated: new Date().toISOString(),
      totalUrls: urls.length,
      description: 'Enhanced URL configurations from unified URL list'
    },

    // Mission sets (legacy format compatible)
    missionSets: {},

    // Category-based sets
    byCategory: {},

    // Domain-based sets
    byDomain: {
      ffxiclopedia: [],
      bgwiki: []
    },

    // Specialized sets
    specialized: {
      missions: {
        all: [],
        ffxiclopedia: [],
        bgwiki: []
      },
      quests: {
        all: [],
        ffxiclopedia: [],
        bgwiki: []
      },
      bestiary: {
        all: [],
        ffxiclopedia: [],
        bgwiki: []
      },
      roe: {
        all: [],
        ffxiclopedia: [],
        bgwiki: []
      },
      zones: {
        all: [],
        ffxiclopedia: [],
        bgwiki: []
      }
    }
  };

  // Build mission sets
  configs.missionSets = groupByMissionSets(urls);

  // Build category-based sets
  const categories = new Set();
  urls.forEach(url => url.categories.forEach(cat => categories.add(cat)));

  for (const category of categories) {
    configs.byCategory[category] = filterUrls(urls, { category }).map(u => u.url);
  }

  // Build domain-based sets
  configs.byDomain.ffxiclopedia = filterUrls(urls, {
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.byDomain.bgwiki = filterUrls(urls, {
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  // Build specialized sets
  // Missions
  configs.specialized.missions.all = filterUrls(urls, {
    category: 'missions'
  }).map(u => u.url);

  configs.specialized.missions.ffxiclopedia = filterUrls(urls, {
    category: 'missions',
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.specialized.missions.bgwiki = filterUrls(urls, {
    category: 'missions',
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  // Quests
  configs.specialized.quests.all = filterUrls(urls, {
    category: 'quests'
  }).map(u => u.url);

  configs.specialized.quests.ffxiclopedia = filterUrls(urls, {
    category: 'quests',
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.specialized.quests.bgwiki = filterUrls(urls, {
    category: 'quests',
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  // Bestiary
  configs.specialized.bestiary.all = filterUrls(urls, {
    category: 'bestiary'
  }).map(u => u.url);

  configs.specialized.bestiary.ffxiclopedia = filterUrls(urls, {
    category: 'bestiary',
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.specialized.bestiary.bgwiki = filterUrls(urls, {
    category: 'bestiary',
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  // ROE
  configs.specialized.roe.all = filterUrls(urls, {
    category: 'roe'
  }).map(u => u.url);

  configs.specialized.roe.ffxiclopedia = filterUrls(urls, {
    category: 'roe',
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.specialized.roe.bgwiki = filterUrls(urls, {
    category: 'roe',
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  // Zones
  configs.specialized.zones.all = filterUrls(urls, {
    category: 'zones'
  }).map(u => u.url);

  configs.specialized.zones.ffxiclopedia = filterUrls(urls, {
    category: 'zones',
    domain: 'ffxiclopedia.fandom.com'
  }).map(u => u.url);

  configs.specialized.zones.bgwiki = filterUrls(urls, {
    category: 'zones',
    domain: 'www.bg-wiki.com'
  }).map(u => u.url);

  return configs;
}

/**
 * Generate statistics for configs
 */
function generateConfigStats(configs) {
  return {
    missionSets: Object.keys(configs.missionSets).length,
    categories: Object.keys(configs.byCategory).length,
    domains: Object.keys(configs.byDomain).length,
    specialized: Object.keys(configs.specialized).length,

    urlCounts: {
      missions: configs.specialized.missions.all.length,
      quests: configs.specialized.quests.all.length,
      bestiary: configs.specialized.bestiary.all.length,
      roe: configs.specialized.roe.all.length,
      zones: configs.specialized.zones.all.length
    }
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 URL Configuration Generator\n');

  try {
    // Load unified URLs
    const urls = await loadUnifiedUrls();

    // Create enhanced configurations
    const configs = createEnhancedConfigs(urls);

    // Generate stats
    const stats = generateConfigStats(configs);

    // Save output
    console.log('\n💾 Saving configuration...');
    await fs.writeFile(
      CONFIG_OUTPUT,
      JSON.stringify(configs, null, 2),
      'utf-8'
    );
    console.log(`   ✅ Configuration saved: ${CONFIG_OUTPUT}`);

    // Display summary
    console.log('\n📊 Configuration Summary:\n');
    console.log(`Mission Sets: ${stats.missionSets}`);
    console.log(`Categories: ${stats.categories}`);
    console.log(`Domains: ${stats.domains}`);

    console.log('\nSpecialized Sets:');
    for (const [type, count] of Object.entries(stats.urlCounts)) {
      console.log(`  ${type}: ${count} URLs`);
    }

    console.log('\nMission Sets:');
    for (const [id, set] of Object.entries(configs.missionSets)) {
      console.log(`  ${id}: ${set.missionPages.length} missions (${set.categoryPages.length} categories)`);
    }

    console.log('\n✅ Configuration generation complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createEnhancedConfigs, filterUrls, groupByMissionSets };
