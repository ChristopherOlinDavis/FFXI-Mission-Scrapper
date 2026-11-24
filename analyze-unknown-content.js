#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeUnknown() {
  const unknownDir = path.join(__dirname, 'parsed_output', 'unknown');
  const outputDir = path.join(__dirname, 'output');

  console.log('\n' + '='.repeat(80));
  console.log('UNKNOWN CONTENT ANALYSIS');
  console.log('='.repeat(80) + '\n');

  const files = fs.readdirSync(unknownDir).filter(f => f.endsWith('.json'));

  console.log(`Total unknown files: ${files.length}\n`);

  // Sample analysis
  const sampleSize = Math.min(200, files.length);
  const samples = [];

  // Stratified sampling
  const interval = Math.floor(files.length / sampleSize);
  for (let i = 0; i < files.length; i += interval) {
    if (samples.length < sampleSize) {
      samples.push(files[i]);
    }
  }

  console.log(`Analyzing ${samples.length} sample files...\n`);

  const categories = {};
  const detectedTypes = {};

  for (const jsonFile of samples) {
    const htmlFile = jsonFile.replace('.json', '.html');
    const htmlPath = path.join(outputDir, htmlFile);

    if (!fs.existsSync(htmlPath)) {
      continue;
    }

    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      const $ = cheerio.load(html);

      // Extract MediaWiki categories
      const scripts = $('script');
      let cats = [];

      for (let i = 0; i < scripts.length; i++) {
        const content = $(scripts[i]).html() || '';
        const match = content.match(/wgCategories":\[(.*?)\]/);
        if (match) {
          try {
            const categoriesStr = '[' + match[1] + ']';
            cats = JSON.parse(categoriesStr);
            break;
          } catch (e) {
            // Ignore
          }
        }
      }

      // Categorize based on MediaWiki categories
      if (cats.length > 0) {
        for (const cat of cats) {
          if (!categories[cat]) {
            categories[cat] = 0;
          }
          categories[cat]++;
        }
      } else {
        if (!categories['No Category']) {
          categories['No Category'] = 0;
        }
        categories['No Category']++;
      }

    } catch (error) {
      // Skip files with errors
    }
  }

  // Sort and display results
  console.log('='.repeat(80));
  console.log('TOP 50 CATEGORIES IN UNKNOWN FILES');
  console.log('='.repeat(80) + '\n');

  const sorted = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  for (const [cat, count] of sorted) {
    const pct = ((count / samples.length) * 100).toFixed(1);
    console.log(`${cat.substring(0, 60).padEnd(60)} ${count.toString().padStart(5)} (${pct}%)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('CATEGORY GROUPS');
  console.log('='.repeat(80) + '\n');

  const groups = {
    'Monsters/NPCs': 0,
    'Missions': 0,
    'Quests': 0,
    'Equipment/Items': 0,
    'Spells/Magic': 0,
    'Abilities/Traits': 0,
    'Locations/Zones': 0,
    'Food/Consumables': 0,
    'Synthesis/Crafting': 0,
    'Category/List Pages': 0,
    'Talk/User Pages': 0,
    'Other': 0
  };

  for (const [cat, count] of Object.entries(categories)) {
    if (/Monsters?|NPCs?|Notorious Monsters?|Bestiary/i.test(cat)) {
      groups['Monsters/NPCs'] += count;
    } else if (/Missions?/i.test(cat)) {
      groups['Missions'] += count;
    } else if (/Quests?/i.test(cat)) {
      groups['Quests'] += count;
    } else if (/Armor|Weapons?|Equipment|Items?|Shields?|Rings?|Earrings/i.test(cat)) {
      groups['Equipment/Items'] += count;
    } else if (/Spells?|Magic|Blue Magic/i.test(cat)) {
      groups['Spells/Magic'] += count;
    } else if (/Abilit(y|ies)|Traits?|Merits?/i.test(cat)) {
      groups['Abilities/Traits'] += count;
    } else if (/Zones?|Areas?|Locations?|Regions?/i.test(cat)) {
      groups['Locations/Zones'] += count;
    } else if (/Food|Ingredients?|Consumables?/i.test(cat)) {
      groups['Food/Consumables'] += count;
    } else if (/Synthesis|Crafting|Recipes?/i.test(cat)) {
      groups['Synthesis/Crafting'] += count;
    } else if (/Category|Lists?|Tables?/i.test(cat)) {
      groups['Category/List Pages'] += count;
    } else if (/Talk:|User:|Template:/i.test(cat)) {
      groups['Talk/User Pages'] += count;
    } else {
      groups['Other'] += count;
    }
  }

  const groupsSorted = Object.entries(groups)
    .sort((a, b) => b[1] - a[1]);

  for (const [group, count] of groupsSorted) {
    const pct = ((count / samples.length) * 100).toFixed(1);
    console.log(`${group.padEnd(30)} ${count.toString().padStart(5)} (${pct}%)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  console.log('Based on this analysis, you should create/enhance parsers for:\n');

  const recommendations = [];
  for (const [group, count] of groupsSorted) {
    if (count > samples.length * 0.05 && !['Category/List Pages', 'Talk/User Pages', 'Other'].includes(group)) {
      const pct = ((count / samples.length) * 100).toFixed(1);
      recommendations.push({ group, count, pct });
    }
  }

  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.group} (${rec.pct}% of samples, ~${Math.round(rec.count * (files.length / samples.length))} total files)`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

analyzeUnknown().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
