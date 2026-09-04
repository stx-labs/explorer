import { escapeMarkdownTableCell } from '../../../../scripts/tx-diagnosis/lib/report';

describe('evaluation report Markdown', () => {
  it('escapes backslashes before table delimiters in one pass', () => {
    expect(escapeMarkdownTableCell('path\\|<script>\r\nnext')).toBe(
      'path\\\\\\|&lt;script&gt;  next'
    );
  });
});
