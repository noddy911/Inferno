import { describe, it, expect } from 'vitest';
import { aiSuggestionSchema } from '../dto.js';
import mockProvider, { suggestForPrompt } from './mock.provider.js';

/** Parse the provider's raw JSON and assert it always validates. */
async function suggestionFor(prompt) {
  const raw = await mockProvider.estimate({ system: 'x', user: prompt });
  const parsed = JSON.parse(raw);
  aiSuggestionSchema.parse(parsed); // throws if invalid
  return parsed;
}

describe('mock provider — keyword heuristics', () => {
  it.each([
    ['modular kitchen', 'kitchen'],
    ['a big wardrobe', 'wardrobe'],
    ['wardrobe and bed for the master bedroom', 'bed'],
    ['tv unit for the living room', 'tv-unit'],
    ['6 seater dining table', 'dining'],
    ['dressing vanity in the bedroom', 'vanity'],
    ['shoe rack near the entrance', 'shoe-rack'],
    ['loft bed for kids', 'loft'],
    ['study table with shelves', 'study-table'],
    ['home office desk', 'office-table'],
    ['something completely unknown', 'wardrobe'], // generic → bedroom suite
  ])('maps "%s" to a %s suggestion', async (prompt, category) => {
    const suggestion = await suggestionFor(prompt);
    const categories = suggestion.rooms.flatMap((r) => r.furniture.map((f) => f.category));
    expect(categories).toContain(category);
  });

  it('is deterministic (same prompt → same output)', async () => {
    const a = await suggestionFor('I need a modular kitchen.');
    const b = await suggestionFor('I need a modular kitchen.');
    expect(a).toEqual(b);
  });

  it('returns schema-valid JSON for every known keyword', async () => {
    for (const prompt of ['kitchen', 'wardrobe', 'tv', 'bed', 'dining', 'vanity', 'shoe', 'loft', 'study', 'office', 'hello']) {
      await suggestionFor(prompt);
    }
  });

  it('exposes suggestForPrompt for direct use', () => {
    const s = suggestForPrompt('I need a modular kitchen');
    expect(s.rooms[0].name).toBe('Modular Kitchen');
    expect(s.summary).toBeTruthy();
  });
});
