/**
 * JSON Builder
 * Transforms parsed mission data into UI-ready JSON format
 */

import { APIMissionSchema, APIMissionSetSchema, APIResponseSchema } from '../schemas/index.js';

/**
 * Build UI-ready mission object
 * @param {Object} mission - Parsed mission object
 * @returns {Object} UI-ready mission
 */
export function buildAPIMission(mission) {
  return {
    id: mission.id,
    title: mission.title,
    number: mission.number || undefined,
    category: mission.metadata?.category || 'other',
    missionSet: mission.metadata?.missionSet || '',
    url: mission.url,

    // Prerequisites and unlocks
    prerequisites: mission.prerequisites || [],
    unlocks: mission.unlocks || [],

    // Walkthrough steps
    nodes: mission.nodes || [],

    // Metadata for UI display
    metadata: {
      estimatedTime: mission.metadata?.estimatedTime,
      difficulty: mission.metadata?.difficulty,
      minLevel: mission.metadata?.minLevel,
      maxLevel: mission.metadata?.maxLevel,
      hasTimeLimit: mission.metadata?.hasTimeLimit || false,
      isSoloable: mission.metadata?.isSoloable,
      rewards: mission.metadata?.rewards,
      tags: mission.metadata?.tags || generateTags(mission),

      // Include enriched metadata fields if present
      ...(mission.metadata?.prerequisiteChainLength !== undefined && {
        prerequisiteChainLength: mission.metadata.prerequisiteChainLength,
        unlockChainLength: mission.metadata.unlockChainLength,
        isOptional: mission.metadata.isOptional,
        isBottleneck: mission.metadata.isBottleneck,
        progressPercentage: mission.metadata.progressPercentage,
        estimatedCompletionOrder: mission.metadata.estimatedCompletionOrder
      }),

      ...(mission.metadata?.keywords && { keywords: mission.metadata.keywords }),
      ...(mission.metadata?.searchableText && { searchableText: mission.metadata.searchableText }),
      ...(mission.metadata?.rewardTypes && { rewardTypes: mission.metadata.rewardTypes }),
      ...(mission.metadata?.difficultyInferred !== undefined && {
        difficultyInferred: mission.metadata.difficultyInferred
      })
    },

    // Navigation helpers
    navigation: mission.navigation || {
      previous: null,
      next: null,
      setIndex: 0,
      setTotal: 1
    },

    // Include cross-reference fields if present
    ...(mission.relatedMissions && { relatedMissions: mission.relatedMissions }),
    ...(mission.parallelMissions && { parallelMissions: mission.parallelMissions }),
    ...(mission.suggestedOrder !== undefined && { suggestedOrder: mission.suggestedOrder })
  };
}

/**
 * Build UI-ready mission set object
 * @param {Object} missionSet - Parsed mission set
 * @param {Array} missions - Full missions with all data
 * @returns {Object} UI-ready mission set
 */
export function buildAPIMissionSet(missionSet, missions) {
  const apiMissions = missions.map(buildAPIMission);

  // Calculate summary statistics
  const summary = calculateSummary(missions);

  return {
    id: missionSet.id,
    name: missionSet.name,
    category: missionSet.category,
    missions: apiMissions,
    summary,
    sourceUrl: missionSet.sourceUrl,
    lastUpdated: missionSet.lastScraped,
    version: '1.0.0'
  };
}

/**
 * Build complete API response with all mission sets
 * @param {Array} missionSets - Array of mission set results
 * @returns {Object} Complete API response
 */
export function buildAPIResponse(missionSets) {
  const apiMissionSets = missionSets.map(result =>
    buildAPIMissionSet(result.missionSet, result.missions)
  );

  const totalMissions = apiMissionSets.reduce((sum, set) => sum + set.missions.length, 0);

  return {
    missionSets: apiMissionSets,
    metadata: {
      totalMissions,
      totalSets: apiMissionSets.length,
      lastGenerated: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Calculate summary statistics for a mission set
 * @param {Array} missions - Array of missions
 * @returns {Object} Summary statistics
 */
function calculateSummary(missions) {
  const levels = missions
    .map(m => m.metadata?.minLevel)
    .filter(l => l != null && typeof l === 'number');

  const hasTimeLimit = missions.some(m => m.metadata?.hasTimeLimit);

  return {
    totalMissions: missions.length,
    estimatedTotalTime: estimateTotalTime(missions),
    minLevel: levels.length > 0 ? Math.min(...levels) : undefined,
    maxLevel: levels.length > 0 ? Math.max(...levels) : undefined,
    hasTimeLimit,
    completionRate: undefined // For user progress tracking
  };
}

/**
 * Estimate total time for mission set
 * @param {Array} missions - Array of missions
 * @returns {string|undefined} Estimated time string
 */
function estimateTotalTime(missions) {
  const timesWithEstimates = missions.filter(m => m.metadata?.estimatedTime);

  if (timesWithEstimates.length === 0) {
    return undefined;
  }

  // Simple estimation based on number of missions
  const avgMinutes = 30; // Assume 30 minutes per mission
  const totalMinutes = missions.length * avgMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Generate tags for a mission based on its properties
 * @param {Object} mission - Mission object
 * @returns {Array} Array of tag strings
 */
function generateTags(mission) {
  const tags = [];

  // Difficulty tags
  if (mission.metadata?.difficulty) {
    tags.push(mission.metadata.difficulty);
  }

  // Level tags
  if (mission.metadata?.minLevel) {
    const level = mission.metadata.minLevel;
    if (level >= 75) tags.push('high-level');
    else if (level >= 50) tags.push('mid-level');
    else if (level >= 20) tags.push('low-level');
    else tags.push('starter');
  }

  // Content tags
  if (mission.metadata?.isSoloable) tags.push('soloable');
  if (mission.metadata?.hasTimeLimit) tags.push('timed');
  if (mission.nodes.length > 10) tags.push('long-mission');
  if (mission.nodes.length <= 3) tags.push('short-mission');

  // Prerequisite tags
  if (mission.prerequisites && mission.prerequisites.length > 0) {
    tags.push('has-prerequisites');

    const hasExpansion = mission.prerequisites.some(p => p.type === 'expansion');
    const hasRank = mission.prerequisites.some(p => p.type === 'rank');

    if (hasExpansion) tags.push('requires-expansion');
    if (hasRank) tags.push('requires-rank');
  }

  // Category tags
  if (mission.metadata?.category) {
    tags.push(mission.metadata.category);
  }

  return tags;
}

/**
 * Validate API response against schema
 * @param {Object} response - API response object
 * @returns {Object} Validated response
 */
export function validateAPIResponse(response) {
  return APIResponseSchema.parse(response);
}

/**
 * Validate API mission set against schema
 * @param {Object} missionSet - API mission set object
 * @returns {Object} Validated mission set
 */
export function validateAPIMissionSet(missionSet) {
  return APIMissionSetSchema.parse(missionSet);
}

/**
 * Validate API mission against schema
 * @param {Object} mission - API mission object
 * @returns {Object} Validated mission
 */
export function validateAPIMission(mission) {
  return APIMissionSchema.parse(mission);
}
