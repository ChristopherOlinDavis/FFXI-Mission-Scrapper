/**
 * Metadata Enricher
 * Adds computed fields and enriched metadata to parsed missions
 */

/**
 * Enrich mission with computed metadata
 * @param {Object} mission - Parsed mission object
 * @param {Array} allMissions - All missions in the set (for context)
 * @param {Array} edges - Dependency edges
 * @returns {Object} Enriched mission
 */
export function enrichMission(mission, allMissions = [], edges = []) {
  const enriched = { ...mission };

  // Add completion metrics
  enriched.metadata = {
    ...enriched.metadata,
    ...calculateCompletionMetrics(mission, allMissions, edges),
    ...inferDifficulty(mission),
    ...calculateRewards(mission),
    ...extractKeywords(mission),
    searchableText: buildSearchableText(mission)
  };

  return enriched;
}

/**
 * Calculate completion-related metrics
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Object} Completion metrics
 */
function calculateCompletionMetrics(mission, allMissions, edges) {
  // Count how many missions must be completed before this one
  const prerequisiteChain = getPrerequisiteChain(mission.id, allMissions, edges);

  // Count how many missions this unlocks (directly and indirectly)
  const unlockChain = getUnlockChain(mission.id, allMissions, edges);

  // Calculate progress percentage within set
  const missionIndex = allMissions.findIndex(m => m.id === mission.id);
  const progressPercentage = allMissions.length > 0
    ? Math.round(((missionIndex + 1) / allMissions.length) * 100)
    : 0;

  return {
    prerequisiteChainLength: prerequisiteChain.length,
    unlockChainLength: unlockChain.length,
    isOptional: isOptionalMission(mission, edges),
    isBottleneck: isBottleneck(mission.id, edges),
    progressPercentage,
    estimatedCompletionOrder: missionIndex + 1
  };
}

/**
 * Get all missions that must be completed before this one (recursive)
 * @param {string} missionId - Mission ID
 * @param {Array} missions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Array of prerequisite mission IDs
 */
function getPrerequisiteChain(missionId, missions, edges) {
  const visited = new Set();
  const chain = [];

  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    const prereqs = edges.filter(e => e.to === id && e.type === 'mission');
    for (const edge of prereqs) {
      chain.push(edge.from);
      traverse(edge.from);
    }
  }

  traverse(missionId);
  return [...new Set(chain)]; // Remove duplicates
}

/**
 * Get all missions unlocked by this one (recursive)
 * @param {string} missionId - Mission ID
 * @param {Array} missions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Array of unlocked mission IDs
 */
function getUnlockChain(missionId, missions, edges) {
  const visited = new Set();
  const chain = [];

  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    const unlocks = edges.filter(e => e.from === id && e.type === 'mission');
    for (const edge of unlocks) {
      chain.push(edge.to);
      traverse(edge.to);
    }
  }

  traverse(missionId);
  return [...new Set(chain)]; // Remove duplicates
}

/**
 * Check if mission is optional (not required for any other mission)
 * @param {Object} mission - Mission object
 * @param {Array} edges - Dependency edges
 * @returns {boolean} True if optional
 */
function isOptionalMission(mission, edges) {
  // Mission is optional if it has no outgoing edges to other missions
  const unlocks = edges.filter(e => e.from === mission.id && e.type === 'mission');
  return unlocks.length === 0;
}

/**
 * Check if mission is a bottleneck (required by multiple missions)
 * @param {string} missionId - Mission ID
 * @param {Array} edges - Dependency edges
 * @returns {boolean} True if bottleneck
 */
function isBottleneck(missionId, edges) {
  const unlocks = edges.filter(e => e.from === missionId && e.type === 'mission');
  return unlocks.length >= 2;
}

/**
 * Infer difficulty if not explicitly set
 * @param {Object} mission - Mission object
 * @returns {Object} Difficulty metadata
 */
function inferDifficulty(mission) {
  if (mission.metadata?.difficulty) {
    return { difficulty: mission.metadata.difficulty };
  }

  // Infer from various factors
  const level = mission.metadata?.minLevel || 0;
  const nodeCount = mission.nodes?.length || 0;
  const hasTimeLimit = mission.metadata?.hasTimeLimit || false;

  let difficulty = 'trivial';

  if (level >= 75 || nodeCount > 15 || hasTimeLimit) {
    difficulty = 'difficult';
  } else if (level >= 50 || nodeCount > 8) {
    difficulty = 'moderate';
  } else if (level >= 20 || nodeCount > 4) {
    difficulty = 'easy';
  }

  return {
    difficulty,
    difficultyInferred: true
  };
}

/**
 * Calculate and format rewards information
 * @param {Object} mission - Mission object
 * @returns {Object} Rewards metadata
 */
function calculateRewards(mission) {
  const rewards = mission.metadata?.rewards || [];

  // Parse reward types
  const rewardTypes = {
    gil: [],
    items: [],
    keyItems: [],
    titleRewards: [],
    rankPoints: [],
    other: []
  };

  rewards.forEach(reward => {
    const rewardStr = reward.toString().toLowerCase();

    if (rewardStr.includes('gil')) {
      rewardTypes.gil.push(reward);
    } else if (rewardStr.includes('key item')) {
      rewardTypes.keyItems.push(reward);
    } else if (rewardStr.includes('title')) {
      rewardTypes.titleRewards.push(reward);
    } else if (rewardStr.includes('rank point')) {
      rewardTypes.rankPoints.push(reward);
    } else if (rewardStr.match(/\d+\s*x\s*/)) {
      rewardTypes.items.push(reward);
    } else {
      rewardTypes.other.push(reward);
    }
  });

  return {
    rewardTypes,
    hasRewards: rewards.length > 0
  };
}

/**
 * Extract searchable keywords from mission
 * @param {Object} mission - Mission object
 * @returns {Object} Keywords metadata
 */
function extractKeywords(mission) {
  const keywords = new Set();

  // Add mission set and category
  if (mission.metadata?.missionSet) {
    keywords.add(mission.metadata.missionSet);
  }
  if (mission.metadata?.category) {
    keywords.add(mission.metadata.category);
  }

  // Extract zone names from nodes
  mission.nodes?.forEach(node => {
    if (node.location?.zone) {
      keywords.add(node.location.zone.toLowerCase());
    }
    if (node.location?.npc) {
      keywords.add(node.location.npc.toLowerCase());
    }
  });

  // Extract NPC names from descriptions
  mission.nodes?.forEach(node => {
    const description = node.description || '';
    // Simple NPC name extraction (capitalized words)
    const npcMatches = description.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    npcMatches.forEach(name => keywords.add(name.toLowerCase()));
  });

  // Add level range
  if (mission.metadata?.minLevel) {
    const level = mission.metadata.minLevel;
    if (level >= 75) keywords.add('high-level');
    else if (level >= 50) keywords.add('mid-level');
    else if (level >= 20) keywords.add('low-level');
    else keywords.add('starter');
  }

  return {
    keywords: Array.from(keywords)
  };
}

/**
 * Build searchable text for full-text search
 * @param {Object} mission - Mission object
 * @returns {string} Searchable text
 */
function buildSearchableText(mission) {
  const parts = [];

  // Title and number
  parts.push(mission.title);
  if (mission.number) parts.push(mission.number);

  // Node descriptions
  mission.nodes?.forEach(node => {
    parts.push(node.title);
    if (node.description) parts.push(node.description);
    if (node.location?.zone) parts.push(node.location.zone);
    if (node.location?.npc) parts.push(node.location.npc);
  });

  // Prerequisites
  mission.prerequisites?.forEach(prereq => {
    if (prereq.requirement) parts.push(prereq.requirement);
  });

  // Metadata
  if (mission.metadata?.category) parts.push(mission.metadata.category);
  if (mission.metadata?.missionSet) parts.push(mission.metadata.missionSet);

  return parts.join(' ').toLowerCase();
}

/**
 * Enrich entire mission set with computed metadata
 * @param {Array} missions - Array of missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Enriched missions
 */
export function enrichMissionSet(missions, edges = []) {
  return missions.map(mission => enrichMission(mission, missions, edges));
}

/**
 * Add cross-references between missions
 * @param {Array} missions - Array of missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Missions with cross-references
 */
export function addCrossReferences(missions, edges) {
  const missionMap = new Map(missions.map(m => [m.id, m]));

  return missions.map(mission => {
    const enriched = { ...mission };

    // Add related missions (share same NPCs or zones)
    enriched.relatedMissions = findRelatedMissions(mission, missions);

    // Add parallel missions (can be done at same time)
    enriched.parallelMissions = findParallelMissions(mission, missions, edges);

    // Add suggested order
    enriched.suggestedOrder = calculateSuggestedOrder(mission, missions, edges);

    return enriched;
  });
}

/**
 * Find missions related by shared content (NPCs, zones)
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions
 * @returns {Array} Related mission IDs
 */
function findRelatedMissions(mission, allMissions) {
  const missionZones = new Set(
    mission.nodes?.map(n => n.location?.zone).filter(Boolean) || []
  );

  const missionNPCs = new Set(
    mission.nodes?.map(n => n.location?.npc).filter(Boolean) || []
  );

  const related = [];

  for (const other of allMissions) {
    if (other.id === mission.id) continue;

    const otherZones = new Set(
      other.nodes?.map(n => n.location?.zone).filter(Boolean) || []
    );

    const otherNPCs = new Set(
      other.nodes?.map(n => n.location?.npc).filter(Boolean) || []
    );

    // Check for shared zones or NPCs
    const sharedZones = [...missionZones].filter(z => otherZones.has(z));
    const sharedNPCs = [...missionNPCs].filter(n => otherNPCs.has(n));

    if (sharedZones.length > 0 || sharedNPCs.length > 0) {
      related.push({
        missionId: other.id,
        sharedZones,
        sharedNPCs,
        relevanceScore: sharedZones.length + sharedNPCs.length * 2
      });
    }
  }

  // Sort by relevance and return top 5
  return related
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)
    .map(r => r.missionId);
}

/**
 * Find missions that can be done in parallel (no dependencies between them)
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Parallel mission IDs
 */
function findParallelMissions(mission, allMissions, edges) {
  const parallel = [];

  // Get all missions at same level requirement
  const sameLevel = allMissions.filter(m =>
    m.id !== mission.id &&
    m.metadata?.minLevel === mission.metadata?.minLevel
  );

  for (const other of sameLevel) {
    // Check if there's any dependency path between them
    const hasPath = hasPathBetween(mission.id, other.id, edges) ||
                    hasPathBetween(other.id, mission.id, edges);

    if (!hasPath) {
      parallel.push(other.id);
    }
  }

  return parallel;
}

/**
 * Check if there's a path between two missions
 * @param {string} fromId - From mission ID
 * @param {string} toId - To mission ID
 * @param {Array} edges - Dependency edges
 * @returns {boolean} True if path exists
 */
function hasPathBetween(fromId, toId, edges) {
  const visited = new Set();
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === toId) return true;
    if (visited.has(current)) continue;

    visited.add(current);

    const neighbors = edges
      .filter(e => e.from === current)
      .map(e => e.to);

    queue.push(...neighbors);
  }

  return false;
}

/**
 * Calculate suggested completion order
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {number} Suggested order (1-based index)
 */
function calculateSuggestedOrder(mission, allMissions, edges) {
  // Use topological sort position as suggested order
  const sorted = topologicalSort(allMissions, edges);
  const index = sorted.findIndex(id => id === mission.id);

  return index >= 0 ? index + 1 : allMissions.length;
}

/**
 * Simple topological sort (duplicated from dependency-builder to avoid circular import)
 * @param {Array} missions - Missions
 * @param {Array} edges - Edges
 * @returns {Array} Sorted mission IDs
 */
function topologicalSort(missions, edges) {
  const inDegree = new Map();
  const graph = new Map();

  missions.forEach(m => {
    inDegree.set(m.id, 0);
    graph.set(m.id, []);
  });

  edges.forEach(edge => {
    if (graph.has(edge.from) && graph.has(edge.to)) {
      graph.get(edge.from).push(edge.to);
      inDegree.set(edge.to, inDegree.get(edge.to) + 1);
    }
  });

  const queue = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  const sorted = [];

  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

/**
 * Calculate aggregate statistics for mission set
 * @param {Array} missions - Array of missions
 * @returns {Object} Aggregate statistics
 */
export function calculateAggregateStats(missions) {
  const totalMissions = missions.length;
  const totalNodes = missions.reduce((sum, m) => sum + (m.nodes?.length || 0), 0);

  // Level distribution
  const levels = missions
    .map(m => m.metadata?.minLevel)
    .filter(l => l != null && typeof l === 'number');

  // Difficulty distribution
  const difficulties = missions
    .map(m => m.metadata?.difficulty)
    .filter(Boolean);

  const difficultyCount = difficulties.reduce((acc, d) => {
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  // Zone coverage
  const zones = new Set();
  missions.forEach(m => {
    m.nodes?.forEach(n => {
      if (n.location?.zone) zones.add(n.location.zone);
    });
  });

  return {
    totalMissions,
    totalNodes,
    averageNodesPerMission: totalMissions > 0 ? totalNodes / totalMissions : 0,

    levelRange: levels.length > 0 ? {
      min: Math.min(...levels),
      max: Math.max(...levels),
      average: levels.reduce((a, b) => a + b, 0) / levels.length
    } : null,

    difficultyDistribution: difficultyCount,

    zoneCoverage: zones.size,
    zones: Array.from(zones).sort(),

    soloableCount: missions.filter(m => m.metadata?.isSoloable).length,
    timedCount: missions.filter(m => m.metadata?.hasTimeLimit).length,
    optionalCount: missions.filter(m => m.metadata?.isOptional).length
  };
}
