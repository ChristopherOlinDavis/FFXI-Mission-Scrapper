# Unknown Content Analysis

## Problem Statement

**94.7% of all parsed files (9,394 out of 9,916) are categorized as "unknown"**

This is a massive data loss issue. The parsers are failing to recognize and categorize the vast majority of scraped content.

## Current Distribution

```
Category Distribution:
========================================
unknown             :   9394 ( 94.7%)  ← PROBLEM!
zones               :    257 (  2.6%)
items               :    100 (  1.0%)
spells              :     75 (  0.8%)
jobs                :     48 (  0.5%)
jobs-enhanced       :     42 (  0.4%)
========================================
TOTAL               :   9916
```

## Root Cause

Based on the analysis of `analyze-unknown-content.js`, the main issues are:

1. **98.5% of files have "No Category"** in MediaWiki metadata
   - The parsers rely heavily on MediaWiki categories (`wgCategories`)
   - Most scraped HTML files either:
     - Don't have category metadata
     - Have it in a different format
     - Are from pages that weren't properly categorized on the source wiki

2. **Parser Detection Logic is Too Strict**
   - Each parser (job, item, quest, etc.) checks for specific categories
   - If categories are missing, the parser returns `null`
   - Content defaults to "unknown" type

3. **Missing Parser Types**
   - Based on filename analysis, we're missing parsers for:
     - **Missions**: ~153 files (Shantotto Ascension, Aht Urhgan, etc.)
     - **NPCs**: Many NPC pages not detected
     - **Monsters/NMs**: Notorious Monsters and bestiary entries
     - **Equipment Sets**: Armor set pages
     - **Food/Consumables**: Cooking recipes and food items
     - **Synthesis/Crafting**: Crafting recipes
     - **Effects/Mechanics**: Game mechanic pages

## Sample Unknown Files

From random sampling:
```
Academic's Attire +1 Set           -> Armor Set (missing parser)
Agility (Feral Skill)              -> Pet ability (missing parser)
Armageddon (95)                    -> Weapon/REMA (should be item)
Beryllium Tachi                    -> Weapon (should be item)
Caller's Pigaches +1               -> Armor piece (should be item)
Cilbir                             -> Food item (missing parser)
Energy Drain                       -> Spell/Ability (should be detected)
Gobbue (MON)                       -> Monster (missing parser)
Maugie                             -> NPC (missing parser)
Maze Voucher 08                    -> Key item (should be item)
```

## Recommended Solutions

### Priority 1: Fix Existing Parsers

1. **Make parsers less strict** - Don't rely solely on MediaWiki categories
2. **Add content-based detection** - Look for specific HTML structures, tables, keywords
3. **Implement fallback detection** - Multi-stage detection with progressively looser criteria

### Priority 2: Create Missing Parsers

Essential new parsers needed:

1. **Mission Parser Enhancement**
   - Currently handles some missions but misses many
   - ~153 mission files in unknown
   - Need better detection for mission pages

2. **NPC Parser** (High Priority)
   - Many NPC pages not recognized
   - Detection: Look for NPC-specific tables, location data, shop inventory

3. **Monster/Bestiary Parser** (High Priority)
   - Notorious Monsters and regular enemies
   - Detection: Look for "Family", "Spawn Conditions", drop tables

4. **Food/Recipe Parser** (Medium Priority)
   - Cooking recipes and consumables
   - Detection: Look for "Effect Duration", ingredient tables

5. **Equipment Set Parser** (Medium Priority)
   - Armor/weapon set pages (e.g., "+1 Set", "+2 Set")
   - Detection: Look for set bonuses, individual piece listings

6. **Synthesis/Crafting Parser** (Medium Priority)
   - Crafting recipes
   - Detection: Look for "Crystal", "Ingredients", skill requirements

### Priority 3: Improved Detection Strategy

Implement a **waterfall detection system**:

```
1. Try strict detection (current method with categories)
   ↓
2. Try content-based detection (look for specific HTML patterns)
   ↓
3. Try keyword-based detection (search page text for indicators)
   ↓
4. Try filename-based detection (as last resort)
   ↓
5. Mark as "unknown" only if all methods fail
```

## Implementation Plan

### Phase 1: Quick Wins (Immediate)

1. ✅ **Enhance Job Parser** - DONE (98.3% improvement)
2. ⏳ **Fix Item Parser** - Make less reliant on categories
3. ⏳ **Fix Spell Parser** - Add content-based detection
4. ⏳ **Create Mission Parser Enhancement** - Catch the ~153 missions

**Expected Impact**: Move ~500-1,000 files from unknown to proper categories

### Phase 2: New Parsers (Short Term)

1. ⏳ **Create NPC Parser**
2. ⏳ **Create Monster/Bestiary Parser**
3. ⏳ **Create Food/Recipe Parser**

**Expected Impact**: Move ~2,000-3,000 files from unknown to proper categories

### Phase 3: Advanced Detection (Medium Term)

1. ⏳ **Implement waterfall detection system**
2. ⏳ **Add ML-based content classification** (optional)
3. ⏳ **Create Equipment Set Parser**
4. ⏳ **Create Synthesis/Crafting Parser**

**Expected Impact**: Move ~3,000-4,000 files from unknown to proper categories

### Phase 4: Cleanup (Final)

1. ⏳ **Review remaining unknown files**
2. ⏳ **Create parsers for edge cases**
3. ⏳ **Document what should stay as unknown** (category pages, talk pages, etc.)

**Target**: Reduce unknown category to <5% (under 500 files)

## Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Unknown Files** | 9,394 (94.7%) | <500 (5%) | **89.7% reduction** |
| **Properly Categorized** | 522 (5.3%) | >9,400 (95%) | **18x increase** |
| **Parser Coverage** | 6 types | 12+ types | **2x increase** |

## Next Steps

1. **Immediate**: Review and enhance existing parsers (item, spell, mission)
2. **This Week**: Create NPC and Monster parsers
3. **This Month**: Implement waterfall detection system
4. **Ongoing**: Add new parsers as patterns emerge

## Files Created

- `analyze-unknown-content.js` - Analysis script
- `UNKNOWN_CONTENT_ANALYSIS.md` - This document

## Commands

```bash
# Analyze unknown content
node analyze-unknown-content.js

# Check current distribution
python3 -c "import os; [print(f'{d}: {len(os.listdir(f\"parsed_output/{d}\"))}') for d in os.listdir('parsed_output') if os.path.isdir(f'parsed_output/{d}')]"
```

---

**Status**: Analysis Complete
**Priority**: HIGH - 94.7% data loss
**Next Action**: Enhance existing parsers and create missing parsers
