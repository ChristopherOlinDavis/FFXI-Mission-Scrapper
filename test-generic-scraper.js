/**
 * Test the generic mission set scraper
 */

import { scrapeMissionSet, getAvailableMissionSets } from './src/scrapers/mission-set-scraper.js';

console.log('🧪 Testing Generic Mission Set Scraper\n');

async function testScraper() {
  // List available mission sets
  console.log('📋 Available Mission Sets:');
  const config = await getAvailableMissionSets();
  for (const [id, setConfig] of Object.entries(config)) {
    console.log(`   - ${id}: ${setConfig.name} (${setConfig.category})`);
  }

  // Test with a small set (we'll use bastok-rank which has missions downloaded)
  console.log('\n🔬 Testing with a sample mission set...\n');

  try {
    const result = await scrapeMissionSet('bastok-rank', {
      verbose: true,
      onProgress: (current, total, mission) => {
        // Progress callback handled by verbose mode
      }
    });

    console.log('\n✅ Scraping complete!');
    console.log('\n📊 Results:');
    console.log(`   Mission Set: ${result.missionSet.name}`);
    console.log(`   Category: ${result.missionSet.category}`);
    console.log(`   Total Missions: ${result.stats.total}`);
    console.log(`   Successfully Parsed: ${result.stats.parsed}`);
    console.log(`   Failed: ${result.stats.failed}`);
    console.log(`   Dependency Edges: ${result.dependencyEdges.length}`);

    if (result.missions.length > 0) {
      const firstMission = result.missions[0];
      console.log('\n📝 Sample Mission:');
      console.log(`   Title: ${firstMission.title}`);
      console.log(`   ID: ${firstMission.id}`);
      console.log(`   Nodes: ${firstMission.nodes.length}`);
      console.log(`   Prerequisites: ${firstMission.prerequisites.length}`);
      console.log(`   Unlocks: ${firstMission.unlocks.length}`);
      if (firstMission.navigation) {
        console.log(`   Next Mission: ${firstMission.navigation.next || 'None'}`);
      }
    }

    return result;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return null;
  }
}

// Run test
testScraper().then((result) => {
  if (result) {
    console.log('\n🎉 Generic scraper test passed!');
  } else {
    console.log('\n❌ Generic scraper test failed');
    process.exit(1);
  }
});
