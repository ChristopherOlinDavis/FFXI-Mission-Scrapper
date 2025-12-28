/**
 * Demo scraper for Bastok Rank Missions with realistic sample data
 * This demonstrates what the fully-scraped data would look like
 */
export async function scrapeBastokRankMissionsDemo() {
  console.log('Generating demo data for Bastok Rank Missions...');

  const now = new Date().toISOString();

  return {
    id: 'bastok-rank-demo',
    name: 'Bastok Rank Missions (Demo)',
    category: 'nation',
    sourceUrl: 'https://ffxiclopedia.fandom.com/wiki/Category:Bastok_Missions',
    lastScraped: now,
    lastKnownUpdate: '2024-03-15T00:00:00Z',
    missions: [
      {
        id: 'bastok-rank-1-1',
        title: 'The Zeruhn Report',
        nodes: [
          {
            id: 'bastok-rank-1-1-node-1',
            orderIndex: 0,
            title: 'Speak to Guard',
            description: 'Talk to the guard in Bastok Mines at (H-9) to receive the mission.',
            dependencies: []
          },
          {
            id: 'bastok-rank-1-1-node-2',
            orderIndex: 1,
            title: 'Enter Zeruhn Mines',
            description: 'Enter Zeruhn Mines from Bastok Mines and proceed to the ??? point.',
            dependencies: ['bastok-rank-1-1-node-1']
          },
          {
            id: 'bastok-rank-1-1-node-3',
            orderIndex: 2,
            title: 'Examine the ???',
            description: 'Examine the ??? to spawn a Ding Bats. Defeat it to obtain the Zeruhn Report.',
            dependencies: ['bastok-rank-1-1-node-2']
          },
          {
            id: 'bastok-rank-1-1-node-4',
            orderIndex: 3,
            title: 'Return to Guard',
            description: 'Return to the guard in Bastok Mines and trade the Zeruhn Report to complete the mission.',
            dependencies: ['bastok-rank-1-1-node-3']
          }
        ],
        gates: []
      },
      {
        id: 'bastok-rank-1-2',
        title: 'The Emissary',
        nodes: [
          {
            id: 'bastok-rank-1-2-node-1',
            orderIndex: 0,
            title: 'Speak to Ambassador',
            description: 'Speak to the Bastok Ambassador in Bastok Mines (K-7) to receive the mission.',
            dependencies: []
          },
          {
            id: 'bastok-rank-1-2-node-2',
            orderIndex: 1,
            title: 'Travel to San d\'Oria',
            description: 'Travel to Southern San d\'Oria and find the embassy.',
            dependencies: ['bastok-rank-1-2-node-1']
          },
          {
            id: 'bastok-rank-1-2-node-3',
            orderIndex: 2,
            title: 'Speak to Emissary',
            description: 'Speak to the Bastok Emissary at (L-6) to receive a letter.',
            dependencies: ['bastok-rank-1-2-node-2']
          },
          {
            id: 'bastok-rank-1-2-node-4',
            orderIndex: 3,
            title: 'Return to Ambassador',
            description: 'Return to the Bastok Ambassador and deliver the letter to complete the mission.',
            dependencies: ['bastok-rank-1-2-node-3']
          }
        ],
        gates: [
          {
            id: 'bastok-rank-1-2-gate-1',
            type: 'mission',
            afterNodeId: 'bastok-rank-1-2-node-1',
            requirement: 'Complete Mission 1-1',
            description: 'Must have completed "The Zeruhn Report" mission'
          }
        ]
      },
      {
        id: 'bastok-rank-1-3',
        title: 'The President\'s Gatekeepers',
        nodes: [
          {
            id: 'bastok-rank-1-3-node-1',
            orderIndex: 0,
            title: 'Speak to President\'s Aide',
            description: 'Speak to Gumbah in the Metalworks at (J-8) to receive the mission.',
            dependencies: []
          },
          {
            id: 'bastok-rank-1-3-node-2',
            orderIndex: 1,
            title: 'Find First Gatekeeper',
            description: 'Locate and speak to Parraggoh in Port Bastok at (G-7).',
            dependencies: ['bastok-rank-1-3-node-1']
          },
          {
            id: 'bastok-rank-1-3-node-3',
            orderIndex: 2,
            title: 'Find Second Gatekeeper',
            description: 'Locate and speak to Gwill in Bastok Mines at (I-7).',
            dependencies: ['bastok-rank-1-3-node-2']
          },
          {
            id: 'bastok-rank-1-3-node-4',
            orderIndex: 3,
            title: 'Find Third Gatekeeper',
            description: 'Locate and speak to Elki in Bastok Markets at (G-9).',
            dependencies: ['bastok-rank-1-3-node-3']
          },
          {
            id: 'bastok-rank-1-3-node-5',
            orderIndex: 4,
            title: 'Return to Aide',
            description: 'Return to Gumbah in the Metalworks to complete the mission and earn promotion to Rank 2.',
            dependencies: ['bastok-rank-1-3-node-4']
          }
        ],
        gates: [
          {
            id: 'bastok-rank-1-3-gate-1',
            type: 'mission',
            afterNodeId: 'bastok-rank-1-3-node-1',
            requirement: 'Complete Mission 1-2',
            description: 'Must have completed "The Emissary" mission'
          }
        ]
      },
      {
        id: 'bastok-rank-2-1',
        title: 'The Emissary (Windurst)',
        nodes: [
          {
            id: 'bastok-rank-2-1-node-1',
            orderIndex: 0,
            title: 'Accept Mission',
            description: 'Speak to Gumbah in Metalworks to accept the mission.',
            dependencies: []
          },
          {
            id: 'bastok-rank-2-1-node-2',
            orderIndex: 1,
            title: 'Travel to Windurst',
            description: 'Travel to Windurst Woods and locate the Bastok consulate.',
            dependencies: ['bastok-rank-2-1-node-1']
          },
          {
            id: 'bastok-rank-2-1-node-3',
            orderIndex: 2,
            title: 'Speak to Consul',
            description: 'Speak to the Bastok Consul at Windurst Woods (K-12) to receive documents.',
            dependencies: ['bastok-rank-2-1-node-2']
          },
          {
            id: 'bastok-rank-2-1-node-4',
            orderIndex: 3,
            title: 'Return to Bastok',
            description: 'Return to Gumbah in Metalworks and deliver the documents.',
            dependencies: ['bastok-rank-2-1-node-3']
          }
        ],
        gates: [
          {
            id: 'bastok-rank-2-1-gate-rank',
            type: 'mission',
            afterNodeId: 'bastok-rank-2-1-node-1',
            requirement: 'Rank 2',
            description: 'Must be Rank 2 or higher in Bastok'
          },
          {
            id: 'bastok-rank-2-1-gate-level',
            type: 'level',
            afterNodeId: 'bastok-rank-2-1-node-1',
            requirement: 'Level 15+',
            description: 'Must be level 15 or higher'
          }
        ]
      }
    ]
  };
}
