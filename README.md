# FFXI Mission Scraper

A Node.js web scraper that extracts Final Fantasy XI mission data from community wikis and outputs structured JSON for use in an iOS mission tracker app.

## Overview

This scraper fetches mission data from FFXI community wikis (primarily ffxiclopedia.fandom.com and bg-wiki.com) and converts it into a structured, node-based format suitable for displaying missions as a tech tree or mission graph.

## Features

- Scrapes mission data from multiple wiki sources
- Converts mission walkthroughs into discrete nodes with dependencies
- Identifies and structures prerequisite gates (level, rank, item requirements)
- Validates all output data with Zod schemas
- Supports caching to reduce load on wiki servers
- Tracks scrape metadata for intelligent re-scraping
- CLI interface for easy operation

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

- `{mission-set-id}.json` - Individual mission set files
- `all-missions.json` - Combined file with all mission sets
- `scrape-metadata.json` - Tracking information for scrapes

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
│       ├── http.js           # HTTP fetching with cache
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

## Bot Protection Notice

Some wikis (like FFXIClopedia) have bot protection that may block automated requests. In these cases:

1. The scraper will use fallback/placeholder data
2. Try the BG Wiki alternative scrapers
3. Manually cache HTML by visiting pages in a browser and saving them to `cache/`
4. Consider adding delay between requests (already implemented at 1 second)

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
