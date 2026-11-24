import { z } from 'zod';

/**
 * Schema for mission/quest pages
 */
export const missionSchema = z.object({
  name: z.string(),
  type: z.literal('mission'),
  sourceUrl: z.string(),
  
  // Mission details
  series: z.string().optional(), // "Republic of Bastok", "A Shantotto Ascension", etc.
  missionNumber: z.string().optional(), // "1-1", "2-3", etc.
  startingNPC: z.string().optional(),
  title: z.string().optional(), // The mission's actual title (e.g., "The Zeruhn Report")
  
  // Requirements
  prerequisites: z.array(z.string()).optional(),
  requiredRank: z.number().optional(),
  repeatable: z.boolean().optional(),
  
  // Content
  description: z.string().optional(),
  walkthrough: z.array(z.string()).optional(), // Steps
  
  // Navigation
  previousMission: z.string().optional(),
  nextMission: z.string().optional(),
  
  // Rewards
  rewards: z.object({
    rankPoints: z.boolean().optional(),
    gil: z.number().optional(),
    items: z.array(z.string()).optional(),
    keyItems: z.array(z.string()).optional(),
    title: z.string().optional() // Character title reward
  }).optional(),
  
  // Metadata
  metadata: z.object({
    source: z.enum(['bgwiki', 'ffxiclopedia']),
    scrapedAt: z.string(),
    rawFilename: z.string()
  }),
  
  detectedType: z.string().optional()
});

export default missionSchema;
