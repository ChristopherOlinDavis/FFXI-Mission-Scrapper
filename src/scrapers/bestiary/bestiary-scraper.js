/**
 * Bestiary Scraper Orchestrator
 * Coordinates scraping of monster families and variants
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BestiaryDataSchema } from '../../schemas/index.js';
import { loadFromSeed } from './index-scraper.js';
import { scrapeAllFamilies } from './family-scraper.js';
import { scrapeAllVariants } from './variant-scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scrape bestiary using seed data
 * @param {Object} options - Scraping options
 * @param {Function} options.fetchHtml - Function to fetch HTML (url) => html
 * @param {boolean} options.verbose - Verbose logging
 * @param {boolean} options.scrapeFamilies - Scrape family pages
 * @param {boolean} options.scrapeVariants - Scrape variant pages
 * @param {number} options.variantLimit - Limit number of variants to scrape
 * @returns {Promise<Object>} Complete bestiary data
 */
export async function scrapeBestiaryFromSeed(options = {}) {
  const {
    fetchHtml,
    verbose = false,
    scrapeFamilies = true,
    scrapeVariants = false,
    variantLimit = null
  } = options;

  if (!fetchHtml) {
    throw new Error('fetchHtml function is required');
  }

  console.log('\n📚 Starting Bestiary Scraping...\n');

  // Load seed data
  const seedPath = path.join(process.cwd(), 'BeastiaryLinks', 'ffxiBGWiki-enhanced.json');

  console.log('📖 Loading seed data from:', seedPath);

  const seedData = await loadFromSeed(seedPath);

  console.log(`✓ Loaded ${seedData.families.length} families from seed`);
  console.log(`✓ Loaded ${seedData.variants.length} variants from seed`);
  console.log(`✓ System: ${seedData.system.name}\n`);

  let families = seedData.families;
  let variants = seedData.variants;

  // Scrape family pages if requested
  if (scrapeFamilies) {
    console.log(`🌐 Starting to scrape ${families.length} family pages...\n`);

    const familyResult = await scrapeAllFamilies(families, {
      fetchHtml,
      verbose,
      onProgress: (current, total, result) => {
        // Progress callback
      }
    });

    families = familyResult.families;
    variants = familyResult.variants;

    console.log(`\n✓ Family scraping complete!`);
    console.log(`  Total families: ${families.length}`);
    console.log(`  Total variants discovered: ${variants.length}\n`);
  }

  // Scrape variant pages if requested
  if (scrapeVariants && variants.length > 0) {
    const toScrape = variantLimit ? variants.length : variantLimit;
    console.log(`🌐 Starting to scrape ${toScrape || variants.length} variant pages...\n`);

    const scrapedVariants = await scrapeAllVariants(variants, {
      fetchHtml,
      verbose,
      limit: variantLimit,
      onProgress: (current, total, variant) => {
        // Progress callback
      }
    });

    // Merge scraped data with seed data
    const variantMap = new Map(scrapedVariants.map(v => [v.id, v]));
    variants = variants.map(v => variantMap.get(v.id) || v);

    console.log(`\n✓ Variant scraping complete!`);
    console.log(`  Total variants: ${variants.length}\n`);
  }

  // Build bestiary data with familyIds
  const system = {
    ...seedData.system,
    familyIds: families.map(f => f.id)
  };

  const bestiaryData = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    systems: [system],
    families,
    variants,
    stats: {
      totalFamilies: families.length,
      totalVariants: variants.length,
      totalNMs: variants.filter(v => v.isNM).length
    }
  };

  // Validate
  if (verbose) {
    console.log('\n✅ Validating bestiary data...');
  }

  BestiaryDataSchema.parse(bestiaryData);

  if (verbose) {
    console.log('   Validation passed!\n');
    console.log('📊 Bestiary Stats:');
    console.log(`   Families: ${bestiaryData.stats.totalFamilies}`);
    console.log(`   Variants: ${bestiaryData.stats.totalVariants}`);
    console.log(`   NMs: ${bestiaryData.stats.totalNMs}\n`);
  }

  return bestiaryData;
}

/**
 * Save bestiary data to file
 * @param {Object} bestiaryData - Bestiary data to save
 * @param {string} outputPath - Output file path
 */
export async function saveBestiaryData(bestiaryData, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(bestiaryData, null, 2),
    'utf-8'
  );
}

/**
 * Load bestiary data from file
 * @param {string} filePath - Path to bestiary JSON file
 * @returns {Promise<Object>} Bestiary data
 */
export async function loadBestiaryData(filePath) {
  const data = await fs.readFile(filePath, 'utf-8');
  const bestiaryData = JSON.parse(data);
  BestiaryDataSchema.parse(bestiaryData);
  return bestiaryData;
}

export default {
  scrapeBestiaryFromSeed,
  saveBestiaryData,
  loadBestiaryData
};
