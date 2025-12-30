/**
 * Generate WotG Quest Data
 * Creates quest objects from the quest gate table data
 */

// Quest gate data extracted from WotG mission table
const questGateData = [
  {
    number: "1",
    bastok: { title: "Burden of Suspicion", rewards: null },
    sandoria: { title: "Wrath of the Griffon", rewards: null },
    windurst: { title: "A Manifest Problem", rewards: null }
  },
  {
    number: "2",
    bastok: { title: "The Fighting Fourth", rewards: null },
    sandoria: { title: "Claws of the Griffon", rewards: null },
    windurst: { title: "Resolve", rewards: null }
  },
  {
    number: "3",
    bastok: { title: "Fires of Discontent", rewards: null },
    sandoria: { title: "Griffon's Grounding", rewards: null },
    windurst: { title: "Auld Lang Syne", rewards: null }
  },
  {
    number: "4",
    bastok: { title: "The Price of Valor", rewards: null },
    sandoria: { title: "The Shadow Rises", rewards: null },
    windurst: { title: "The Queen of the Dance", rewards: null }
  },
  {
    number: "5",
    bastok: { title: "Burden of Suspicion", rewards: null },
    sandoria: { title: "Wrath of the Griffon", rewards: null },
    windurst: { title: "A Manifest Problem", rewards: null }
  },
  {
    number: "6",
    bastok: { title: "The Unfinished Waltz", rewards: null },
    sandoria: { title: "Daughter of a Knight", rewards: null },
    windurst: { title: "A Timeswept Butterfly", rewards: null }
  },
  {
    number: "7",
    bastok: { title: "Corrosive Shears", rewards: null },
    sandoria: { title: "The Crimson Trial", rewards: null },
    windurst: { title: "Maiden of the Dusk", rewards: null }
  },
  {
    number: "8",
    bastok: { title: "The Lion Roars", rewards: null },
    sandoria: { title: "Knight's March", rewards: null },
    windurst: { title: "A Geyser of Hope", rewards: null }
  },
  {
    number: "9",
    bastok: { title: "Engraved Hearts", rewards: null },
    sandoria: { title: "Bonds of Mythril", rewards: null },
    windurst: { title: "Blossom Leaves", rewards: null }
  },
  {
    number: "10",
    bastok: { title: "The Darkest Day", rewards: null },
    sandoria: { title: "The Darkest Day", rewards: null },
    windurst: { title: "The Darkest Day", rewards: null }
  },
  {
    number: "11",
    bastok: { title: "Music of the March", rewards: null },
    sandoria: { title: "The Blood of Heroes", rewards: null },
    windurst: { title: "Child of Woe", rewards: null }
  },
  {
    number: "12",
    bastok: { title: "Crossroads of Time", rewards: null },
    sandoria: { title: "Crossroads of Time", rewards: null },
    windurst: { title: "Crossroads of Time", rewards: null }
  },
  {
    number: "13",
    bastok: { title: "The Savior's Bond", rewards: null },
    sandoria: { title: "The Savior's Bond", rewards: null },
    windurst: { title: "The Savior's Bond", rewards: null }
  }
];

/**
 * Generate quest objects with variant structure
 */
function generateQuestObjects() {
  return questGateData.map(gate => ({
    id: `wotg-quest-${gate.number}`,
    number: gate.number,
    title: `Quest ${gate.number}`,
    type: "quest",
    variants: [
      {
        nation: "bastok",
        title: gate.bastok.title,
        nodes: [],
        metadata: {
          category: "expansion",
          missionSet: "wotg",
          rewards: gate.bastok.rewards ? [gate.bastok.rewards] : []
        }
      },
      {
        nation: "sandoria",
        title: gate.sandoria.title,
        nodes: [],
        metadata: {
          category: "expansion",
          missionSet: "wotg",
          rewards: gate.sandoria.rewards ? [gate.sandoria.rewards] : []
        }
      },
      {
        nation: "windurst",
        title: gate.windurst.title,
        nodes: [],
        metadata: {
          category: "expansion",
          missionSet: "wotg",
          rewards: gate.windurst.rewards ? [gate.windurst.rewards] : []
        }
      }
    ]
  }));
}

// Generate and output
const quests = generateQuestObjects();
console.log(JSON.stringify(quests, null, 2));
