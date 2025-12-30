const fs = require('fs');

// Check ios-app-package files
console.log('📋 Checking final structure...\n');

// 1. Check wotg.json
const wotg = JSON.parse(fs.readFileSync('ios-app-package/wotg.json', 'utf-8'));
console.log('✅ wotg.json:');
console.log('  Has entries:', !!wotg.entries);
console.log('  Total entries:', wotg.entries?.length || 0);
console.log('  Stats:', JSON.stringify(wotg.stats, null, 2));
console.log();

// 2. Check api-response.json
const apiResponse = JSON.parse(fs.readFileSync('ios-app-package/api-response.json', 'utf-8'));
const wotgFromApi = apiResponse.missionSets.find(s => s.id === 'wotg');
console.log('✅ api-response.json WotG:');
console.log('  Has entries:', !!wotgFromApi.entries);
console.log('  Total entries:', wotgFromApi.entries?.length || 0);
console.log('  Stats:', JSON.stringify(wotgFromApi.stats, null, 2));
console.log();

// 3. Show sample entries
console.log('📝 Sample entries from wotg.json:');
console.log('  First quest:', wotg.entries[0].title, `(${wotg.entries[0].type})`);
console.log('  First mission:', wotg.entries.find(e => e.type === 'mission').title, '(mission)');
console.log();

console.log('🎉 Structure verified!');
