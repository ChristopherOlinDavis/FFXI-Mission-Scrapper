/**
 * Extract Complete WotG Table Data
 * Parses the full WotG mission/quest table from BGWiki
 */

// Complete WotG data from the table
const wotgData = {
  missions: [
    { number: "1", title: "Cavernous Maws", type: "Cutscene" },
    { number: "2", title: "Back to the Beginning", type: "Quest" },
    { number: "3", title: "Cait Sith", type: "Cutscene" },
    { number: "4", title: "The Queen of the Dance", type: "Cutscene" },
    { number: "5", title: "While the Cat is Away", type: "Cutscene" },
    { number: "6", title: "A Timeswept Butterfly", type: "Cutscene" },
    { number: "7", title: "Purple, The New Black", type: "Battlefield" },
    { number: "8", title: "In the Name of the Father", type: "Cutscene" },
    { number: "9", title: "Dancers in Distress", type: "Quest" },
    { number: "10", title: "Daughter of a Knight", type: "Fight" },
    { number: "11", title: "A Spoonful of Sugar", type: "Cutscene" },
    { number: "12", title: "Affairs of State", type: "Cutscene" },
    { number: "13", title: "Borne by the Wind", type: "Cutscene" },
    { number: "14", title: "A Nation on the Brink", type: "Battlefield" },
    { number: "15", title: "Crossroads of Time", type: "Cutscene" },
    { number: "16", title: "Sandswept Memories", type: "Cutscene" },
    { number: "17", title: "Northland Exposure", type: "Cutscene" },
    { number: "18", title: "Traitor in the Midst", type: "Quest" },
    { number: "19", title: "Betrayal at Beaucedine", type: "Fight" },
    { number: "20", title: "On Thin Ice", type: "Cutscene" },
    { number: "21", title: "Proof of Valor", type: "Quest" },
    { number: "22", title: "A Sanguinary Prelude", type: "Cutscene" },
    { number: "23", title: "Dungeons and Dancers", type: "Battlefield" },
    { number: "24", title: "Distorter of Time", type: "Battlefield" },
    { number: "25", title: "The Will of the World", type: "Cutscene" },
    { number: "26", title: "Fate in Haze", type: "Cutscene" },
    { number: "27", title: "The Scent of Battle", type: "Cutscene" },
    { number: "28", title: "Another World", type: "Cutscene" },
    { number: "29", title: "A Hawk in Repose", type: "Quest" },
    { number: "30", title: "The Battle of Xarcabard", type: "Cutscene" },
    { number: "31", title: "Prelude to a Storm", type: "Battlefield" },
    { number: "32", title: "Storm's Crescendo", type: "Battlefield" },
    { number: "33", title: "Into the Beast's Maw", type: "Battlefield" },
    { number: "34", title: "The Hunter Ensnared", type: "Cutscene" },
    { number: "35", title: "Flight of the Lion", type: "Cutscene" },
    { number: "36", title: "Fall of the Hawk", type: "Cutscene" },
    { number: "37", title: "Darkness Descends", type: "Battlefield" },
    { number: "38", title: "Adieu, Lilisette", type: "Cutscene" },
    { number: "39", title: "By the Fading Light", type: "Cutscene" },
    { number: "40", title: "Edge of Existence", type: "Cutscene" },
    { number: "41", title: "Her Memories", type: "Quest" },
    { number: "42", title: "Forget Me Not", type: "Cutscene" },
    { number: "43", title: "Pillar of Hope", type: "Cutscene" },
    { number: "44", title: "Glimmer of Life", type: "Cutscene" },
    { number: "45", title: "Time Slips Away", type: "Quest" },
    { number: "46", title: "When Wills Collide", type: "Battlefield" },
    { number: "47", title: "Whispers of Dawn", type: "Cutscene" },
    { number: "48", title: "A Dreamy Interlude", type: "Cutscene" },
    { number: "49", title: "Cait in the Woods", type: "Cutscene" },
    { number: "50", title: "Fork in the Road", type: "Quest" },
    { number: "51", title: "Maiden of the Dusk", type: "Battlefield" },
    { number: "52", title: "Where It All Began", type: "Cutscene" },
    { number: "53", title: "A Token of Troth", type: "Cutscene" },
    { number: "54", title: "Lest We Forget", type: "Cutscene" }
  ],
  quests: [
    {
      number: "1",
      bastok: { title: "The Fighting Fourth", type: "Quest" },
      sandoria: { title: "Steamed Rams", type: "Quest" },
      windurst: { title: "Snake on the Plains", type: "Quest" }
    },
    {
      number: "2",
      bastok: { title: "Better Part of Valor", type: "Quest" },
      sandoria: { title: "Gifts of the Griffon", type: "Quest" },
      windurst: { title: "The Tigress Stirs", type: "Quest" }
    },
    {
      number: "3",
      bastok: { title: "Fires of Discontent", type: "Quest" },
      sandoria: { title: "Claws of the Griffon", type: "Fight" },
      windurst: { title: "The Tigress Strikes", type: "Fight" }
    },
    {
      number: "4",
      bastok: { title: "Light in the Darkness", type: "Battlefield" },
      sandoria: { title: "Boy and the Beast", type: "Quest" },
      windurst: { title: "Knot Quite There", type: "Quest" }
    },
    {
      number: "5",
      bastok: { title: "Burden of Suspicion", type: "Quest" },
      sandoria: { title: "Wrath of the Griffon", type: "Fight" },
      windurst: { title: "A Manifest Problem", type: "Battlefield" }
    },
    {
      number: "6",
      bastok: { title: "Storm on the Horizon", type: "Quest" },
      sandoria: { title: "Perils of the Griffon", type: "Quest" },
      windurst: { title: "When One Man Is Not Enough", type: "Quest" }
    },
    {
      number: "7",
      bastok: { title: "Fire in the Hole", type: "Battlefield" },
      sandoria: { title: "In a Haze of Glory", type: "Battlefield" },
      windurst: { title: "A Feast for Gnats", type: "Battlefield" }
    },
    {
      number: "8",
      bastok: { title: "Quelling the Storm", type: "Quest" },
      sandoria: { title: "The Price of Valor", type: "Fight" },
      windurst: { title: "The Long March North", type: "Fight" }
    },
    {
      number: "9",
      bastok: { title: "Honor Under Fire", type: "Battlefield" },
      sandoria: { title: "Bonds That Never Die", type: "Battlefield" },
      windurst: { title: "The Forbidden Path", type: "Quest" }
    },
    {
      number: "10",
      bastok: { title: "Beneath the Mask", type: "Quest" },
      sandoria: { title: "Songbirds in a Snowstorm", type: "Fight" },
      windurst: { title: "Sins of the Mothers", type: "Battlefield" }
    },
    {
      number: "11",
      bastok: { title: "What Price Loyalty", type: "Battlefield" },
      sandoria: { title: "Blood of Heroes", type: "Battlefield" },
      windurst: { title: "Howl from the Heavens", type: "Fight" }
    },
    {
      number: "12",
      bastok: { title: "The Truth Lies Hid", type: "Quest" },
      sandoria: { title: "Chasing Shadows", type: "Fight" },
      windurst: { title: "Manifest Destiny", type: "Battlefield" }
    },
    {
      number: "13",
      bastok: { title: "Bonds of Mythril", type: "Battlefield" },
      sandoria: { title: "Face of the Future", type: "Battlefield" },
      windurst: { title: "At Journey's End", type: "Battlefield" }
    }
  ]
};

console.log(JSON.stringify(wotgData, null, 2));
