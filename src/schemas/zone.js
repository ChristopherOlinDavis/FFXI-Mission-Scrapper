import { z } from 'zod';

// Schema for individual monsters in a zone
const monsterSchema = z.object({
  name: z.string(),
  level: z.union([
    z.number(),
    z.string().regex(/^\d+-\d+$/), // Range like "10-12"
    z.enum(['Unknown', '?'])
  ]).optional(),
  family: z.string().optional(), // Monster family/type
  aggressive: z.boolean().optional(),
  detectionMethods: z.array(
    z.enum(['sight', 'sound', 'scent', 'magic', 'low_hp', 'true_sight', 'true_sound'])
  ).optional(),
  linking: z.boolean().optional(), // Does it link with others
  spawns: z.number().optional(), // Number of spawns
  notes: z.string().optional()
});

// Schema for Named Monsters (NMs)
const namedMonsterSchema = z.object({
  name: z.string(),
  level: z.union([z.number(), z.string()]).optional(),
  family: z.string().optional(),
  spawnCondition: z.string().optional(), // Lottery, Forced, Timed, etc.
  spawnLocation: z.string().optional(),
  respawnTime: z.string().optional(),
  drops: z.array(z.object({
    item: z.string(),
    dropRate: z.string().optional()
  })).optional(),
  aggressive: z.boolean().optional(),
  detectionMethods: z.array(z.string()).optional(),
  notes: z.string().optional()
});

// Schema for fishing data
const fishingSchema = z.object({
  fish: z.string(),
  level: z.union([z.number(), z.string()]).optional(),
  bait: z.string().optional(),
  location: z.string().optional()
});

// Main zone schema
export const zoneSchema = z.object({
  name: z.string(),
  type: z.enum(['zone', 'area', 'region']).default('zone'),
  sourceUrl: z.string().url(),
  region: z.string().optional(), // Quon, Mindartia, Aradjiah, etc.
  expansion: z.string().optional(), // Original, RotZ, CoP, etc.
  description: z.string().optional(),

  // Geographic data
  connectedAreas: z.array(z.object({
    name: z.string(),
    direction: z.string().optional() // N, S, E, W, etc.
  })).optional(),

  // Weather and environment
  weather: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(), // Level caps, job restrictions

  // Encounter data
  monsters: z.array(monsterSchema).optional(),
  namedMonsters: z.array(namedMonsterSchema).optional(),

  // Activities
  fishing: z.array(fishingSchema).optional(),
  chocoboDigging: z.boolean().optional(),

  // Involvement
  involvedInQuests: z.array(z.string()).optional(),
  involvedInMissions: z.array(z.string()).optional(),

  // Additional features
  npcs: z.array(z.object({
    name: z.string(),
    role: z.string().optional(), // Merchant, Quest NPC, etc.
    location: z.string().optional()
  })).optional(),

  features: z.array(z.string()).optional(), // Conquest, Outpost, Home Point, etc.

  metadata: z.object({
    source: z.enum(['bgwiki', 'ffxiclopedia']),
    scrapedAt: z.string().datetime(),
    rawFilename: z.string().optional()
  })
});

export default zoneSchema;
