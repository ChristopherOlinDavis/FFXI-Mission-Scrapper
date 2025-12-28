# Testing Checklist - Before Adding Real HTML Files

This checklist helps verify the scraping system works correctly before you add actual HTML files from the wiki sites.

---

## Prerequisites

✅ Node.js installed (v18 or higher)
✅ Dependencies installed (`npm install`)
✅ Playwright browsers installed (or plan to use manual workflow)

---

## Basic Functionality Tests

### 1. Verify All Commands Display Help

```bash
# Should show help for download-manager
node src/utils/download-manager.js

# Should show help for link-parser
node src/utils/link-parser.js

# Should show help for mission-parser
node src/utils/mission-parser.js
```

**Expected:** Each command shows usage information and examples

---

### 2. Check URL List Loading

```bash
# Should list 6 category page URLs
node src/utils/download-manager.js list
```

**Expected Output:**
```
📋 All URLs to Download:

1. https://ffxiclopedia.fandom.com/wiki/Category:Missions
   → ffxiclopedia_fandom_com_wiki_Category_Missions.html

2. https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions
   → ffxiclopedia_fandom_com_wiki_Category_Bastok_Missions.html

...

Total: 6 URLs
```

---

### 3. Check Download Status (Before Any Downloads)

```bash
# Should show all URLs as missing
node src/utils/download-manager.js status
```

**Expected Output:**
```
📊 Download Status:

Downloaded: 0/6
Missing: 6/6

✗ Missing:
  https://ffxiclopedia.fandom.com/wiki/Category:Missions
  ...
```

---

### 4. Verify Filename Generation

```bash
# Check that filenames are safe and consistent
node src/utils/download-manager.js list | grep "→"
```

**Expected:** All filenames should:
- End with `.html`
- Have only alphanumeric characters and underscores
- No spaces or special characters

---

## Error Handling Tests

### 5. Test Parse Without HTMLs (Should Fail Gracefully)

```bash
# Try to parse before downloading HTMLs
node src/utils/mission-parser.js parse-set ffxiclopedia-bastok
```

**Expected:** Error message explaining workflow steps:
```
✗ Error: url-list.json not found.
Please run the download and discover workflow first:
  1. node src/utils/download-manager.js download <set-id>
  2. node src/utils/download-manager.js discover <set-id>
  3. node src/utils/download-manager.js download <set-id>
```

---

### 6. Test Discover Without Category HTMLs (Should Fail Gracefully)

```bash
# Try to discover mission URLs before downloading category pages
node src/utils/download-manager.js discover ffxiclopedia-bastok
```

**Expected:** Error message indicating HTML files not found

---

## Manual Workflow Simulation (No Network Calls)

### 7. Create Test HTML Structure

```bash
# Create test directories
mkdir -p outputHTMLs
mkdir -p output

# Create a minimal test HTML file
cat > outputHTMLs/test_mission.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Test Mission</title></head>
<body>
  <div class="page-header__title">
    <h1 class="mw-page-title-main">Test Mission Title</h1>
  </div>
  <div class="infobox-mission">
    <table>
      <tr><th>Number</th><td>1-1</td></tr>
    </table>
  </div>
  <h2><span id="Walkthrough">Walkthrough</span></h2>
  <ol>
    <li>Step one: Talk to NPC in Bastok Mines</li>
    <li>Step two: Travel to Zeruhn Mines</li>
    <li>Step three: Examine the target location</li>
  </ol>
</body>
</html>
EOF

echo "✓ Created test HTML file"
```

---

### 8. Verify URL Filename Conversion

```bash
# Test that URL to filename conversion works
node -e "
import { urlToFilename } from './src/utils/download-manager.js';
const testUrl = 'https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report';
console.log(urlToFilename(testUrl));
"
```

**Expected:** `ffxiclopedia_fandom_com_wiki_The_Zeruhn_Report.html`

---

## Syntax and Import Checks

### 9. Verify No Syntax Errors

```bash
# Check all utility files
node --check src/utils/download-manager.js
node --check src/utils/link-parser.js
node --check src/utils/mission-parser.js

echo "✓ All syntax checks passed"
```

---

### 10. Verify ES Modules Work

```bash
# Test imports work correctly
node -e "
import { urlToFilename } from './src/utils/download-manager.js';
console.log('✓ download-manager imports work');
"

node -e "
import { discoverMissionURLs } from './src/utils/link-parser.js';
console.log('✓ link-parser imports work');
"

node -e "
import { parseMission } from './src/utils/mission-parser.js';
console.log('✓ mission-parser imports work');
"
```

---

## Integration Tests (With Network - Optional)

⚠️ **WARNING:** These tests will make real network requests and may trigger bot protection.

### 11. Test Single Category Page Download (Optional)

```bash
# Try downloading one category page
# This will fail if Playwright browsers aren't installed
node src/utils/download-manager.js download ffxiclopedia-bastok
```

**Expected (Success):**
```
📥 Downloading: https://ffxiclopedia.fandom.com/wiki/Category:Missions
✓ Downloaded: ffxiclopedia_fandom_com_wiki_Category_Missions.html
...
```

**Expected (Failure - No Playwright):**
```
browserType.launch: Executable doesn't exist at ...
```

---

### 12. Test Category Page Discovery (After Manual Download)

If you manually downloaded category page HTMLs:

```bash
# Try discovering mission URLs
node src/utils/download-manager.js discover ffxiclopedia-bastok

# Then check if url-list.json was updated
cat url-list.json | grep -A 5 "missionPages"
```

**Expected:** `missionPages` array should be populated with discovered URLs

---

## Pre-Test Setup Verification

### 13. Check Git Status

```bash
git status
```

**Expected:** Clean working directory or only expected changes (bug fixes)

---

### 14. Check Package Dependencies

```bash
npm list --depth=0
```

**Expected Dependencies:**
```
├── playwright@^1.40.1
├── cheerio@^1.0.0-rc.12
├── commander@^11.1.0
└── zod@^3.22.4
```

---

## Ready for Real Testing?

Before you add real HTML files:

- [ ] All basic functionality tests pass
- [ ] All error handling tests show appropriate messages
- [ ] Syntax checks pass
- [ ] Import tests work
- [ ] You understand the workflow:
  1. Download category pages → `outputHTMLs/`
  2. Discover mission URLs → updates `url-list.json`
  3. Download mission pages → `outputHTMLs/`
  4. Parse mission data → `output/*.json`

---

## Next Steps

Once all tests pass:

1. **Option A: Automatic Download** (if Playwright browsers work)
   ```bash
   node src/utils/download-manager.js download ffxiclopedia-bastok
   ```

2. **Option B: Manual Download** (if Playwright fails)
   - Visit each URL in browser
   - Save as "Webpage, HTML Only"
   - Use correct filename from `list` command
   - Place in `outputHTMLs/` directory

3. **Then Continue Workflow:**
   ```bash
   # Discover mission URLs
   node src/utils/download-manager.js discover ffxiclopedia-bastok

   # Download mission pages
   node src/utils/download-manager.js download ffxiclopedia-bastok

   # Parse into JSON
   node src/utils/mission-parser.js parse-set ffxiclopedia-bastok
   ```

---

## Troubleshooting

### "Cannot find module" errors
→ Run `npm install`

### "Executable doesn't exist" from Playwright
→ Run `npx playwright install chromium` or use manual workflow

### "url-list.json not found" errors
→ Run `node src/utils/download-manager.js init`

### "HTML not found for URL" errors
→ Download the HTML files first before trying to parse

### 403 Forbidden errors
→ This is expected bot protection, Playwright should handle it

---

## Test Results Log

Fill this in as you test:

- [ ] Test 1: Help commands - ✅ / ❌
- [ ] Test 2: URL list loading - ✅ / ❌
- [ ] Test 3: Download status - ✅ / ❌
- [ ] Test 4: Filename generation - ✅ / ❌
- [ ] Test 5: Parse without HTMLs - ✅ / ❌
- [ ] Test 6: Discover without category HTMLs - ✅ / ❌
- [ ] Test 9: Syntax checks - ✅ / ❌
- [ ] Test 10: ES module imports - ✅ / ❌

**Notes:**
_Add any observations or issues here_
