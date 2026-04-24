import { sanitizeErrorBody } from '../useDataVarValue';

describe('sanitizeErrorBody', () => {
  it('returns short bodies unchanged', () => {
    expect(sanitizeErrorBody('not found')).toBe('not found');
  });

  it('truncates bodies over the size cap', () => {
    const body = 'x'.repeat(3000);
    const result = sanitizeErrorBody(body);
    expect(result.length).toBe(2049);
    expect(result.endsWith('…')).toBe(true);
  });

  it('strips control characters but keeps tab and newline', () => {
    const body = 'line1\nline2\tvalue\x1B[31mred\x07\x00';
    expect(sanitizeErrorBody(body)).toBe('line1\nline2\tvalue[31mred');
  });
});
