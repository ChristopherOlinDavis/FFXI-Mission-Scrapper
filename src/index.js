#!/usr/bin/env node

import { Command } from 'commander';
import { SCRAPERS, getAvailableSets, getScraper } from './scrapers/index.js';
import { saveMissionSet, saveAllMissions, loadMetadata, updateMissionSetMetadata } from './utils/storage.js';
import { MissionSetSchema } from './schemas.js';

const program = new Command();

program
  .name('ffxi-mission-scraper')
  .description('Scrape Final Fantasy XI mission data from community wikis')
  .version('1.0.0');

/**
 * Scrape a single mission set
 */
program
  .command('scrape')
  .description('Scrape a specific mission set or all sets')
  .option('-s, --set <setId>', 'Mission set ID to scrape')
  .option('-a, --all', 'Scrape all mission sets')
  .option('-f, --force', 'Force re-scrape (ignore cache)')
  .action(async (options) => {
    try {
      const useCache = !options.force;

      if (options.all) {
        console.log('Scraping all mission sets...\n');
        const allMissionSets = [];

        for (const setId of getAvailableSets()) {
          console.log(`\n${'='.repeat(60)}`);
          console.log(`Scraping: ${SCRAPERS[setId].name}`);
          console.log('='.repeat(60));

          const scraper = getScraper(setId);
          const missionSet = await scraper.scraper(useCache);

          // Validate the data
          const validated = MissionSetSchema.parse(missionSet);

          // Save individual file
          await saveMissionSet(validated);

          // Update metadata
          await updateMissionSetMetadata(setId, validated.lastKnownUpdate);

          allMissionSets.push(validated);
        }

        // Save combined file
        await saveAllMissions(allMissionSets);

        console.log('\n✓ All mission sets scraped successfully!');
      } else if (options.set) {
        console.log(`Scraping: ${options.set}\n`);

        const scraper = getScraper(options.set);
        const missionSet = await scraper.scraper(useCache);

        // Validate the data
        const validated = MissionSetSchema.parse(missionSet);

        // Save the data
        await saveMissionSet(validated);

        // Update metadata
        await updateMissionSetMetadata(options.set, validated.lastKnownUpdate);

        console.log('\n✓ Mission set scraped successfully!');
      } else {
        console.error('Error: You must specify --set <setId> or --all');
        console.log('\nAvailable sets:');
        getAvailableSets().forEach(setId => {
          console.log(`  - ${setId}: ${SCRAPERS[setId].name}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
      }
      process.exit(1);
    }
  });

/**
 * List available mission sets
 */
program
  .command('list')
  .description('List all available mission sets')
  .action(() => {
    console.log('Available mission sets:\n');
    getAvailableSets().forEach(setId => {
      const scraper = SCRAPERS[setId];
      console.log(`  ${setId.padEnd(20)} - ${scraper.name} (${scraper.category})`);
    });
  });

/**
 * Check scrape metadata
 */
program
  .command('check')
  .description('Check scrape metadata and determine what needs updating')
  .action(async () => {
    try {
      const metadata = await loadMetadata();

      console.log('Scrape Metadata:\n');

      if (metadata.metadata.length === 0) {
        console.log('No scrapes recorded yet. Run a scrape to populate metadata.');
        return;
      }

      metadata.metadata.forEach(m => {
        const scraperInfo = SCRAPERS[m.missionSetId];
        console.log(`${m.missionSetId}:`);
        console.log(`  Name: ${scraperInfo?.name || 'Unknown'}`);
        console.log(`  Last Scraped: ${new Date(m.lastScraped).toLocaleString()}`);
        console.log(`  Scrape Count: ${m.scrapeCount}`);
        if (m.lastKnownUpdate) {
          console.log(`  Last Known Update: ${new Date(m.lastKnownUpdate).toLocaleString()}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
