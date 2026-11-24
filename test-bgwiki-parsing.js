#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JobParserEnhanced } from './src/parsers/job-parser-enhanced.js';
import { ItemParserEnhanced } from './src/parsers/item-parser-enhanced.js';
import { ItemParser } from './src/parsers/item-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBGWikiParsing() {
  console.log('\n' + '='.repeat(80));
  console.log('BGWIKI PARSER TESTING');
  console.log('='.repeat(80) + '\n');

  const outputDir = path.join(__dirname, 'output');
  const bgwikiFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('bgwiki-') && f.endsWith('.html'));

  console.log(`Total BGWiki HTML files: ${bgwikiFiles.length}\n`);

  // Sample diverse content types
  const sampleFiles = bgwikiFiles.slice(0, 100); // Test first 100 files

  const jobParser = new JobParserEnhanced();
  const itemParserOld = new ItemParser();
  const itemParserNew = new ItemParserEnhanced();

  const results = {
    total: 0,
    jobs: 0,
    itemsOld: 0,
    itemsNew: 0,
    unknown: 0
  };

  const detectedTypes = {
    job: [],
    itemOld: [],
    itemNew: [],
    unknown: []
  };

  console.log('Testing parsers on 100 sample BGWiki files...\n');

  for (const htmlFile of sampleFiles) {
    results.total++;

    const htmlPath = path.join(outputDir, htmlFile);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const sourceUrl = `https://www.bg-wiki.com/ffxi/${htmlFile}`;

    try {
      // Test job parser
      const jobResult = jobParser.parse(html, sourceUrl, htmlFile);
      if (jobResult) {
        results.jobs++;
        detectedTypes.job.push(htmlFile);
        continue; // Don't test other parsers if it's a job
      }

      // Test old item parser
      const itemOldResult = itemParserOld.parse(html, sourceUrl, htmlFile);
      if (itemOldResult) {
        results.itemsOld++;
        detectedTypes.itemOld.push(htmlFile);
      }

      // Test new item parser
      const itemNewResult = itemParserNew.parse(html, sourceUrl, htmlFile);
      if (itemNewResult) {
        results.itemsNew++;
        detectedTypes.itemNew.push(htmlFile);
      }

      // If no parser detected it
      if (!itemOldResult && !itemNewResult) {
        results.unknown++;
        detectedTypes.unknown.push(htmlFile);
      }

    } catch (error) {
      console.error(`Error parsing ${htmlFile}: ${error.message}`);
    }
  }

  console.log('='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80) + '\n');

  console.log(`Total Files Tested: ${results.total}`);
  console.log(`\nDetection Results:`);
  console.log(`  Jobs:              ${results.jobs.toString().padStart(4)} (${((results.jobs/results.total)*100).toFixed(1)}%)`);
  console.log(`  Items (Old):       ${results.itemsOld.toString().padStart(4)} (${((results.itemsOld/results.total)*100).toFixed(1)}%)`);
  console.log(`  Items (Enhanced):  ${results.itemsNew.toString().padStart(4)} (${((results.itemsNew/results.total)*100).toFixed(1)}%)`);
  console.log(`  Unknown:           ${results.unknown.toString().padStart(4)} (${((results.unknown/results.total)*100).toFixed(1)}%)`);

  const improvement = results.itemsNew - results.itemsOld;
  console.log(`\nItem Parser Improvement: +${improvement} (${((improvement/results.total)*100).toFixed(1)}%)`);

  // Show sample unknown files
  if (detectedTypes.unknown.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE UNKNOWN FILES (Not Detected by Any Parser)');
    console.log('='.repeat(80) + '\n');

    detectedTypes.unknown.slice(0, 20).forEach((file, i) => {
      const name = file.replace('bgwiki-', '').replace('.html', '');
      console.log(`${(i+1).toString().padStart(2)}. ${name}`);
    });
  }

  // Analyze unknown files
  const patterns = {
    'Missions': 0,
    'Quests': 0,
    'NPCs': 0,
    'Monsters': 0,
    'Spells/Magic': 0,
    'Abilities': 0,
    'Zones/Areas': 0,
    'Other': 0
  };

  if (detectedTypes.unknown.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('UNKNOWN FILE ANALYSIS');
    console.log('='.repeat(80) + '\n');

    for (const file of detectedTypes.unknown) {
      const name = file.replace('bgwiki-', '').replace('.html', '');

      if (/Mission/i.test(name)) {
        patterns['Missions']++;
      } else if (/Quest/i.test(name)) {
        patterns['Quests']++;
      } else if (/(NPC|Moogle|Goblin|Mithra|Elvaan|Hume|Galka|Tarutaru)/i.test(name)) {
        patterns['NPCs']++;
      } else if (/(Monster|NM|Notorious)/i.test(name)) {
        patterns['Monsters']++;
      } else if (/(Spell|Magic|Cure|Fire|Ice|Thunder|Water|Aero|Stone)/i.test(name)) {
        patterns['Spells/Magic']++;
      } else if (/(Ability|Trait|Merit)/i.test(name)) {
        patterns['Abilities']++;
      } else if (/(Zone|Area|Region|City)/i.test(name)) {
        patterns['Zones/Areas']++;
      } else {
        patterns['Other']++;
      }
    }

    console.log('Likely Content Types in Unknown Files:\n');
    for (const [type, count] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) {
      if (count > 0) {
        console.log(`  ${type.padEnd(20)} ${count.toString().padStart(4)} (${((count/detectedTypes.unknown.length)*100).toFixed(1)}%)`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  const unknownPercent = (results.unknown / results.total) * 100;

  if (unknownPercent > 50) {
    console.log('⚠️  HIGH unknown rate - Need more parsers!');
    console.log('\nPriority parsers to create:');
    const sorted = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 3).forEach(([ type, count], i) => {
      if (count > 0) {
        console.log(`  ${i+1}. ${type} Parser (${count} files)`);
      }
    });
  } else if (unknownPercent > 20) {
    console.log('⚠️  MODERATE unknown rate - Additional parsers recommended');
  } else {
    console.log('✅ LOW unknown rate - Current parsers working well!');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save results
  const report = {
    tested: results.total,
    results,
    unknownFiles: detectedTypes.unknown.slice(0, 50),
    patterns
  };

  fs.writeFileSync('bgwiki-parsing-test-results.json', JSON.stringify(report, null, 2));
  console.log('📊 Results saved to: bgwiki-parsing-test-results.json\n');
}

testBGWikiParsing().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
