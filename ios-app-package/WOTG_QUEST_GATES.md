# Wings of the Goddess: Unified Quest & Mission Structure

Wings of the Goddess is **the only mission set** that combines both missions and quests in a unified data structure. This is necessary because players can complete all 3 nation variants of each quest to collect all Trust NPCs.

## Overview

- **Total WotG Content**: 54 missions + 13 quest gates (39 quest variants) = 93 entries
- **In This Package**: 30 missions + 13 quests (39 variants) = 69 entries
- **Unique Structure**: Missions and quests are both first-class entities

## Data Structure

Unlike other mission sets that only have a `missions` array, WotG has both `missions` and `quests`:

```json
{
  "id": "wotg",
  "name": "Wings of the Goddess",
  "missions": [...],
  "quests": [...],
  "stats": {
    "totalMissions": 30,
    "totalQuests": 13,
    "totalQuestVariants": 39
  }
}
```

### Quest Structure

Each quest has 3 nation variants that players can complete:

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
      "metadata": {
        "rewards": []
      }
    },
    {
      "nation": "sandoria",
      "title": "Wrath of the Griffon",
      "nodes": [],
      "metadata": {
        "rewards": []
      }
    },
    {
      "nation": "windurst",
      "title": "A Manifest Problem",
      "nodes": [],
      "metadata": {
        "rewards": []
      }
    }
  ]
}
```

### Mission Prerequisites

Missions reference quests by ID in their metadata:

```json
{
  "id": "wotg-the-queen-of-the-dance",
  "number": "4",
  "title": "The Queen of the Dance",
  "metadata": {
    "questPrerequisite": "wotg-quest-5"
  }
}
```

## Why This Structure?

### 1. Players Can Complete All Variants

Unlike the original game design where you choose ONE nation allegiance, in practice:
- Players can switch nations and complete all quest variants
- Completing all variants is required to collect all Trust NPCs
- Each variant provides different rewards and story perspective

### 2. Tracking Requirements

Your iOS app needs to track:
- Which quest variants a character has completed
- Progress toward completing all 3 variants (for Trust collection)
- Whether a mission is unlocked (requires at least 1 variant of prerequisite quest)

## Swift Implementation

### Loading WotG Data

```swift
// Load WotG mission set
let wotg = apiResponse.missionSets.first { $0.id == "wotg" }

// Check if it has quests (only WotG will)
if wotg?.hasQuests == true {
    let missions = wotg!.missions  // 30 missions
    let quests = wotg!.quests!     // 13 quests with 3 variants each
}
```

### Quest Tracking

Track completed quest variants using the format `"{questId}-{nation}"`:

```swift
// Store in UserDefaults or Core Data
var completedQuestVariants: Set<String> = [
    "wotg-quest-5-bastok",
    "wotg-quest-5-sandoria",
    "wotg-quest-5-windurst"  // All 3 complete!
]

// Check if quest is fully complete
let quest5 = wotg?.quests?.first { $0.number == "5" }
let isFullyComplete = quest5?.isFullyComplete(completedVariants: completedQuestVariants)
// true - all 3 variants done

// Get completion percentage
let percentage = quest5?.completionPercentage(completedVariants: completedQuestVariants)
// 1.0 (100%)

// Get remaining nations
let remaining = quest5?.uncompletedNations(completedVariants: completedQuestVariants)
// [] (empty - all done)
```

### Checking Mission Unlock Status

```swift
let mission4 = wotg?.missions.first { $0.number == "4" }

if let prereqId = mission4?.metadata?.questPrerequisite {
    // prereqId = "wotg-quest-5"

    // Check if player has completed at least ONE variant
    let hasCompletedAny = completedQuestVariants.contains {
        $0.hasPrefix(prereqId)
    }

    if hasCompletedAny {
        print("Mission 4 is unlocked!")
    } else {
        print("Complete Quest 5 (any nation) to unlock")
    }
}
```

## SwiftUI Display Examples

### Quest List with Variant Progress

```swift
struct WotGQuestListView: View {
    let quests: [Quest]
    @State var completedVariants: Set<String> = []

    var body: some View {
        List(quests) { quest in
            VStack(alignment: .leading) {
                HStack {
                    Text("Quest \(quest.number)")
                        .font(.headline)

                    Spacer()

                    // Progress indicator
                    let progress = quest.completionPercentage(
                        completedVariants: completedVariants
                    )
                    ProgressView(value: progress)
                        .frame(width: 100)

                    Text("\(Int(progress * 100))%")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Nation variants
                ForEach(quest.variants, id: \.nation) { variant in
                    HStack {
                        Image(systemName: isVariantComplete(quest.id, variant.nation) ?
                            "checkmark.circle.fill" : "circle")
                            .foregroundColor(isVariantComplete(quest.id, variant.nation) ?
                                .green : .gray)

                        Text("\(variant.nation.capitalized): \(variant.title)")
                            .font(.caption)
                    }
                }
            }
        }
    }

    func isVariantComplete(_ questId: String, _ nation: String) -> Bool {
        completedVariants.contains("\(questId)-\(nation)")
    }
}
```

### Mission Detail with Quest Prerequisite

```swift
struct WotGMissionDetailView: View {
    let mission: Mission
    let quests: [Quest]
    @State var completedVariants: Set<String>

    var body: some View {
        VStack(alignment: .leading) {
            Text(mission.title)
                .font(.title)

            // Show prerequisite quest if exists
            if let prereqId = mission.metadata?.questPrerequisite,
               let prerequisiteQuest = quests.first(where: { $0.id == prereqId }) {

                VStack(alignment: .leading, spacing: 8) {
                    // Check if quest is satisfied
                    let isUnlocked = completedVariants.contains {
                        $0.hasPrefix(prereqId)
                    }

                    HStack {
                        Image(systemName: isUnlocked ?
                            "checkmark.shield.fill" : "lock.shield.fill")
                            .foregroundColor(isUnlocked ? .green : .orange)

                        Text(isUnlocked ?
                            "Quest Requirement Met" :
                            "Quest Required: Quest \(prerequisiteQuest.number)")
                            .font(.headline)
                    }

                    if !isUnlocked {
                        Text("Complete any one of these quests to unlock:")
                            .font(.caption)

                        ForEach(prerequisiteQuest.variants, id: \.nation) { variant in
                            Label("\(variant.nation.capitalized): \(variant.title)",
                                  systemImage: "flag.fill")
                                .font(.caption)
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                    }

                    // Show trust collection progress
                    let progress = prerequisiteQuest.completionPercentage(
                        completedVariants: completedVariants
                    )
                    if progress > 0 && progress < 1.0 {
                        HStack {
                            Image(systemName: "person.3.fill")
                            Text("Trust Progress: \(Int(progress * 100))%")
                                .font(.caption)
                            Text("Complete all 3 variants for all Trusts")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
            }

            // Mission nodes...
        }
    }
}
```

## Quest Gate Reference

### Quest 1
- **Bastok**: Burden of Suspicion
- **San d'Oria**: Wrath of the Griffon
- **Windurst**: A Manifest Problem

### Quest 2
- **Bastok**: The Fighting Fourth
- **San d'Oria**: Claws of the Griffon
- **Windurst**: Resolve

### Quest 3
- **Bastok**: Fires of Discontent
- **San d'Oria**: Griffon's Grounding
- **Windurst**: Auld Lang Syne

### Quest 4
- **Bastok**: The Price of Valor
- **San d'Oria**: The Shadow Rises
- **Windurst**: The Queen of the Dance

### Quest 5 (Required for Mission 4)
- **Bastok**: Burden of Suspicion
- **San d'Oria**: Wrath of the Griffon
- **Windurst**: A Manifest Problem

### Quest 6
- **Bastok**: The Unfinished Waltz
- **San d'Oria**: Daughter of a Knight
- **Windurst**: A Timeswept Butterfly

### Quest 7 (Required for Mission 8)
- **Bastok**: Corrosive Shears
- **San d'Oria**: The Crimson Trial
- **Windurst**: Maiden of the Dusk

### Quest 8
- **Bastok**: The Lion Roars
- **San d'Oria**: Knight's March
- **Windurst**: A Geyser of Hope

### Quest 9
- **Bastok**: Engraved Hearts
- **San d'Oria**: Bonds of Mythril
- **Windurst**: Blossom Leaves

### Quest 10 (Same for all nations)
- **All**: The Darkest Day

### Quest 11 (Required for Mission 26)
- **Bastok**: Music of the March
- **San d'Oria**: The Blood of Heroes
- **Windurst**: Child of Woe

### Quest 12 (Same for all nations)
- **All**: Crossroads of Time

### Quest 13 (Same for all nations)
- **All**: The Savior's Bond

## Important Notes

1. **Only WotG** has this unified structure - other mission sets only have `missions` array
2. **Node data**: Quest variants currently have empty `nodes` arrays - walkthrough steps will be added if quest pages are scraped
3. **Trust collection**: Completing all 3 variants of certain quests unlocks nation-specific Trust NPCs
4. **Partial completion**: Players need at least 1 variant complete to unlock missions, but should complete all 3 for Trusts
5. **Mission count**: This package has 30/54 missions - some missions weren't available in the scrape source

## See Also

- [Models.swift](Models.swift) - Swift type definitions with Quest and QuestVariant structs
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Full integration guide
- [README.md](README.md) - Overview and stats

---

**Key Takeaway**: WotG is the only mission set where you need to track both missions AND quests, with support for multiple completions of the same quest (different nation variants).
