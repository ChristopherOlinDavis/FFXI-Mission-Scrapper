# Example Output

This document shows example output from the FFXI Mission Scraper.

## Sample Mission Set: Bastok Rank 1-1 (The Zeruhn Report)

```json
{
  "id": "bastok-rank-1-1",
  "title": "The Zeruhn Report",
  "nodes": [
    {
      "id": "bastok-rank-1-1-node-1",
      "orderIndex": 0,
      "title": "Speak to Guard",
      "description": "Talk to the guard in Bastok Mines at (H-9) to receive the mission.",
      "dependencies": []
    },
    {
      "id": "bastok-rank-1-1-node-2",
      "orderIndex": 1,
      "title": "Enter Zeruhn Mines",
      "description": "Enter Zeruhn Mines from Bastok Mines and proceed to the ??? point.",
      "dependencies": ["bastok-rank-1-1-node-1"]
    },
    {
      "id": "bastok-rank-1-1-node-3",
      "orderIndex": 2,
      "title": "Examine the ???",
      "description": "Examine the ??? to spawn a Ding Bats. Defeat it to obtain the Zeruhn Report.",
      "dependencies": ["bastok-rank-1-1-node-2"]
    },
    {
      "id": "bastok-rank-1-1-node-4",
      "orderIndex": 3,
      "title": "Return to Guard",
      "description": "Return to the guard in Bastok Mines and trade the Zeruhn Report to complete the mission.",
      "dependencies": ["bastok-rank-1-1-node-3"]
    }
  ],
  "gates": []
}
```

## Sample Mission with Gates: Bastok Rank 1-2 (The Emissary)

```json
{
  "id": "bastok-rank-1-2",
  "title": "The Emissary",
  "nodes": [
    {
      "id": "bastok-rank-1-2-node-1",
      "orderIndex": 0,
      "title": "Speak to Ambassador",
      "description": "Speak to the Bastok Ambassador in Bastok Mines (K-7) to receive the mission.",
      "dependencies": []
    },
    {
      "id": "bastok-rank-1-2-node-2",
      "orderIndex": 1,
      "title": "Travel to San d'Oria",
      "description": "Travel to Southern San d'Oria and find the embassy.",
      "dependencies": ["bastok-rank-1-2-node-1"]
    },
    {
      "id": "bastok-rank-1-2-node-3",
      "orderIndex": 2,
      "title": "Speak to Emissary",
      "description": "Speak to the Bastok Emissary at (L-6) to receive a letter.",
      "dependencies": ["bastok-rank-1-2-node-2"]
    },
    {
      "id": "bastok-rank-1-2-node-4",
      "orderIndex": 3,
      "title": "Return to Ambassador",
      "description": "Return to the Bastok Ambassador and deliver the letter to complete the mission.",
      "dependencies": ["bastok-rank-1-2-node-3"]
    }
  ],
  "gates": [
    {
      "id": "bastok-rank-1-2-gate-1",
      "type": "mission",
      "afterNodeId": "bastok-rank-1-2-node-1",
      "requirement": "Complete Mission 1-1",
      "description": "Must have completed 'The Zeruhn Report' mission"
    }
  ]
}
```

## Understanding the Data Structure

### Node Dependencies

Each node has a `dependencies` array that references the IDs of nodes that must be completed first. For example:

- Node 1 has no dependencies (it's the starting node)
- Node 2 depends on Node 1
- Node 3 depends on Node 2
- Node 4 depends on Node 3

This creates a linear chain: 1 → 2 → 3 → 4

### Gates

Gates represent blockers that apply to an entire mission or mission set. They specify:

- `type`: The kind of requirement (mission, level, item, etc.)
- `afterNodeId`: Which node this gate applies after
- `requirement`: Short description of the requirement
- `description`: Detailed explanation

### For iOS App

The iOS app can use this data to:

1. Build a node graph visualization (tech tree style)
2. Show dependencies between nodes
3. Display gates as blockers
4. Track user progress through missions
5. Unlock nodes as dependencies are completed

## Visual Representation

The Zeruhn Report mission would look like this in a graph:

```
[Speak to Guard] → [Enter Zeruhn Mines] → [Examine ???] → [Return to Guard]
```

With gates, The Emissary mission would look like:

```
                    ┌──────────────────────┐
                    │ Gate: Complete 1-1   │
                    └──────────┬───────────┘
                               ↓
[Speak to Ambassador] → [Travel to San d'Oria] → [Speak to Emissary] → [Return]
```

## Output Files

After running the scraper, you'll find these files in the `output/` directory:

- `bastok-rank.json` - All Bastok rank missions
- `bastok-rank-demo.json` - Demo data with realistic content
- `sandoria-rank.json` - All San d'Oria rank missions
- `all-missions.json` - Combined file with all mission sets
- `scrape-metadata.json` - Tracking and metadata

## Testing the Demo

To see the full, realistic output:

```bash
node src/index.js scrape --set bastok-rank-demo
cat output/bastok-rank-demo.json | head -100
```
