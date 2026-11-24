#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ItemParser } from './src/parsers/item-parser.js';
import { ItemParserEnhanced } from './src/parsers/item-parser-enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testItemParsers() {
  console.log('\n' + '='.repeat(80));
  console.log('ITEM PARSER COMPARISON TEST');
  console.log('='.repeat(80) + '\n');

  const unknownDir = path.join(__dirname, 'parsed_output', 'unknown');
  const outputDir = path.join(__dirname, 'output');

  // Sample item-looking files
  const testFiles = [
    'ffxiclopedia-Excalibur.html',
    'ffxiclopedia-Bronze_Sword.html',
    'ffxiclopedia-Relic_Sword.html',
    'bgwiki-Bard.html', // Should NOT be detected as item
    'bgwiki-Bastok_Mission_1-1.html' // Should NOT be detected as item
  ].filter(f => {
    const htmlPath = path.join(outputDir, f);
    const exists = fs.existsSync(htmlPath);
    const size = exists ? fs.statSync(htmlPath).size : 0;
    return exists && size > 10000; // Filter out tiny error pages
  });

  if (testFiles.length === 0) {
    console.log('❌ No test files found. Looking for any equipment files in unknown...\n');

    // Find equipment-looking files in unknown
    const unknownFiles = fs.readdirSync(unknownDir);
    const equipmentFiles = unknownFiles.filter(f =>
      /sword|shield|armor|weapon|ring|staff/i.test(f)
    ).slice(0, 10);

    for (const jsonFile of equipmentFiles) {
      const htmlFile = jsonFile.replace('.json', '.html');
      const htmlPath = path.join(outputDir, htmlFile);
      if (fs.existsSync(htmlPath)) {
        testFiles.push(htmlFile);
      }
    }
  }

  console.log(`Testing ${testFiles.length} files...\n`);

  const oldParser = new ItemParser();
  const enhancedParser = new ItemParserEnhanced();

  let oldDetected = 0;
  let enhancedDetected = 0;

  for (const htmlFile of testFiles) {
    const htmlPath = path.join(outputDir, htmlFile);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const sourceUrl = `https://www.bg-wiki.com/ffxi/${htmlFile}`;

    console.log(`Testing: ${htmlFile}`);

    try {
      const oldResult = oldParser.parse(html, sourceUrl, htmlFile);
      const enhancedResult = enhancedParser.parse(html, sourceUrl, htmlFile);

      const oldStatus = oldResult ? '✅ DETECTED' : '❌ MISSED';
      const enhancedStatus = enhancedResult ? '✅ DETECTED' : '❌ MISSED';

      console.log(`  Old Parser:      ${oldStatus}`);
      console.log(`  Enhanced Parser: ${enhancedStatus}`);

      if (oldResult) oldDetected++;
      if (enhancedResult) enhancedDetected++;

      if (enhancedResult && !oldResult) {
        console.log(`  📈 IMPROVEMENT! Enhanced parser found: ${enhancedResult.name}`);
        if (enhancedResult.stats) {
          console.log(`     Stats: ${Object.keys(enhancedResult.stats).join(', ')}`);
        }
        if (enhancedResult.slot) {
          console.log(`     Slot: ${enhancedResult.slot}`);
        }
      }

      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Test Files: ${testFiles.length}`);
  console.log(`Old Parser Detected: ${oldDetected} (${((oldDetected/testFiles.length)*100).toFixed(1)}%)`);
  console.log(`Enhanced Parser Detected: ${enhancedDetected} (${((enhancedDetected/testFiles.length)*100).toFixed(1)}%)`);
  console.log(`Improvement: +${enhancedDetected - oldDetected} items (+${(((enhancedDetected - oldDetected)/testFiles.length)*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80) + '\n');
}

testItemParsers().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
