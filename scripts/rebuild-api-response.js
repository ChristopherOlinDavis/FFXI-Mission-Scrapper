/**
 * Rebuild API Response
 * Combines all mission sets into api-response.json with updated WotG structure
 */

import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'output');
const IOS_DIR = path.join(process.cwd(), 'ios-app-package');

async function rebuildApiResponse() {
  console.log('📦 Rebuilding api-response.json with updated WotG structure...\n');

  // Load all mission set files
  const missionSetFiles = [
    'ffxiclopedia-bastok.json',
    'ffxiclopedia-sandoria.json',
    'ffxiclopedia-windurst.json',
    'zilart.json',
    'promathia.json',
    'wotg.json'  // This one now has quests!
  ];

  const missionSets = [];
  let totalMissions = 0;
  let totalNodes = 0;
  let totalQuests = 0;

  for (const filename of missionSetFiles) {
    const filepath = path.join(OUTPUT_DIR, filename);
    const data = JSON.parse(await fs.readFile(filepath, 'utf-8'));

    missionSets.push(data);

    // Handle different structures
    if (data.entries) {
      // WotG unified structure
      const missions = data.entries.filter(e => e.type === 'mission');
      const quests = data.entries.filter(e => e.type === 'quest');

      totalMissions += missions.length;
      totalQuests += quests.length;

      // Count nodes from all entries
      for (const entry of data.entries) {
        totalNodes += entry.nodes.length;
      }

      console.log(`✓ Loaded ${filename}`);
      console.log(`  - Missions: ${missions.length}`);
      console.log(`  - Quest variants: ${quests.length}`);
      console.log(`  - Total entries: ${data.entries.length}`);
    } else {
      // Traditional structure (missions only)
      totalMissions += data.missions.length;

      // Count nodes
      for (const mission of data.missions) {
        totalNodes += mission.nodes.length;
      }

      console.log(`✓ Loaded ${filename}`);
      console.log(`  - Missions: ${data.missions.length}`);
    }
  }

  console.log();

  // Create API response
  const apiResponse = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    missionSets: missionSets,
    stats: {
      totalSets: missionSets.length,
      totalMissions: totalMissions,
      totalNodes: totalNodes,
      totalQuests: totalQuests
    }
  };

  // Write to both output and iOS directories
  const outputPath = path.join(IOS_DIR, 'api-response.json');
  await fs.writeFile(outputPath, JSON.stringify(apiResponse, null, 2));

  console.log('✅ Successfully rebuilt api-response.json');
  console.log(`   Written to: ${outputPath}`);
  console.log();
  console.log('📊 Stats:');
  console.log(`   Mission Sets: ${apiResponse.stats.totalSets}`);
  console.log(`   Total Missions: ${apiResponse.stats.totalMissions}`);
  console.log(`   Total Quests: ${apiResponse.stats.totalQuests}`);
  console.log(`   Total Nodes: ${apiResponse.stats.totalNodes}`);
  console.log();
  console.log('🎯 WotG Structure:');
  const wotg = missionSets.find(s => s.id === 'wotg');
  console.log(`   Missions: ${wotg.missions.length}`);
  console.log(`   Quests: ${wotg.quests?.length || 0}`);
  console.log(`   Quest Variants: ${wotg.stats?.totalQuestVariants || 0}`);
}

rebuildApiResponse().catch(console.error);
