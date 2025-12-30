import { z } from 'zod';

/**
 * Dependency types for mission prerequisites
 */
export const DependencyType = {
  // Simple dependencies
  MISSION: 'mission',              // Complete specific mission
  RANK: 'rank',                    // Achieve specific rank
  LEVEL: 'level',                  // Character level requirement
  QUEST: 'quest',                  // Quest completion
  ITEM: 'item',                    // Possess specific item
  EXPANSION: 'expansion',          // Expansion ownership
  ADDON: 'addon',                  // Add-on ownership

  // Complex gates
  ANY_OF: 'any_of',                // OR logic: satisfy any 1 of N
  ALL_OF: 'all_of',                // AND logic: satisfy all N
  N_OF: 'n_of',                    // N-of-M logic: satisfy N of M requirements
  CONDITIONAL: 'conditional'        // Complex conditional logic
};

/**
 * Prerequisite schema with recursive structure for complex gates
 */
export const PrerequisiteSchema = z.lazy(() => z.object({
  id: z.string(),
  type: z.enum(Object.values(DependencyType)),

  // Human-readable fields
  requirement: z.string(),          // Human-readable description
  description: z.string(),          // Detailed explanation

  // Specific requirement data
  missionId: z.string().optional(),       // For MISSION type
  questId: z.string().optional(),         // For QUEST type
  rankLevel: z.number().optional(),       // For RANK type (1-10)
  rankNation: z.string().optional(),      // For RANK type (any/bastok/sandoria/windurst)
  characterLevel: z.number().optional(),  // For LEVEL type
  itemId: z.string().optional(),          // For ITEM type
  expansionId: z.string().optional(),     // For EXPANSION type
  addonId: z.string().optional(),         // For ADDON type

  // Complex gate fields
  operator: z.enum(['AND', 'OR', 'N_OF']).optional(),
  requiredCount: z.number().optional(),   // For N_OF: how many needed
  children: z.array(z.lazy(() => PrerequisiteSchema)).optional(),

  // Metadata
  isOptional: z.boolean().default(false),
  estimatedTime: z.string().optional(),
  difficulty: z.enum(['trivial', 'easy', 'medium', 'hard', 'very_hard']).optional()
}));

/**
 * Dependency edge for graph representation
 */
export const DependencyEdgeSchema = z.object({
  from: z.string(),          // Source mission ID
  to: z.string(),            // Target mission ID
  type: z.string(),          // Dependency type
  isHard: z.boolean(),       // Hard blocker vs soft recommendation
  metadata: z.record(z.any()).optional()
});

/**
 * Mission with full dependency information
 */
export const MissionWithDepsSchema = z.object({
  id: z.string(),
  title: z.string(),
  number: z.string().optional(),
  url: z.string().optional(),

  // Prerequisite system
  prerequisites: z.array(PrerequisiteSchema),
  unlocks: z.array(z.string()), // Mission IDs that this unlocks

  // Navigation
  navigation: z.object({
    previous: z.string().nullable(),
    next: z.string().nullable(),
    setIndex: z.number(),
    setTotal: z.number()
  }).optional()
});

/**
 * Dependency graph for a mission set
 */
export const DependencyGraphSchema = z.object({
  missionSetId: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string()
  })),
  edges: z.array(DependencyEdgeSchema)
});
