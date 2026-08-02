/**
 * Deterministic mock AI provider — the default when no real SDK is installed or an
 * API key is missing (design §8, §10 edge case: "missing key → deterministic mock
 * response, logged"). Maps prompt keywords to a realistic, always-schema-valid
 * furniture suggestion, so the whole estimate → apply → measure pipeline runs without
 * any external dependency.
 */

const wardrobe = {
  category: 'wardrobe',
  name: 'Wardrobe 8ft',
  width: 2400,
  height: 2400,
  depth: 600,
  shelves: 4,
  drawers: 2,
  shutters: 4,
  quantity: 1,
};

const bed = {
  category: 'bed',
  name: 'Queen Bed',
  width: 1800,
  height: 450,
  depth: 2000,
  shelves: 0,
  drawers: 2,
  shutters: 0,
  quantity: 1,
};

/** Every template suggestion, each guaranteed to validate against `aiSuggestionSchema`. */
function templates() {
  return {
    kitchen: {
      summary: 'Modular kitchen with base and wall cabinet runs (per-module counts).',
      rooms: [
        {
          name: 'Modular Kitchen',
          width: 4200,
          length: 3200,
          height: 2900,
          furniture: [
            { category: 'kitchen', name: 'Kitchen Base Run', width: 3600, height: 720, depth: 450, shelves: 1, drawers: 1, shutters: 0, quantity: 1 },
            { category: 'kitchen', name: 'Kitchen Wall Cabinets', width: 3600, height: 720, depth: 350, shelves: 1, drawers: 0, shutters: 0, quantity: 1 },
          ],
        },
      ],
    },

    bedroom: {
      summary: 'Master bedroom suite: wardrobe + bed.',
      rooms: [
        { name: 'Master Bedroom', width: 4000, length: 3600, height: 2900, furniture: [wardrobe, bed] },
      ],
    },

    living: {
      summary: 'Living room with TV unit and sideboard.',
      rooms: [
        {
          name: 'Living Room',
          width: 5000,
          length: 4200,
          height: 2900,
          furniture: [
            { category: 'tv-unit', name: 'TV Unit', width: 2400, height: 450, depth: 400, shelves: 2, drawers: 0, shutters: 2, quantity: 1 },
          ],
        },
      ],
    },

    dining: {
      summary: 'Dining room with a 6-seater table.',
      rooms: [
        {
          name: 'Dining Room',
          width: 3600,
          length: 3000,
          height: 2900,
          furniture: [{ category: 'dining', name: '6-Seater Dining Table', width: 1800, height: 760, depth: 900, shelves: 0, drawers: 0, shutters: 0, quantity: 1 }],
        },
      ],
    },

    vanity: {
      summary: 'Bedroom dressing vanity.',
      rooms: [
        {
          name: 'Master Bedroom',
          width: 3200,
          length: 3000,
          height: 2900,
          furniture: [{ category: 'vanity', name: 'Dressing Vanity', width: 1200, height: 750, depth: 500, shelves: 1, drawers: 2, shutters: 0, quantity: 1 }],
        },
      ],
    },

    shoe: {
      summary: 'Entrance shoe rack.',
      rooms: [
        {
          name: 'Entrance',
          width: 1800,
          length: 1500,
          height: 2900,
          furniture: [{ category: 'shoe-rack', name: 'Shoe Rack', width: 900, height: 1200, depth: 350, shelves: 3, drawers: 0, shutters: 1, quantity: 1 }],
        },
      ],
    },

    loft: {
      summary: "Kids' room with a loft bed.",
      rooms: [
        {
          name: "Kids' Room",
          width: 3200,
          length: 3000,
          height: 2900,
          furniture: [{ category: 'loft', name: 'Loft Bed', width: 900, height: 2000, depth: 1900, shelves: 0, drawers: 0, shutters: 0, quantity: 1 }],
        },
      ],
    },

    study: {
      summary: 'Study room with a work table.',
      rooms: [
        {
          name: 'Study Room',
          width: 2800,
          length: 2400,
          height: 2900,
          furniture: [{ category: 'study-table', name: 'Study Table', width: 1200, height: 750, depth: 600, shelves: 2, drawers: 1, shutters: 0, quantity: 1 }],
        },
      ],
    },

    office: {
      summary: 'Home office with a desk.',
      rooms: [
        {
          name: 'Home Office',
          width: 3000,
          length: 2600,
          height: 2900,
          furniture: [{ category: 'office-table', name: 'Office Table', width: 1500, height: 750, depth: 700, shelves: 0, drawers: 2, shutters: 0, quantity: 1 }],
        },
      ],
    },
  };
}

/**
 * Pick a template from prompt keywords (deterministic; unknown prompts → bedroom suite).
 * @param {string} prompt
 */
export function suggestForPrompt(prompt) {
  const p = prompt.toLowerCase();
  const t = templates();
  // Specific keywords are matched before broad ones ("dressing vanity" must not hit
  // the generic "bed" rule via "bedroom").
  if (p.includes('kitchen')) return t.kitchen;
  if (p.includes('wardrobe') || p.includes('almirah')) return t.bedroom;
  if (p.includes('tv') || p.includes('entertainment') || p.includes('living')) return t.living;
  if (p.includes('vanity') || p.includes('makeup') || p.includes('dressing')) return t.vanity;
  if (p.includes('loft')) return t.loft;
  if (p.includes('dining')) return t.dining;
  if (p.includes('shoe')) return t.shoe;
  if (p.includes('study')) return t.study;
  if (p.includes('office') || p.includes('desk')) return t.office;
  if (p.includes('bed')) return t.bedroom;
  return t.bedroom;
}

export default {
  name: 'mock',
  /**
   * @param {{ user: string }} args
   * @returns {Promise<string>} raw JSON text (as an LLM would return it)
   */
  async estimate({ user }) {
    return JSON.stringify(suggestForPrompt(user));
  },
};
