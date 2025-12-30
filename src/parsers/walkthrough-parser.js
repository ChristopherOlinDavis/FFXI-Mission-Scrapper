/**
 * Walkthrough Parser
 * Converts walkthrough steps into structured nodes with dependencies
 */

/**
 * Parse walkthrough steps into nodes with linear dependencies
 * @param {Array} walkthroughSteps - Array of parsed steps with title, description, location
 * @param {string} missionId - Mission ID for generating node IDs
 * @returns {Array} Array of node objects
 */
export function parseWalkthroughToNodes(walkthroughSteps, missionId) {
  const nodes = [];

  walkthroughSteps.forEach((step, index) => {
    if (!step || !step.title) return;

    const nodeId = `${missionId}-node-${index + 1}`;
    const dependencies = index > 0 ? [`${missionId}-node-${index}`] : [];

    nodes.push({
      id: nodeId,
      orderIndex: index,
      title: step.title,
      description: step.description,
      dependencies,
      location: step.location
    });
  });

  return nodes;
}

/**
 * Merge duplicate or similar steps
 * @param {Array} nodes - Array of nodes
 * @returns {Array} Deduplicated nodes
 */
export function deduplicateNodes(nodes) {
  const seen = new Set();
  const unique = [];

  for (const node of nodes) {
    // Create a key from title (case-insensitive, normalized)
    const key = node.title.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(node);
    }
  }

  // Reindex and update dependencies
  return unique.map((node, index) => ({
    ...node,
    orderIndex: index,
    id: node.id.replace(/-node-\d+$/, `-node-${index + 1}`),
    dependencies: index > 0 ? [unique[index - 1].id.replace(/-node-\d+$/, `-node-${index}`)] : []
  }));
}

/**
 * Extract all walkthrough lists from a section
 * @param {Cheerio} $ - Cheerio instance
 * @param {Cheerio} sectionElement - The section containing walkthrough
 * @param {Function} parseListItem - Function to parse individual list items
 * @returns {Array} Array of parsed steps
 */
export function extractWalkthroughSteps($, sectionElement, parseListItem) {
  const steps = [];

  // Look for ordered lists first
  sectionElement.nextAll('ol').first().find('> li').each((i, elem) => {
    const text = $(elem).text();
    const step = parseListItem(text);
    if (step) {
      steps.push(step);
    }
  });

  // If no ordered list, try unordered list
  if (steps.length === 0) {
    sectionElement.nextAll('ul').first().find('> li').each((i, elem) => {
      const text = $(elem).text();
      const step = parseListItem(text);
      if (step) {
        steps.push(step);
      }
    });
  }

  return steps;
}
