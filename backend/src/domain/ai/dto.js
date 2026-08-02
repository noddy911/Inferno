/**
 * AI Estimation Assistant DTOs.
 *
 * The provider (mock or an LLM) returns a *structured furniture suggestion* which is
 * Zod-validated here before anything is persisted or measured (design §8.4: "validated
 * JSON suggestion → /ai/apply writes rooms/furniture"). Dimensions in mm; furniture
 * mirrors the measurement engine's `furnitureInputSchema` so an apply result feeds
 * `measureItems` unchanged. `category` is constrained to the recipe catalogue so a
 * suggestion is always measurable.
 */

import { z } from 'zod';
import { FURNITURE_CATEGORIES } from '../measurement/recipe.schema.js';

const DIM = z.number().positive().max(20000);

const furnitureSuggestionSchema = z.object({
  category: z.enum(FURNITURE_CATEGORIES),
  name: z.string().trim().min(1).max(100),
  width: DIM,
  height: DIM,
  depth: DIM,
  shelves: z.number().int().min(0).max(50).default(0),
  drawers: z.number().int().min(0).max(50).default(0),
  shutters: z.number().int().min(0).max(50).default(0),
  quantity: z.number().int().min(1).max(100).default(1),
});

const roomSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  width: DIM,
  length: DIM,
  height: DIM,
  furniture: z.array(furnitureSuggestionSchema).min(1),
});

/**
 * The validated suggestion both `POST /ai/estimate` returns and `POST /ai/apply`
 * consumes. Rejects out-of-catalogue categories and empty rooms/suggestions.
 */
export const aiSuggestionSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  rooms: z.array(roomSuggestionSchema).min(1),
});

/** `POST /ai/estimate` — free-text prompt (design §10: 3–2000 chars). */
export const aiEstimateInputSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
});

/**
 * `POST /ai/apply` — persist a (client-supplied or estimated) suggestion into a project.
 * The suggestion is re-validated here — never trust client input. `measure` optionally
 * runs the measurement engine over the persisted furniture to seed the cost pipeline.
 */
export const aiApplyInputSchema = z.object({
  projectId: z.string().min(1),
  suggestion: aiSuggestionSchema,
  measure: z.boolean().default(false),
});

/**
 * @typedef {z.infer<typeof aiSuggestionSchema>} AiSuggestion
 * @typedef {z.infer<typeof roomSuggestionSchema>} RoomSuggestion
 * @typedef {z.infer<typeof furnitureSuggestionSchema>} FurnitureSuggestion
 * @typedef {z.infer<typeof aiEstimateInputSchema>} AiEstimateInput
 * @typedef {z.infer<typeof aiApplyInputSchema>} AiApplyInput
 */
