# WotG Unified Quest & Mission Structure - Implementation Summary

## What Was Done

Successfully implemented a unified data structure for Wings of the Goddess that combines both missions and quests as first-class entities, with support for tracking 3 nation variants per quest.

## Key Changes

### 1. Data Structure

Created a new structure for WotG **ONLY** (other mission sets unchanged):

```json
{
  "id": "wotg",
  "name": "Wings of the Goddess",
  "missions": [30 missions],
  "quests": [13 quests with 39 variants total],
  "stats": {
    "totalMissions": 30,
    "totalQuests": 13,
    "totalQuestVariants": 39
  }
}
```

### 2. Quest Object Structure

Each quest has 3 nation variants:

```json
{
  "id": "wotg-quest-5",
  "number": "5",
  "title": "Quest 5",
  "type": "quest",
  "variants": [
    {
      "nation": "bastok",
      "title": "Burden of Suspicion",
      "nodes": [],
      "metadata": { "rewards": [] }
    },
    {
      "nation": "sandoria",
      "title": "Wrath of the Griffon",
      "nodes": [],
      "metadata": { "rewards": [] }
    },
    {
      "nation": "windurst",
      "title": "A Manifest Problem",
      "nodes": [],
      "metadata": { "rewards": [] }
    }
  ]
}
```

### 3. Mission Prerequisites Updated

Missions now reference quests by ID:

```json
{
  "id": "wotg-the-queen-of-the-dance",
  "number": "4",
  "metadata": {
    "questPrerequisite": "wotg-quest-5"  // References quest ID
  }
}
```

The old `nationSpecificQuest` object is removed from mission metadata - that data is now in the quests array.

## Files Modified

### Core Data Files
- `output/wotg.json` - Updated with unified structure
- `ios-app-package/wotg.json` - Updated with unified structure

### Swift Models
- `ios-app-package/Models.swift`
  - Added `Quest` struct with variant support
  - Added `QuestVariant` struct
  - Added `MissionSetStats` for quest counts
  - Added `quests` and `stats` fields to `MissionSet`
  - Added helper methods: `isFullyComplete()`, `completionPercentage()`, `uncompletedNations()`
  - Deprecated `NationSpecificQuest` (kept for backward compatibility)

### Documentation
- `ios-app-package/WOTG_QUEST_GATES.md` - Completely rewritten with:
  - Unified structure explanation
  - Swift tracking examples
  - SwiftUI display examples
  - Complete quest gate reference (all 13 quests)
- `ios-app-package/README.md` - Updated stats table and features list

### Scripts Created
- `scripts/generate-wotg-quests.js` - Generates quest data from table
- `scripts/merge-wotg-quests-missions.js` - Merges quests into mission set

## Quest Tracking Pattern

The recommended tracking pattern uses quest variant IDs in format `"{questId}-{nation}"`:

```swift
// Track completed variants
var completedQuestVariants: Set<String> = [
    "wotg-quest-5-bastok",
    "wotg-quest-5-sandoria",
    "wotg-quest-5-windurst"
]

// Check if quest is fully complete (all 3 variants)
let quest5 = wotg?.quests?.first { $0.number == "5" }
let isFullyComplete = quest5?.isFullyComplete(completedVariants: completedQuestVariants)
// true

// Get completion percentage
let percentage = quest5?.completionPercentage(completedVariants: completedQuestVariants)
// 1.0 (100%)

// Check if mission is unlocked (needs at least 1 variant)
let hasCompletedAny = completedQuestVariants.contains { $0.hasPrefix("wotg-quest-5") }
```

## Why This Approach?

1. **Separate Arrays**: Missions and quests are both first-class entities
2. **Variant Grouping**: 3 nation variants grouped under single quest ID
3. **Clean Dependencies**: Missions reference quests by ID
4. **Easy Tracking**: Set-based tracking with variant IDs
5. **Backward Compatible**: Old `NationSpecificQuest` struct still exists (deprecated)
6. **WotG Only**: Other mission sets unchanged (no `quests` field)

## Trust Collection Use Case

The structure supports the requirement to complete all 3 quest variants:

```swift
// Show trust collection progress
let quest5 = wotg?.quests?.first { $0.number == "5" }
let progress = quest5?.completionPercentage(completedVariants: completedQuestVariants)

if progress == 1.0 {
    print("🎉 All 3 variants complete - all Trusts collected!")
} else {
    let remaining = quest5?.uncompletedNations(completedVariants: completedQuestVariants)
    print("Complete these for all Trusts: \(remaining.joined(separator: ", "))")
}
```

## Quest Gate Reference

13 quests total, 3 with mission prerequisites:

- **Quest 5** → Required for Mission 4 (The Queen of the Dance)
- **Quest 7** → Required for Mission 8 (In the Name of the Father)
- **Quest 11** → Required for Mission 26 (Fate in Haze)

See [WOTG_QUEST_GATES.md](ios-app-package/WOTG_QUEST_GATES.md) for complete quest list.

## Stats

- **Missions**: 30/54 (from scrape source)
- **Quests**: 13 quest gates
- **Quest Variants**: 39 total (13 × 3 nations)
- **Total Entries**: 69 (30 missions + 39 quest variants)

## Important Notes

1. ✅ **WotG ONLY** - No other mission sets have this structure
2. ✅ **Quest nodes empty** - Quest walkthrough steps not yet scraped (nodes arrays are empty)
3. ✅ **Backward compatible** - Old `NationSpecificQuest` struct deprecated but still present
4. ✅ **Schema valid** - All data validates against schemas
5. ✅ **Production ready** - Complete Swift models with tracking helpers

## Next Steps (Optional)

If you want to enhance this further:

1. **Scrape quest pages** to populate `nodes` arrays in quest variants
2. **Add rewards** by scraping individual quest pages
3. **Scrape remaining missions** (24 missions missing from original source)
4. **Add quest dependencies** if quests have prerequisites among themselves

---

**Result**: WotG now has a unified structure that treats missions and quests equally, with full support for tracking all 3 nation variants per quest for Trust collection!
