import { describe, it, expect } from 'vitest';
import { DomainError } from '../../shared/errors.js';
import { createAiService } from './ai.service.js';
import { aiSuggestionSchema } from './dto.js';

const validSuggestion = {
  summary: 'A bedroom suite.',
  rooms: [
    {
      name: 'Master Bedroom',
      width: 4000,
      length: 3600,
      height: 2900,
      furniture: [
        { category: 'wardrobe', name: 'Wardrobe 8ft', width: 2400, height: 2400, depth: 600, shelves: 4, drawers: 2, shutters: 4, quantity: 1 },
      ],
    },
  ],
};

const jsonProvider = (name, text) => ({ name, async estimate() { return text; } });

const silent = () => {};

describe('AI service — dispatch & output validation', () => {
  it('uses the default mock provider and returns a validated suggestion', async () => {
    const svc = createAiService({ log: silent });
    const result = await svc.estimate('I need a modular kitchen.');

    expect(result.provider).toBe('mock');
    expect(result.suggestion.rooms[0].furniture[0].category).toBe('kitchen');
    expect(aiSuggestionSchema.safeParse(result.suggestion).success).toBe(true);
  });

  it('dispatches to an explicit provider override', async () => {
    const providers = { mock: jsonProvider('mock', JSON.stringify(validSuggestion)), fake: jsonProvider('fake', JSON.stringify(validSuggestion)) };
    const svc = createAiService({ providers, log: silent });

    const result = await svc.estimate('I need a wardrobe.', { provider: 'fake' });
    expect(result.provider).toBe('fake');
  });

  it('falls back to the default provider for an unknown provider name', async () => {
    const providers = { mock: jsonProvider('mock', JSON.stringify(validSuggestion)) };
    const svc = createAiService({ providers, defaultProvider: 'mock', log: silent });

    const result = await svc.estimate('I need a wardrobe.', { provider: 'nope' });
    expect(result.provider).toBe('mock');
  });

  it('rejects malformed JSON output (INVALID_INPUT)', async () => {
    const providers = { fake: jsonProvider('fake', 'this is not json {') };
    const svc = createAiService({ providers, defaultProvider: 'fake', log: silent });

    let caught;
    try {
      await svc.estimate('I need a wardrobe.');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('INVALID_INPUT');
    expect(caught.message).toContain('not valid JSON');
  });

  it('rejects schema-invalid output (valid JSON, wrong shape) with structured errors', async () => {
    const providers = { fake: jsonProvider('fake', JSON.stringify({ summary: 'x', rooms: [] })) };
    const svc = createAiService({ providers, defaultProvider: 'fake', log: silent });

    let caught;
    try {
      await svc.estimate('I need a wardrobe.');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('INVALID_INPUT');
    expect(caught.message).toContain('schema validation');
    expect(caught.details.errors.length).toBeGreaterThan(0);
  });

  it('rejects an out-of-catalogue category even when the LLM "thinks" it is valid', async () => {
    const bad = { ...validSuggestion, rooms: [{ ...validSuggestion.rooms[0], furniture: [{ ...validSuggestion.rooms[0].furniture[0], category: 'rocket' }] }] };
    const providers = { fake: jsonProvider('fake', JSON.stringify(bad)) };
    const svc = createAiService({ providers, defaultProvider: 'fake', log: silent });

    await expect(svc.estimate('I need a wardrobe.')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('falls back to mock with a log when the provider throws (e.g. missing API key)', async () => {
    const logged = [];
    const providers = {
      mock: jsonProvider('mock', JSON.stringify(validSuggestion)),
      openai: { name: 'openai', async estimate() { throw new Error('OPENAI_API_KEY is not set'); } },
    };
    const svc = createAiService({ providers, defaultProvider: 'openai', log: (message, meta) => logged.push({ message, meta }) });

    const result = await svc.estimate('I need a wardrobe.');
    expect(result.provider).toBe('mock');
    expect(aiSuggestionSchema.safeParse(result.suggestion).success).toBe(true);
    expect(logged).toHaveLength(1);
    expect(logged[0].message).toBe('ai:openai:fallback:mock');
    expect(logged[0].meta.reason).toContain('OPENAI_API_KEY');
  });

  it('falls back to mock with a log when the provider times out', async () => {
    const logged = [];
    const never = new Promise(() => {});
    const providers = {
      mock: jsonProvider('mock', JSON.stringify(validSuggestion)),
      slow: { name: 'slow', estimate: () => never },
    };
    const svc = createAiService({ providers, defaultProvider: 'slow', timeoutMs: 30, log: (message, meta) => logged.push({ message, meta }) });

    const result = await svc.estimate('I need a wardrobe.');
    expect(result.provider).toBe('mock');
    expect(logged[0].meta.reason).toContain('timed out after 30ms');
  });

  it('rejects an out-of-range prompt', async () => {
    const svc = createAiService({ log: silent });
    await expect(svc.estimate('ab')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('exports a process-wide estimate function that reads AI_PROVIDER from env', async () => {
    const { estimateFurniture } = await import('./ai.service.js');
    const result = await estimateFurniture('I need a wardrobe.');
    expect(result.provider).toBe('mock'); // .env has AI_PROVIDER=mock
  });
});
