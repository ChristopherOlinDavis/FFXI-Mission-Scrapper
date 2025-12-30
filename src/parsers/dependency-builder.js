/**
 * Dependency Builder
 * Builds mission dependency graphs and handles complex prerequisite logic
 */

/**
 * Build unlocks array - what missions does this mission unlock?
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions in the set
 * @returns {Array} Array of mission IDs this mission unlocks
 */
export function buildUnlocks(mission, allMissions) {
  const unlocks = [];

  // If this mission has a next mission, that's what it unlocks
  if (mission.nextMission) {
    const nextMission = allMissions.find(m => m.url === mission.nextMission);
    if (nextMission) {
      unlocks.push(nextMission.id);
    }
  }

  // Also check if any mission lists this one as a prerequisite
  for (const otherMission of allMissions) {
    if (otherMission.prerequisites) {
      for (const prereq of otherMission.prerequisites) {
        if (prereq.missionId === mission.id) {
          unlocks.push(otherMission.id);
        }
      }
    }
  }

  return [...new Set(unlocks)]; // Remove duplicates
}

/**
 * Build navigation info for a mission
 * @param {Object} mission - Mission object
 * @param {Array} allMissions - All missions in the set
 * @param {number} index - Index of this mission in the set
 * @returns {Object} Navigation object
 */
export function buildNavigation(mission, allMissions, index) {
  let previous = null;
  let next = null;

  // Try to find previous/next from mission chain
  if (mission.previousMission) {
    const prevMission = allMissions.find(m => m.url === mission.previousMission);
    if (prevMission) {
      previous = prevMission.id;
    }
  }

  if (mission.nextMission) {
    const nextMission = allMissions.find(m => m.url === mission.nextMission);
    if (nextMission) {
      next = nextMission.id;
    }
  }

  // If no explicit chain, use array order
  if (!previous && index > 0) {
    previous = allMissions[index - 1].id;
  }

  if (!next && index < allMissions.length - 1) {
    next = allMissions[index + 1].id;
  }

  return {
    previous,
    next,
    setIndex: index,
    setTotal: allMissions.length
  };
}

/**
 * Build dependency edges for graph visualization
 * @param {Array} missions - All missions
 * @returns {Array} Array of dependency edges
 */
export function buildDependencyEdges(missions) {
  const edges = [];

  for (const mission of missions) {
    if (!mission.prerequisites) continue;

    for (const prereq of mission.prerequisites) {
      // Mission prerequisites
      if (prereq.type === 'mission' && prereq.missionId) {
        edges.push({
          from: prereq.missionId,
          to: mission.id,
          type: 'mission',
          isHard: true
        });
      }

      // Recursive for complex gates
      if (prereq.children) {
        for (const child of prereq.children) {
          if (child.type === 'mission' && child.missionId) {
            edges.push({
              from: child.missionId,
              to: mission.id,
              type: prereq.type, // any_of, all_of, etc.
              isHard: true
            });
          }
        }
      }
    }

    // Add next mission edge
    if (mission.nextMission) {
      const nextMission = missions.find(m => m.url === mission.nextMission);
      if (nextMission) {
        edges.push({
          from: mission.id,
          to: nextMission.id,
          type: 'sequence',
          isHard: true
        });
      }
    }
  }

  return edges;
}

/**
 * Calculate topological order for missions (for suggested completion order)
 * @param {Array} missions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Missions in topological order
 */
export function topologicalSort(missions, edges) {
  const graph = new Map();
  const inDegree = new Map();

  // Initialize graph
  for (const mission of missions) {
    graph.set(mission.id, []);
    inDegree.set(mission.id, 0);
  }

  // Build graph
  for (const edge of edges) {
    if (graph.has(edge.from) && graph.has(edge.to)) {
      graph.get(edge.from).push(edge.to);
      inDegree.set(edge.to, inDegree.get(edge.to) + 1);
    }
  }

  // Kahn's algorithm
  const queue = [];
  const result = [];

  // Add all nodes with in-degree 0
  for (const [missionId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(missionId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);

    for (const neighbor of graph.get(current)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Map IDs back to mission objects
  return result.map(id => missions.find(m => m.id === id)).filter(Boolean);
}

/**
 * Detect cycles in dependency graph
 * @param {Array} missions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Array of cycles (each cycle is an array of mission IDs)
 */
export function detectCycles(missions, edges) {
  const graph = new Map();
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  // Initialize graph
  for (const mission of missions) {
    graph.set(mission.id, []);
  }

  // Build graph
  for (const edge of edges) {
    if (graph.has(edge.from)) {
      graph.get(edge.from).push(edge.to);
    }
  }

  // DFS to detect cycles
  function dfs(node, path = []) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    recStack.delete(node);
    path.pop();
  }

  for (const mission of missions) {
    if (!visited.has(mission.id)) {
      dfs(mission.id);
    }
  }

  return cycles;
}
