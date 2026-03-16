import { Monaco } from '@monaco-editor/react';
import { IRange, Position, editor, languages } from 'monaco-editor';

import { clarity } from './clarity-reference';

const getToken = (line: string, replacer: string) =>
  line
    .replace(`${replacer}`, '')
    .split(' ')
    .map(t => t.replace(new RegExp(/\)/, 'g'), ''))
    .filter(t => t !== ' ')
    .filter(t => t !== '')
    .filter(t => t)[0];

export function autocomplete(monaco: Monaco) {
  const provider: languages.CompletionItemProvider = {
    triggerCharacters: ['(', "'", '"', ' '],
    provideCompletionItems: (model: editor.ITextModel, position: Position) => {
      // // Get all the text content before the cursor
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullRange = model.getFullModelRange();
      const text = model.getValueInRange(fullRange);
      const word = model.getWordUntilPosition(position);
      const lines = text.split('\n');
      const nfts = new Set<string>([]);
      const fts = new Set<string>([]);
      const functions = new Set<string>([]);
      const principals = new Set<string>([]);
      const DEFINE_NFT = `(define-non-fungible-token`;
      const DEFINE_FT = `(define-fungible-token`;
      const DEFINE_PUBLIC = `(define-public (`;
      const DEFINE_READ_ONLY = `(define-read-only (`;

      lines.forEach(line => {
        if (line.includes(" '")) {
          const token = line.split(" '").map(t => t.replace(new RegExp(/\)/, 'g'), ''))[1];
          if (token) {
            principals.add(token);
          }
        }
        if (line.includes(DEFINE_NFT)) {
          const token = getToken(line, `${DEFINE_NFT} `);
          if (token) {
            nfts.add(token);
          }
        }
        if (line.includes(DEFINE_FT)) {
          const token = getToken(line, `${DEFINE_FT} `);
          fts.add(token);
        }
        if (line.includes(DEFINE_PUBLIC)) {
          const token = getToken(line, `${DEFINE_PUBLIC}`);
          functions.add(token);
        }
        if (line.includes(DEFINE_READ_ONLY)) {
          const token = getToken(line, `${DEFINE_READ_ONLY}`);
          functions.add(token);
        }
      });

      const range: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      if (
        /(nft-get-balance|nft-get-supply|nft-mint|nft-burn|nft-get-owner|nft-transfer)\?\s$/.exec(
          textUntilPosition
        ) &&
        Array.from(nfts).length > 0
      ) {
        return {
          suggestions: Array.from(nfts).map(nft => ({
            label: nft,
            insertText: nft,
            kind: monaco.languages.CompletionItemKind.Constant,
            range,
          })),
        };
      }
      if (
        /(ft-get-balance|ft-get-supply|ft-mint|ft-burn|ft-get-owner|ft-transfer)\?\s$/.exec(
          textUntilPosition
        ) &&
        Array.from(fts).length > 0
      ) {
        return {
          suggestions: Array.from(fts).map(nft => ({
            label: nft,
            insertText: nft,
            kind: monaco.languages.CompletionItemKind.Constant,
            range,
          })),
        };
      }

      if (textUntilPosition.endsWith('(')) {
        return {
          suggestions: clarity.functions.map(func => ({
            label: func.name,
            detail: func.input_type,
            documentation: func.description,
            insertText: func.name.split(' ')[0],
            kind: monaco.languages.CompletionItemKind.Function,
            range,
          })),
        };
      }

      return;
    },
  };
  monaco.languages.registerCompletionItemProvider('clarity', provider);
}

export function hover(monaco: Monaco) {
  monaco.languages.registerHoverProvider('clarity', {
    provideHover: (model: editor.ITextModel, position: Position) => {
      const word = model.getWordAtPosition(position);
      const hyphenWordPattern = new RegExp(/((?:\w+-)+\w+)/, 'g');
      const wordsWithHyphens: string[] = Array.from(
        new Set([
          ...Array.from(
            model.getLineContent(position.lineNumber).matchAll(hyphenWordPattern)
          ).flat(),
        ])
      );
      const token =
        (word?.word && wordsWithHyphens?.find(t => t.includes(word.word))) || word?.word;

      const functions = clarity.functions.find(
        func => func.name === token || func.name === `${token}?`
      );

      if (functions) {
        const foundWord =
          model.findMatches(`${token}?`, false, false, false, null, false).find(i => {
            if (i.range.startLineNumber === position.lineNumber) {
              if (position.column >= i.range.startColumn && position.column <= i.range.endColumn) {
                return true;
              }
            }
          }) ||
          model.findMatches(`${token}`, false, false, false, null, false).find(i => {
            if (i.range.startLineNumber === position.lineNumber) {
              if (position.column >= i.range.startColumn && position.column <= i.range.endColumn) {
                return true;
              }
            }
          });
        if (!foundWord) return;
        return {
          range: foundWord?.range || undefined,
          contents: [
            { value: `**${functions.name}**` },
            ...(functions.input_type !== 'Not Applicable'
              ? [{ value: `**Input type** \`${functions.input_type}\`` }]
              : []),
            ...(functions.output_type !== 'Not Applicable'
              ? [{ value: `**Output type** \`${functions.output_type}\`` }]
              : []),
            { value: `**Signature** \`${functions.signature}\`` },
            { value: functions.description },
          ].filter(t => t),
        };
      }

      const keywords = clarity.keywords.find(keyword => keyword.name === token);
      if (keywords) {
        const foundWord = model
          .findMatches(`${token}`, false, false, false, null, false)
          .find(i => {
            if (i.range.startLineNumber === position.lineNumber) {
              if (position.column >= i.range.startColumn && position.column <= i.range.endColumn) {
                return true;
              }
            }
          });
        if (!foundWord) return;
        return {
          range: foundWord?.range || undefined,
          contents: [
            { value: `**${keywords.name}**` },
            ...(keywords.output_type !== 'Not Applicable'
              ? [{ value: `**Output type** \`${keywords.output_type}\`` }]
              : []),
            { value: `\`${keywords.example}\`` },
            { value: keywords.description },
          ].filter(t => t),
        };
      }

      return;
    },
  });
}
