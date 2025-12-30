import { z } from 'zod';
import { NodeSchema, LocationSchema } from './mission.js';
import { PrerequisiteSchema } from './dependency.js';

/**
 * UI-optimized mission response schema
 * This is the format that will be consumed by the frontend
 */
export const APIMissionSchema = z.object({
  // Core identification
  id: z.string(),
  title: z.string(),
  number: z.string().optional(),
  category: z.string(),
  missionSet: z.string(),
  url: z.string().optional(),

  // Prerequisites and unlocks
  prerequisites: z.array(PrerequisiteSchema),
  unlocks: z.array(z.string()),

  // Walkthrough steps
  nodes: z.array(NodeSchema),

  // Metadata for UI display
  metadata: z.object({
    estimatedTime: z.string().optional(),
    difficulty: z.enum(['trivial', 'easy', 'medium', 'hard', 'very_hard', 'moderate', 'difficult']).optional(),
    minLevel: z.number().nullable().optional(),
    maxLevel: z.number().nullable().optional(),
    hasTimeLimit: z.boolean().default(false),
    isSoloable: z.boolean().optional(),
    rewards: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
  }).passthrough().optional(), // Allow additional enriched fields

  // Navigation helpers
  navigation: z.object({
    previous: z.string().nullable(),
    next: z.string().nullable(),
    setIndex: z.number(),
    setTotal: z.number()
  })
}).passthrough(); // Allow additional fields like relatedMissions, parallelMissions, suggestedOrder

/**
 * Mission set response for UI
 */
export const APIMissionSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['nation', 'expansion', 'addon', 'other']),
  missions: z.array(APIMissionSchema),

  // Summary statistics
  summary: z.object({
    totalMissions: z.number(),
    estimatedTotalTime: z.string().optional(),
    minLevel: z.number().optional(),
    maxLevel: z.number().optional(),
    hasTimeLimit: z.boolean(),
    completionRate: z.number().optional() // For tracking user progress
  }).optional(),

  // Metadata
  sourceUrl: z.string().url(),
  lastUpdated: z.string().datetime(),
  version: z.string().optional()
});

/**
 * Complete API response with all mission sets
 */
export const APIResponseSchema = z.object({
  missionSets: z.array(APIMissionSetSchema),
  metadata: z.object({
    totalMissions: z.number(),
    totalSets: z.number(),
    lastGenerated: z.string().datetime(),
    version: z.string()
  })
});

/**
 * Dependency graph response for UI visualization
 */
export const APIDependencyGraphSchema = z.object({
  missionSetId: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    category: z.string(),
    level: z.number().optional(), // Topological level for layout
    x: z.number().optional(),     // Suggested x coordinate
    y: z.number().optional()      // Suggested y coordinate
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string(),
    isHard: z.boolean(),
    label: z.string().optional()
  })),
  metadata: z.object({
    criticalPath: z.array(z.string()).optional(),
    estimatedPathTime: z.string().optional()
  }).optional()
});

/**
 * Search/filter parameters for API queries
 */
export const APIQuerySchema = z.object({
  category: z.enum(['nation', 'expansion', 'addon', 'other']).optional(),
  minLevel: z.number().optional(),
  maxLevel: z.number().optional(),
  difficulty: z.array(z.enum(['trivial', 'easy', 'medium', 'hard', 'very_hard'])).optional(),
  soloable: z.boolean().optional(),
  hasTimeLimit: z.boolean().optional(),
  search: z.string().optional(),
  missionSetId: z.string().optional()
});
