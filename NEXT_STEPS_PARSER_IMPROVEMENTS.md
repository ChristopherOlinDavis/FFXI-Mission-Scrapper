# Next Steps: Parser Improvements

## Current Situation

After thorough analysis, we've discovered that **94.7% of scraped content (9,394 out of 9,916 files) is categorized as "unknown"**.

## Key Findings

### 1. The Core Issue
- **98.5% of files lack MediaWiki category metadata**
- Current parsers heavily rely on `wgCategories` which is often missing
- When categories are absent, parsers return `null` → content defaults to "unknown"

### 2. HTML File Quality Issues
Many HTML files in `output/` appear to be:
- Error pages (only 78 lines)
- CSP (Content Security Policy) blocks
- Redirects or stubs
- Not the actual content pages

Example:
```
ffxiclopedia-Acheron_Shield_%2B1.html: 78 lines (error page)
ffxiclopedia-Excalibur.html: 2,440 lines (actual content)
```

### 3. Parser Detection Problems
- **Job Parser**: ✅ Fixed (enhanced version works great)
- **Item Parser**: Detects items WITH categories, misses items WITHOUT categories
- **Spell Parser**: Similar category-dependency issue
- **Mission Parser**: Misses ~153 mission pages
- **No Parser For**: NPCs, Monsters, Food, Recipes, Equipment Sets

## What We've Accomplished

### ✅ Job Parser Enhancement (COMPLETE)
- Created `src/parsers/job-parser-enhanced.js`
- **98.3% reduction** in duplicates
- **100% schema validation** pass rate
- Successfully parsed 41 of 42 jobs
- **Result**: 2,822 clean items extracted

### ✅ Repository Cleanup (COMPLETE)
- Removed 54 obsolete files
- **72% reduction** in root directory clutter
- Clean, organized structure

### ✅ Analysis & Documentation (COMPLETE)
- `UNKNOWN_CONTENT_ANALYSIS.md` - Comprehensive analysis
- `FINAL_PARSER_IMPROVEMENTS.md` - Parser enhancement summary
- `REPOSITORY_SUMMARY.md` - Repository structure
- `CLEANUP_COMPLETE.md` - Cleanup summary

### ⏳ Item Parser Enhancement (IN PROGRESS)
- Created `src/parsers/item-parser-enhanced.js`
- Added content-based detection
- **Issue**: Many HTML files are error pages, not actual content
- **Next**: Need to verify HTML file quality before proceeding

## The Real Problem

**The HTML files being parsed may not be the actual content pages.**

Looking at the evidence:
1. Files like `ffxiclopedia-Acheron_Shield_%2B1.html` are only 78 lines
2. These appear to be CSP blocks or error pages
3. The actual content may need to be re-downloaded
4. Or, these pages simply don't exist on FFXIClopedia

## Recommended Approach Going Forward

### Option 1: Focus on BGWiki Only (RECOMMENDED)
**Why**: BGWiki appears to have better quality HTML and more complete data

**Actions**:
1. ✅ Job parser works great on BGWiki
2. Test item/spell parsers on BGWiki content
3. Create NPC and Monster parsers for BGWiki
4. Build waterfall detection for BGWiki pages
5. Ignore FFXIClopedia error pages

**Expected Result**: Move from 5.3% → 60-70% properly categorized (focusing on quality over quantity)

### Option 2: Re-Download FFXIClopedia Content
**Why**: Current FFXIClopedia HTML files may be incomplete/errors

**Actions**:
1. Review download scripts
2. Re-download FFXIClopedia pages with proper error handling
3. Verify HTML quality before parsing
4. Then apply enhanced parsers

**Expected Result**: More work, but could get to 95% categorized

### Option 3: Hybrid Approach (BEST)
**Why**: Combines quality BGWiki data with selective FFXIClopedia content

**Actions**:
1. **Phase 1**: Perfect BGWiki parsing (this week)
   - Enhance item parser for BGWiki
   - Enhance spell parser for BGWiki
   - Create NPC parser for BGWiki
   - Create Monster parser for BGWiki

2. **Phase 2**: Quality-check FFXIClopedia (next week)
   - Identify which FFXIClopedia pages are valid
   - Re-download missing/error pages
   - Apply enhanced parsers to valid pages only

3. **Phase 3**: Waterfall detection (ongoing)
   - Implement multi-stage detection
   - Category → Content → Keywords → Filename
   - Works for both sources

**Expected Result**: 80-90% properly categorized with high data quality

## Immediate Next Steps

### 1. Test Current Parsers on BGWiki Content ⏭️
```bash
# Test job parser on BGWiki jobs
node batch-reparse-jobs.js  # Already works!

# Test item parser on BGWiki items
# Create test script for BGWiki items specifically
```

### 2. Verify HTML File Quality ⏭️
```bash
# Create script to analyze HTML file sizes/quality
# Identify error pages vs real content
# Separate BGWiki (good) from FFXIClopedia (needs review)
```

### 3. Create Missing Parsers (BGWiki-focused) ⏭️
```
Priority order:
1. NPC Parser (many NPCs in BGWiki)
2. Monster/Bestiary Parser (bestiary data)
3. Mission Parser Enhancement
4. Spell/Magic Parser Enhancement
```

### 4. Build Quality Metrics Dashboard ⏭️
```javascript
// Show:
// - Files by source (BGWiki vs FFXIClopedia)
// - Files by size (error pages vs real content)
// - Files by category
// - Detection success rate per parser
```

## Success Metrics (Revised)

### Short Term (BGWiki Focus)
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| BGWiki Categorized | ~2% | 70% | This Week |
| Parser Types | 6 | 10 | This Week |
| Unknown (BGWiki) | ~1,500 | <150 | This Week |

### Long Term (Both Sources)
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Overall Categorized | 5.3% | 80% | 2 Weeks |
| Unknown Total | 9,394 | <2,000 | 2 Weeks |
| Parser Coverage | 6 types | 12+ types | 2 Weeks |

## Decision Point 🎯

**We need to decide**: Focus on BGWiki (quality) or fix FFXIClopedia (quantity)?

**Recommendation**: **Option 3 - Hybrid Approach**
- Week 1: Perfect BGWiki (quality foundation)
- Week 2: Fix FFXIClopedia (add quantity)
- Ongoing: Waterfall detection (robustness)

This gives us high-quality data quickly, then expands coverage systematically.

---

**Status**: Analysis Complete, Awaiting Direction
**Priority**: HIGH
**Blocker**: Need to verify HTML file quality
**Next Action**: Test parsers on BGWiki content specifically

