/**
 * Test script to verify expand button selector
 * This validates that our selector correctly identifies the expand button in Fandom HTML
 */

import * as cheerio from 'cheerio';

// Sample HTML from a Fandom page (from user-provided example)
const sampleHTML = `
<div class="page-side-tools__wrapper">
  <div class="page-side-tools">
    <button class="page-side-tool content-size-toggle"
            name="content-size-toggle"
            aria-label="Expand"
            data-wds-tooltip="Expand"
            data-wds-tooltip-position="right"
            data-tooltip-attached="1">
      <svg class="wds-icon wds-icon-small">
        <use xlink:href="#wds-icons-zoom-in-small"></use>
      </svg>
    </button>
  </div>
</div>
`;

console.log('🧪 Testing Expand Button Selector\n');

// Load HTML with Cheerio
const $ = cheerio.load(sampleHTML);

// Test the selector we use in download-manager.js
const selector = 'button.content-size-toggle[name="content-size-toggle"]';
const expandButton = $(selector);

console.log(`Selector: ${selector}`);
console.log(`Found: ${expandButton.length > 0 ? '✅ Yes' : '❌ No'}`);

if (expandButton.length > 0) {
  console.log(`\nButton Details:`);
  console.log(`  - Class: ${expandButton.attr('class')}`);
  console.log(`  - Name: ${expandButton.attr('name')}`);
  console.log(`  - Aria Label: ${expandButton.attr('aria-label')}`);
  console.log(`  - Tooltip: ${expandButton.attr('data-wds-tooltip')}`);
  console.log('\n✅ Selector is correct! The button will be detected.');
} else {
  console.log('\n❌ Selector failed! The button was not found.');
}

// Also test alternative selectors to ensure we're using the best one
console.log('\n📋 Alternative Selectors:');
const alternatives = [
  '.content-size-toggle',
  'button[name="content-size-toggle"]',
  'button[aria-label="Expand"]',
  '.page-side-tool.content-size-toggle',
];

alternatives.forEach(alt => {
  const found = $(alt).length > 0;
  console.log(`  ${found ? '✅' : '❌'} ${alt}`);
});

console.log('\n✨ Test complete!\n');
