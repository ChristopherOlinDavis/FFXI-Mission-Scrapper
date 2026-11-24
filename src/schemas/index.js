/**
 * Central export for all schema definitions
 */

// Mission schemas
export {
  GateTypeSchema,
  GateSchema,
  LocationSchema,
  NodeSchema,
  MissionMetadataSchema,
  MissionSchema,
  CategorySchema,
  MissionSetSchema,
  MissionDataSchema,
  ScrapeMetadataSchema,
  AllScrapeMetadataSchema
} from './mission.js';

// Dependency schemas
export {
  DependencyType,
  PrerequisiteSchema,
  DependencyEdgeSchema,
  MissionWithDepsSchema,
  DependencyGraphSchema
} from './dependency.js';

// API schemas
export {
  APIMissionSchema,
  APIMissionSetSchema,
  APIResponseSchema,
  APIDependencyGraphSchema,
  APIQuerySchema
} from './api.js';

// Bestiary schemas
export {
  ElementalResistancesSchema,
  PhysicalResistancesSchema,
  ResistancesSchema,
  MonsterAbilitySchema,
  MonsterFamilySchema,
  MonsterVariantSchema,
  MonsterSystemSchema,
  BestiaryDataSchema,
  BestiaryMetadataSchema,
  AllBestiaryMetadataSchema
} from './bestiary.js';

// Records of Eminence schemas
export {
  ROEReference,
  ROERewardsSchema,
  ROEObjectiveSchema,
  ROECategorySchema,
  ROEDataSchema
} from './roe.js';

// Zone schemas
export { zoneSchema } from './zone.js';

// Spell schemas
export { spellSchema } from './spell.js';

// Job schemas
export { jobSchema } from './job.js';

// Item schemas
export { itemSchema } from './item.js';

// Mission/Quest parser schemas (simple mission pages)
export { missionSchema } from './mission.js';

// Quest schemas
export { questSchema } from './quest.js';
