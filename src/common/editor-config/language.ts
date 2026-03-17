import { Monaco } from '@monaco-editor/react';

export function configLanguage(monaco: Monaco) {
  monaco.languages.register({
    id: 'clarity',
    extensions: ['.clar'],
  });
  monaco.languages.setLanguageConfiguration('clarity', {
    wordPattern: /(-?\d*\.\d\w*)|([^`~!#%^&*()=+\[{\]}\\|;:'",>?\s]+)/g,
    comments: {
      lineComment: ';;',
    },
    brackets: [['(', ')']],
    autoClosingPairs: [
      {
        open: '(',
        close: ')',
      },
      {
        open: '"',
        close: '"',
      },
      {
        open: '{',
        close: '}',
      },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      {
        open: '{',
        close: '}',
      },
      { open: '"', close: '"' },
    ],
  });
}
