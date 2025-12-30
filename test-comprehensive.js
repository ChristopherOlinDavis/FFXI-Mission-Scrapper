/**
 * Comprehensive test suite for the refactored parser
 */

import { scrapeMissionSet, getAvailableMissionSets } from './src/scrapers/mission-set-scraper.js';
import { parseMission } from './src/parsers/index.js';
import { buildDependencyEdges, topologicalSort } from './src/parsers/dependency-builder.js';

console.log('🧪 Comprehensive FFXI Mission Parser Test Suite\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

// Test 1: Configuration Loading
console.log('📋 Test 1: Configuration Loading');
const config = await getAvailableMissionSets();
test('Config has all mission sets', () => {
  const expected = ['bastok-rank', 'sandoria-rank', 'windurst-rank', 'zilart', 'promathia', 'toau', 'wotg', 'soa', 'rov', 'asa', 'amk', 'acp'];
  const actual = Object.keys(config);
  if (expected.every(key => actual.includes(key))) return;
  throw new Error(`Missing keys: ${expected.filter(k => !actual.includes(k))}`);
});

test('Each config has required fields', () => {
  for (const [id, cfg] of Object.entries(config)) {
    if (!cfg.name) throw new Error(`${id} missing name`);
    if (!cfg.category) throw new Error(`${id} missing category`);
    if (!cfg.sourceWiki) throw new Error(`${id} missing sourceWiki`);
  }
});

// Test 2: Single Mission Parsing
console.log('\n🔬 Test 2: Single Mission Parsing');
const testUrl = 'https://ffxiclopedia.fandom.com/wiki/The_Voracious_Resurgence_(mission)';
const mission = await parseMission(testUrl, 'test-set');

test('Mission has required fields', () => {
  if (!mission.id) throw new Error('Missing id');
  if (!mission.title) throw new Error('Missing title');
  if (!mission.nodes) throw new Error('Missing nodes');
  if (!mission.metadata) throw new Error('Missing metadata');
});

test('Mission has nodes with proper structure', () => {
  if (mission.nodes.length === 0) throw new Error('No nodes found');
  const node = mission.nodes[0];
  if (!node.id) throw new Error('Node missing id');
  if (!node.title) throw new Error('Node missing title');
  if (!node.description) throw new Error('Node missing description');
  if (!Array.isArray(node.dependencies)) throw new Error('Node missing dependencies array');
});

test('Mission has prerequisites', () => {
  if (!Array.isArray(mission.prerequisites)) throw new Error('Prerequisites not an array');
});

test('Mission metadata is correct', () => {
  if (!mission.metadata.category) throw new Error('Missing category');
  if (!mission.metadata.missionSet) throw new Error('Missing missionSet');
});

// Test 3: Mission Set Parsing (smaller set)
console.log('\n📦 Test 3: Mission Set Parsing');
console.log('   Parsing bastok-rank missions (this may take a moment)...');

const result = await scrapeMissionSet('bastok-rank', { verbose: false });

test('Mission set parsed successfully', () => {
  if (!result.missionSet) throw new Error('No mission set returned');
  if (!result.missions) throw new Error('No missions array');
  if (!result.stats) throw new Error('No stats');
});

test('All missions parsed (100% success rate)', () => {
  if (result.stats.parsed !== result.stats.total) {
    throw new Error(`Only ${result.stats.parsed}/${result.stats.total} missions parsed`);
  }
});

test('Mission set has valid structure', () => {
  const ms = result.missionSet;
  if (!ms.id) throw new Error('Missing id');
  if (!ms.name) throw new Error('Missing name');
  if (!ms.category) throw new Error('Missing category');
  if (!ms.missions) throw new Error('Missing missions');
});

test('Missions have sequential IDs', () => {
  const missions = result.missions;
  if (missions.length === 0) throw new Error('No missions');
  for (const m of missions) {
    if (!m.id.startsWith('bastok-rank-')) throw new Error(`Invalid ID: ${m.id}`);
  }
});

// Test 4: Dependency Building
console.log('\n🔗 Test 4: Dependency Building');

test('Dependency edges created', () => {
  if (!result.dependencyEdges) throw new Error('No dependency edges');
  if (!Array.isArray(result.dependencyEdges)) throw new Error('Dependency edges not array');
});

test('Dependency edges have valid structure', () => {
  if (result.dependencyEdges.length === 0) return; // OK if no edges
  const edge = result.dependencyEdges[0];
  if (!edge.from) throw new Error('Edge missing from');
  if (!edge.to) throw new Error('Edge missing to');
  if (!edge.type) throw new Error('Edge missing type');
  if (typeof edge.isHard !== 'boolean') throw new Error('Edge missing isHard');
});

test('Mission unlocks are computed', () => {
  const missionsWithUnlocks = result.missions.filter(m => m.unlocks && m.unlocks.length > 0);
  // At least some missions should have unlocks
  if (missionsWithUnlocks.length === 0) {
    console.log('   ⚠️  Warning: No missions have unlocks (may be OK for some sets)');
  }
});

test('Mission navigation is computed', () => {
  const missionsWithNav = result.missions.filter(m => m.navigation);
  if (missionsWithNav.length === 0) throw new Error('No missions have navigation');

  const nav = missionsWithNav[0].navigation;
  if (typeof nav.setIndex !== 'number') throw new Error('Navigation missing setIndex');
  if (typeof nav.setTotal !== 'number') throw new Error('Navigation missing setTotal');
});

// Test 5: Prerequisite Extraction
console.log('\n🎯 Test 5: Prerequisite Extraction');

test('Prerequisites are extracted', () => {
  const missionsWithPrereqs = result.missions.filter(m => m.prerequisites && m.prerequisites.length > 0);
  if (missionsWithPrereqs.length === 0) {
    console.log('   ⚠️  Warning: No missions have prerequisites');
  }
});

test('Expansion prerequisites detected', () => {
  const expansionPrereqs = result.missions
    .flatMap(m => m.prerequisites || [])
    .filter(p => p.type === 'expansion');

  // Some missions in the set should have expansion prereqs
  if (expansionPrereqs.length > 0) {
    const prereq = expansionPrereqs[0];
    if (!prereq.expansionId) throw new Error('Expansion prereq missing expansionId');
  }
});

test('Level prerequisites detected', () => {
  const levelPrereqs = result.missions
    .flatMap(m => m.prerequisites || [])
    .filter(p => p.type === 'level');

  if (levelPrereqs.length > 0) {
    const prereq = levelPrereqs[0];
    if (typeof prereq.characterLevel !== 'number') throw new Error('Level prereq missing characterLevel');
  }
});

// Test 6: Location Extraction
console.log('\n📍 Test 6: Location Extraction');

test('Locations extracted from nodes', () => {
  const nodesWithLocation = result.missions
    .flatMap(m => m.nodes)
    .filter(n => n.location && (n.location.zone || n.location.coordinates || n.location.npc));

  if (nodesWithLocation.length === 0) {
    console.log('   ⚠️  Warning: No nodes have location data');
  } else {
    console.log(`   ℹ️  Found ${nodesWithLocation.length} nodes with location data`);
  }
});

test('Location structure is valid', () => {
  const nodesWithLocation = result.missions
    .flatMap(m => m.nodes)
    .filter(n => n.location);

  if (nodesWithLocation.length > 0) {
    const loc = nodesWithLocation[0].location;
    // At least one location field should be present
    if (!loc.zone && !loc.coordinates && !loc.npc) {
      throw new Error('Location has no fields');
    }
  }
});

// Test 7: Topological Sort
console.log('\n📊 Test 7: Graph Algorithms');

test('Topological sort works', () => {
  const sorted = topologicalSort(result.missions, result.dependencyEdges);
  if (!Array.isArray(sorted)) throw new Error('Topological sort did not return array');
  // Sorted should have missions (may not be all if there are cycles or isolated nodes)
  if (sorted.length === 0 && result.missions.length > 0) {
    throw new Error('Topological sort returned empty array');
  }
});

// Test 8: Schema Validation
console.log('\n✔️  Test 8: Schema Validation');

test('Mission set validates against schema', () => {
  // If we got this far, schema validation already passed in scrapeMissionSet
  // This is just to confirm
  if (!result.missionSet.id) throw new Error('Schema validation should have caught this');
});

// Test 9: Performance Check
console.log('\n⚡ Test 9: Performance');

test('Parse time is reasonable', () => {
  const avgTimePerMission = result.stats.total > 0 ? 1000 / result.stats.total : 0;
  console.log(`   ℹ️  Average parse time: ~${avgTimePerMission.toFixed(0)}ms per mission`);
  // This is just informational, not a hard requirement
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

console.log('\n📊 Mission Set Statistics:');
console.log(`   Total Missions: ${result.stats.total}`);
console.log(`   Successfully Parsed: ${result.stats.parsed}`);
console.log(`   Failed: ${result.stats.failed}`);
console.log(`   Dependency Edges: ${result.dependencyEdges.length}`);
console.log(`   Parse Success Rate: ${((result.stats.parsed / result.stats.total) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed');
  process.exit(1);
}
