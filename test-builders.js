/**
 * Test suite for the builder layer
 */

import { scrapeMissionSet } from './src/scrapers/mission-set-scraper.js';
import {
  buildAPIMission,
  buildAPIMissionSet,
  buildAPIResponse,
  buildDependencyGraph,
  buildMissionSubgraph,
  enrichMission,
  enrichMissionSet,
  addCrossReferences,
  calculateAggregateStats
} from './src/builders/index.js';

console.log('🧪 Builder Layer Test Suite\n');

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

// Parse a mission set first
console.log('📦 Parsing mission set for testing...');
const result = await scrapeMissionSet('bastok-rank', { verbose: false });
console.log(`   Parsed ${result.missions.length} missions\n`);

// Test 1: JSON Builder
console.log('📋 Test 1: JSON Builder');

test('buildAPIMission returns valid structure', () => {
  const apiMission = buildAPIMission(result.missions[0]);
  if (!apiMission.id) throw new Error('Missing id');
  if (!apiMission.title) throw new Error('Missing title');
  if (!apiMission.category) throw new Error('Missing category');
  if (!Array.isArray(apiMission.nodes)) throw new Error('nodes not array');
  if (!Array.isArray(apiMission.prerequisites)) throw new Error('prerequisites not array');
  if (!apiMission.metadata) throw new Error('Missing metadata');
  if (!Array.isArray(apiMission.metadata.tags)) throw new Error('tags not array');
  if (!apiMission.navigation) throw new Error('Missing navigation');
});

test('buildAPIMissionSet returns valid structure', () => {
  const apiMissionSet = buildAPIMissionSet(result.missionSet, result.missions);
  if (!apiMissionSet.id) throw new Error('Missing id');
  if (!apiMissionSet.name) throw new Error('Missing name');
  if (!Array.isArray(apiMissionSet.missions)) throw new Error('missions not array');
  if (!apiMissionSet.summary) throw new Error('Missing summary');
  if (typeof apiMissionSet.summary.totalMissions !== 'number') throw new Error('Invalid totalMissions');
});

test('buildAPIResponse returns valid structure', () => {
  const apiResponse = buildAPIResponse([result]);
  if (!Array.isArray(apiResponse.missionSets)) throw new Error('missionSets not array');
  if (!apiResponse.metadata) throw new Error('Missing metadata');
  if (typeof apiResponse.metadata.totalMissions !== 'number') throw new Error('Invalid totalMissions');
  if (typeof apiResponse.metadata.totalSets !== 'number') throw new Error('Invalid totalSets');
});

test('Tags are generated correctly', () => {
  const apiMission = buildAPIMission(result.missions[0]);
  if (apiMission.metadata.tags.length === 0) {
    console.log('   ⚠️  Warning: No tags generated');
  }
  // Should have at least category tag
  if (!apiMission.metadata.tags.includes(apiMission.category)) {
    throw new Error('Category tag not included');
  }
});

// Test 2: Graph Builder
console.log('\n🔗 Test 2: Graph Builder');

test('buildDependencyGraph returns valid structure', () => {
  const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
  if (!Array.isArray(graph.nodes)) throw new Error('nodes not array');
  if (!Array.isArray(graph.edges)) throw new Error('edges not array');
  if (!graph.stats) throw new Error('Missing stats');
  if (!graph.layout) throw new Error('Missing layout');
  console.log(`   ℹ️  Graph has ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
});

test('Graph nodes have required properties', () => {
  const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
  if (graph.nodes.length === 0) throw new Error('No nodes');

  const node = graph.nodes[0];
  if (!node.id) throw new Error('Node missing id');
  if (!node.label) throw new Error('Node missing label');
  if (typeof node.layer !== 'number') throw new Error('Node missing layer');
  if (typeof node.isStartNode !== 'boolean') throw new Error('Node missing isStartNode');
  if (typeof node.isCriticalPath !== 'boolean') throw new Error('Node missing isCriticalPath');
});

test('Graph edges have required properties', () => {
  const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
  if (graph.edges.length === 0) {
    console.log('   ℹ️  No edges to test');
    return;
  }

  const edge = graph.edges[0];
  if (!edge.from) throw new Error('Edge missing from');
  if (!edge.to) throw new Error('Edge missing to');
  if (!edge.type) throw new Error('Edge missing type');
  if (typeof edge.isHard !== 'boolean') throw new Error('Edge missing isHard');
  if (!edge.style) throw new Error('Edge missing style');
});

test('Critical path is calculated', () => {
  const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
  if (!Array.isArray(graph.criticalPath)) throw new Error('Critical path not array');
  console.log(`   ℹ️  Critical path length: ${graph.criticalPath.length}`);
});

test('Graph statistics are calculated', () => {
  const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
  const stats = graph.stats;
  if (typeof stats.totalNodes !== 'number') throw new Error('Invalid totalNodes');
  if (typeof stats.totalEdges !== 'number') throw new Error('Invalid totalEdges');
  if (typeof stats.layerCount !== 'number') throw new Error('Invalid layerCount');
  if (typeof stats.criticalPathLength !== 'number') throw new Error('Invalid criticalPathLength');
});

test('buildMissionSubgraph works', () => {
  if (result.missions.length === 0) throw new Error('No missions to test');

  const subgraph = buildMissionSubgraph(
    result.missions[0].id,
    result.missions,
    result.dependencyEdges,
    2
  );

  if (!Array.isArray(subgraph.nodes)) throw new Error('Subgraph nodes not array');
  if (!Array.isArray(subgraph.edges)) throw new Error('Subgraph edges not array');
  console.log(`   ℹ️  Subgraph has ${subgraph.nodes.length} nodes`);
});

// Test 3: Metadata Enricher
console.log('\n📊 Test 3: Metadata Enricher');

test('enrichMission adds computed metadata', () => {
  const enriched = enrichMission(
    result.missions[0],
    result.missions,
    result.dependencyEdges
  );

  if (!enriched.metadata) throw new Error('Missing metadata');
  if (typeof enriched.metadata.prerequisiteChainLength !== 'number') {
    throw new Error('Missing prerequisiteChainLength');
  }
  if (typeof enriched.metadata.unlockChainLength !== 'number') {
    throw new Error('Missing unlockChainLength');
  }
  if (typeof enriched.metadata.isOptional !== 'boolean') {
    throw new Error('Missing isOptional');
  }
  if (!enriched.metadata.searchableText) {
    throw new Error('Missing searchableText');
  }
});

test('enrichMissionSet enriches all missions', () => {
  const enriched = enrichMissionSet(result.missions, result.dependencyEdges);
  if (enriched.length !== result.missions.length) {
    throw new Error('Not all missions enriched');
  }

  const firstEnriched = enriched[0];
  if (!firstEnriched.metadata.searchableText) {
    throw new Error('Mission not properly enriched');
  }
});

test('Keywords are extracted', () => {
  const enriched = enrichMission(result.missions[0], result.missions, result.dependencyEdges);
  if (!Array.isArray(enriched.metadata.keywords)) {
    throw new Error('Keywords not array');
  }
  console.log(`   ℹ️  Extracted ${enriched.metadata.keywords.length} keywords`);
});

test('Difficulty is inferred when missing', () => {
  const enriched = enrichMission(result.missions[0], result.missions, result.dependencyEdges);
  if (!enriched.metadata.difficulty) {
    throw new Error('Difficulty not inferred');
  }
});

test('addCrossReferences adds related missions', () => {
  const withRefs = addCrossReferences(result.missions, result.dependencyEdges);
  const firstMission = withRefs[0];

  if (!Array.isArray(firstMission.relatedMissions)) {
    throw new Error('relatedMissions not array');
  }
  if (!Array.isArray(firstMission.parallelMissions)) {
    throw new Error('parallelMissions not array');
  }
  if (typeof firstMission.suggestedOrder !== 'number') {
    throw new Error('suggestedOrder not number');
  }
});

test('calculateAggregateStats computes statistics', () => {
  const stats = calculateAggregateStats(result.missions);

  if (typeof stats.totalMissions !== 'number') throw new Error('Invalid totalMissions');
  if (typeof stats.totalNodes !== 'number') throw new Error('Invalid totalNodes');
  if (typeof stats.averageNodesPerMission !== 'number') {
    throw new Error('Invalid averageNodesPerMission');
  }
  if (typeof stats.zoneCoverage !== 'number') throw new Error('Invalid zoneCoverage');

  console.log(`   ℹ️  Total zones: ${stats.zoneCoverage}`);
  console.log(`   ℹ️  Average nodes per mission: ${stats.averageNodesPerMission.toFixed(1)}`);
});

// Test 4: Integration Test
console.log('\n🔄 Test 4: Full Pipeline Integration');

test('Complete pipeline: parse → enrich → build API', () => {
  // Enrich missions
  const enriched = enrichMissionSet(result.missions, result.dependencyEdges);

  // Build API response
  const apiResponse = buildAPIResponse([{
    missionSet: result.missionSet,
    missions: enriched
  }]);

  // Build dependency graph
  const graph = buildDependencyGraph(enriched, result.dependencyEdges);

  // Calculate aggregate stats
  const stats = calculateAggregateStats(enriched);

  // Validate all pieces exist
  if (!apiResponse.missionSets) throw new Error('API response invalid');
  if (!graph.nodes) throw new Error('Graph invalid');
  if (!stats.totalMissions) throw new Error('Stats invalid');

  console.log(`   ℹ️  Complete pipeline validated successfully`);
});

test('API mission includes enriched metadata', () => {
  const enriched = enrichMission(
    result.missions[0],
    result.missions,
    result.dependencyEdges
  );

  const apiMission = buildAPIMission(enriched);

  // Should include enriched fields
  if (!apiMission.metadata.searchableText) {
    throw new Error('Enriched searchableText not in API mission');
  }
  if (!Array.isArray(apiMission.metadata.keywords)) {
    throw new Error('Enriched keywords not in API mission');
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All builder tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed');
  process.exit(1);
}
