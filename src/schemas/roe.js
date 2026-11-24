/**
 * Records of Eminence Schema Definitions
 * Schemas for ROE objectives, categories, and rewards
 */

import { z } from 'zod';

/**
 * Reference schema for NPCs, locations, and items
 */
export const ROEReference = z.object({
  name: z.string(),
  url: z.string().url().optional()
});

/**
 * ROE rewards schema
 */
export const ROERewardsSchema = z.object({
  sparks: z.number().int().nonnegative().nullable(),
  exp: z.number().int().nonnegative().nullable(),
  accolades: z.number().int().nonnegative().nullable().optional(),
  items: z.array(ROEReference).optional(),
  capacityPoints: z.number().int().nonnegative().optional(),
  permanentCPBonus: z.number().int().nonnegative().optional()
});

/**
 * ROE objective schema
 */
export const ROEObjectiveSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().nullable().optional(),
  description: z.string().min(1),
  objectiveCount: z.number().int().positive().nullable(),

  repeatable: z.boolean(),
  repeatType: z.enum(['unlimited', 'daily', 'weekly', 'monthly']).optional(),

  rewards: ROERewardsSchema,

  npcs: z.array(ROEReference).optional(),
  locations: z.array(ROEReference).optional(),
  relatedItems: z.array(ROEReference).optional(),

  prerequisites: z.array(z.string()).optional(),
  notes: z.string().optional()
});

/**
 * ROE category schema
 */
export const ROECategorySchema = z.object({
  name: z.string().min(1),
  subcategories: z.array(z.string())
});

/**
 * Complete ROE data schema
 */
export const ROEDataSchema = z.object({
  version: z.string().default('1.0.0'),
  source: z.string(),
  sourceUrl: z.string().url(),
  lastUpdated: z.string().datetime(),

  categories: z.array(ROECategorySchema),
  objectives: z.array(ROEObjectiveSchema),

  stats: z.object({
    totalCategories: z.number().int(),
    totalObjectives: z.number().int(),
    byCategory: z.array(z.object({
      name: z.string(),
      count: z.number().int()
    }))
  })
});

export default {
  ROEReference,
  ROERewardsSchema,
  ROEObjectiveSchema,
  ROECategorySchema,
  ROEDataSchema
};
