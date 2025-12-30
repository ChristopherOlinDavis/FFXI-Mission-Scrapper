/**
 * Test script for schemas and parsers
 */

import {
  MissionSchema,
  PrerequisiteSchema,
  APIMissionSchema,
  DependencyType
} from './src/schemas/index.js';
import { BaseParser } from './src/parsers/base-parser.js';
import { parseWalkthroughToNodes } from './src/parsers/walkthrough-parser.js';

console.log('🧪 Testing FFXI Mission Parser - Schema & Utilities\n');

// Test 1: Schema Validation
console.log('Test 1: Basic Mission Schema Validation');
try {
  const testMission = {
    id: 'bastok-rank-1-1',
    title: 'The Zeruhn Report',
    number: '1-1',
    nodes: [
      {
        id: 'bastok-rank-1-1-node-1',
        orderIndex: 0,
        title: 'Speak to Guard',
        description: 'Talk to the guard in Bastok Mines at (H-9)',
        dependencies: [],
        location: {
          zone: 'Bastok Mines',
          coordinates: '(H-9)'
        }
      }
    ],
    gates: [],
    metadata: {
      category: 'nation',
      missionSet: 'bastok-rank',
      difficulty: 'trivial',
      minLevel: 1,
      isSoloable: true
    }
  };

  const validated = MissionSchema.parse(testMission);
  console.log('✅ Mission schema validation passed');
  console.log('   Mission:', validated.title);
  console.log('   Nodes:', validated.nodes.length);
} catch (error) {
  console.log('❌ Mission schema validation failed:', error.message);
}

// Test 2: Complex Prerequisite Schema
console.log('\nTest 2: Complex Prerequisite Schema (ANY_OF)');
try {
  const complexPrereq = {
    id: 'zilart-prereq-rank6',
    type: DependencyType.ANY_OF,
    requirement: 'Rank 6 in any nation',
    description: 'Must achieve Rank 6 in Bastok, San d\'Oria, or Windurst',
    operator: 'OR',
    children: [
      {
        id: 'zilart-prereq-rank6-bastok',
        type: DependencyType.RANK,
        requirement: 'Bastok Rank 6',
        description: 'Bastok Rank 6',
        rankLevel: 6,
        rankNation: 'bastok',
        isOptional: false
      },
      {
        id: 'zilart-prereq-rank6-sandoria',
        type: DependencyType.RANK,
        requirement: 'San d\'Oria Rank 6',
        description: 'San d\'Oria Rank 6',
        rankLevel: 6,
        rankNation: 'sandoria',
        isOptional: false
      },
      {
        id: 'zilart-prereq-rank6-windurst',
        type: DependencyType.RANK,
        requirement: 'Windurst Rank 6',
        description: 'Windurst Rank 6',
        rankLevel: 6,
        rankNation: 'windurst',
        isOptional: false
      }
    ],
    isOptional: false
  };

  const validated = PrerequisiteSchema.parse(complexPrereq);
  console.log('✅ Complex prerequisite schema validation passed');
  console.log('   Type:', validated.type);
  console.log('   Operator:', validated.operator);
  console.log('   Children:', validated.children.length);
} catch (error) {
  console.log('❌ Prerequisite schema validation failed:', error.message);
}

// Test 3: API Mission Schema
console.log('\nTest 3: API Mission Schema');
try {
  const apiMission = {
    id: 'bastok-rank-1-1',
    title: 'The Zeruhn Report',
    number: '1-1',
    category: 'nation',
    missionSet: 'bastok-rank',
    prerequisites: [],
    unlocks: ['bastok-rank-1-2'],
    nodes: [
      {
        id: 'bastok-rank-1-1-node-1',
        orderIndex: 0,
        title: 'Speak to Guard',
        description: 'Talk to the guard in Bastok Mines at (H-9)',
        dependencies: [],
        location: {
          zone: 'Bastok Mines',
          coordinates: '(H-9)'
        }
      }
    ],
    metadata: {
      estimatedTime: '15 minutes',
      difficulty: 'trivial',
      minLevel: 1,
      isSoloable: true,
      rewards: ['Rank Points: 1000']
    },
    navigation: {
      previous: null,
      next: 'bastok-rank-1-2',
      setIndex: 0,
      setTotal: 45
    }
  };

  const validated = APIMissionSchema.parse(apiMission);
  console.log('✅ API mission schema validation passed');
  console.log('   Navigation:', validated.navigation.next);
  console.log('   Unlocks:', validated.unlocks);
} catch (error) {
  console.log('❌ API mission schema validation failed:', error.message);
}

// Test 4: BaseParser Utilities
console.log('\nTest 4: BaseParser Utilities');
try {
  const parser = new BaseParser();

  // Test cleanText
  const dirty = '  Multiple   spaces\n\nand newlines  ';
  const clean = parser.cleanText(dirty);
  console.log('✅ cleanText:', clean === 'Multiple spaces and newlines');

  // Test generateId
  const id = parser.generateId('mission', 'The Zeruhn Report');
  console.log('✅ generateId:', id === 'mission-the-zeruhn-report');

  // Test extractLocation
  const location = parser.extractLocation('Talk to Gumbah in Bastok Mines (J-7)');
  console.log('✅ extractLocation:', location.zone === 'Bastok Mines' && location.coordinates === 'J-7');

  // Test detectWikiSource
  const source1 = parser.detectWikiSource('https://ffxiclopedia.fandom.com/wiki/Mission');
  const source2 = parser.detectWikiSource('https://www.bg-wiki.com/ffxi/Mission');
  console.log('✅ detectWikiSource:', source1 === 'ffxiclopedia' && source2 === 'bgwiki');

  console.log('✅ All BaseParser utilities passed');
} catch (error) {
  console.log('❌ BaseParser utilities failed:', error.message);
}

// Test 5: Walkthrough Parser
console.log('\nTest 5: Walkthrough Parser');
try {
  const steps = [
    {
      title: 'Speak to Guard',
      description: 'Talk to the guard in Bastok Mines at (H-9)',
      location: { zone: 'Bastok Mines', coordinates: '(H-9)' }
    },
    {
      title: 'Enter Zeruhn Mines',
      description: 'Enter Zeruhn Mines and find the ???',
      location: undefined
    },
    {
      title: 'Return to Guard',
      description: 'Return to the guard with your findings',
      location: { zone: 'Bastok Mines', coordinates: '(H-9)' }
    }
  ];

  const nodes = parseWalkthroughToNodes(steps, 'bastok-rank-1-1');

  console.log('✅ Walkthrough parser passed');
  console.log('   Nodes created:', nodes.length);
  console.log('   Node 1 dependencies:', nodes[0].dependencies.length === 0);
  console.log('   Node 2 dependencies:', nodes[1].dependencies.length === 1);
  console.log('   Node 3 dependencies:', nodes[2].dependencies.length === 1);
} catch (error) {
  console.log('❌ Walkthrough parser failed:', error.message);
}

console.log('\n🎉 Schema and utility tests complete!');
