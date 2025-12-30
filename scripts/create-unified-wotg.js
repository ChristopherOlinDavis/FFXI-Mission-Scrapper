/**
 * Create Unified WotG JSON
 * Combines missions and quests into a single unified array
 */

import fs from 'fs/promises';
import path from 'path';

const WOTG_PATH = path.join(process.cwd(), 'output/wotg.json');
const OUTPUT_PATH = path.join(process.cwd(), 'ios-app-package/wotg.json');

async function createUnifiedWotG() {
  console.log('🔄 Creating unified WotG JSON...\n');

  const data = JSON.parse(await fs.readFile(WOTG_PATH, 'utf-8'));

  // Create unified entries array combining missions and quests
  const entries = [];

  // Add all missions
  for (const mission of data.missions) {
    entries.push({
      type: 'mission',
      ...mission
    });
  }

  // Add all quest variants as individual entries
  for (const quest of data.quests) {
    for (const variant of quest.variants) {
      entries.push({
        type: 'quest',
        id: `${quest.id}-${variant.nation}`,
        questId: quest.id,
        questNumber: quest.number,
        title: variant.title,
        nation: variant.nation,
        number: quest.number, // For sorting
        nodes: variant.nodes,
        metadata: variant.metadata
      });
    }
  }

  // Sort by number (missions and quests interleaved)
  entries.sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  // Create unified structure
  const unified = {
    id: data.id,
    name: data.name,
    category: data.category,
    sourceUrl: data.sourceUrl,
    lastScraped: data.lastScraped,
    entries: entries,
    stats: {
      totalMissions: data.missions.length,
      totalQuests: data.quests.length,
      totalQuestVariants: data.stats.totalQuestVariants,
      totalEntries: entries.length
    }
  };

  // Write unified file
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(unified, null, 2));

  console.log('✅ Created unified WotG JSON');
  console.log(`   Written to: ${OUTPUT_PATH}`);
  console.log();
  console.log('📊 Stats:');
  console.log(`   Missions: ${unified.stats.totalMissions}`);
  console.log(`   Quests: ${unified.stats.totalQuests}`);
  console.log(`   Quest Variants: ${unified.stats.totalQuestVariants}`);
  console.log(`   Total Entries: ${unified.stats.totalEntries}`);
  console.log();
  console.log('📋 Entry Types:');
  const missionCount = entries.filter(e => e.type === 'mission').length;
  const questCount = entries.filter(e => e.type === 'quest').length;
  console.log(`   Missions: ${missionCount}`);
  console.log(`   Quest variants: ${questCount}`);
  console.log();
  console.log('🎯 First 10 entries:');
  entries.slice(0, 10).forEach((entry, i) => {
    if (entry.type === 'mission') {
      console.log(`   ${i + 1}. Mission ${entry.number}: ${entry.title}`);
    } else {
      console.log(`   ${i + 1}. Quest ${entry.questNumber} (${entry.nation}): ${entry.title}`);
    }
  });
}

createUnifiedWotG().catch(console.error);
