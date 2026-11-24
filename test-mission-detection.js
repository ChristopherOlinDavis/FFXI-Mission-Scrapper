#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MissionParser } from './src/parsers/mission-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new MissionParser();

// Test with a known mission file
const testFiles = [
  'bgwiki-A_Shantotto_Ascension_Mission_1.html',
  'bgwiki-Aht_Urhgan_Mission_1.html',
  'bgwiki-A_Hawk_in_Repose.html'
];

console.log('\n' + '='.repeat(80));
console.log('MISSION PARSER DETECTION TEST');
console.log('='.repeat(80) + '\n');

for (const filename of testFiles) {
  const filepath = path.join(__dirname, 'output', filename);

  if (!fs.existsSync(filepath)) {
    console.log(`❌ File not found: ${filename}`);
    continue;
  }

  const html = fs.readFileSync(filepath, 'utf-8');
  const result = parser.parse(html, `https://example.com/${filename}`, filename);

  console.log(`File: ${filename}`);
  console.log(`  Detection: ${result ? '✅ DETECTED' : '❌ NOT DETECTED'}`);

  if (result) {
    console.log(`  Name: ${result.name}`);
    console.log(`  Series: ${result.series || 'N/A'}`);
    console.log(`  Mission Number: ${result.missionNumber || 'N/A'}`);
  }
  console.log('');
}

console.log('='.repeat(80) + '\n');
