# Manual Scraping Workflow

Complete guide for manually scraping FFXI mission data when automated tools are unavailable.

## Quick Start

```bash
# 1. See all URLs you need to scrape
node src/utils/manual-cache-helper.js list bastok-rank-ffxiclopedia

# 2. Save HTML pages manually (see detailed steps below)

# 3. Check your progress
node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia

# 4. When all pages are cached, run the scraper
node src/index.js scrape --set bastok-rank
```

---

## Detailed Workflow

### Step 1: Choose Your Mission Set

Available mission sets:
- `bastok-rank-ffxiclopedia` - FFXIclopedia Bastok Missions (Ranks 1-3)
- `bastok-rank-bgwiki` - BG Wiki Bastok Missions (Ranks 1-3)
- `sandoria-rank-ffxiclopedia` - San d'Oria Missions (coming soon)

### Step 2: Get the URL List

```bash
node src/utils/manual-cache-helper.js list bastok-rank-ffxiclopedia
```

This shows:
- All URLs to visit
- The exact cache filename for each URL
- Step-by-step instructions

### Step 3: Save HTML Pages

For each URL in the list:

#### Method A: Save Entire Page (Recommended)

1. **Visit URL** in your browser
2. **Right-click** anywhere on the page
3. **Select** "Save Page As..." or "Save As..."
4. **Choose format**: "Webpage, HTML Only" or "HTML File"
5. **Save** to a temporary location

#### Method B: Copy HTML Source

1. **Visit URL** in your browser
2. **View source**: Press `Ctrl+U` (Windows/Linux) or `Cmd+Option+U` (Mac)
3. **Select all**: `Ctrl+A` / `Cmd+A`
4. **Copy**: `Ctrl+C` / `Cmd+C`
5. **Save** to a text file with `.html` extension

### Step 4: Name and Move Files

For each saved HTML file:

1. **Get the cache filename**:
   ```bash
   node src/utils/manual-cache-helper.js filename "https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report"
   # Returns: aHR0cHM6Ly9mZnhpY2xvcGVkaWEuZmFuZG9tLmNvbS93aWtpL1RoZV9aZXJ1aG5fUmVwb3J0.html
   ```

2. **Rename file** to the cache filename

3. **Move file** to the `cache/` directory:
   ```bash
   mv ~/Downloads/The_Zeruhn_Report.html cache/aHR0cHM6Ly9mZnhpY2xvcGVkaWEuZmFuZG9tLmNvbS93aWtpL1RoZV9aZXJ1aG5fUmVwb3J0.html
   ```

### Step 5: Track Progress

Check which files you've cached:

```bash
node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia
```

Output shows:
- ✓ CACHED - File successfully saved
- ✗ MISSING - Still need to save this URL

### Step 6: Run the Scraper

Once all files are cached:

```bash
# Scrape using cached HTML
node src/index.js scrape --set bastok-rank

# The scraper will automatically use cached files instead of fetching
```

---

## Alternative: Paste HTML Directly

If you prefer copy/paste over file management:

```bash
# 1. Visit URL and copy all HTML (Ctrl+U → Ctrl+A → Ctrl+C)

# 2. Run this command:
node src/utils/manual-cache-helper.js save "https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report"

# 3. Paste HTML and press:
#    - Unix/Mac: Ctrl+D
#    - Windows: Ctrl+Z then Enter
```

The HTML will be automatically saved with the correct cache filename.

---

## Batch Processing Tips

### Save Multiple Pages Quickly

1. **Open all URLs** in separate browser tabs
2. **Save each tab** one by one (Ctrl+S)
3. **Use a script** to rename/move all files:

```bash
# Example rename script (customize filenames as needed)
mv ~/Downloads/The_Zeruhn_Report.html cache/aHR0cHM6Ly9mZnhpY2xvcGVkaWEuZmFuZG9tLmNvbS93aWtpL1RoZV9aZXJ1aG5fUmVwb3J0.html
mv ~/Downloads/The_Emissary_\(Bastok\).html cache/aHR0cHM6Ly9mZnhpY2xvcGVkaWEuZmFuZG9tLmNvbS93aWtpL1RoZV9FbWlzc2FyeV8oQmFzdG9rKQ__.html
# ... etc
```

### Using Browser Extensions

Browser extensions like **SingleFile** can save pages with one click:
1. Install SingleFile extension
2. Click extension icon on each page
3. Files auto-save to Downloads
4. Batch rename/move afterward

---

## Troubleshooting

### Wrong cache filename?

Make sure you're using the **exact URL** including:
- Protocol (`https://`)
- Domain name
- Full path
- Query parameters and special characters

```bash
# Get exact cache filename for any URL
node src/utils/manual-cache-helper.js filename "<FULL_URL>"
```

### Scraper not finding cached files?

Check:
1. Files are in `cache/` directory (not subdirectory)
2. Filenames match exactly (including `.html` extension)
3. Files contain actual HTML (not error pages)

```bash
# Verify cache status
node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia
```

### HTML contains "Access Denied" or error?

If the saved HTML shows an error page:
1. Try a different browser
2. Clear cookies and try again
3. Wait a few minutes between requests
4. Try the BG Wiki version instead

---

## See Also

- **MANUAL_SCRAPING_URLS.md** - All URLs organized by mission set
- **README.md** - Full project documentation
- **src/utils/manual-cache-helper.js** - Source code for helper tool
