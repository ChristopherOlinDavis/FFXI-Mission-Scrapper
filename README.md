# FFXI Mission Scraper & Bestiary

A Node.js web scraper that extracts Final Fantasy XI mission and monster data from community wikis and outputs structured JSON for use in an iOS tracker app.

## Overview

This scraper fetches mission and bestiary data from FFXI community wikis (primarily ffxiclopedia.fandom.com and bg-wiki.com) and converts it into a structured, node-based format suitable for displaying missions as a tech tree or mission graph, along with comprehensive monster information.

## Features

### Mission Scraping
- Scrapes mission data from multiple wiki sources
- Converts mission walkthroughs into discrete nodes with dependencies
- Identifies and structures prerequisite gates (level, rank, item requirements)
- Validates all output data with Zod schemas
- Supports caching to reduce load on wiki servers
- Tracks scrape metadata for intelligent re-scraping

### Bestiary Scraping (NEW!)
- Scrapes comprehensive monster family data
- Extracts elemental and physical resistances
- Captures monster abilities, drops, and spawn conditions
- Supports individual monster variant scraping
- Links monsters to their families with inheritance
- Validates all bestiary data with dedicated schemas

### General
- CLI interface for easy operation
- Configurable output formats
- Verbose logging options

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd FFXI-Mission-Scrapper

# Install dependencies
npm install
```

## Requirements

- Node.js 18.0.0 or higher
- Internet connection for scraping wikis

## Usage

### List Available Mission Sets

```bash
node src/index.js list
```

### Scrape a Specific Mission Set

```bash
# Scrape Bastok Rank Missions
node src/index.js scrape --set bastok-rank

# Scrape demo data (shows ideal output structure)
node src/index.js scrape --set bastok-rank-demo
```

### Scrape All Mission Sets

```bash
node src/index.js scrape --all
```

### Force Re-scrape (Ignore Cache)

```bash
node src/index.js scrape --set bastok-rank --force
```

### Check Scrape Metadata

```bash
node src/index.js check
```

### Bestiary Scraping

Scrape monster bestiary data from BGWiki:

```bash
# Scrape monster families only (fast - recommended for initial testing)
npm run bestiary

# Scrape families + individual monster variants (slow - hundreds of pages)
npm run bestiary:full

# Limit number of variants to scrape (for testing)
node src/index.js bestiary --families --variants --variant-limit 50

# View bestiary statistics
npm run bestiary:stats

# Verbose output
node src/index.js bestiary -v
```

**Output:** `output/monsters.json`

For complete bestiary documentation, see [BESTIARY_GUIDE.md](BESTIARY_GUIDE.md)

### URL Management & Enhancement (NEW!)

The app now includes an enhanced URL management system that organizes, de-duplicates, and categorizes URLs from multiple sources:

```bash
# Merge all URL sources into unified list
npm run urls:merge

# Generate enhanced configurations
npm run urls:config
```

This creates:
- **17,375 unique URLs** from 3 sources (url-list.json, NewFFXIClopedia.json, New-URL-list.json)
- **22 mission sets** with full backwards compatibility
- **11 content categories** (missions, quests, bestiary, ROE, zones, etc.)
- **Specialized collections** for easy filtering by type and domain

For complete URL enhancement documentation, see [URL_ENHANCEMENT_GUIDE.md](URL_ENHANCEMENT_GUIDE.md)

### Extract Main Content from HTML

To reduce HTML file size and improve parsing performance, you can extract only the `<main>` tag content from downloaded HTML files:

```bash
# Extract to a separate directory (outputHTMLs/extracted/)
npm run extract-main

# Extract and overwrite original files in-place
npm run extract-main:in-place

# Custom input/output directories
npm run extract-main -- --input ./custom-html --output ./custom-output

# Show help
npm run extract-main -- --help
```

**Benefits:**
- Reduces HTML file size by 60-80% on average
- Removes unnecessary headers, navigation, footers, and scripts
- Keeps only the main content needed for parsing
- Makes parsing faster and more efficient

**Options:**
- `--input <dir>` - Input directory containing HTML files (default: `outputHTMLs/`)
- `--output <dir>` - Output directory for extracted files (default: `inputDir/extracted`)
- `--in-place` - Overwrite original files instead of creating new ones
- `--quiet` - Suppress detailed output
- `--help` - Show usage information

**Example workflow:**
```bash
# 1. Download HTML files
npm run download:all

# 2. Extract main content to reduce size
npm run extract-main:in-place

# 3. Parse the mission data
npm run parse:mission
```

## Data Structure

### Mission Set

Each mission set is saved as an individual JSON file in the `output/` directory.

```json
{
  "id": "bastok-rank",
  "name": "Bastok Rank Missions",
  "category": "nation",
  "sourceUrl": "https://...",
  "lastScraped": "2025-12-28T10:00:00Z",
  "lastKnownUpdate": "2024-03-15T00:00:00Z",
  "missions": [ ... ]
}
```

### Mission

Each mission contains nodes (steps) and gates (blockers).

```json
{
  "id": "bastok-rank-1-1",
  "title": "The Zeruhn Report",
  "nodes": [ ... ],
  "gates": [ ... ]
}
```

### Node

Nodes represent individual steps in a mission walkthrough.

```json
{
  "id": "bastok-rank-1-1-node-1",
  "orderIndex": 0,
  "title": "Speak to Guard",
  "description": "Talk to the guard in Bastok Mines at (H-9)",
  "dependencies": []
}
```

### Gate

Gates represent blockers between nodes or missions.

```json
{
  "id": "bastok-rank-1-2-gate-1",
  "type": "mission",
  "afterNodeId": "bastok-rank-1-2-node-1",
  "requirement": "Complete Mission 1-1",
  "description": "Must have completed 'The Zeruhn Report' mission"
}
```

## Gate Types

- `missionSet` - requires completing another mission set
- `mission` - requires completing a specific mission
- `node` - requires completing a specific node
- `level` - requires character level
- `item` - requires obtaining an item
- `other` - custom requirement

## Output Files

All output is saved to the `output/` directory:

### Mission Data
- `{mission-set-id}.json` - Individual mission set files
- `all-missions.json` - Combined file with all mission sets
- `scrape-metadata.json` - Tracking information for scrapes

### Bestiary Data
- `monsters.json` - Complete bestiary data

### URL Data (NEW!)
- `unified-urls.json` - De-duplicated URLs from all sources (17,375 URLs)
- `enhanced-url-config.json` - Organized URL configurations by category/domain
- `url-sources.json` - Source tracking for each URL
- `url-merge-stats.json` - Detailed merge statistics

## Available Mission Sets

Currently implemented:

- `bastok-rank` - Bastok Rank Missions (FFXIClopedia)
- `bastok-rank-demo` - Demo data showing ideal structure
- `bastok-rank-bgwiki` - Bastok Rank Missions (BG Wiki)
- `sandoria-rank` - San d'Oria Rank Missions (FFXIClopedia)

### Planned Mission Sets

- Windurst Rank Missions
- Rise of the Zilart
- Chains of Promathia
- Treasures of Aht Urhgan
- Wings of the Goddess
- And more...

## Project Structure

```
FFXI-Mission-Scrapper/
├── src/
│   ├── index.js              # CLI entry point
│   ├── schemas.js            # Zod validation schemas
│   ├── scrapers/
│   │   ├── index.js          # Scraper registry
│   │   ├── bastok-rank.js    # Bastok scraper
│   │   ├── bastok-rank-demo.js # Demo data
│   │   ├── bgwiki-bastok.js  # BG Wiki scraper
│   │   └── sandoria-rank.js  # San d'Oria scraper
│   └── utils/
│       ├── download-manager.js # Download and manage HTML files
│       ├── extract-main.js   # Extract <main> tag from HTML
│       ├── http.js           # HTTP fetching with cache
│       ├── link-parser.js    # Parse mission links from category pages
│       ├── mission-parser.js # Parse mission data from HTML
│       ├── parser.js         # HTML parsing utilities
│       └── storage.js        # File I/O operations
├── output/                   # Generated JSON files
├── cache/                    # Cached HTML from wikis
├── package.json
├── .gitignore
└── README.md
```

## Adding New Scrapers

To add a new mission set scraper:

1. Create a new file in `src/scrapers/` (e.g., `windurst-rank.js`)
2. Implement the scraper function following the existing patterns
3. Register it in `src/scrapers/index.js`
4. Test with `node src/index.js scrape --set your-new-scraper`

Example scraper structure:

```javascript
export async function scrapeYourMissionSet(useCache = true) {
  // Fetch HTML
  const html = await fetchWithDelay(url, 1000, useCache);
  const $ = cheerio.load(html);

  // Parse missions and nodes
  // ...

  return {
    id: 'your-mission-set',
    name: 'Your Mission Set Name',
    category: 'nation', // or 'expansion', 'addon', 'other'
    sourceUrl: url,
    lastScraped: new Date().toISOString(),
    missions: missions
  };
}
```

## Caching

The scraper caches HTML responses in the `cache/` directory to:

- Reduce load on wiki servers
- Speed up development and testing
- Allow offline development with cached data

Use the `--force` flag to bypass cache and fetch fresh data.

## 🚀 Open-Source Data Extraction (NEW!)

This project includes powerful **100% free and open-source** batch extraction tools that rival paid services like Firecrawl:

### Quick Start

```bash
# Install dependencies
npm install

# Install browser for extraction
npx playwright install chromium

# Extract data from all URLs
npm run extract:batch

# Or crawl a specific wiki section
npm run crawl:roe
npm run crawl:missions
```

**Features:**
- 🆓 **Completely free** - No API keys or paid services required
- 🎯 **Smart extraction** - Automatically detects and extracts missions, quests, bestiary, items, ROE
- 💾 **Checkpoint system** - Resume from where you left off
- ⚡ **Parallel processing** - Extract multiple pages simultaneously
- 📊 **Progress tracking** - Monitor what's processed and what failed
- 🔧 **Fully customizable** - Add your own extraction strategies

For complete documentation, see **[EXTRACTION_GUIDE.md](EXTRACTION_GUIDE.md)**

---

## Bot Protection and Manual Caching

FFXIclopedia has bot protection that blocks most automated requests. This scraper uses **Playwright** (headless browser automation) to bypass these protections.

### Automated Scraping with Playwright

The scraper uses Playwright to:
- Launch a real Chrome browser in headless mode
- Behave like a real user to bypass bot detection
- Wait for JavaScript content to load
- Extract the fully-rendered HTML

**Installation:**

```bash
# Install dependencies
npm install

# Install Playwright browsers (required for first run)
npx playwright install chromium
```

### Manual HTML Caching Workflow

If Playwright cannot be installed in your environment (e.g., restricted networks), you can manually cache HTML:

1. **Visit the wiki page in your browser** (e.g., https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report)

2. **Save the HTML**:
   - Right-click → "Save Page As" → Save as HTML
   - Or copy the full page HTML from browser DevTools

3. **Calculate the cache filename**:
   ```bash
   # Use this command to get the cache filename for a URL:
   node -e "console.log(Buffer.from('YOUR_URL_HERE').toString('base64').replace(/[/+=]/g, '_'))"
   ```

4. **Save to cache directory**:
   ```bash
   # Save your HTML file as: cache/{CACHE_KEY}.html
   # Example for The Zeruhn Report:
   cache/aHR0cHM6Ly9mZnhpY2xvcGVkaWEuZmFuZG9tLmNvbS93aWtpL1RoZV9aZXJ1aG5fUmVwb3J0.html
   ```

5. **Run the scraper**:
   ```bash
   # The scraper will automatically use cached HTML
   node src/index.js scrape --set bastok-rank
   ```

### Fallback Options

If you can't use Playwright or manual caching:

1. Try the **BG Wiki scrapers** (may have less strict bot protection)
2. The scraper includes **fallback/placeholder data** for testing
3. Increase delays between requests (default: 2 seconds)

## Data Validation

All scraped data is validated against Zod schemas before being saved. This ensures:

- All required fields are present
- Data types are correct
- Node IDs are unique within missions
- Dependencies reference valid node IDs
- URLs are properly formatted

## Scraping Frequency Strategy

The scraper tracks metadata to determine optimal scraping frequency:

- Old content (1+ years unchanged): scrape every 6 months
- Recent updates (changed in last 3 months): scrape weekly
- Force scrape anytime with `--force` flag

## Contributing

When adding new scrapers or improving existing ones:

1. Follow the existing code structure
2. Validate data with Zod schemas
3. Handle errors gracefully with fallbacks
4. Add appropriate delays between requests
5. Update this README with new mission sets

## License

MIT

## Credits

Data sourced from:
- [FFXIClopedia](https://ffxiclopedia.fandom.com)
- [BG Wiki](https://www.bg-wiki.com/ffxi/)

This project is for educational purposes and to support the FFXI community.
