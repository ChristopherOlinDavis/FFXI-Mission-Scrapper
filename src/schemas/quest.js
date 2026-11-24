import { z } from "zod";

/**
 * Schema for quest pages
 * Quests are standalone tasks (unlike missions which are part of a series)
 */
export const questSchema = z.object({
  name: z.string(),
  type: z.literal("quest"),
  sourceUrl: z.string(),

  // Quest details
  questType: z.string().optional(), // "Nation Quest", "Job Quest", "Repeatable Quest", etc.
  questChain: z.string().optional(), // If part of a quest chain
  startingNPC: z.string().optional(),
  startingLocation: z.string().optional(), // Zone name

  // Requirements
  prerequisites: z.array(z.string()).optional(),
  requiredFame: z.number().optional(), // Fame level required (0-10 typically)
  requiredRank: z.number().optional(), // Nation rank if applicable
  repeatable: z.boolean().optional(),

  // Content
  description: z.string().optional(),
  walkthrough: z.array(z.string()).optional(), // Steps

  // Navigation (for quest chains)
  previousQuest: z.string().optional(),
  nextQuest: z.string().optional(),

  // Rewards
  rewards: z
    .object({
      gil: z.number().optional(),
      items: z.array(z.string()).optional(),
      keyItems: z.array(z.string()).optional(),
      fame: z.number().optional(), // Fame points awarded
      title: z.string().optional(), // Character title reward
      experience: z.number().optional(), // EXP points if applicable
    })
    .optional(),

  // Metadata
  metadata: z.object({
    source: z.enum(["bgwiki", "ffxiclopedia"]),
    scrapedAt: z.string(),
    rawFilename: z.string(),
  }),

  detectedType: z.string().optional(),
});

export default questSchema;
