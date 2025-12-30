/**
 * Prerequisite Extractor
 * Extracts all prerequisite types from HTML and creates complex dependency structures
 */

import { DependencyType } from '../schemas/dependency.js';

/**
 * Extract prerequisites from mission page
 * @param {Cheerio} $ - Cheerio instance
 * @param {Object} infoboxMetadata - Metadata extracted from infobox
 * @param {string} missionId - Mission ID for generating prerequisite IDs
 * @param {Function} cleanText - Text cleaning function
 * @param {Function} generateId - ID generation function
 * @returns {Array} Array of prerequisite objects
 */
export function extractPrerequisites($, infoboxMetadata, missionId, cleanText, generateId) {
  const prerequisites = [];

  // 1. Extract from infobox requirements
  if (infoboxMetadata.requirements && infoboxMetadata.requirements.length > 0) {
    for (const reqText of infoboxMetadata.requirements) {
      const prereqs = parseRequirementText(reqText, missionId, generateId);
      prerequisites.push(...prereqs);
    }
  }

  // 2. Extract from prerequisite quest section
  const questPrereqs = extractPrerequisiteQuests($, missionId, cleanText, generateId);
  prerequisites.push(...questPrereqs);

  // 3. Extract level requirement from infobox
  if (infoboxMetadata.level) {
    prerequisites.push({
      id: generateId(missionId, 'level-req'),
      type: DependencyType.LEVEL,
      requirement: `Level ${infoboxMetadata.level}+`,
      description: `Must be level ${infoboxMetadata.level} or higher`,
      characterLevel: infoboxMetadata.level,
      isOptional: false
    });
  }

  // 4. Extract previous mission dependency
  if (infoboxMetadata.previousMission) {
    const prevMissionId = generateId('mission', extractTitleFromURL(infoboxMetadata.previousMission));
    prerequisites.push({
      id: generateId(missionId, 'prev-mission'),
      type: DependencyType.MISSION,
      requirement: `Complete previous mission`,
      description: `Must complete the previous mission in the chain`,
      missionId: prevMissionId,
      isOptional: false
    });
  }

  return prerequisites;
}

/**
 * Parse requirement text and extract structured prerequisites
 * @param {string} text - Requirement text
 * @param {string} missionId - Mission ID
 * @param {Function} generateId - ID generation function
 * @returns {Array} Array of prerequisite objects
 */
export function parseRequirementText(text, missionId, generateId) {
  const prerequisites = [];
  const lowerText = text.toLowerCase();

  // Pattern 1: Rank requirements
  // "Bastok Rank 6", "Rank 6", "Rank 6 in any nation"
  const rankMatch = text.match(/rank\s+(\d+)/i);
  if (rankMatch) {
    const rankLevel = parseInt(rankMatch[1]);

    // Check if it's "any nation"
    if (lowerText.includes('any nation') || lowerText.includes('any city')) {
      prerequisites.push(createAnyNationRankGate(rankLevel, missionId, generateId));
    } else {
      // Specific nation
      const nation = extractNation(text);
      prerequisites.push({
        id: generateId(missionId, `rank-${rankLevel}`),
        type: DependencyType.RANK,
        requirement: `Rank ${rankLevel}${nation ? ` in ${nation}` : ''}`,
        description: `Must achieve Rank ${rankLevel}${nation ? ` in ${nation}` : ''}`,
        rankLevel,
        rankNation: nation || 'any',
        isOptional: false
      });
    }
  }

  // Pattern 2: Expansion requirements
  // "Treasures of Aht Urhgan", "Rise of the Zilart"
  const expansions = [
    { name: 'Rise of the Zilart', id: 'zilart' },
    { name: 'Chains of Promathia', id: 'promathia' },
    { name: 'Treasures of Aht Urhgan', id: 'toau' },
    { name: 'Wings of the Goddess', id: 'wotg' },
    { name: 'Seekers of Adoulin', id: 'soa' },
    { name: 'Rhapsodies of Vana\'diel', id: 'rov' }
  ];

  for (const expansion of expansions) {
    if (text.includes(expansion.name)) {
      prerequisites.push({
        id: generateId(missionId, `expansion-${expansion.id}`),
        type: DependencyType.EXPANSION,
        requirement: expansion.name,
        description: `Requires ${expansion.name} expansion`,
        expansionId: expansion.id,
        isOptional: false
      });
    }
  }

  // Pattern 3: N-of-M requirements
  // "Complete 2 of 3 expansion storylines"
  const nOfMMatch = text.match(/complete\s+(\d+)\s+of\s+(\d+)/i);
  if (nOfMMatch) {
    const required = parseInt(nOfMMatch[1]);
    const total = parseInt(nOfMMatch[2]);

    prerequisites.push({
      id: generateId(missionId, `n-of-${required}-${total}`),
      type: DependencyType.N_OF,
      requirement: `Complete ${required} of ${total}`,
      description: text,
      operator: 'N_OF',
      requiredCount: required,
      children: [], // Would be populated with specific missions
      isOptional: false
    });
  }

  return prerequisites;
}

/**
 * Extract prerequisite quests from dedicated section
 * @param {Cheerio} $ - Cheerio instance
 * @param {string} missionId - Mission ID
 * @param {Function} cleanText - Text cleaning function
 * @param {Function} generateId - ID generation function
 * @returns {Array} Array of quest prerequisite objects
 */
export function extractPrerequisiteQuests($, missionId, cleanText, generateId) {
  const quests = [];

  // Find prerequisite quests section
  const prereqSection = $('h2:contains("Prerequisite Quest"), h2 #Prerequisite_Quests').parent();

  if (prereqSection.length > 0) {
    // Look for quest names in h3 or h4 headers
    prereqSection.nextAll('h3, h4').each((i, elem) => {
      const questTitle = cleanText($(elem).text());

      if (questTitle && questTitle.length > 0 && questTitle.length < 100) {
        const questId = generateId('quest', questTitle);

        quests.push({
          id: generateId(missionId, `quest-${i}`),
          type: DependencyType.QUEST,
          requirement: questTitle,
          description: `Must complete quest: ${questTitle}`,
          questId: questId,
          isOptional: false
        });
      }
    });

    // Also check for lists of quests
    prereqSection.nextAll('ul').first().find('li').each((i, elem) => {
      const questText = cleanText($(elem).text());

      if (questText && questText.length > 0 && !quests.some(q => q.requirement === questText)) {
        const questId = generateId('quest', questText);

        quests.push({
          id: generateId(missionId, `quest-list-${i}`),
          type: DependencyType.QUEST,
          requirement: questText,
          description: `Must complete quest: ${questText}`,
          questId: questId,
          isOptional: false
        });
      }
    });
  }

  return quests;
}

/**
 * Create ANY_OF gate for "Rank X in any nation" requirement
 * @param {number} rankLevel - Required rank level
 * @param {string} missionId - Mission ID
 * @param {Function} generateId - ID generation function
 * @returns {Object} ANY_OF prerequisite object
 */
function createAnyNationRankGate(rankLevel, missionId, generateId) {
  const nations = ['bastok', 'sandoria', 'windurst'];

  return {
    id: generateId(missionId, `rank-${rankLevel}-any-nation`),
    type: DependencyType.ANY_OF,
    requirement: `Rank ${rankLevel} in any nation`,
    description: `Must achieve Rank ${rankLevel} in Bastok, San d'Oria, or Windurst`,
    operator: 'OR',
    children: nations.map(nation => ({
      id: generateId(missionId, `rank-${rankLevel}-${nation}`),
      type: DependencyType.RANK,
      requirement: `${capitalize(nation)} Rank ${rankLevel}`,
      description: `Achieve Rank ${rankLevel} in ${capitalize(nation)}`,
      rankLevel,
      rankNation: nation,
      isOptional: false
    })),
    isOptional: false
  };
}

/**
 * Extract nation name from text
 * @param {string} text - Text containing nation name
 * @returns {string|null} Nation name or null
 */
function extractNation(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('bastok')) return 'bastok';
  if (lowerText.includes('san d\'oria') || lowerText.includes('sandoria')) return 'sandoria';
  if (lowerText.includes('windurst')) return 'windurst';

  return null;
}

/**
 * Extract title from URL
 * @param {string} url - Mission URL
 * @returns {string} Mission title
 */
function extractTitleFromURL(url) {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  return decodeURIComponent(lastPart.replace(/_/g, ' ').replace(/\(.*?\)/g, '').trim());
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
