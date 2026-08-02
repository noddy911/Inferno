import { describe, it, expect } from 'vitest';
import { aiSuggestionSchema, aiEstimateInputSchema, aiApplyInputSchema } from './dto.js';

const validSuggestion = {
  summary: 'A bedroom suite with wardrobe and bed.',
  rooms: [
    {
      name: 'Master Bedroom',
      width: 4000,
      length: 3600,
      height: 2900,
      furniture: [
        { category: 'wardrobe', name: 'Wardrobe 8ft', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1 },
        { category: 'bed', name: 'Queen Bed', width: 1800, height: 450, depth: 2000, quantity: 1 },
      ],
    },
  ],
};

describe('aiSuggestionSchema', () => {
  it('accepts a complete valid suggestion', () => {
    const parsed = aiSuggestionSchema.parse(validSuggestion);
    expect(parsed.rooms).toHaveLength(1);
    expect(parsed.rooms[0].furniture).toHaveLength(2);
  });

  it('applies count defaults (shelves/drawers/shutters → 0, quantity → 1)', () => {
    const parsed = aiSuggestionSchema.parse(validSuggestion);
    expect(parsed.rooms[0].furniture[1]).toMatchObject({ shelves: 0, drawers: 0, shutters: 0, quantity: 1 });
  });

  const validRoom = () => ({
    name: 'R',
    width: 100,
    length: 100,
    height: 100,
    furniture: [{ category: 'bed', name: 'B', width: 100, height: 100, depth: 100 }],
  });

  it.each([
    ['unknown category', { summary: 'x', rooms: [{ ...validRoom(), furniture: [{ category: 'rocket', name: 'x', width: 100, height: 100, depth: 100 }] }] }],
    ['empty rooms', { summary: 'x', rooms: [] }],
    ['room with no furniture', { summary: 'x', rooms: [{ ...validRoom(), furniture: [] }] }],
    ['non-positive dimension', { summary: 'x', rooms: [{ ...validRoom(), width: -1 }] }],
    ['empty summary', { summary: '', rooms: [validRoom()] }],
  ])('rejects %s', (_label, input) => {
    expect(aiSuggestionSchema.safeParse(input).success).toBe(false);
  });
});

describe('aiEstimateInputSchema', () => {
  it('accepts a 3–2000 char prompt', () => {
    expect(aiEstimateInputSchema.parse({ prompt: 'I need a modular kitchen.' }).prompt).toBe('I need a modular kitchen.');
  });

  it.each([['too short', 'ab'], ['empty', '   ']])('rejects a %s prompt', (_label, prompt) => {
    expect(aiEstimateInputSchema.safeParse({ prompt }).success).toBe(false);
  });
});

describe('aiApplyInputSchema', () => {
  it('accepts projectId + suggestion, measure defaults to false', () => {
    const parsed = aiApplyInputSchema.parse({ projectId: 'p1', suggestion: validSuggestion });
    expect(parsed).toMatchObject({ projectId: 'p1', measure: false });
  });

  it('accepts measure: true', () => {
    expect(aiApplyInputSchema.parse({ projectId: 'p1', suggestion: validSuggestion, measure: true }).measure).toBe(true);
  });

  it('rejects a missing projectId and an invalid suggestion', () => {
    expect(aiApplyInputSchema.safeParse({ suggestion: validSuggestion }).success).toBe(false);
    expect(aiApplyInputSchema.safeParse({ projectId: 'p1', suggestion: { summary: 'x', rooms: [] } }).success).toBe(false);
  });
});
