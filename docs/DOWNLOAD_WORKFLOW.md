# Download and Parse Workflow

Simple workflow for downloading HTML pages and parsing them offline.

## Overview

1. **List URLs** - See what needs to be downloaded
2. **Download HTMLs** - Save pages to `outputHTMLs/`
3. **Parse HTMLs** - Extract mission data + discover new URLs

---

## Step 1: List URLs

See all URLs that need to be downloaded:

```bash
node src/utils/download-manager.js list
```

This shows:
- All category pages (to discover mission links)
- All known mission pages
- Filename for each URL

---

## Step 2: Download HTMLs

### Option A: Automatic (Playwright)

**Note:** Requires Playwright browsers installed (`npx playwright install chromium`)

```bash
# Download all URLs
node src/utils/download-manager.js download all

# Or download specific set
node src/utils/download-manager.js download ffxiclopedia-bastok
```

### Option B: Manual Download

If Playwright can't run (bot protection or network restrictions):

1. **Visit each URL** in your browser
2. **Save page**: Right-click → "Save Page As" → "Webpage, HTML Only"
3. **Rename** to the filename shown by the `list` command
4. **Move** to `outputHTMLs/` directory

Example:
```bash
# URL: https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions
# Filename: ffxiclopedia_fandom_com_wiki_Category_Bastok_Missions.html

# Save browser download as:
mv ~/Downloads/Category_Bastok_Missions.html outputHTMLs/ffxiclopedia_fandom_com_wiki_Category_Bastok_Missions.html
```

---

## Step 3: Check Progress

See which URLs have been downloaded:

```bash
node src/utils/download-manager.js status
```

Shows:
- ✓ Downloaded - Already saved
- ✗ Missing - Still need to download

---

## Step 4: Discover Mission URLs

Parse category pages to find mission URLs and add them to `url-list.json`:

```bash
# Discover mission URLs from downloaded category pages
node src/utils/download-manager.js discover ffxiclopedia-bastok

# Or discover all at once
node src/utils/download-manager.js discover all
```

This:
- Reads downloaded category page HTMLs from `outputHTMLs/`
- Extracts mission links from the category listings
- Updates `url-list.json` with discovered mission URLs
- Shows you all discovered missions

## Step 5: Download Mission Pages

Now download the newly discovered mission pages:

```bash
# See new URLs added to the list
node src/utils/download-manager.js list

# Download mission pages
node src/utils/download-manager.js download ffxiclopedia-bastok
```

---

## URL List Configuration

Edit `url-list.json` to add/modify mission sets:

```json
{
  "ffxiclopedia-bastok": {
    "name": "FFXIclopedia - Bastok Missions",
    "source": "FFXIclopedia",
    "categoryPages": [
      "https://ffxiclopedia.fandom.com/wiki/Category:Missions",
      "https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions"
    ],
    "missionPages": []
  }
}
```

- `categoryPages` - Pages that list missions (we parse these to find mission URLs)
- `missionPages` - Individual mission pages (discovered or manually added)

---

## Directory Structure

```
FFXI-Mission-Scrapper/
├── url-list.json              # URL configuration
├── outputHTMLs/               # Downloaded HTML files
│   ├── ffxiclopedia_fandom_com_wiki_Category_Missions.html
│   ├── ffxiclopedia_fandom_com_wiki_The_Zeruhn_Report.html
│   └── ...
├── output/                    # Parsed JSON data
│   ├── bastok-rank.json
│   └── all-missions.json
└── src/utils/
    └── download-manager.js    # Download & parse tool
```

---

## Complete Workflow Example

```bash
# 1. See what needs downloading (initially just category pages)
node src/utils/download-manager.js list

# 2. Download category pages
#    Option A - Manual: Visit each URL, save HTML to outputHTMLs/
#    Option B - Auto: node src/utils/download-manager.js download ffxiclopedia-bastok

# 3. Check download progress
node src/utils/download-manager.js status

# 4. Discover mission URLs from category pages
node src/utils/download-manager.js discover ffxiclopedia-bastok
#    This updates url-list.json with mission URLs

# 5. List all URLs again (now includes discovered missions)
node src/utils/download-manager.js list

# 6. Download newly discovered mission pages
node src/utils/download-manager.js download ffxiclopedia-bastok

# 7. Check final status
node src/utils/download-manager.js status

# 8. Parse mission pages to extract data (coming soon)
#    This will create JSON files in output/
```

---

## Tips

### Batch Download Multiple Pages

1. Open all URLs in separate browser tabs
2. Use browser extension like "Save All Resources" or "SingleFile"
3. Batch rename files with script:

```bash
# Example rename script
for file in ~/Downloads/*.html; do
  # Rename based on URL pattern
  # Move to outputHTMLs/
done
```

### Update URL List with Discovered URLs

After parsing category pages, the tool will update `url-list.json` with discovered mission URLs.

```bash
# Before parsing
"missionPages": []

# After parsing category pages
"missionPages": [
  "https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report",
  "https://ffxiclopedia.fandom.com/wiki/The_Emissary_(Bastok)",
  ...
]
```

---

## Next Steps

1. Download all category pages
2. Parse to discover mission URLs
3. Download mission pages
4. Parse mission data
5. Refine parsers based on actual HTML structure
