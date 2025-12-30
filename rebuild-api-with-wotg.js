#!/usr/bin/env node
/**
 * Rebuild clean API response with Wings of the Goddess included
 */

import fs from 'fs/promises';

async function rebuildAPI() {
  console.log('📦 Rebuilding API response with Wings of the Goddess...\n');

  // Load all mission sets
  const bastok = JSON.parse(await fs.readFile('./output/ffxiclopedia-bastok.json', 'utf-8'));
  const sandoria = JSON.parse(await fs.readFile('./output/ffxiclopedia-sandoria.json', 'utf-8'));
  const windurst = JSON.parse(await fs.readFile('./output/ffxiclopedia-windurst.json', 'utf-8'));
  const zilart = JSON.parse(await fs.readFile('./output/zilart.json', 'utf-8'));
  const promathia = JSON.parse(await fs.readFile('./output/promathia.json', 'utf-8'));
  const wotg = JSON.parse(await fs.readFile('./output/wotg.json', 'utf-8'));

  const missionSets = [bastok, sandoria, windurst, zilart, promathia, wotg];

  // Calculate stats
  const totalMissions = missionSets.reduce((sum, set) => sum + set.missions.length, 0);
  const totalNodes = missionSets.reduce((sum, set) =>
    sum + set.missions.reduce((nodeSum, mission) => nodeSum + mission.nodes.length, 0), 0
  );

  // Build API response
  const apiResponse = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    missionSets,
    stats: {
      totalSets: missionSets.length,
      totalMissions,
      totalNodes
    }
  };

  // Save to both output and ios-app-package
  await fs.writeFile('./output/api-response.json', JSON.stringify(apiResponse, null, 2));
  await fs.writeFile('./ios-app-package/api-response.json', JSON.stringify(apiResponse, null, 2));

  console.log('✅ API Response Built:');
  console.log(`   Mission Sets: ${apiResponse.stats.totalSets}`);
  console.log(`   Total Missions: ${apiResponse.stats.totalMissions}`);
  console.log(`   Total Nodes: ${apiResponse.stats.totalNodes}`);
  console.log('\n📊 Breakdown:');
  missionSets.forEach(set => {
    const nodes = set.missions.reduce((sum, m) => sum + m.nodes.length, 0);
    console.log(`   ${set.name}: ${set.missions.length} missions, ${nodes} nodes`);
  });

  console.log('\n✅ Saved to:');
  console.log('   - output/api-response.json');
  console.log('   - ios-app-package/api-response.json');
}

rebuildAPI().catch(console.error);
