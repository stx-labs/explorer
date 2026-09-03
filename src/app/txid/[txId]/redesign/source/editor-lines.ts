/**
 * The source editor shows contract text without its leading and trailing whitespace, while every
 * line number quoted elsewhere (the "Why it failed" card, the context pack, the API) refers to the
 * original text. These helpers keep the mapping in one place: the gutter shows original numbers and
 * a requested original line lands on the right editor line.
 */

export function trimForEditor(code: string): string {
  return code.replace(/^\s+|\s+$/g, '');
}

/** Blank lines removed from the top of the source by `trimForEditor`. */
export function trimmedLeadingLines(code: string): number {
  return (code.match(/^\s*/)?.[0].match(/\n/g) ?? []).length;
}

/** Map a 1-based line of the original source onto the trimmed text the editor displays. */
export function editorLineFor(code: string, line: number): number {
  return Math.max(1, line - trimmedLeadingLines(code));
}
