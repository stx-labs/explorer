'use client';

import { Box } from '@chakra-ui/react';
import Editor, { EditorProps, Monaco } from '@monaco-editor/react';
import { FrameCorners } from '@phosphor-icons/react';
import Prism from 'prismjs';
import { FC, memo, useState } from 'react';

import { claritySyntax } from '../../common/constants/claritySyntax';
import { autocomplete, hover } from '../../common/editor-config/autocomplete';
import { defineTheme } from '../../common/editor-config/define-theme';
import { liftOff } from '../../common/editor-config/init';
import { configLanguage } from '../../common/editor-config/language';
import { IconButton } from '../IconButton';
import { clarity } from './clarity';

clarity(Prism);

const CodeEditorBase: FC<{ code: string } & Partial<EditorProps>> = ({
  code,
  height: defaultHeight = 252,
  ...editorProps
}) => {
  const handleEditorWillMount = async (monaco: Monaco) => {
    configLanguage(monaco);
    hover(monaco);
    autocomplete(monaco);
    defineTheme(monaco);
    if (claritySyntax) await liftOff(monaco, claritySyntax);
  };
  const defaultHeightNum = Number(defaultHeight);
  const [height, setHeight] = useState<number>(defaultHeightNum);
  const [contentHeight, setContentHeight] = useState<number>(defaultHeightNum);
  return (
    <Box position={'relative'}>
      <Editor
        width={'100%'}
        height={height}
        beforeMount={handleEditorWillMount}
        onMount={editor => {
          setContentHeight(Math.max(editor.getContentHeight(), defaultHeightNum));
          editor.updateOptions({
            wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
          });
        }}
        defaultLanguage="clarity"
        theme="vs-dark"
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
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
        {...editorProps}
      />
      <IconButton
        aria-label={'expand source code'}
        onClick={() => {
          height === contentHeight
            ? setHeight(defaultHeightNum)
            : setHeight(Math.max(contentHeight, defaultHeightNum));
        }}
        position={'absolute'}
        bottom={0}
        right={0}
      >
        <FrameCorners color={'white'} />
      </IconButton>
    </Box>
  );
};

export const CodeEditor = memo(CodeEditorBase);
