# Manual Scraping URLs

This document lists all URLs that need to be manually scraped and cached.

## How to Use This File

1. Visit each URL in your browser
2. Save the page: Right-click → "Save Page As" → "Webpage, HTML Only"
3. Use the helper tool to get the cache filename:
   ```bash
   node src/utils/manual-cache-helper.js filename "<URL>"
   ```
4. Rename and move the saved HTML to `cache/<filename>.html`
5. Check progress with:
   ```bash
   node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia
   ```

## FFXIclopedia - Bastok Rank Missions

**Category Pages:**
- https://ffxiclopedia.fandom.com/wiki/Category:Missions
- https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions

**Rank 1 Missions:**
- https://ffxiclopedia.fandom.com/wiki/The_Zeruhn_Report (1-1)
- https://ffxiclopedia.fandom.com/wiki/The_Emissary_(Bastok) (1-2)
- https://ffxiclopedia.fandom.com/wiki/The_President%27s_Gatekeepers (1-3)

**Rank 2 Missions:**
- https://ffxiclopedia.fandom.com/wiki/A_Geological_Survey (2-1)
- https://ffxiclopedia.fandom.com/wiki/Fetichism (2-2)
- https://ffxiclopedia.fandom.com/wiki/Wading_Beasts (2-3)

**Rank 3 Missions:**
- https://ffxiclopedia.fandom.com/wiki/The_Emissary (3-1)
- https://ffxiclopedia.fandom.com/wiki/The_Chains_that_Bind_Us (3-2)
- https://ffxiclopedia.fandom.com/wiki/Enter_the_Talekeeper (3-3)

---

## BG Wiki - Bastok Rank Missions

**Category Pages:**
- https://www.bg-wiki.com/ffxi/Category:Missions
- https://www.bg-wiki.com/ffxi/Category:Bastok_Missions

**Rank 1 Missions:**
- https://www.bg-wiki.com/ffxi/Bastok_Mission_1-1
- https://www.bg-wiki.com/ffxi/Bastok_Mission_1-2
- https://www.bg-wiki.com/ffxi/Bastok_Mission_1-3

**Rank 2 Missions:**
- https://www.bg-wiki.com/ffxi/Bastok_Mission_2-1
- https://www.bg-wiki.com/ffxi/Bastok_Mission_2-2
- https://www.bg-wiki.com/ffxi/Bastok_Mission_2-3

**Rank 3 Missions:**
- https://www.bg-wiki.com/ffxi/Bastok_Mission_3-1
- https://www.bg-wiki.com/ffxi/Bastok_Mission_3-2
- https://www.bg-wiki.com/ffxi/Bastok_Mission_3-3

---

## Progress Tracking

Use the status command to track your progress:

```bash
# Check FFXIclopedia Bastok missions
node src/utils/manual-cache-helper.js status bastok-rank-ffxiclopedia

# Check BG Wiki Bastok missions
node src/utils/manual-cache-helper.js status bastok-rank-bgwiki
```

## Quick Save Method

If you want to copy/paste HTML instead of saving files:

1. Visit the URL in your browser
2. View page source (Ctrl+U or Cmd+U)
3. Copy all the HTML
4. Save with:
   ```bash
   # Paste HTML, then press Ctrl+D (Unix) or Ctrl+Z (Windows)
   node src/utils/manual-cache-helper.js save "<URL>"
   ```

## Adding More Missions

To add more mission sets, edit `src/utils/manual-cache-helper.js` and add URLs to the `MISSION_URLS` object.
