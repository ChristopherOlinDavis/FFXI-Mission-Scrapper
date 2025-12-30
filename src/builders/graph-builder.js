/**
 * Graph Builder
 * Builds dependency graph visualization data from missions and edges
 */

import { topologicalSort } from '../parsers/dependency-builder.js';

/**
 * Build complete dependency graph for visualization
 * @param {Array} missions - Array of mission objects
 * @param {Array} edges - Array of dependency edges
 * @returns {Object} Graph data structure
 */
export function buildDependencyGraph(missions, edges) {
  // Create node map for quick lookup
  const nodeMap = new Map(missions.map(m => [m.id, m]));

  // Build graph nodes
  const graphNodes = missions.map((mission, index) => ({
    id: mission.id,
    label: mission.title,
    number: mission.number,
    category: mission.metadata?.category || 'other',
    level: mission.metadata?.minLevel,

    // Position hints for layout algorithms
    orderIndex: index,
    layer: calculateLayer(mission, missions, edges),

    // Visual properties
    isStartNode: !hasIncomingEdges(mission.id, edges),
    isEndNode: !hasOutgoingEdges(mission.id, edges),
    isCriticalPath: false, // Will be calculated below

    // Metadata for tooltips
    metadata: {
      estimatedTime: mission.metadata?.estimatedTime,
      difficulty: mission.metadata?.difficulty,
      prerequisiteCount: mission.prerequisites?.length || 0,
      unlockCount: mission.unlocks?.length || 0
    }
  }));

  // Build graph edges with visual properties
  const graphEdges = edges.map(edge => ({
    from: edge.from,
    to: edge.to,
    type: edge.type,
    isHard: edge.isHard,
    isCriticalPath: false, // Will be calculated below

    // Visual properties based on edge type
    style: getEdgeStyle(edge),
    label: edge.type === 'mission' ? '' : edge.type
  }));

  // Calculate critical path
  const criticalPath = calculateCriticalPath(missions, edges);
  markCriticalPath(graphNodes, graphEdges, criticalPath);

  // Calculate graph statistics
  const stats = calculateGraphStats(graphNodes, graphEdges);

  return {
    nodes: graphNodes,
    edges: graphEdges,
    criticalPath,
    stats,
    layout: {
      algorithm: 'layered',
      direction: 'TB', // Top to Bottom
      spacing: {
        node: 80,
        layer: 120
      }
    }
  };
}

/**
 * Calculate which layer a mission should be on (for vertical positioning)
 * @param {Object} mission - Mission object
 * @param {Array} missions - All missions
 * @param {Array} edges - Dependency edges
 * @returns {number} Layer index
 */
function calculateLayer(mission, missions, edges) {
  // Use longest path from any start node
  const visited = new Set();
  const layerMap = new Map();

  function dfs(missionId, depth) {
    if (visited.has(missionId)) {
      return layerMap.get(missionId) || 0;
    }

    visited.add(missionId);

    // Find all incoming edges
    const incomingEdges = edges.filter(e => e.to === missionId);

    if (incomingEdges.length === 0) {
      layerMap.set(missionId, 0);
      return 0;
    }

    // Layer is max of all parent layers + 1
    const maxParentLayer = Math.max(
      ...incomingEdges.map(e => dfs(e.from, depth + 1))
    );

    const layer = maxParentLayer + 1;
    layerMap.set(missionId, layer);
    return layer;
  }

  return dfs(mission.id, 0);
}

/**
 * Check if a mission has incoming dependency edges
 * @param {string} missionId - Mission ID
 * @param {Array} edges - Dependency edges
 * @returns {boolean} True if has incoming edges
 */
function hasIncomingEdges(missionId, edges) {
  return edges.some(e => e.to === missionId);
}

/**
 * Check if a mission has outgoing dependency edges
 * @param {string} missionId - Mission ID
 * @param {Array} edges - Dependency edges
 * @returns {boolean} True if has outgoing edges
 */
function hasOutgoingEdges(missionId, edges) {
  return edges.some(e => e.from === missionId);
}

/**
 * Get visual style for an edge based on type
 * @param {Object} edge - Dependency edge
 * @returns {Object} Style properties
 */
function getEdgeStyle(edge) {
  const baseStyle = {
    width: edge.isHard ? 2 : 1,
    dashes: edge.isHard ? false : [5, 5]
  };

  switch (edge.type) {
    case 'mission':
      return { ...baseStyle, color: '#4A90E2' };
    case 'rank':
      return { ...baseStyle, color: '#7B68EE' };
    case 'level':
      return { ...baseStyle, color: '#50C878' };
    case 'quest':
      return { ...baseStyle, color: '#FF6B6B' };
    case 'expansion':
      return { ...baseStyle, color: '#FFA500' };
    default:
      return { ...baseStyle, color: '#888888' };
  }
}

/**
 * Calculate critical path through mission set
 * Uses longest path algorithm (most missions to complete)
 * @param {Array} missions - Array of missions
 * @param {Array} edges - Dependency edges
 * @returns {Array} Array of mission IDs on critical path
 */
function calculateCriticalPath(missions, edges) {
  // Build adjacency list
  const graph = new Map();
  const inDegree = new Map();

  missions.forEach(m => {
    graph.set(m.id, []);
    inDegree.set(m.id, 0);
  });

  edges.forEach(edge => {
    if (graph.has(edge.from) && graph.has(edge.to)) {
      graph.get(edge.from).push(edge.to);
      inDegree.set(edge.to, inDegree.get(edge.to) + 1);
    }
  });

  // Find start nodes (no incoming edges)
  const startNodes = Array.from(inDegree.entries())
    .filter(([_, degree]) => degree === 0)
    .map(([id, _]) => id);

  if (startNodes.length === 0) {
    return []; // No start node, possibly cyclic
  }

  // Calculate longest path from each start node
  let longestPath = [];

  for (const startNode of startNodes) {
    const path = findLongestPath(startNode, graph);
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
}

/**
 * Find longest path from a given start node using DFS
 * @param {string} start - Start node ID
 * @param {Map} graph - Adjacency list
 * @returns {Array} Longest path as array of node IDs
 */
function findLongestPath(start, graph) {
  const visited = new Set();
  let longestPath = [];

  function dfs(nodeId, currentPath) {
    visited.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = graph.get(nodeId) || [];

    if (neighbors.length === 0) {
      // Leaf node - check if this is the longest path
      if (currentPath.length > longestPath.length) {
        longestPath = [...currentPath];
      }
    } else {
      // Continue DFS on unvisited neighbors
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, currentPath);
        }
      }
    }

    currentPath.pop();
    visited.delete(nodeId);
  }

  dfs(start, []);
  return longestPath;
}

/**
 * Mark nodes and edges that are on the critical path
 * @param {Array} nodes - Graph nodes
 * @param {Array} edges - Graph edges
 * @param {Array} criticalPath - Critical path node IDs
 */
function markCriticalPath(nodes, edges, criticalPath) {
  const criticalSet = new Set(criticalPath);

  // Mark nodes
  nodes.forEach(node => {
    node.isCriticalPath = criticalSet.has(node.id);
  });

  // Mark edges
  edges.forEach(edge => {
    const fromOnPath = criticalSet.has(edge.from);
    const toOnPath = criticalSet.has(edge.to);

    // Edge is on critical path if both nodes are on path and they're consecutive
    const fromIndex = criticalPath.indexOf(edge.from);
    const toIndex = criticalPath.indexOf(edge.to);

    edge.isCriticalPath = fromOnPath && toOnPath && toIndex === fromIndex + 1;
  });
}

/**
 * Calculate graph statistics
 * @param {Array} nodes - Graph nodes
 * @param {Array} edges - Graph edges
 * @returns {Object} Statistics
 */
function calculateGraphStats(nodes, edges) {
  const layers = [...new Set(nodes.map(n => n.layer))];
  const startNodes = nodes.filter(n => n.isStartNode);
  const endNodes = nodes.filter(n => n.isEndNode);
  const criticalNodes = nodes.filter(n => n.isCriticalPath);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    layerCount: layers.length,
    startNodeCount: startNodes.length,
    endNodeCount: endNodes.length,
    criticalPathLength: criticalNodes.length,
    averageConnectivity: edges.length / nodes.length,
    maxLayer: Math.max(...layers),

    // Edge type breakdown
    edgeTypes: edges.reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    }, {}),

    // Hard vs soft dependencies
    hardEdges: edges.filter(e => e.isHard).length,
    softEdges: edges.filter(e => !e.isHard).length
  };
}

/**
 * Build subgraph for a specific mission and its dependencies
 * @param {string} missionId - Mission ID
 * @param {Array} missions - All missions
 * @param {Array} edges - All edges
 * @param {number} depth - How many levels of dependencies to include
 * @returns {Object} Subgraph
 */
export function buildMissionSubgraph(missionId, missions, edges, depth = 2) {
  const includedIds = new Set([missionId]);

  // BFS to find all missions within depth
  let currentLevel = [missionId];

  for (let i = 0; i < depth; i++) {
    const nextLevel = [];

    for (const id of currentLevel) {
      // Add incoming edges (prerequisites)
      const prereqs = edges.filter(e => e.to === id).map(e => e.from);
      prereqs.forEach(p => {
        includedIds.add(p);
        nextLevel.push(p);
      });

      // Add outgoing edges (unlocks)
      const unlocks = edges.filter(e => e.from === id).map(e => e.to);
      unlocks.forEach(u => {
        includedIds.add(u);
        nextLevel.push(u);
      });
    }

    currentLevel = nextLevel;
  }

  // Filter missions and edges to only included IDs
  const subMissions = missions.filter(m => includedIds.has(m.id));
  const subEdges = edges.filter(e =>
    includedIds.has(e.from) && includedIds.has(e.to)
  );

  return buildDependencyGraph(subMissions, subEdges);
}

/**
 * Export graph to various formats
 * @param {Object} graph - Graph object
 * @param {string} format - Export format ('dot', 'json', 'cytoscape')
 * @returns {string} Exported graph
 */
export function exportGraph(graph, format = 'json') {
  switch (format) {
    case 'json':
      return JSON.stringify(graph, null, 2);

    case 'dot':
      return exportToDot(graph);

    case 'cytoscape':
      return exportToCytoscape(graph);

    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

/**
 * Export graph to DOT format (for Graphviz)
 * @param {Object} graph - Graph object
 * @returns {string} DOT format string
 */
function exportToDot(graph) {
  let dot = 'digraph MissionDependencies {\n';
  dot += '  rankdir=TB;\n';
  dot += '  node [shape=box];\n\n';

  // Add nodes
  graph.nodes.forEach(node => {
    const style = node.isCriticalPath ? 'filled' : '';
    const color = node.isCriticalPath ? 'lightblue' : 'white';
    dot += `  "${node.id}" [label="${node.label}" style="${style}" fillcolor="${color}"];\n`;
  });

  dot += '\n';

  // Add edges
  graph.edges.forEach(edge => {
    const style = edge.isCriticalPath ? 'bold' : edge.isHard ? 'solid' : 'dashed';
    dot += `  "${edge.from}" -> "${edge.to}" [style="${style}"];\n`;
  });

  dot += '}\n';
  return dot;
}

/**
 * Export graph to Cytoscape.js format
 * @param {Object} graph - Graph object
 * @returns {Object} Cytoscape format object
 */
function exportToCytoscape(graph) {
  return {
    elements: {
      nodes: graph.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          ...node.metadata
        },
        classes: node.isCriticalPath ? 'critical' : ''
      })),
      edges: graph.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.from,
          target: edge.to,
          type: edge.type
        },
        classes: edge.isCriticalPath ? 'critical' : edge.isHard ? 'hard' : 'soft'
      }))
    },
    layout: graph.layout
  };
}
