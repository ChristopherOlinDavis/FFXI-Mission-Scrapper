import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract only the <main> tag content from an HTML string
 * @param {string} html - The full HTML content
 * @returns {string} - The extracted <main> tag content or original HTML if not found
 */
export function extractMainTag(html) {
  const $ = cheerio.load(html);

  // Try multiple selectors for main content
  const selectors = [
    'main',
    '#mw-content-text',
    '.mw-parser-output',
    '.page-content',
    '#content'
  ];

  for (const selector of selectors) {
    const content = $(selector);
    if (content.length > 0) {
      // Return the outer HTML of the found content
      return $.html(content);
    }
  }

  // If no main content found, return original HTML to prevent data loss
  console.warn('Warning: No main content tag found in HTML, keeping original');
  return html;
}

/**
 * Process a single HTML file and extract the <main> tag
 * @param {string} inputPath - Path to the input HTML file
 * @param {string} outputPath - Path to save the extracted content
 * @returns {Promise<{success: boolean, originalSize: number, newSize: number}>}
 */
export async function extractMainFromFile(inputPath, outputPath) {
  try {
    const originalHtml = await fs.readFile(inputPath, 'utf-8');
    const originalSize = Buffer.byteLength(originalHtml, 'utf-8');

    const extractedHtml = extractMainTag(originalHtml);
    const newSize = Buffer.byteLength(extractedHtml, 'utf-8');

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(outputPath, extractedHtml, 'utf-8');

    return {
      success: true,
      originalSize,
      newSize,
      reduction: ((1 - newSize / originalSize) * 100).toFixed(2)
    };
  } catch (error) {
    console.error(`Error processing file ${inputPath}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process all HTML files in a directory
 * @param {string} inputDir - Directory containing HTML files
 * @param {string} outputDir - Directory to save extracted HTML files (defaults to inputDir for in-place)
 * @param {object} options - Processing options
 * @param {boolean} options.inPlace - Whether to overwrite original files (default: false)
 * @param {boolean} options.verbose - Whether to show detailed progress (default: true)
 * @returns {Promise<{processed: number, failed: number, totalReduction: string}>}
 */
export async function extractMainFromDirectory(inputDir, outputDir = null, options = {}) {
  const { inPlace = false, verbose = true } = options;

  // If in-place, use inputDir as outputDir
  const targetOutputDir = inPlace ? inputDir : (outputDir || path.join(inputDir, 'extracted'));

  try {
    const files = await fs.readdir(inputDir);
    const htmlFiles = files.filter(file => file.toLowerCase().endsWith('.html'));

    if (htmlFiles.length === 0) {
      console.log(`No HTML files found in ${inputDir}`);
      return { processed: 0, failed: 0, totalReduction: '0.00' };
    }

    if (verbose) {
      console.log(`Found ${htmlFiles.length} HTML file(s) to process`);
      console.log(`Output directory: ${targetOutputDir}`);
      if (inPlace) {
        console.log('⚠️  In-place mode: Original files will be overwritten');
      }
    }

    let processed = 0;
    let failed = 0;
    let totalOriginalSize = 0;
    let totalNewSize = 0;

    for (const file of htmlFiles) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(targetOutputDir, file);

      if (verbose) {
        process.stdout.write(`Processing ${file}... `);
      }

      const result = await extractMainFromFile(inputPath, outputPath);

      if (result.success) {
        processed++;
        totalOriginalSize += result.originalSize;
        totalNewSize += result.newSize;

        if (verbose) {
          console.log(`✓ (${result.reduction}% reduction: ${result.originalSize} → ${result.newSize} bytes)`);
        }
      } else {
        failed++;
        if (verbose) {
          console.log(`✗ Failed: ${result.error}`);
        }
      }
    }

    const totalReduction = totalOriginalSize > 0
      ? ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(2)
      : '0.00';

    if (verbose) {
      console.log('\n' + '='.repeat(60));
      console.log(`Summary:`);
      console.log(`  Processed: ${processed} file(s)`);
      console.log(`  Failed: ${failed} file(s)`);
      console.log(`  Total size reduction: ${totalReduction}%`);
      console.log(`  Original size: ${totalOriginalSize.toLocaleString()} bytes`);
      console.log(`  New size: ${totalNewSize.toLocaleString()} bytes`);
      console.log('='.repeat(60));
    }

    return { processed, failed, totalReduction };
  } catch (error) {
    console.error(`Error reading directory ${inputDir}:`, error.message);
    throw error;
  }
}

/**
 * CLI entry point
 */
export async function main() {
  const args = process.argv.slice(2);

  // Default to outputHTMLs directory
  const defaultInputDir = path.join(__dirname, '../../outputHTMLs');

  let inputDir = defaultInputDir;
  let outputDir = null;
  let inPlace = false;
  let verbose = true;

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--input' || arg === '-i') {
      inputDir = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--in-place') {
      inPlace = true;
    } else if (arg === '--quiet' || arg === '-q') {
      verbose = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node extract-main.js [options]

Extract <main> tag content from HTML files to reduce file size.

Options:
  -i, --input <dir>     Input directory containing HTML files (default: outputHTMLs/)
  -o, --output <dir>    Output directory for extracted files (default: inputDir/extracted)
  --in-place            Overwrite original files in-place
  -q, --quiet           Suppress detailed output
  -h, --help            Show this help message

Examples:
  # Extract from default outputHTMLs/ to outputHTMLs/extracted/
  npm run extract-main

  # Extract and overwrite original files
  npm run extract-main -- --in-place

  # Extract from custom directory
  npm run extract-main -- --input ./custom-html --output ./custom-output
      `);
      process.exit(0);
    }
  }

  console.log('Starting HTML <main> tag extraction...\n');

  try {
    await extractMainFromDirectory(inputDir, outputDir, { inPlace, verbose });
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
