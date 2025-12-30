/**
 * Test script to debug BG-wiki download issues
 */
import { chromium } from 'playwright';
import fs from 'fs/promises';

const TEST_URL = 'https://www.bg-wiki.com/ffxi/Aht_Urhgan_Mission_6';

async function testDownload() {
  console.log('🔍 Testing BG-wiki download...\n');
  console.log(`URL: ${TEST_URL}\n`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    console.log('📡 Loading page...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('✓ Page loaded (domcontentloaded)\n');

    // Check for various selectors
    console.log('🔎 Checking for content selectors...');

    const selectors = [
      '.mw-parser-output',
      '.page-content',
      '#mw-content-text',
      '#content',
      'body'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const html = await element.innerHTML();
          console.log(`  ✓ Found: ${selector} (${html.length} chars)`);
        } else {
          console.log(`  ✗ Not found: ${selector}`);
        }
      } catch (e) {
        console.log(`  ✗ Error checking ${selector}: ${e.message}`);
      }
    }

    // Try waiting for main content
    console.log('\n⏳ Waiting for main content selector...');
    try {
      await page.waitForSelector('.mw-parser-output, .page-content', { timeout: 10000 });
      console.log('  ✓ Main content selector found');
    } catch (e) {
      console.warn('  ⚠️  Main content selector not found, continuing...');
    }

    // Get full page content
    console.log('\n📄 Getting page content...');
    const html = await page.content();
    console.log(`  Content length: ${html.length} characters`);

    if (html.length === 0) {
      console.error('  ✗ ERROR: Page content is empty!');
    } else {
      console.log('  ✓ Page content retrieved');

      // Check if it looks like an error page
      if (html.includes('<!DOCTYPE html>') && html.includes('<head>')) {
        console.log('  ✓ Looks like valid HTML');
      } else {
        console.warn('  ⚠️  HTML structure might be incomplete');
      }

      // Save to test file
      const testFile = 'test-bgwiki-output.html';
      await fs.writeFile(testFile, html, 'utf-8');
      console.log(`  ✓ Saved to ${testFile}`);

      // Show first 500 chars
      console.log('\n📋 First 500 characters:');
      console.log(html.substring(0, 500));
      console.log('...\n');
    }

    await browser.close();
    console.log('✅ Test complete!');

  } catch (error) {
    if (browser) await browser.close();
    console.error('\n❌ Error during download:');
    console.error(error);
  }
}

testDownload();
