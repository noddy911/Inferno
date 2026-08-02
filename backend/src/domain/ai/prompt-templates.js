/**
 * Prompt templates — build the system/user prompt for any provider. The system prompt
 * is static text describing the exact JSON contract (mirrors `aiSuggestionSchema`); the
 * user prompt is the caller's text passed verbatim. Provider output is validated with
 * Zod before use — prompt output is never injected as code.
 */

import { FURNITURE_CATEGORIES } from '../measurement/recipe.schema.js';

const CATEGORY_LIST = FURNITURE_CATEGORIES.map((c) => `- ${c}`).join('\n');

const SYSTEM_PROMPT = `You are a furniture estimation assistant for an interior-design firm.
Given the customer's request, propose a structured interior estimate.

Return ONLY valid JSON (no markdown, no commentary) matching exactly this shape:

{
  "summary": "one or two sentences describing the estimate",
  "rooms": [
    {
      "name": "room name",
      "width": number,   // mm, positive
      "length": number,  // mm, positive
      "height": number,  // mm, positive
      "furniture": [
        {
          "category": one of the categories below,
          "name": "item name",
          "width": number,   // mm, positive
          "height": number,  // mm, positive
          "depth": number,   // mm, positive
          "shelves": integer >= 0,
          "drawers": integer >= 0,
          "shutters": integer >= 0,
          "quantity": integer >= 1
        }
      ]
    }
  ]
}

At least one room, and each room needs at least one furniture item.
Categories:
${CATEGORY_LIST}

Dimensions must be realistic furniture sizes in millimetres (e.g. wardrobe height 2400,
bed depth 2000). Counts describe ONE unit (or one module for kitchens).`;

/**
 * @param {string} userPrompt free-text request (3–2000 chars)
 * @returns {{ system: string, user: string }}
 */
export function buildEstimatePrompt(userPrompt) {
  return { system: SYSTEM_PROMPT, user: userPrompt };
}
