# WotG Unified Structure Diagram

## Visual Overview

```
Wings of the Goddess Mission Set
├── missions (30 missions)
│   ├── Mission 4: The Queen of the Dance
│   │   └── metadata.questPrerequisite: "wotg-quest-5" ─┐
│   ├── Mission 5: While the Cat is Away                │
│   ├── Mission 7: A Timeswept Butterfly                │
│   ├── Mission 8: In the Name of the Father            │
│   │   └── metadata.questPrerequisite: "wotg-quest-7" ─┼─┐
│   ├── ...                                             │ │
│   ├── Mission 26: Fate in Haze                        │ │
│   │   └── metadata.questPrerequisite: "wotg-quest-11" ┼─┼─┐
│   └── ...                                             │ │ │
│                                                        │ │ │
├── quests (13 quests, 39 variants)                     │ │ │
│   ├── Quest 1                                         │ │ │
│   │   ├── variant[bastok]: "Burden of Suspicion"      │ │ │
│   │   ├── variant[sandoria]: "Wrath of the Griffon"   │ │ │
│   │   └── variant[windurst]: "A Manifest Problem"     │ │ │
│   ├── ...                                             │ │ │
│   ├── Quest 5 <───────────────────────────────────────┘ │ │
│   │   ├── variant[bastok]: "Burden of Suspicion"        │ │
│   │   ├── variant[sandoria]: "Wrath of the Griffon"     │ │
│   │   └── variant[windurst]: "A Manifest Problem"       │ │
│   ├── ...                                               │ │
│   ├── Quest 7 <─────────────────────────────────────────┘ │
│   │   ├── variant[bastok]: "Corrosive Shears"            │
│   │   ├── variant[sandoria]: "The Crimson Trial"         │
│   │   └── variant[windurst]: "Maiden of the Dusk"        │
│   ├── ...                                                 │
│   ├── Quest 11 <──────────────────────────────────────────┘
│   │   ├── variant[bastok]: "Music of the March"
│   │   ├── variant[sandoria]: "The Blood of Heroes"
│   │   └── variant[windurst]: "Child of Woe"
│   └── ...
│
└── stats
    ├── totalMissions: 30
    ├── totalQuests: 13
    └── totalQuestVariants: 39
```

## Comparison: WotG vs Other Mission Sets

### Traditional Mission Set (Bastok, San d'Oria, Windurst, Zilart, Promathia)

```json
{
  "id": "bastok-rank",
  "missions": [20 missions],
  // No quests array
  // No stats object
}
```

### Wings of the Goddess (UNIQUE)

```json
{
  "id": "wotg",
  "missions": [30 missions],
  "quests": [13 quests],  // ← NEW: Only WotG has this
  "stats": {              // ← NEW: Quest stats
    "totalMissions": 30,
    "totalQuests": 13,
    "totalQuestVariants": 39
  }
}
```

## Quest Variant Structure

Each quest has 3 nation-specific variants:

```
Quest 5
├── id: "wotg-quest-5"
├── number: "5"
├── title: "Quest 5"
├── type: "quest"
└── variants: [3 items]
    ├── [0] bastok
    │   ├── nation: "bastok"
    │   ├── title: "Burden of Suspicion"
    │   ├── nodes: [] (walkthrough steps)
    │   └── metadata: { rewards: [] }
    │
    ├── [1] sandoria
    │   ├── nation: "sandoria"
    │   ├── title: "Wrath of the Griffon"
    │   ├── nodes: []
    │   └── metadata: { rewards: [] }
    │
    └── [2] windurst
        ├── nation: "windurst"
        ├── title: "A Manifest Problem"
        ├── nodes: []
        └── metadata: { rewards: [] }
```

## Tracking Pattern

```
Player Completion State
├── Completed Mission IDs: Set<String>
│   └── ["wotg-mission-4", "wotg-mission-5", ...]
│
└── Completed Quest Variants: Set<String>
    └── ["wotg-quest-5-bastok",
         "wotg-quest-5-sandoria",
         "wotg-quest-7-windurst",
         ...]

Quest 5 Status Check:
├── At least 1 variant? → Mission 4 UNLOCKED ✓
└── All 3 variants? → All Trusts collected ✓
```

## Data Flow in iOS App

```
App Launch
│
├─→ Load api-response.json
│   └─→ Decode MissionAPIResponse
│       └─→ missionSets: [MissionSet]
│
├─→ Find WotG mission set
│   └─→ if missionSet.hasQuests == true
│       ├─→ missions: [Mission] (30)
│       └─→ quests: [Quest] (13)
│
├─→ Load user progress
│   ├─→ completedMissions: Set<String>
│   └─→ completedQuestVariants: Set<String>
│
└─→ Display Mission List
    ├─→ Show mission
    ├─→ Check questPrerequisite
    │   └─→ if prereqId exists
    │       ├─→ Find quest by ID
    │       └─→ Check if any variant complete
    │           ├─→ YES → Show "Unlocked" ✓
    │           └─→ NO → Show "Locked" with quest options
    │
    └─→ Show Trust progress
        └─→ quest.completionPercentage(completedVariants)
            ├─→ 0% → Not started
            ├─→ 33% → 1/3 complete
            ├─→ 66% → 2/3 complete
            └─→ 100% → All Trusts collected! 🎉
```

## Key Design Decisions

### Why Separate Arrays?

```
✓ missions + quests arrays (CHOSEN)
  - Missions and quests are both first-class entities
  - Easy to list/filter missions vs quests separately
  - Clear structure for different entity types

✗ Single combined array
  - Would need type discriminator field
  - Harder to get just missions or just quests
  - Less clear structure

✗ Quests nested under missions
  - Doesn't match the actual game structure
  - Quests aren't "owned by" missions
  - Multiple missions can depend on same quest
```

### Why Quest Variants?

```
✓ Quest with variants array (CHOSEN)
  - Groups 3 nation versions as one logical quest
  - Quest ID references work cleanly
  - Completion tracking natural (Set of variant IDs)
  - Reflects actual game structure

✗ 39 separate quest objects
  - Would need complex ID scheme
  - Harder to track "complete all variants"
  - Doesn't reflect logical grouping
```

### Why Quest IDs in Prerequisites?

```
✓ questPrerequisite: "wotg-quest-5" (CHOSEN)
  - Clean ID reference
  - Quest data lives in quests array
  - Easy to find quest by ID
  - No data duplication

✗ Inline nationSpecificQuest object (OLD)
  - Duplicates quest names in mission metadata
  - Quest data split across missions + quests
  - Harder to update quest information
```

---

This unified structure supports the unique WotG gameplay where players can complete all 3 nation variants of each quest for complete Trust collection!
