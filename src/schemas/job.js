import { z } from 'zod';

// Schema for job abilities
const jobAbilitySchema = z.object({
  name: z.string(),
  level: z.number().optional(),
  recast: z.string().optional(),
  description: z.string().optional(),
  effect: z.string().optional(),
  type: z.enum(['Job Ability', 'Job Trait', 'Weapon Skill', 'Magic']).optional()
});

// Schema for job traits
const jobTraitSchema = z.object({
  name: z.string(),
  level: z.number().optional(),
  description: z.string().optional(),
  effect: z.string().optional(),
  tier: z.number().optional() // For traits with multiple tiers
});

// Schema for weapon skills
const weaponSkillSchema = z.object({
  name: z.string(),
  level: z.number().optional(),
  weaponType: z.string().optional(), // Sword, Great Sword, Polearm, etc.
  skillchainProperties: z.array(z.string()).optional(),
  element: z.string().optional(),
  description: z.string().optional(),
  modifiers: z.string().optional() // STR, DEX, etc.
});

// Schema for job points
const jobPointSchema = z.object({
  category: z.string(), // e.g., "Soul Voice Effect", "Clarion Call Effect"
  description: z.string(), // Description of what this JP category does
  effectPerTier: z.string().optional(), // Effect per tier/rank
  level: z.number().optional(),
  jpCost: z.number().optional(),
  capacity: z.number().optional() // Max points that can be spent
});

// Schema for equipment skill ratings
const skillRatingSchema = z.object({
  skillName: z.string(), // Sword, Evasion, Parrying, etc.
  rank: z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E', 'F', 'G']).optional(),
  cap: z.number().optional() // Skill cap at 99
});

// Main job schema
export const jobSchema = z.object({
  name: z.string(),
  type: z.enum(['job']).default('job'),
  sourceUrl: z.string().url(),

  // Basic information
  abbreviation: z.string().max(3).optional(), // WAR, MNK, WHM, etc.
  category: z.enum(['Standard', 'Extra', 'Special']).optional(),
  expansion: z.string().optional(), // Original, RotZ, ToAU, etc.
  description: z.string().optional(),

  // Role information
  role: z.array(z.enum(['Tank', 'Melee', 'Ranged', 'Magic', 'Healer', 'Support'])).optional(),

  // Stat modifiers
  statModifiers: z.object({
    HP: z.string().optional(),
    MP: z.string().optional(),
    STR: z.string().optional(),
    DEX: z.string().optional(),
    VIT: z.string().optional(),
    AGI: z.string().optional(),
    INT: z.string().optional(),
    MND: z.string().optional(),
    CHR: z.string().optional()
  }).optional(),

  // Equipment and skills
  equipableWeapons: z.array(z.string()).optional(),
  equipableArmor: z.array(z.string()).optional(),
  skillRatings: z.array(skillRatingSchema).optional(),

  // Abilities and traits
  abilities: z.array(jobAbilitySchema).optional(),
  traits: z.array(jobTraitSchema).optional(),
  weaponSkills: z.array(weaponSkillSchema).optional(),
  spells: z.array(z.object({
    name: z.string(),
    level: z.number().optional(),
    type: z.string().optional()
  })).optional(),

  // Job Points
  jobPoints: z.array(jobPointSchema).optional(),
  jobPointGifts: z.array(z.object({
    name: z.string(), // Gift name
    description: z.string(), // What the gift does
    requiredJP: z.number().optional() // Total JP required to unlock
  })).optional(),

  // Unlock requirements
  unlockRequirements: z.object({
    level: z.number().optional(),
    quest: z.string().optional(),
    items: z.array(z.string()).optional(),
    otherRequirements: z.string().optional()
  }).optional(),

  // Related content
  guides: z.array(z.string()).optional(),
  relatedJobs: z.array(z.string()).optional(), // Good subjob combinations

  metadata: z.object({
    source: z.enum(['bgwiki', 'ffxiclopedia']),
    scrapedAt: z.string().datetime(),
    rawFilename: z.string().optional()
  })
});

export default jobSchema;
