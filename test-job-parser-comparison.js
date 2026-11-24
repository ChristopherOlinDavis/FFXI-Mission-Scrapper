#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JobParser } from './src/parsers/job-parser.js';
import { JobParserEnhanced } from './src/parsers/job-parser-enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compareParsers() {
  const testFile = 'bgwiki-Bard.html';
  const htmlPath = path.join(__dirname, 'output', testFile);

  console.log(`\n${'='.repeat(80)}`);
  console.log('JOB PARSER COMPARISON TEST');
  console.log(`${'='.repeat(80)}\n`);

  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ Test file not found: ${htmlPath}`);
    return;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sourceUrl = 'https://www.bg-wiki.com/ffxi/Bard';

  // Test old parser
  console.log('Testing OLD Parser...\n');
  const oldParser = new JobParser();
  const oldResult = oldParser.parse(html, sourceUrl, testFile);

  // Test new enhanced parser
  console.log('Testing ENHANCED Parser...\n');
  const enhancedParser = new JobParserEnhanced();
  const enhancedResult = enhancedParser.parse(html, sourceUrl, testFile);

  // Compare results
  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPARISON RESULTS');
  console.log(`${'='.repeat(80)}\n`);

  console.log('OLD PARSER:');
  console.log(`  Job Name: ${oldResult?.name || 'N/A'}`);
  console.log(`  Abbreviation: ${oldResult?.abbreviation || 'N/A'}`);
  console.log(`  Description: ${oldResult?.description?.substring(0, 80) || 'N/A'}...`);
  console.log(`  Abilities: ${oldResult?.abilities?.length || 0}`);
  console.log(`  Traits: ${oldResult?.traits?.length || 0}`);
  console.log(`  Job Points: ${oldResult?.jobPoints?.length || 0}`);
  console.log(`  Job Point Gifts: ${oldResult?.jobPointGifts?.length || 0}`);

  console.log('\nENHANCED PARSER:');
  console.log(`  Job Name: ${enhancedResult?.name || 'N/A'}`);
  console.log(`  Abbreviation: ${enhancedResult?.abbreviation || 'N/A'}`);
  console.log(`  Description: ${enhancedResult?.description?.substring(0, 80) || 'N/A'}...`);
  console.log(`  Abilities: ${enhancedResult?.abilities?.length || 0}`);
  console.log(`  Traits: ${enhancedResult?.traits?.length || 0}`);
  console.log(`  Job Points: ${enhancedResult?.jobPoints?.length || 0}`);
  console.log(`  Job Point Gifts: ${enhancedResult?.jobPointGifts?.length || 0}`);

  // Calculate reduction
  const oldTotal = (oldResult?.abilities?.length || 0) +
                   (oldResult?.traits?.length || 0) +
                   (oldResult?.jobPoints?.length || 0);
  const newTotal = (enhancedResult?.abilities?.length || 0) +
                   (enhancedResult?.traits?.length || 0) +
                   (enhancedResult?.jobPoints?.length || 0) +
                   (enhancedResult?.jobPointGifts?.length || 0);

  console.log(`\n${'='.repeat(80)}`);
  console.log('IMPROVEMENT METRICS');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`  Total Items (Old): ${oldTotal}`);
  console.log(`  Total Items (Enhanced): ${newTotal}`);
  console.log(`  Reduction: ${oldTotal - newTotal} items (${Math.round((1 - newTotal/oldTotal) * 100)}%)`);

  // Check for duplicate abilities in old parser
  if (oldResult?.abilities) {
    const abilityNames = oldResult.abilities.map(a => a.name);
    const uniqueNames = new Set(abilityNames);
    const duplicateCount = abilityNames.length - uniqueNames.size;
    console.log(`\n  OLD Parser Duplicate Abilities: ${duplicateCount}`);
  }

  if (enhancedResult?.abilities) {
    const abilityNames = enhancedResult.abilities.map(a => a.name);
    const uniqueNames = new Set(abilityNames);
    const duplicateCount = abilityNames.length - uniqueNames.size;
    console.log(`  ENHANCED Parser Duplicate Abilities: ${duplicateCount}`);
  }

  // Sample abilities
  console.log(`\n${'='.repeat(80)}`);
  console.log('SAMPLE ABILITIES (First 5)');
  console.log(`${'='.repeat(80)}\n`);

  console.log('OLD PARSER:');
  (oldResult?.abilities || []).slice(0, 5).forEach((ability, i) => {
    console.log(`  ${i + 1}. ${ability.name} (Lv${ability.level || '?'}): ${ability.description?.substring(0, 50) || ''}...`);
  });

  console.log('\nENHANCED PARSER:');
  (enhancedResult?.abilities || []).slice(0, 5).forEach((ability, i) => {
    console.log(`  ${i + 1}. ${ability.name} (Lv${ability.level || '?'}): ${ability.description?.substring(0, 50) || ''}...`);
  });

  // Sample job points
  console.log(`\n${'='.repeat(80)}`);
  console.log('SAMPLE JOB POINTS (First 5)');
  console.log(`${'='.repeat(80)}\n`);

  console.log('OLD PARSER:');
  (oldResult?.jobPoints || []).slice(0, 5).forEach((jp, i) => {
    console.log(`  ${i + 1}. ${jp.effect?.substring(0, 70) || 'N/A'}...`);
  });

  console.log('\nENHANCED PARSER:');
  (enhancedResult?.jobPoints || []).slice(0, 5).forEach((jp, i) => {
    console.log(`  ${i + 1}. [${jp.category}] ${jp.description?.substring(0, 60) || 'N/A'}...`);
  });

  // Validation errors
  if (enhancedResult?.validationErrors) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('VALIDATION ERRORS (Enhanced Parser)');
    console.log(`${'='.repeat(80)}\n`);
    enhancedResult.validationErrors.slice(0, 5).forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  // Save output for inspection
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(
    path.join(outputDir, 'old-parser-bard.json'),
    JSON.stringify(oldResult, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'enhanced-parser-bard.json'),
    JSON.stringify(enhancedResult, null, 2)
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log('OUTPUT FILES');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`  Old Parser Output: test-output/old-parser-bard.json`);
  console.log(`  Enhanced Parser Output: test-output/enhanced-parser-bard.json`);
  console.log(`\n✅ Test complete!\n`);
}

compareParsers().catch(error => {
  console.error('Error running comparison:', error);
  process.exit(1);
});
