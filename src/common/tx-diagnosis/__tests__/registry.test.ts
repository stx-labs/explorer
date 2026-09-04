import registry from '../registry/known-errors.json';
import { SEMANTIC_TAGS } from '../tags';

describe('known-errors registry schema', () => {
  it('contains valid, unambiguous matchers and copy', () => {
    const exactIds = new Set<string>();
    const matcherCodes = new Set<string>();

    expect(Array.isArray(registry.contracts)).toBe(true);
    expect(registry.contracts.length).toBeGreaterThan(0);

    for (const contract of registry.contracts) {
      const id = contract.match.id?.trim();
      const pattern = contract.match.namePattern?.trim();
      expect([id, pattern].filter(Boolean)).toHaveLength(1);

      if (id) {
        expect(exactIds.has(id)).toBe(false);
        exactIds.add(id);
      }
      if (pattern) expect(() => new RegExp(pattern)).not.toThrow();

      const codes = Object.entries(contract.codes).filter(([, entry]) => entry !== undefined);
      expect(codes.length).toBeGreaterThan(0);
      for (const [code, entry] of codes) {
        if (!entry) throw new Error(`Missing registry entry for ${code}`);
        expect(code.trim()).not.toBe('');
        expect(typeof entry.summary).toBe('string');
        expect((entry.summary as string).trim()).not.toBe('');
        if (entry.tag !== undefined) expect(SEMANTIC_TAGS).toContain(entry.tag);
        for (const copy of [entry.sender, entry.developer]) {
          expect(copy === undefined || copy === null || typeof copy === 'string').toBe(true);
        }

        const matcherCode = `${id ? `id:${id}` : `pattern:${pattern}`}|${code}`;
        expect(matcherCodes.has(matcherCode)).toBe(false);
        matcherCodes.add(matcherCode);
      }
    }
  });
});
