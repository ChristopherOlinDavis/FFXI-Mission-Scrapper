#!/usr/bin/env node

/**
 * URL Enhancement Usage Examples
 *
 * Demonstrates how to use the enhanced URL management system
 */

import {
  getMissionSetUrls,
  getUrlsByCategory,
  getUrlsByDomain,
  getSpecializedUrls,
  searchUrls,
  getUrlDetails,
  getUrlStats,
  getAllMissionSets
} from '../src/utils/enhanced-url-loader.js';

async function examples() {
  console.log('🔗 URL Enhancement Usage Examples\n');

  // Example 1: Get Mission Set URLs (backwards compatible)
  console.log('Example 1: Get Mission Set URLs');
  console.log('─────────────────────────────────');
  const bastokMissions = await getMissionSetUrls('ffxiclopedia-bastok');
  console.log(`Mission Set: ${bastokMissions.name}`);
  console.log(`Category Pages: ${bastokMissions.categoryPages.length}`);
  console.log(`Mission Pages: ${bastokMissions.missionPages.length}`);
  console.log(`First mission: ${bastokMissions.missionPages[0]}`);
  console.log();

  // Example 2: Get URLs by Category
  console.log('Example 2: Get URLs by Category');
  console.log('────────────────────────────────');
  const missionUrls = await getUrlsByCategory('missions');
  const bestiaryUrls = await getUrlsByCategory('bestiary');
  const roeUrls = await getUrlsByCategory('roe');
  console.log(`Mission URLs: ${missionUrls.length}`);
  console.log(`Bestiary URLs: ${bestiaryUrls.length}`);
  console.log(`ROE URLs: ${roeUrls.length}`);
  console.log();

  // Example 3: Get URLs by Domain
  console.log('Example 3: Get URLs by Domain');
  console.log('─────────────────────────────');
  const ffxiUrls = await getUrlsByDomain('ffxiclopedia.fandom.com');
  const bgwikiUrls = await getUrlsByDomain('www.bg-wiki.com');
  console.log(`FFXIclopedia URLs: ${ffxiUrls.length}`);
  console.log(`BG-Wiki URLs: ${bgwikiUrls.length}`);
  console.log();

  // Example 4: Get Specialized URLs
  console.log('Example 4: Get Specialized URLs');
  console.log('───────────────────────────────');
  const allQuests = await getSpecializedUrls('quests', 'all');
  const ffxiQuests = await getSpecializedUrls('quests', 'ffxiclopedia');
  const bgwikiQuests = await getSpecializedUrls('quests', 'bgwiki');
  console.log(`All Quest URLs: ${allQuests.length}`);
  console.log(`FFXIclopedia Quests: ${ffxiQuests.length}`);
  console.log(`BG-Wiki Quests: ${bgwikiQuests.length}`);
  console.log();

  // Example 5: Search URLs with Custom Criteria
  console.log('Example 5: Search URLs');
  console.log('─────────────────────');
  const bastokContent = await searchUrls({
    titleContains: 'Bastok',
    category: 'missions'
  });
  console.log(`URLs about Bastok missions: ${bastokContent.length}`);
  if (bastokContent.length > 0) {
    console.log(`Example: ${bastokContent[0].title} - ${bastokContent[0].url}`);
  }
  console.log();

  // Example 6: Search by Multiple Criteria
  console.log('Example 6: Advanced Search');
  console.log('─────────────────────────');
  const bgwikiMissions = await searchUrls({
    category: 'missions',
    domain: 'www.bg-wiki.com',
    type: 'crawled'
  });
  console.log(`BG-Wiki crawled mission URLs: ${bgwikiMissions.length}`);
  console.log();

  // Example 7: Get URL Details
  console.log('Example 7: Get URL Details');
  console.log('──────────────────────────');
  if (bastokMissions.missionPages.length > 0) {
    const details = await getUrlDetails(bastokMissions.missionPages[0]);
    if (details) {
      console.log(`URL: ${details.url}`);
      console.log(`Title: ${details.title}`);
      console.log(`Type: ${details.type}`);
      console.log(`Categories: ${details.categories.join(', ')}`);
      console.log(`Sources: ${details.sources.join(', ')}`);
      console.log(`Mission Set: ${details.missionSet || 'N/A'}`);
    }
  }
  console.log();

  // Example 8: Get Statistics
  console.log('Example 8: Get Statistics');
  console.log('────────────────────────');
  const stats = await getUrlStats();
  console.log(`Total URLs: ${stats.totalUrls}`);
  console.log(`Mission Sets: ${stats.missionSets}`);
  console.log(`Categories: ${stats.categories}`);
  console.log(`Specialized Collections:`);
  console.log(`  Missions: ${stats.specialized.missions}`);
  console.log(`  Quests: ${stats.specialized.quests}`);
  console.log(`  Bestiary: ${stats.specialized.bestiary}`);
  console.log(`  ROE: ${stats.specialized.roe}`);
  console.log(`  Zones: ${stats.specialized.zones}`);
  console.log();

  // Example 9: List All Mission Sets
  console.log('Example 9: List All Mission Sets');
  console.log('────────────────────────────────');
  const allSets = await getAllMissionSets();
  const setCount = Object.keys(allSets).length;
  console.log(`Total Mission Sets: ${setCount}`);
  console.log('\nFirst 5 sets:');
  Object.entries(allSets).slice(0, 5).forEach(([id, set]) => {
    console.log(`  ${id}: ${set.name || id}`);
    if (set.missionPages) {
      console.log(`    Missions: ${set.missionPages.length}`);
    }
  });
  console.log();

  // Example 10: Practical Use Case - Get All Content for Bastok
  console.log('Example 10: Practical Use Case - All Bastok Content');
  console.log('──────────────────────────────────────────────────');
  const bastokAll = await searchUrls({
    urlPattern: 'bastok',
    category: ['missions', 'quests']
  });
  console.log(`All Bastok missions and quests: ${bastokAll.length}`);

  // Group by type
  const byType = {};
  bastokAll.forEach(url => {
    byType[url.type] = (byType[url.type] || 0) + 1;
  });
  console.log('By type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();

  console.log('✅ Examples complete!\n');
  console.log('For more information, see URL_ENHANCEMENT_GUIDE.md');
}

// Run examples
examples().catch(error => {
  console.error('❌ Error running examples:', error.message);
  console.error('\nMake sure you have run:');
  console.error('  npm run urls:merge');
  console.error('  npm run urls:config');
  process.exit(1);
});
