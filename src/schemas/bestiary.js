/**
 * Bestiary Schema Definitions
 * Schemas for monster families, variants, and related data
 */

import { z } from 'zod';

/**
 * Elemental resistance schema
 * Represents resistance multipliers for elemental damage
 */
export const ElementalResistancesSchema = z.object({
  fire: z.number().min(-1).max(2).optional(),
  ice: z.number().min(-1).max(2).optional(),
  wind: z.number().min(-1).max(2).optional(),
  earth: z.number().min(-1).max(2).optional(),
  lightning: z.number().min(-1).max(2).optional(),
  water: z.number().min(-1).max(2).optional(),
  light: z.number().min(-1).max(2).optional(),
  dark: z.number().min(-1).max(2).optional()
}).describe('Elemental resistance multipliers');

/**
 * Physical resistance schema
 * Represents resistance multipliers for physical damage types
 */
export const PhysicalResistancesSchema = z.object({
  slashing: z.number().min(-1).max(2).optional(),
  piercing: z.number().min(-1).max(2).optional(),
  blunt: z.number().min(-1).max(2).optional(),
  h2h: z.number().min(-1).max(2).optional(),
  ranged: z.number().min(-1).max(2).optional()
}).describe('Physical resistance multipliers');

/**
 * Combined resistances schema
 */
export const ResistancesSchema = z.object({
  elemental: ElementalResistancesSchema.optional(),
  physical: PhysicalResistancesSchema.optional()
}).describe('Monster resistance data');

/**
 * Monster ability schema
 */
export const MonsterAbilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['physical', 'magical', 'breath', 'special']).optional(),
  element: z.enum(['fire', 'ice', 'wind', 'earth', 'lightning', 'water', 'light', 'dark', 'none']).optional(),
  aoe: z.boolean().optional(),
  range: z.string().optional()
}).describe('Monster ability data');

/**
 * Monster family schema
 * Represents a family/type of monster (e.g., Dhalmel, Tiger, Behemoth)
 */
export const MonsterFamilySchema = z.object({
  id: z.string().min(1).describe('Unique identifier (lowercase, hyphenated)'),
  name: z.string().min(1).describe('Display name of the monster family'),
  japanese: z.string().optional().describe('Japanese name'),
  type: z.enum([
    'Beast', 'Bird', 'Lizard', 'Vermin', 'Plantoid', 'Aquan',
    'Amorph', 'Undead', 'Arcana', 'Dragon', 'Demon', 'Empty',
    'Humanoid', 'Luminian', 'Lumorian'
  ]).describe('Monster type/ecosystem'),

  charmable: z.boolean().optional().describe('Whether family is charmable by BST'),
  pankration: z.boolean().optional().describe('Whether family is available in Pankration'),

  resistances: ResistancesSchema.optional(),
  abilities: z.array(MonsterAbilitySchema).optional().describe('Family-wide abilities'),

  traits: z.array(z.string()).optional().describe('Special traits (Double Attack, etc.)'),
  immunities: z.array(z.string()).optional().describe('Status effect immunities'),
  weaknesses: z.array(z.string()).optional().describe('Status effect weaknesses'),

  detects: z.array(z.enum([
    'sight', 'sound', 'low_hp', 'magic', 'job_ability', 'weapon_skill', 'true_sight', 'true_sound'
  ])).optional().describe('Detection methods'),

  intimidates: z.array(z.string()).optional().describe('What this family intimidates'),
  intimidatedBy: z.array(z.string()).optional().describe('What intimidates this family'),

  notes: z.string().optional().describe('Additional family notes'),
  source: z.enum(['bgwiki', 'ffxiclopedia', 'manual']).describe('Data source'),
  lastUpdated: z.string().datetime().optional().describe('Last update timestamp')
}).describe('Monster family data');

/**
 * Monster variant schema
 * Represents a specific monster instance (e.g., Apex Dhalmel, King Behemoth)
 */
export const MonsterVariantSchema = z.object({
  id: z.string().min(1).describe('Unique identifier (lowercase, hyphenated)'),
  name: z.string().min(1).describe('Display name of the monster'),
  familyId: z.string().min(1).describe('Reference to monster family ID'),

  isNM: z.boolean().default(false).describe('Is this a Notorious Monster'),
  nmType: z.enum(['lottery', 'forced', 'timed', 'pop_item', 'bcnm', 'event', 'other']).optional(),

  level: z.number().int().min(1).max(150).optional().describe('Monster level'),
  levelRange: z.string().optional().describe('Level range (e.g., "50-55", "130-135")'),

  zone: z.string().optional().describe('Primary zone where found'),
  zones: z.array(z.string()).optional().describe('All zones where found'),
  location: z.string().optional().describe('Specific location within zone'),

  spawnConditions: z.string().optional().describe('How the monster spawns'),
  respawnTime: z.string().optional().describe('Respawn/repop time'),

  resistances: ResistancesSchema.optional().describe('Variant-specific resistances (override family)'),
  abilities: z.array(MonsterAbilitySchema).optional().describe('Variant-specific abilities'),

  drops: z.array(z.object({
    item: z.string(),
    rate: z.string().optional(),
    steal: z.boolean().optional()
  })).optional(),

  notes: z.string().optional(),
  strategy: z.string().optional().describe('Battle strategy notes'),

  stats: z.object({
    hp: z.number().optional(),
    mp: z.number().optional(),
    str: z.number().optional(),
    dex: z.number().optional(),
    vit: z.number().optional(),
    agi: z.number().optional(),
    int: z.number().optional(),
    mnd: z.number().optional(),
    chr: z.number().optional()
  }).optional(),

  source: z.enum(['bgwiki', 'ffxiclopedia', 'manual']).describe('Data source'),
  sourceUrl: z.string().url().optional(),
  lastUpdated: z.string().datetime().optional()
}).describe('Monster variant/instance data');

/**
 * Monster system schema
 * Represents a collection of monster families (e.g., "Beasts", "Birds")
 */
export const MonsterSystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  characteristics: z.array(z.string()).optional().describe('System-wide characteristics'),
  familyIds: z.array(z.string()).describe('IDs of families in this system')
}).describe('Monster ecosystem/system');

/**
 * Complete bestiary data schema
 * Root schema for bestiary JSON output
 */
export const BestiaryDataSchema = z.object({
  version: z.string().default('1.0.0'),
  lastUpdated: z.string().datetime(),

  systems: z.array(MonsterSystemSchema).optional(),
  families: z.array(MonsterFamilySchema),
  variants: z.array(MonsterVariantSchema),

  stats: z.object({
    totalFamilies: z.number().int(),
    totalVariants: z.number().int(),
    totalNMs: z.number().int(),
    byType: z.record(z.number()).optional()
  }).optional()
}).describe('Complete bestiary data export');

/**
 * Bestiary scrape metadata
 */
export const BestiaryMetadataSchema = z.object({
  familyId: z.string(),
  lastScraped: z.string().datetime(),
  scrapeCount: z.number().int().default(1),
  lastKnownUpdate: z.string().datetime().optional(),
  variantCount: z.number().int().default(0),
  source: z.string()
});

export const AllBestiaryMetadataSchema = z.object({
  version: z.string().default('1.0.0'),
  lastUpdated: z.string().datetime(),
  metadata: z.array(BestiaryMetadataSchema)
});
