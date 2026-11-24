import { z } from 'zod';

// Schema for item stats/attributes
// Note: Many stats can be either numbers or strings (e.g., "+3" or 3)
const itemStatsSchema = z.object({
  DEF: z.union([z.number(), z.string()]).optional(),
  HP: z.union([z.number(), z.string()]).optional(),
  MP: z.union([z.number(), z.string()]).optional(),
  STR: z.union([z.number(), z.string()]).optional(),
  DEX: z.union([z.number(), z.string()]).optional(),
  VIT: z.union([z.number(), z.string()]).optional(),
  AGI: z.union([z.number(), z.string()]).optional(),
  INT: z.union([z.number(), z.string()]).optional(),
  MND: z.union([z.number(), z.string()]).optional(),
  CHR: z.union([z.number(), z.string()]).optional(),
  Attack: z.union([z.number(), z.string()]).optional(),
  Accuracy: z.union([z.number(), z.string()]).optional(),
  Ranged_Attack: z.union([z.number(), z.string()]).optional(),
  Ranged_Accuracy: z.union([z.number(), z.string()]).optional(),
  Magic_Attack: z.union([z.number(), z.string()]).optional(),
  Magic_Accuracy: z.union([z.number(), z.string()]).optional(),
  Magic_Defense: z.union([z.number(), z.string()]).optional(),
  Evasion: z.union([z.number(), z.string()]).optional(),
  Haste: z.string().optional(), // "3%", etc.
  Store_TP: z.union([z.number(), z.string()]).optional(),
  Dual_Wield: z.union([z.number(), z.string()]).optional(),
  Enmity: z.union([z.number(), z.string()]).optional(),
  Critical_Hit_Rate: z.string().optional(),
  Damage: z.string().optional(), // For weapons: "DMG:50"
  Delay: z.union([z.number(), z.string()]).optional(),
  DPS: z.union([z.number(), z.string()]).optional(),
  skillType: z.string().optional() // Sword Skill, Great Sword Skill, etc.
}).passthrough(); // Allow other stats we haven't defined

// Schema for job restrictions
const jobRestrictionSchema = z.object({
  jobs: z.array(z.string()).optional(), // [WAR, MNK, PLD, etc.]
  level: z.number().optional(),
  race: z.array(z.string()).optional()
});

// Schema for augments
const augmentSchema = z.object({
  path: z.string().optional(), // A, B, C for some augment systems
  attribute: z.string(),
  value: z.string(),
  rank: z.number().optional()
});

// Schema for where to obtain
const obtainMethodSchema = z.object({
  method: z.enum([
    'Quest', 'Mission', 'NM Drop', 'Synthesis', 'Vendor',
    'BCNM', 'Dynamis', 'Abyssea', 'Ambuscade', 'Reforged',
    'Event', 'Login Campaign', 'Unknown'
  ]),
  details: z.string().optional(),
  npc: z.string().optional(),
  location: z.string().optional(),
  cost: z.union([z.number(), z.string()]).optional()
});

// Main item schema
export const itemSchema = z.object({
  name: z.string(),
  type: z.enum(['item', 'equipment', 'weapon', 'armor', 'consumable', 'currency', 'key_item']).default('item'),
  sourceUrl: z.string().url(),

  // Basic classification
  category: z.string().optional(), // Weapon, Armor, Medicine, Food, etc.
  subCategory: z.string().optional(), // Sword, Body Armor, Potion, etc.
  slot: z.enum([
    'Main', 'Sub', 'Range', 'Ammo',
    'Head', 'Neck', 'Ear', 'Body', 'Hands', 'Ring', 'Back', 'Waist', 'Legs', 'Feet'
  ]).optional(),

  // Item level and requirements
  itemLevel: z.number().optional(),
  level: z.number().optional(), // Required level
  jobs: jobRestrictionSchema.optional(),

  // Item properties
  description: z.string().optional(),
  stats: itemStatsSchema.optional(),

  // Special properties
  rare: z.boolean().optional(),
  exclusive: z.boolean().optional(),
  exRare: z.boolean().optional(),
  canSendToDeliveryBox: z.boolean().optional(),
  canTradeNPC: z.boolean().optional(),
  canSynthesis: z.boolean().optional(),
  canAuction: z.boolean().optional(),
  stackSize: z.number().optional(),

  // Effects
  effects: z.array(z.string()).optional(),
  latentEffects: z.array(z.object({
    condition: z.string(),
    effect: z.string()
  })).optional(),
  enchantment: z.string().optional(),

  // Augments and upgrades
  augments: z.array(augmentSchema).optional(),
  canAugment: z.boolean().optional(),
  upgradePath: z.array(z.object({
    stage: z.string(),
    itemName: z.string(),
    requirements: z.string().optional()
  })).optional(),

  // Set bonuses (for armor sets)
  setBonus: z.object({
    setName: z.string().optional(),
    pieces: z.array(z.string()).optional(),
    bonuses: z.array(z.object({
      piecesRequired: z.number(),
      effect: z.string()
    })).optional()
  }).optional(),

  // Weapon-specific
  damage: z.number().optional(),
  delay: z.number().optional(),
  dps: z.number().optional(),
  additionalEffect: z.string().optional(),

  // How to obtain
  obtainedFrom: z.array(obtainMethodSchema).optional(),
  synthesis: z.object({
    craft: z.string().optional(), // Smithing, Alchemy, etc.
    level: z.number().optional(),
    yield: z.number().optional(),
    materials: z.array(z.object({
      item: z.string(),
      quantity: z.number().optional()
    })).optional()
  }).optional(),

  // Related items
  relatedItems: z.array(z.string()).optional(),

  // Storage and value
  storage: z.array(z.enum(['Inventory', 'Safe', 'Storage', 'Locker', 'Satchel', 'Sack', 'Case', 'Wardrobe'])).optional(),

  // NPC pricing
  npcPrice: z.object({
    buy: z.number().optional(),
    sell: z.number().optional()
  }).optional(),

  metadata: z.object({
    source: z.enum(['bgwiki', 'ffxiclopedia']),
    scrapedAt: z.string().datetime(),
    rawFilename: z.string().optional()
  })
});

export default itemSchema;
