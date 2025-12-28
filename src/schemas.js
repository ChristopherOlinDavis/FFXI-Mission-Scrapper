import { z } from 'zod';

/**
 * Gate types that can block progress between nodes
 */
export const GateTypeSchema = z.enum([
  'missionSet',  // requires completing another mission set
  'mission',     // requires completing a specific mission
  'node',        // requires completing a specific node
  'level',       // requires character level
  'item',        // requires obtaining an item
  'other'        // custom requirement
]);

/**
 * A gate represents a blocker between nodes
 */
export const GateSchema = z.object({
  id: z.string(),
  type: GateTypeSchema,
  afterNodeId: z.string(),
  requirement: z.string(),
  description: z.string()
});

/**
 * A node represents a single step in a mission walkthrough
 */
export const NodeSchema = z.object({
  id: z.string(),
  orderIndex: z.number(),
  title: z.string(),
  description: z.string(),
  dependencies: z.array(z.string())
});

/**
 * A mission contains multiple nodes and gates
 */
export const MissionSchema = z.object({
  id: z.string(),
  title: z.string(),
  nodes: z.array(NodeSchema),
  gates: z.array(GateSchema).optional().default([])
});

/**
 * Mission set category
 */
export const CategorySchema = z.enum([
  'nation',
  'expansion',
  'addon',
  'other'
]);

/**
 * A mission set is a collection of related missions
 */
export const MissionSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: CategorySchema,
  sourceUrl: z.string().url(),
  lastScraped: z.string().datetime(),
  lastKnownUpdate: z.string().datetime().optional(),
  missions: z.array(MissionSchema)
});

/**
 * Root schema for all mission data
 */
export const MissionDataSchema = z.object({
  missionSets: z.array(MissionSetSchema)
});

/**
 * Scrape metadata for tracking scrape frequency
 */
export const ScrapeMetadataSchema = z.object({
  missionSetId: z.string(),
  lastScraped: z.string().datetime(),
  lastKnownUpdate: z.string().datetime().optional(),
  scrapeCount: z.number(),
  nextScheduledScrape: z.string().datetime().optional()
});

export const AllScrapeMetadataSchema = z.object({
  metadata: z.array(ScrapeMetadataSchema)
});
