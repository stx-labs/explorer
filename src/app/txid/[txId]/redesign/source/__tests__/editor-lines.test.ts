import { editorLineFor, trimForEditor, trimmedLeadingLines } from '../editor-lines';

describe('editor line mapping', () => {
  const source = '\n\n;; header\n(define-public (f) (ok true))\n';

  it('trims the text the editor shows', () => {
    expect(trimForEditor(source)).toBe(';; header\n(define-public (f) (ok true))');
  });

  it('preserves indentation on the first non-empty line', () => {
    expect(trimForEditor('\n\n  ;; indented header\n  (ok true)\n')).toBe(
      '  ;; indented header\n  (ok true)'
    );
    expect(trimForEditor('\r\n\t\r\n\t(define-private (f) true)\r\n')).toBe(
      '\t(define-private (f) true)'
    );
  });

  it('counts the blank lines removed at the top', () => {
    expect(trimmedLeadingLines(source)).toBe(2);
    expect(trimmedLeadingLines('  ;; indented first line\n(ok true)')).toBe(0);
    expect(trimmedLeadingLines(';; header')).toBe(0);
  });

  it('shifts original line numbers by the blank lines removed at the top', () => {
    // Line 4 of the original is the define; the editor shows it as its line 2.
    expect(editorLineFor(source, 4)).toBe(2);
    expect(editorLineFor(source, 3)).toBe(1);
  });

  it('leaves sources without leading blank lines alone and never goes below line 1', () => {
    expect(editorLineFor(';; header\n(ok true)', 2)).toBe(2);
    expect(editorLineFor(source, 1)).toBe(1);
  });
});
