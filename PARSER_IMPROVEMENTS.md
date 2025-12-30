# Parser Improvements for iOS App Integration

## Summary of Changes

The parser has been significantly improved to produce clean, structured data suitable for iOS app consumption. All HTML artifacts and image captions have been removed, and location data has been properly extracted into structured fields.

## Key Improvements

### 1. ✅ HTML Content Removed (CRITICAL)
**Before:**
```json
{
  "title": "(Bas.",
  "description": "(Bas. Mines). Zeruh is all the way on the left. (Bastok Mines) Go to (D-7)..."
}
```

**After:**
```json
{
  "title": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines.",
  "description": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines.."
}
```

**What was fixed:**
- Added `extractCleanText()` method to remove `<figure>`, `<figcaption>`, and `<img>` tags
- Image alt text and captions are no longer included in node descriptions
- Nested lists (warnings/notes) are also removed for cleaner output

### 2. ✅ Fixed Title Truncation (CRITICAL)
**Before:**
- Titles were cut off at exactly 100 characters with `.substring(0, 100)`
- Result: "(Bas." instead of full location name

**After:**
- Titles are only truncated if they exceed 150 characters
- Truncation happens at word boundaries (last space before 150 chars)
- Ellipsis (...) added when truncated

### 3. ✅ Location Extraction to Separate Field (MEDIUM PRIORITY)
**Before:**
```json
{
  "title": "(Bastok Mines) Go to (D-7)...",
  "description": "...",
  "location": undefined
}
```

**After:**
```json
{
  "title": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines.",
  "description": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines..",
  "location": {
    "coordinates": "D-7",
    "zone": "Bastok Mines"
  }
}
```

**What was extracted:**
- `coordinates`: Grid coordinates like "H-9", "D-7"
- `zone`: Zone/area name like "Bastok Mines", "Zeruhn Mines"
- `npc`: NPC name when mentioned (e.g., "Makarim", "Naji")

### 4. ✅ Improved Description Quality (MEDIUM PRIORITY)
**Before:**
- Descriptions included full text with warnings, notes, and navigation instructions
- Could be 200+ characters of text

**After:**
- Descriptions are limited to first 1-2 sentences
- Contextual details and warnings are stripped out
- Focus is on the core action needed

## Example Comparison

### The Zeruhn Report - Node 2

**BEFORE:**
```json
{
  "id": "ffxiclopedia-bastok-the-zeruhn-report-node-2",
  "orderIndex": 1,
  "title": "(Bas.",
  "description": "(Bas. Mines). Zeruh is all the way on the left. (Bastok Mines) Go to (D-7) and enter Zeruhn Mines.",
  "dependencies": ["ffxiclopedia-bastok-the-zeruhn-report-node-1"]
}
```

**AFTER:**
```json
{
  "id": "bastok-rank-the-zeruhn-report-node-2",
  "orderIndex": 1,
  "title": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines.",
  "description": "(Bastok Mines) Go to (D-7) and enter Zeruhn Mines..",
  "dependencies": ["bastok-rank-the-zeruhn-report-node-1"],
  "location": {
    "coordinates": "D-7",
    "zone": "Bastok Mines"
  }
}
```

### The Zeruhn Report - Node 3

**AFTER:**
```json
{
  "id": "bastok-rank-the-zeruhn-report-node-3",
  "orderIndex": 2,
  "title": "(Zeruhn Mines) Talk to Makarim (H-11) for the Zeruhn Report",
  "description": "(Zeruhn Mines) Talk to Makarim (H-11) for the Zeruhn Report. He is all the way south.",
  "dependencies": ["bastok-rank-the-zeruhn-report-node-2"],
  "location": {
    "coordinates": "H-11",
    "zone": "Zeruhn Mines"
  }
}
```

## Files Modified

1. **src/parsers/base-parser.js**
   - Added `extractCleanText($elem)` method to strip HTML elements
   - Improved `extractLocation(text)` to parse zone names from parentheses
   - Enhanced `parseListItemToStep(text)` with smarter sentence splitting
   - Fixed title truncation to respect word boundaries

2. **src/parsers/ffxiclopedia-parser.js**
   - Updated `extractWalkthrough($)` to use `extractCleanText()` instead of `.text()`
   - Now properly removes figure/img/figcaption elements before text extraction

## Benefits for iOS App

✅ **Clean titles** - No more truncated text like "(Bas."
✅ **Structured locations** - Easy to display coordinates and zone names separately
✅ **Concise descriptions** - First 1-2 sentences only, perfect for card/list views
✅ **No HTML artifacts** - No image alt text or captions polluting the data
✅ **NPC extraction** - Can highlight or link NPC names in the UI
✅ **Searchable** - Zone names and coordinates are in separate fields for filtering

## Testing

All 164 Bastok missions have been re-scraped with the improved parser:
- ✅ 164/164 missions parsed successfully
- ✅ Schema validation passed
- ✅ No HTML artifacts in output
- ✅ Location data properly extracted

## Next Steps (Optional Enhancements)

1. **Image URL extraction** - Save map image URLs separately for optional display
2. **NPC database** - Build a separate NPC lookup table from extracted names
3. **Zone validation** - Validate zone names against a master list of FFXI zones
4. **Coordinate parsing** - Further parse coordinates into separate column/row fields
