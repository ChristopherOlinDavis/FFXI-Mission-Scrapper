/**
 * Clean missing URLs from url-list.json
 * Removes URLs that:
 * - Are duplicates (redirect to other pages)
 * - Have invalid filenames
 * - Don't exist anymore
 */

import { loadURLList, saveURLList } from './download-manager.js';

const URLS_TO_REMOVE = [
  'https://ffxiclopedia.fandom.com/wiki/The_Jester_Who%27d_Be_King',  // Duplicate/redirect
  'https://ffxiclopedia.fandom.com/wiki/TOAU_Missions',  // Duplicate of Category:Treasures_of_Aht_Urhgan_Missions
  'https://ffxiclopedia.fandom.com/wiki/Category:Assault_Missions',  // Duplicate of Assault_Missions
];

async function cleanMissingURLs() {
  console.log('\n🧹 Cleaning missing URLs from url-list.json\n');

  const urlList = await loadURLList();
  let totalRemoved = 0;

  for (const urlToRemove of URLS_TO_REMOVE) {
    for (const [setId, setData] of Object.entries(urlList)) {
      // Check categoryPages
      const categoryIndex = setData.categoryPages.indexOf(urlToRemove);
      if (categoryIndex !== -1) {
        setData.categoryPages.splice(categoryIndex, 1);
        console.log(`  Removed from ${setId} (categoryPages): ${urlToRemove}`);
        totalRemoved++;
      }

      // Check missionPages
      const missionIndex = setData.missionPages.indexOf(urlToRemove);
      if (missionIndex !== -1) {
        setData.missionPages.splice(missionIndex, 1);
        console.log(`  Removed from ${setId} (missionPages): ${urlToRemove}`);
        totalRemoved++;
      }
    }
  }

  if (totalRemoved > 0) {
    await saveURLList(urlList);
    console.log(`\n✓ Removed ${totalRemoved} URLs from url-list.json\n`);
  } else {
    console.log('\n✓ No URLs needed to be removed\n');
  }

  return totalRemoved;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await cleanMissingURLs();
}

export { cleanMissingURLs };
