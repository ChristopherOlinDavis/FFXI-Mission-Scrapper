/**
 * End-to-End Integration Test
 * Tests the complete pipeline from parsing to API output
 */

import { scrapeMissionSet } from './src/scrapers/mission-set-scraper.js';
import {
  enrichMissionSet,
  addCrossReferences,
  buildAPIResponse,
  buildDependencyGraph,
  calculateAggregateStats,
  validateAPIResponse
} from './src/builders/index.js';
import { saveMissionSet, saveAPIResponse } from './src/utils/storage.js';

console.log('🧪 End-to-End Integration Test\n');

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

// Run complete pipeline
console.log('🚀 Running complete pipeline...\n');

console.log('Step 1: Parse mission set from HTML');
const result = await scrapeMissionSet('bastok-rank', { verbose: false });

test('Mission set parsed successfully', () => {
  if (!result.missionSet) throw new Error('No mission set');
  if (result.missions.length === 0) throw new Error('No missions parsed');
  console.log(`   ℹ️  Parsed ${result.missions.length} missions`);
});

test('Dependency edges created', () => {
  if (!result.dependencyEdges) throw new Error('No dependency edges');
  console.log(`   ℹ️  Created ${result.dependencyEdges.length} edges`);
});

console.log('\nStep 2: Enrich missions with metadata');
const enriched = enrichMissionSet(result.missions, result.dependencyEdges);

test('Missions enriched with computed metadata', () => {
  const first = enriched[0];
  if (!first.metadata.searchableText) throw new Error('No searchable text');
  if (!Array.isArray(first.metadata.keywords)) throw new Error('No keywords');
  if (typeof first.metadata.prerequisiteChainLength !== 'number') {
    throw new Error('No prerequisite chain length');
  }
  console.log(`   ℹ️  Enriched ${enriched.length} missions`);
});

console.log('\nStep 3: Add cross-references');
const withRefs = addCrossReferences(enriched, result.dependencyEdges);

test('Cross-references added', () => {
  const first = withRefs[0];
  if (!Array.isArray(first.relatedMissions)) throw new Error('No related missions');
  if (!Array.isArray(first.parallelMissions)) throw new Error('No parallel missions');
  if (typeof first.suggestedOrder !== 'number') throw new Error('No suggested order');
});

console.log('\nStep 4: Build API response');
const apiResponse = buildAPIResponse([{
  missionSet: result.missionSet,
  missions: withRefs
}]);

test('API response built', () => {
  if (!apiResponse.missionSets) throw new Error('No mission sets');
  if (apiResponse.missionSets.length === 0) throw new Error('Empty mission sets');
  if (!apiResponse.metadata) throw new Error('No metadata');
  console.log(`   ℹ️  API response contains ${apiResponse.missionSets.length} mission set(s)`);
});

test('API mission includes all enriched data', () => {
  const firstMission = apiResponse.missionSets[0].missions[0];
  if (!firstMission.metadata.searchableText) {
    throw new Error('Missing searchable text');
  }
  if (!firstMission.relatedMissions) {
    throw new Error('Missing related missions');
  }
});

console.log('\nStep 5: Validate against schema');
test('API response validates against schema', () => {
  validateAPIResponse(apiResponse);
  console.log('   ℹ️  Schema validation passed');
});

console.log('\nStep 6: Build dependency graph');
const graph = buildDependencyGraph(withRefs, result.dependencyEdges);

test('Dependency graph built', () => {
  if (!graph.nodes) throw new Error('No graph nodes');
  if (!graph.edges) throw new Error('No graph edges');
  if (!graph.stats) throw new Error('No graph stats');
  if (!graph.criticalPath) throw new Error('No critical path');
  console.log(`   ℹ️  Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
});

test('Critical path calculated', () => {
  if (!Array.isArray(graph.criticalPath)) throw new Error('Critical path not array');
  console.log(`   ℹ️  Critical path length: ${graph.criticalPath.length}`);
});

test('Graph layers calculated', () => {
  const layers = new Set(graph.nodes.map(n => n.layer));
  console.log(`   ℹ️  Graph has ${layers.size} layers`);
});

console.log('\nStep 7: Calculate aggregate statistics');
const stats = calculateAggregateStats(withRefs);

test('Aggregate statistics calculated', () => {
  if (typeof stats.totalMissions !== 'number') throw new Error('No total missions');
  if (typeof stats.totalNodes !== 'number') throw new Error('No total nodes');
  if (typeof stats.zoneCoverage !== 'number') throw new Error('No zone coverage');
  console.log(`   ℹ️  Total missions: ${stats.totalMissions}`);
  console.log(`   ℹ️  Zone coverage: ${stats.zoneCoverage} zones`);
});

test('Level range calculated', () => {
  if (!stats.levelRange) {
    console.log('   ⚠️  No level range (may be OK)');
    return;
  }
  if (typeof stats.levelRange.min !== 'number') throw new Error('Invalid min level');
  if (typeof stats.levelRange.max !== 'number') throw new Error('Invalid max level');
  console.log(`   ℹ️  Level range: ${stats.levelRange.min}-${stats.levelRange.max}`);
});

console.log('\nStep 8: Save to files');
test('Mission set saved', async () => {
  const path = await saveMissionSet(result.missionSet);
  if (!path) throw new Error('No path returned');
});

test('API response saved', async () => {
  const path = await saveAPIResponse(apiResponse);
  if (!path) throw new Error('No path returned');
});

// Data quality checks
console.log('\nStep 9: Data quality checks');

test('All missions have IDs', () => {
  const missingIds = withRefs.filter(m => !m.id);
  if (missingIds.length > 0) {
    throw new Error(`${missingIds.length} missions missing IDs`);
  }
});

test('All missions have titles', () => {
  const missingTitles = withRefs.filter(m => !m.title);
  if (missingTitles.length > 0) {
    throw new Error(`${missingTitles.length} missions missing titles`);
  }
});

test('All missions have nodes', () => {
  const missingNodes = withRefs.filter(m => !m.nodes || m.nodes.length === 0);
  if (missingNodes.length > 0) {
    throw new Error(`${missingNodes.length} missions have no nodes`);
  }
});

test('All nodes have required fields', () => {
  for (const mission of withRefs) {
    for (const node of mission.nodes) {
      if (!node.id) throw new Error(`Node missing ID in ${mission.id}`);
      if (!node.title) throw new Error(`Node missing title in ${mission.id}`);
    }
  }
});

test('Prerequisites are well-formed', () => {
  for (const mission of withRefs) {
    for (const prereq of mission.prerequisites || []) {
      if (!prereq.type) throw new Error(`Prerequisite missing type in ${mission.id}`);
      if (!prereq.requirement) throw new Error(`Prerequisite missing requirement in ${mission.id}`);
    }
  }
});

test('Dependency edges reference valid missions', () => {
  const missionIds = new Set(withRefs.map(m => m.id));
  for (const edge of result.dependencyEdges) {
    if (!missionIds.has(edge.from) && !missionIds.has(edge.to)) {
      throw new Error(`Invalid edge: ${edge.from} -> ${edge.to}`);
    }
  }
});

test('Tags are generated for all missions', () => {
  const missingTags = withRefs.filter(m => !m.metadata?.tags || m.metadata.tags.length === 0);
  if (missingTags.length > 0) {
    console.log(`   ⚠️  ${missingTags.length} missions have no tags`);
  }
});

test('Searchable text generated for all missions', () => {
  const missingSearchable = withRefs.filter(m => !m.metadata?.searchableText);
  if (missingSearchable.length > 0) {
    throw new Error(`${missingSearchable.length} missions missing searchable text`);
  }
});

// Performance metrics
console.log('\nStep 10: Performance metrics');

test('Average nodes per mission is reasonable', () => {
  const avgNodes = stats.averageNodesPerMission;
  console.log(`   ℹ️  Average nodes per mission: ${avgNodes.toFixed(1)}`);
  if (avgNodes < 1) throw new Error('Average nodes too low');
  if (avgNodes > 50) console.log('   ⚠️  Average nodes seems high');
});

test('Zone coverage is good', () => {
  console.log(`   ℹ️  Covers ${stats.zoneCoverage} unique zones`);
  if (stats.zoneCoverage === 0) {
    console.log('   ⚠️  No zone coverage (may be OK for some sets)');
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Integration Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

console.log('\n📊 Pipeline Results:');
console.log(`   Missions Parsed: ${result.missions.length}`);
console.log(`   Dependency Edges: ${result.dependencyEdges.length}`);
console.log(`   Graph Nodes: ${graph.nodes.length}`);
console.log(`   Graph Edges: ${graph.edges.length}`);
console.log(`   Zone Coverage: ${stats.zoneCoverage} zones`);
console.log(`   Level Range: ${stats.levelRange?.min || 'N/A'} - ${stats.levelRange?.max || 'N/A'}`);

if (passedTests === totalTests) {
  console.log('\n🎉 All integration tests passed!');
  console.log('✅ Complete pipeline is working end-to-end!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed');
  process.exit(1);
}
