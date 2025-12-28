import * as cheerio from 'cheerio';

/**
 * Extracts text content and cleans it up
 */
export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Generates a unique ID from a title
 */
export function generateId(prefix, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug}`;
}

/**
 * Parses a mission walkthrough into nodes
 * This is a simplified parser - in reality, you'd need more sophisticated logic
 */
export function parseWalkthroughToNodes(walkthroughSteps, missionId) {
  const nodes = [];

  walkthroughSteps.forEach((step, index) => {
    const nodeId = `${missionId}-node-${index + 1}`;
    const dependencies = index > 0 ? [`${missionId}-node-${index}`] : [];

    nodes.push({
      id: nodeId,
      orderIndex: index,
      title: step.title || `Step ${index + 1}`,
      description: step.description,
      dependencies
    });
  });

  return nodes;
}

/**
 * Extracts prerequisites from text and converts them to gates
 */
export function parsePrerequisitesToGates(prerequisiteText, missionId, startingNodeId) {
  const gates = [];

  if (!prerequisiteText) return gates;

  const text = cleanText(prerequisiteText);

  // Check for level requirements
  const levelMatch = text.match(/level\s+(\d+)/i);
  if (levelMatch) {
    gates.push({
      id: `${missionId}-gate-level`,
      type: 'level',
      afterNodeId: startingNodeId,
      requirement: `Level ${levelMatch[1]}+`,
      description: `Must be level ${levelMatch[1]} or higher`
    });
  }

  // Check for rank requirements
  const rankMatch = text.match(/rank\s+(\d+)/i);
  if (rankMatch) {
    gates.push({
      id: `${missionId}-gate-rank`,
      type: 'mission',
      afterNodeId: startingNodeId,
      requirement: `Rank ${rankMatch[1]}`,
      description: `Must have completed Rank ${parseInt(rankMatch[1]) - 1} mission`
    });
  }

  return gates;
}

/**
 * Parses a list item into a walkthrough step
 */
export function parseListItemToStep($, element) {
  const $item = $(element);
  const text = cleanText($item.text());

  // Try to extract location info
  const locationMatch = text.match(/\(([A-Z]-\d+)\)/);

  // Try to split into title and description
  // Common patterns: "Talk to NPC: Description" or "Action - Details"
  let title = text;
  let description = text;

  if (text.includes(':')) {
    const parts = text.split(':');
    title = cleanText(parts[0]);
    description = cleanText(parts.slice(1).join(':'));
  } else if (text.includes('.')) {
    const firstSentence = text.split('.')[0];
    if (firstSentence.length < 80) {
      title = firstSentence;
      description = text;
    }
  }

  return {
    title: title.substring(0, 100),
    description: description,
    raw: text
  };
}

/**
 * Extracts the last modified date from wiki page
 */
export function extractLastModified($) {
  // Try to find the last modified date in footer
  const footerText = $('#footer-info-lastmod').text();
  if (footerText) {
    const match = footerText.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    if (match) {
      return new Date(match[1]).toISOString();
    }
  }

  // Default to current date if not found
  return new Date().toISOString();
}
