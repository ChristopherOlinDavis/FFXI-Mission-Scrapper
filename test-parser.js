/**
 * Test script for parsing actual mission HTML files
 */

import { parseMission } from './src/parsers/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing FFXI Mission Parser with actual HTML\n');

// Test with a Voracious Resurgence mission (we know this exists)
const testMission = async () => {
  try {
    const url = 'https://ffxiclopedia.fandom.com/wiki/The_Voracious_Resurgence_(mission)';
    console.log(`Parsing: ${url}\n`);

    const mission = await parseMission(url, 'voracious-resurgence');

    console.log('✅ Mission parsed successfully!\n');
    console.log('Mission Details:');
    console.log('  ID:', mission.id);
    console.log('  Title:', mission.title);
    console.log('  Number:', mission.number || 'N/A');
    console.log('  Nodes:', mission.nodes.length);
    console.log('  Prerequisites:', mission.prerequisites.length);
    console.log('  Category:', mission.metadata?.category);
    console.log('  Min Level:', mission.metadata?.minLevel || 'N/A');
    console.log('  Difficulty:', mission.metadata?.difficulty || 'N/A');

    if (mission.nodes.length > 0) {
      console.log('\nFirst Node:');
      console.log('  Title:', mission.nodes[0].title);
      console.log('  Description:', mission.nodes[0].description.substring(0, 100) + '...');
      if (mission.nodes[0].location) {
        console.log('  Location:', JSON.stringify(mission.nodes[0].location));
      }
    }

    if (mission.prerequisites.length > 0) {
      console.log('\nPrerequisites:');
      for (const prereq of mission.prerequisites.slice(0, 3)) {
        console.log(`  - ${prereq.type}: ${prereq.requirement}`);
        if (prereq.children) {
          console.log(`    (Complex gate with ${prereq.children.length} children)`);
        }
      }
    }

    return mission;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return null;
  }
};

// Run test
testMission().then((mission) => {
  if (mission) {
    console.log('\n🎉 Parser test complete!');
    console.log('\n📊 Statistics:');
    console.log(`  Nodes created: ${mission.nodes.length}`);
    console.log(`  Prerequisites found: ${mission.prerequisites.length}`);
    console.log(`  Has metadata: ${mission.metadata ? 'Yes' : 'No'}`);
  } else {
    console.log('\n❌ Parser test failed');
    process.exit(1);
  }
});
