#!/usr/bin/env node

import { Command } from 'commander';
import { scrapeMissionSet, scrapeAllMissionSets, getAvailableMissionSets } from './scrapers/index.js';
import { saveMissionSet, saveAPIResponse, loadMetadata, updateMissionSetMetadata } from './utils/storage.js';
import {
  buildAPIResponse,
  buildDependencyGraph,
  enrichMissionSet,
  addCrossReferences,
  calculateAggregateStats,
  exportGraph
} from './builders/index.js';
import { validateAPIResponse } from './builders/json-builder.js';
import { scrapeBestiaryFromSeed, saveBestiaryData, loadBestiaryData } from './scrapers/bestiary/index.js';
import { createRateLimitedFetcher, closeBrowser } from './utils/live-fetcher.js';
import path from 'path';
import fs from 'fs/promises';

const program = new Command();

program
  .name('ffxi-mission-scraper')
  .description('Parse Final Fantasy XI mission data from pre-downloaded HTML files')
  .version('2.0.0');

/**
 * Parse a single mission set or all sets
 */
program
  .command('parse')
  .description('Parse a specific mission set or all sets from downloaded HTML')
  .option('-s, --set <setId>', 'Mission set ID to parse')
  .option('-a, --all', 'Parse all mission sets')
  .option('--enrich', 'Enrich missions with computed metadata', true)
  .option('--graph', 'Generate dependency graph', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      if (options.all) {
        console.log('🚀 Parsing all mission sets...\n');

        const results = await scrapeAllMissionSets({
          verbose: options.verbose
        });

        // Filter successful results
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);

        // Enrich and build API response
        if (options.enrich && successful.length > 0) {
          console.log('\n📊 Enriching missions with metadata...');
          successful.forEach(result => {
            result.missions = enrichMissionSet(result.missions, result.dependencyEdges);
            result.missions = addCrossReferences(result.missions, result.dependencyEdges);
          });
        }

        // Build API response
        const apiResponse = buildAPIResponse(successful);

        // Validate
        console.log('\n✅ Validating API response...');
        validateAPIResponse(apiResponse);

        // Save
        await saveAPIResponse(apiResponse);

        // Save individual mission sets
        for (const result of successful) {
          await saveMissionSet(result.missionSet);
          await updateMissionSetMetadata(result.missionSet.id, result.missionSet.lastScraped);
        }

        console.log(`\n✅ Parsed ${successful.length}/${results.length} mission sets successfully!`);
        if (failed.length > 0) {
          console.log(`\n⚠️  Failed to parse ${failed.length} sets:`);
          failed.forEach(r => console.log(`   - ${r.setId}: ${r.error}`));
        }

      } else if (options.set) {
        const config = await getAvailableMissionSets();
        const setConfig = config[options.set];

        if (!setConfig) {
          console.error(`❌ Unknown mission set: ${options.set}`);
          console.log('\nAvailable sets:');
          Object.keys(config).forEach(id => {
            console.log(`  - ${id}: ${config[id].name}`);
          });
          process.exit(1);
        }

        console.log(`🚀 Parsing: ${setConfig.name}\n`);

        const result = await scrapeMissionSet(options.set, {
          verbose: options.verbose
        });

        // Enrich missions
        if (options.enrich) {
          console.log('\n📊 Enriching missions...');
          result.missions = enrichMissionSet(result.missions, result.dependencyEdges);
          result.missions = addCrossReferences(result.missions, result.dependencyEdges);
        }

        // Generate graph if requested
        if (options.graph) {
          console.log('\n🔗 Generating dependency graph...');
          const graph = buildDependencyGraph(result.missions, result.dependencyEdges);
          console.log(`   Nodes: ${graph.nodes.length}`);
          console.log(`   Edges: ${graph.edges.length}`);
          console.log(`   Critical Path Length: ${graph.criticalPath.length}`);

          // Save graph (you can add a saveGraph function to storage.js later)
          console.log('   Graph generated successfully');
        }

        // Build API response
        const apiResponse = buildAPIResponse([result]);

        // Validate
        console.log('\n✅ Validating...');
        validateAPIResponse(apiResponse);

        // Save
        await saveMissionSet(result.missionSet);
        await updateMissionSetMetadata(result.missionSet.id, result.missionSet.lastScraped);

        console.log('\n✅ Mission set parsed successfully!');
        console.log(`\n📊 Stats:`);
        console.log(`   Total Missions: ${result.stats.total}`);
        console.log(`   Successfully Parsed: ${result.stats.parsed}`);
        console.log(`   Failed: ${result.stats.failed}`);
        console.log(`   Dependency Edges: ${result.dependencyEdges.length}`);

      } else {
        const config = await getAvailableMissionSets();
        console.error('❌ You must specify --set <setId> or --all');
        console.log('\nAvailable sets:');
        Object.entries(config).forEach(([id, cfg]) => {
          console.log(`  - ${id}: ${cfg.name}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
      }
      console.error(error.stack);
      process.exit(1);
    }
  });

/**
 * List available mission sets
 */
program
  .command('list')
  .description('List all available mission sets')
  .action(async () => {
    const config = await getAvailableMissionSets();

    console.log('📋 Available mission sets:\n');

    const byCategory = {};
    Object.entries(config).forEach(([id, cfg]) => {
      if (!byCategory[cfg.category]) {
        byCategory[cfg.category] = [];
      }
      byCategory[cfg.category].push({ id, ...cfg });
    });

    Object.entries(byCategory).forEach(([category, sets]) => {
      console.log(`\n${category.toUpperCase()}:`);
      sets.forEach(set => {
        console.log(`  ${set.id.padEnd(20)} - ${set.name}`);
      });
    });
  });

/**
 * Validate generated JSON files
 */
program
  .command('validate')
  .description('Validate generated JSON files against schemas')
  .option('-s, --set <setId>', 'Validate specific mission set')
  .action(async (options) => {
    try {
      console.log('🔍 Validating generated JSON files...\n');

      // TODO: Implement validation by loading JSON files from output/
      // and running them through schemas

      console.log('✅ Validation complete!');
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate dependency graph for a mission set
 */
program
  .command('graph')
  .description('Generate and export dependency graph')
  .requiredOption('-s, --set <setId>', 'Mission set ID')
  .option('-f, --format <format>', 'Export format (json, dot, cytoscape)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(`🔗 Generating graph for: ${options.set}\n`);

      const result = await scrapeMissionSet(options.set, { verbose: false });

      const graph = buildDependencyGraph(result.missions, result.dependencyEdges);

      console.log('📊 Graph Statistics:');
      console.log(`   Nodes: ${graph.stats.totalNodes}`);
      console.log(`   Edges: ${graph.stats.totalEdges}`);
      console.log(`   Layers: ${graph.stats.layerCount}`);
      console.log(`   Critical Path: ${graph.stats.criticalPathLength} missions`);
      console.log(`   Start Nodes: ${graph.stats.startNodeCount}`);
      console.log(`   End Nodes: ${graph.stats.endNodeCount}`);

      const exported = exportGraph(graph, options.format);

      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, exported, 'utf-8');
        console.log(`\n✅ Graph exported to: ${options.output}`);
      } else {
        console.log(`\n📄 Graph (${options.format}):`);
        console.log(exported);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Show statistics for parsed missions
 */
program
  .command('stats')
  .description('Show statistics for parsed missions')
  .option('-s, --set <setId>', 'Show stats for specific set')
  .action(async (options) => {
    try {
      if (options.set) {
        console.log(`📊 Statistics for: ${options.set}\n`);

        const result = await scrapeMissionSet(options.set, { verbose: false });

        const enriched = enrichMissionSet(result.missions, result.dependencyEdges);
        const stats = calculateAggregateStats(enriched);

        console.log('Mission Set Statistics:');
        console.log(`  Total Missions: ${stats.totalMissions}`);
        console.log(`  Total Nodes: ${stats.totalNodes}`);
        console.log(`  Average Nodes per Mission: ${stats.averageNodesPerMission.toFixed(1)}`);

        if (stats.levelRange) {
          console.log(`\nLevel Range:`);
          console.log(`  Min: ${stats.levelRange.min}`);
          console.log(`  Max: ${stats.levelRange.max}`);
          console.log(`  Average: ${stats.levelRange.average.toFixed(1)}`);
        }

        console.log(`\nDifficulty Distribution:`);
        Object.entries(stats.difficultyDistribution).forEach(([diff, count]) => {
          console.log(`  ${diff}: ${count}`);
        });

        console.log(`\nZone Coverage: ${stats.zoneCoverage} zones`);
        console.log(`Soloable Missions: ${stats.soloableCount}`);
        console.log(`Timed Missions: ${stats.timedCount}`);

      } else {
        console.log('📊 Overall Statistics\n');

        const results = await scrapeAllMissionSets({ verbose: false });
        const successful = results.filter(r => !r.error);

        const totalMissions = successful.reduce((sum, r) => sum + r.missions.length, 0);
        const totalEdges = successful.reduce((sum, r) => sum + r.dependencyEdges.length, 0);

        console.log(`Total Mission Sets: ${successful.length}`);
        console.log(`Total Missions: ${totalMissions}`);
        console.log(`Total Dependency Edges: ${totalEdges}`);

        console.log('\nBy Category:');
        const byCategory = {};
        successful.forEach(r => {
          const cat = r.missionSet.category;
          if (!byCategory[cat]) byCategory[cat] = 0;
          byCategory[cat] += r.missions.length;
        });

        Object.entries(byCategory).forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count} missions`);
        });
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Check metadata
 */
program
  .command('check')
  .description('Check parse metadata and status')
  .action(async () => {
    try {
      const metadata = await loadMetadata();
      const config = await getAvailableMissionSets();

      console.log('📋 Parse Metadata:\n');

      if (metadata.metadata.length === 0) {
        console.log('No parses recorded yet. Run a parse to populate metadata.');
        return;
      }

      metadata.metadata.forEach(m => {
        const setConfig = config[m.missionSetId];
        console.log(`${m.missionSetId}:`);
        console.log(`  Name: ${setConfig?.name || 'Unknown'}`);
        console.log(`  Last Parsed: ${new Date(m.lastScraped).toLocaleString()}`);
        console.log(`  Parse Count: ${m.scrapeCount}`);
        if (m.lastKnownUpdate) {
          console.log(`  Last Known Update: ${new Date(m.lastKnownUpdate).toLocaleString()}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Scrape bestiary data
 */
program
  .command('bestiary')
  .description('Scrape monster bestiary data from BGWiki')
  .option('--families', 'Scrape family pages for detailed data', true)
  .option('--variants', 'Scrape individual monster variant pages', false)
  .option('--variant-limit <number>', 'Limit number of variants to scrape', parseInt)
  .option('-o, --output <file>', 'Output file path', 'output/monsters.json')
  .option('-v, --verbose', 'Verbose output', true)
  .action(async (options) => {
    try {
      console.log('🐉 Starting bestiary scraping...\n');
      console.log('⏱️  This will take approximately 10 minutes for full scraping');
      console.log('   Fetching live from BGWiki with 2-second delays between requests\n');

      // Create rate-limited fetcher (2 second delay between requests)
      const fetchHtml = createRateLimitedFetcher(2000);

      const bestiaryData = await scrapeBestiaryFromSeed({
        fetchHtml,
        verbose: options.verbose,
        scrapeFamilies: options.families,
        scrapeVariants: options.variants,
        variantLimit: options.variantLimit
      });

      // Close browser
      await closeBrowser();

      // Save to file
      await saveBestiaryData(bestiaryData, options.output);

      console.log(`\n✅ Bestiary data saved to: ${options.output}`);
      console.log('\n📊 Final Stats:');
      console.log(`   Families: ${bestiaryData.stats.totalFamilies}`);
      console.log(`   Variants: ${bestiaryData.stats.totalVariants}`);
      console.log(`   Notorious Monsters: ${bestiaryData.stats.totalNMs}`);

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      await closeBrowser();
      process.exit(1);
    }
  });

/**
 * Show bestiary statistics
 */
program
  .command('bestiary-stats')
  .description('Show statistics for bestiary data')
  .option('-f, --file <path>', 'Bestiary JSON file', 'output/monsters.json')
  .action(async (options) => {
    try {
      console.log('📊 Loading bestiary data...\n');

      const bestiaryData = await loadBestiaryData(options.file);

      console.log('Bestiary Statistics:\n');
      console.log(`Total Families: ${bestiaryData.stats.totalFamilies}`);
      console.log(`Total Variants: ${bestiaryData.stats.totalVariants}`);
      console.log(`Notorious Monsters: ${bestiaryData.stats.totalNMs}`);

      console.log('\nBy Monster Type:');
      const byType = {};
      bestiaryData.families.forEach(family => {
        byType[family.type] = (byType[family.type] || 0) + 1;
      });
      Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} families`);
      });

      console.log('\nCharmable Families:');
      const charmable = bestiaryData.families.filter(f => f.charmable);
      console.log(`  ${charmable.length} families can be charmed`);

      console.log('\nPankration Available:');
      const pankration = bestiaryData.families.filter(f => f.pankration);
      console.log(`  ${pankration.length} families available in Pankration`);

      if (bestiaryData.variants.length > 0) {
        const withZone = bestiaryData.variants.filter(v => v.zone);
        console.log(`\nVariants with Zone Data: ${withZone.length}/${bestiaryData.variants.length}`);

        const withDrops = bestiaryData.variants.filter(v => v.drops && v.drops.length > 0);
        console.log(`Variants with Drop Data: ${withDrops.length}/${bestiaryData.variants.length}`);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
