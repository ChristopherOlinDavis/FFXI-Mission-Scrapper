import { z } from 'zod';

// Schema for equipment that modifies a spell
const equipmentModifierSchema = z.object({
  itemName: z.string(),
  slot: z.string().optional(), // Head, Body, Hands, etc.
  effect: z.string(), // Description of modification
  augments: z.array(z.string()).optional()
});

// Schema for NPC vendors selling spell scrolls
const vendorSchema = z.object({
  npcName: z.string(),
  location: z.string().optional(),
  cost: z.union([z.number(), z.string()]).optional(), // For special costs like "Conquest Points"
  currency: z.string().optional() // Gil, Conquest Points, etc.
});

// Main spell schema
export const spellSchema = z.object({
  name: z.string(),
  type: z.enum(['spell', 'song', 'ninjutsu', 'blood_pact']).default('spell'),
  sourceUrl: z.string().url(),

  // Spell classification
  magicType: z.string().optional(), // White Magic, Black Magic, Blue Magic, etc.
  element: z.enum(['Fire', 'Ice', 'Wind', 'Earth', 'Thunder', 'Water', 'Light', 'Dark', 'None']).optional(),
  school: z.array(z.string()).optional(), // Divine, Enfeebling, Enhancing, etc.

  // Basic stats
  level: z.record(z.string(), z.number()).optional(), // Job abbreviation -> level requirement

  mpCost: z.number().optional(),
  castTime: z.string().optional(), // "2 seconds", "Instant", etc.
  recastTime: z.string().optional(),
  duration: z.string().optional(),
  range: z.string().optional(), // "Self", "Party", "15'", etc.
  target: z.string().optional(), // Single, AoE, Party, etc.

  // Effect information
  description: z.string().optional(),
  effect: z.string().optional(),

  // Damage/healing formulas
  formula: z.string().optional(),
  skillType: z.string().optional(), // Healing Magic, Enhancing Magic, etc.

  // Related items and equipment
  scroll: z.object({
    name: z.string().optional(),
    canSynthesis: z.boolean().optional(),
    canAuction: z.boolean().optional()
  }).optional(),

  equipmentModifiers: z.array(equipmentModifierSchema).optional(),
  vendors: z.array(vendorSchema).optional(),

  // Additional data
  questReward: z.string().optional(),
  missionReward: z.string().optional(),
  cannotUse: z.array(z.string()).optional(), // Areas where spell cannot be used
  notes: z.string().optional(),

  // Job-specific (for Blue Magic)
  bluePoints: z.number().optional(),
  blueTraits: z.array(z.string()).optional(),
  learnedFrom: z.array(z.string()).optional(), // Monsters that use this spell

  metadata: z.object({
    source: z.enum(['bgwiki', 'ffxiclopedia']),
    scrapedAt: z.string().datetime(),
    rawFilename: z.string().optional()
  })
});

export default spellSchema;
