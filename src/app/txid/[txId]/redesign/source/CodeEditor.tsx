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
import { forwardRef, memo, useCallback, useRef, useState } from 'react';

import { clarity } from './clarity';

clarity(Prism);

export const DEFAULT_EDITOR_HEIGHT = '500px';
const BUTTONS_HEIGHT = 8;

type CodeEditorProps = {
  code: string;
  /** 1-based line to scroll to and highlight once the editor mounts. */
  revealLine?: number;
} & Partial<EditorProps>;

const HIGHLIGHT_LINE_CLASS = 'code-editor-highlight-line';

const CodeEditorBase = forwardRef<any, CodeEditorProps>(
  ({ code, revealLine, ...editorProps }, ref) => {
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
        editor.updateOptions({
          wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
        });
        if (revealLine) {
          editor.createDecorationsCollection([
            {
              range: new monaco.Range(revealLine, 1, revealLine, 1),
              options: { isWholeLine: true, className: HIGHLIGHT_LINE_CLASS },
            },
          ]);
          editor.revealLineInCenter(revealLine);
        }
      },
      [ref, revealLine]
    );
    const colorMode = useColorMode();

    return (
      <Stack
        css={{
          '& .monaco-editor, & .overflow-guard': { borderRadius: 'redesign.xl' },
          [`& .${HIGHLIGHT_LINE_CLASS}`]: {
            bg: 'feedback.red-150',
            _dark: { bg: 'transactionStatus.failed' },
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
          value={code.replace(/^\s+|\s+$/g, '')}
          keepCurrentModel
          options={{
            fontLigatures: true,
            fontSize: 14,
            minimap: {
              enabled: false,
            },
            readOnly: true,
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
