'use client';

import { CopyButtonRedesign } from '@/common/components/CopyButton';
import { claritySyntax } from '@/common/constants/claritySyntax';
import { autocomplete, hover } from '@/common/editor-config/autocomplete';
import { defineTheme } from '@/common/editor-config/define-theme';
import { liftOff } from '@/common/editor-config/init';
import { configLanguage } from '@/common/editor-config/language';
import { useColorMode } from '@/components/ui/color-mode';
import { Button } from '@/ui/Button';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import Editor, { BeforeMount, EditorProps, Monaco, OnMount } from '@monaco-editor/react';
import { ArrowsOutSimple } from '@phosphor-icons/react';
import Prism from 'prismjs';
import { forwardRef, memo, useCallback, useEffect, useRef, useState } from 'react';

import { clarity } from './clarity';
import { editorLineFor, trimForEditor, trimmedLeadingLines } from './editor-lines';

clarity(Prism);

export const DEFAULT_EDITOR_HEIGHT = '500px';
const BUTTONS_HEIGHT = 8;

type CodeEditorProps = {
  code: string;
  /** 1-based line of the original (untrimmed) source to scroll to and highlight. */
  revealLine?: number;
} & Partial<EditorProps>;

const HIGHLIGHT_LINE_CLASS = 'code-editor-highlight-line';

const CodeEditorBase = forwardRef<any, CodeEditorProps>(
  ({ code, revealLine, ...editorProps }, ref) => {
    // The editor shows the source without its leading/trailing whitespace; line numbers quoted
    // elsewhere (the "Why it failed" card, the API) refer to the original text, so shift them by the
    // blank lines removed at the top.
    const trimmed = trimForEditor(code);
    const leadingLines = trimmedLeadingLines(code);
    const targetLine = revealLine ? editorLineFor(code, revealLine) : undefined;
    // The gutter shows original line numbers, matching the card, the API and the context pack.
    const lineNumbers = useCallback((n: number) => String(n + leadingLines), [leadingLines]);

    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<any>(null);

    const applyHighlight = useCallback(() => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      decorationsRef.current?.clear();
      decorationsRef.current = null;
      if (!targetLine) return;
      decorationsRef.current = editor.createDecorationsCollection([
        {
          range: new monaco.Range(targetLine, 1, targetLine, 1),
          options: { isWholeLine: true, className: HIGHLIGHT_LINE_CLASS },
        },
      ]);
      editor.revealLineInCenter(targetLine);
    }, [targetLine]);

    // Re-apply when the requested line changes after mount (same-page navigation).
    useEffect(() => {
      applyHighlight();
    }, [applyHighlight]);

    const handleEditorBeforeMount: BeforeMount = useCallback(async (monaco: Monaco) => {
      configLanguage(monaco);
      hover(monaco);
      autocomplete(monaco);
      defineTheme(monaco);
      if (claritySyntax) await liftOff(monaco, claritySyntax);
    }, []);
    const handleEditorOnMount: OnMount = useCallback(
      (editor, monaco) => {
        if (ref && 'current' in ref) {
          ref.current = editor;
        }
        editorRef.current = editor;
        monacoRef.current = monaco;
        editor.updateOptions({
          wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
        });
        applyHighlight();
      },
      [ref, applyHighlight]
    );
    const colorMode = useColorMode();

    return (
      <Stack
        css={{
          '& .monaco-editor, & .overflow-guard': { borderRadius: 'redesign.xl' },
          [`& .${HIGHLIGHT_LINE_CLASS}`]: {
            backgroundColor: 'transactionStatus.failed',
          },
        }}
        w="full"
        flexGrow={1}
        minHeight={DEFAULT_EDITOR_HEIGHT}
      >
        <Editor
          width="full"
          beforeMount={handleEditorBeforeMount}
          onMount={handleEditorOnMount}
          defaultLanguage="clarity"
          theme={colorMode.colorMode === 'light' ? 'vs-light' : 'vs-dark'}
          value={trimmed}
          keepCurrentModel
          options={{
            fontLigatures: true,
            fontSize: 14,
            minimap: {
              enabled: false,
            },
            readOnly: true,
            lineNumbers,
            folding: true,
            tabFocusMode: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
          }}
          {...editorProps}
        />
      </Stack>
    );
  }
);

export const CodeEditor = memo(CodeEditorBase);

// HOC to add controls to the code editor
export function withControls(
  WrappedCodeEditor: typeof CodeEditor,
  hasCopyButton = true,
  hasExpandButton = true
) {
  return function CodeEditorWithControls({ code, ...editorProps }: CodeEditorProps) {
    const [codeHeight, setCodeHeight] = useState(DEFAULT_EDITOR_HEIGHT);
    const [isCodeHeightExpanded, setIsCodeHeightExpanded] = useState(false);
    const editorRef = useRef<any>(null);
    const toggleHeight = useCallback(() => {
      setIsCodeHeightExpanded(!isCodeHeightExpanded);
      if (isCodeHeightExpanded) {
        setCodeHeight(DEFAULT_EDITOR_HEIGHT);
      } else {
        setCodeHeight(editorRef.current?.getContentHeight());
      }
    }, [isCodeHeightExpanded]);

    return (
      <Flex position="relative" w="full">
        <Stack
          className="floating-buttons"
          position={'absolute'}
          top={4}
          right={4}
          gap={1.5}
          zIndex="docked"
        >
          {hasCopyButton && (
            <CopyButtonRedesign
              initialValue={code}
              iconProps={{
                h: 3.5,
                w: 3.5,
              }}
              buttonProps={{
                'aria-label': 'Copy source code',
                variant: 'redesignPrimary',
                p: 1.5,
                h: BUTTONS_HEIGHT,
                w: BUTTONS_HEIGHT,
                minW: BUTTONS_HEIGHT,
              }}
            />
          )}
          {hasExpandButton && (
            <Button
              variant="redesignPrimary"
              aria-label={isCodeHeightExpanded ? 'collapse source code' : 'expand source code'}
              aria-expanded={isCodeHeightExpanded}
              onClick={toggleHeight}
              p={1.5}
              h={BUTTONS_HEIGHT}
              w={BUTTONS_HEIGHT}
              minW={BUTTONS_HEIGHT}
            >
              <Icon color="iconInvert" h={3.5} w={3.5}>
                <ArrowsOutSimple />
              </Icon>
            </Button>
          )}
        </Stack>
        <Stack height={codeHeight} w="full">
          <WrappedCodeEditor code={code} ref={editorRef} {...editorProps} />
        </Stack>
      </Flex>
    );
  };
}
