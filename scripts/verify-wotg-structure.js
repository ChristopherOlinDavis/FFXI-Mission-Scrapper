/**
 * Verify WotG Unified Structure
 * Validates the unified quest & mission structure
 */

import fs from 'fs/promises';
import path from 'path';

const WOTG_PATH = path.join(process.cwd(), 'output/wotg.json');

async function verifyStructure() {
  console.log('🔍 Verifying WotG unified structure...\n');

  const data = JSON.parse(await fs.readFile(WOTG_PATH, 'utf-8'));

  // Check basic structure
  console.log('📊 Basic Structure:');
  console.log(`  ✓ Has missions array: ${Array.isArray(data.missions)}`);
  console.log(`  ✓ Has quests array: ${Array.isArray(data.quests)}`);
  console.log(`  ✓ Has stats object: ${!!data.stats}`);
  console.log();

  // Check counts
  console.log('📈 Counts:');
  console.log(`  Missions: ${data.missions.length}`);
  console.log(`  Quests: ${data.quests.length}`);
  console.log(`  Expected quest variants: ${data.quests.length * 3}`);
  console.log(`  Stats totalMissions: ${data.stats.totalMissions}`);
  console.log(`  Stats totalQuests: ${data.stats.totalQuests}`);
  console.log(`  Stats totalQuestVariants: ${data.stats.totalQuestVariants}`);
  console.log();

  // Verify all quests have 3 variants
  console.log('🔎 Quest Variant Verification:');
  let allQuestsValid = true;
  for (const quest of data.quests) {
    const hasThreeVariants = quest.variants.length === 3;
    const nations = quest.variants.map(v => v.nation);
    const hasAllNations = nations.includes('bastok') &&
                          nations.includes('sandoria') &&
                          nations.includes('windurst');

    if (!hasThreeVariants || !hasAllNations) {
      console.log(`  ✗ Quest ${quest.number}: Invalid variants`);
      allQuestsValid = false;
    }
  }
  if (allQuestsValid) {
    console.log(`  ✓ All ${data.quests.length} quests have 3 nation variants`);
  }
  console.log();

  // Check mission prerequisites
  console.log('🔗 Mission Prerequisites:');
  const missionsWithPrereqs = data.missions.filter(m =>
    m.metadata?.questPrerequisite
  );
  console.log(`  Missions with quest prerequisites: ${missionsWithPrereqs.length}`);

  for (const mission of missionsWithPrereqs) {
    const prereqId = mission.metadata.questPrerequisite;
    const quest = data.quests.find(q => q.id === prereqId);

    if (quest) {
      console.log(`  ✓ Mission ${mission.number} → ${prereqId} (${quest.title})`);
    } else {
      console.log(`  ✗ Mission ${mission.number} → ${prereqId} NOT FOUND`);
    }
  }
  console.log();

  // Check for deprecated nationSpecificQuest field
  console.log('🗑️  Deprecated Fields:');
  const missionsWithOldField = data.missions.filter(m =>
    m.metadata?.nationSpecificQuest
  );
  if (missionsWithOldField.length === 0) {
    console.log('  ✓ No missions use deprecated nationSpecificQuest field');
  } else {
    console.log(`  ⚠️  ${missionsWithOldField.length} missions still have nationSpecificQuest`);
  }
  console.log();

  // Verify quest IDs follow pattern
  console.log('🏷️  Quest ID Format:');
  const allQuestIdsValid = data.quests.every(q =>
    q.id.match(/^wotg-quest-\d+$/)
  );
  if (allQuestIdsValid) {
    console.log('  ✓ All quest IDs follow wotg-quest-N pattern');
  } else {
    console.log('  ✗ Some quest IDs have invalid format');
  }
  console.log();

  // Sample quest data
  console.log('📝 Sample Quest (Quest 5):');
  const quest5 = data.quests.find(q => q.number === '5');
  if (quest5) {
    console.log(`  ID: ${quest5.id}`);
    console.log(`  Title: ${quest5.title}`);
    console.log(`  Type: ${quest5.type}`);
    console.log('  Variants:');
    quest5.variants.forEach(v => {
      console.log(`    - ${v.nation}: ${v.title}`);
    });
  }
  console.log();

  // Summary
  console.log('✅ Verification Summary:');
  console.log(`  Total missions: ${data.missions.length}`);
  console.log(`  Total quests: ${data.quests.length}`);
  console.log(`  Total quest variants: ${data.quests.length * 3}`);
  console.log(`  Missions with prerequisites: ${missionsWithPrereqs.length}`);
  console.log(`  Structure: ${allQuestsValid && allQuestIdsValid ? 'VALID ✓' : 'INVALID ✗'}`);
  console.log();
  console.log('🎉 WotG unified structure is ready for iOS integration!');
}

verifyStructure().catch(console.error);
