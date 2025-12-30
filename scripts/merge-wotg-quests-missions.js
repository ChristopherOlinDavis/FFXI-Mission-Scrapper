/**
 * Merge WotG Quests and Missions
 * Combines quest data with existing mission data to create unified WotG structure
 */

import fs from 'fs/promises';
import path from 'path';

const WOTG_MISSIONS_PATH = path.join(process.cwd(), 'output/wotg.json');
const WOTG_QUESTS_PATH = path.join(process.cwd(), 'output/wotg-quests.json');
const OUTPUT_PATH = path.join(process.cwd(), 'output/wotg.json');
const IOS_OUTPUT_PATH = path.join(process.cwd(), 'ios-app-package/wotg.json');

async function mergeWotGData() {
  console.log('Loading WotG missions and quests...');

  // Load existing missions
  const missionsData = JSON.parse(await fs.readFile(WOTG_MISSIONS_PATH, 'utf-8'));

  // Load generated quests
  const quests = JSON.parse(await fs.readFile(WOTG_QUESTS_PATH, 'utf-8'));

  console.log(`Loaded ${missionsData.missions.length} missions`);
  console.log(`Loaded ${quests.length} quests with 3 variants each`);

  // Update mission metadata to use quest IDs instead of inline quest data
  const updatedMissions = missionsData.missions.map(mission => {
    if (mission.metadata?.questPrerequisite) {
      // Extract quest number from existing data
      const questMatch = mission.metadata.questPrerequisite.match(/Quest (\d+)/i);
      if (questMatch) {
        const questNum = questMatch[1];
        mission.metadata.questPrerequisite = `wotg-quest-${questNum}`;

        // Remove the inline nationSpecificQuest data - it's now in the quests array
        delete mission.metadata.nationSpecificQuest;
      }
    }
    return mission;
  });

  // Create unified structure
  const unifiedWotG = {
    ...missionsData,
    missions: updatedMissions,
    quests: quests,
    stats: {
      totalMissions: updatedMissions.length,
      totalQuests: quests.length,
      totalQuestVariants: quests.length * 3
    }
  };

  // Write to output
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(unifiedWotG, null, 2));
  await fs.writeFile(IOS_OUTPUT_PATH, JSON.stringify(unifiedWotG, null, 2));

  console.log('\n✓ Successfully merged WotG data');
  console.log(`  Missions: ${unifiedWotG.stats.totalMissions}`);
  console.log(`  Quests: ${unifiedWotG.stats.totalQuests}`);
  console.log(`  Quest Variants: ${unifiedWotG.stats.totalQuestVariants}`);
  console.log(`\nWritten to:`);
  console.log(`  ${OUTPUT_PATH}`);
  console.log(`  ${IOS_OUTPUT_PATH}`);
}

mergeWotGData().catch(console.error);
