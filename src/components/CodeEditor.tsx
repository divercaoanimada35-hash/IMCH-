import React, { useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import { Code2 } from 'lucide-react';
import { ProjectFile } from '../types';

interface CodeEditorProps {
  file?: ProjectFile | null;
  onChangeContent: (newContent: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ file, onChangeContent }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => (file ? file.content.split('\n') : []), [file?.content]);
  const lineCount = lines.length;

  // Determine Prism grammar based on file extension
  const { grammar, langName } = useMemo(() => {
    if (!file) return { grammar: Prism.languages.markup, langName: 'markup' };
    const ext = file.path.split('.').pop()?.toLowerCase();
    if (ext === 'html') return { grammar: Prism.languages.markup, langName: 'markup' };
    if (ext === 'css') return { grammar: Prism.languages.css, langName: 'css' };
    if (ext === 'js') return { grammar: Prism.languages.javascript, langName: 'javascript' };
    if (ext === 'jsx') return { grammar: Prism.languages.javascript, langName: 'javascript' };
    if (ext === 'ts' || ext === 'tsx') return { grammar: Prism.languages.typescript || Prism.languages.javascript, langName: 'typescript' };
    if (ext === 'json') return { grammar: Prism.languages.json || Prism.languages.javascript, langName: 'json' };
    if (ext === 'md') return { grammar: Prism.languages.markdown || Prism.languages.markup, langName: 'markdown' };
    return { grammar: Prism.languages.markup, langName: 'markup' };
  }, [file?.path]);

  // Generate highlighted HTML with permanent syntax highlighting
  const highlightedCode = useMemo(() => {
    if (!file) return '';
    try {
      if (grammar) {
        return Prism.highlight(file.content, grammar, langName);
      }
    } catch (e) {
      console.warn('Prism highlight error:', e);
    }
    return file.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [file?.content, grammar, langName]);

  // Synchronize scroll between textarea, pre, and line numbers gutter
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const updated = value.substring(0, start) + '  ' + value.substring(end);
      onChangeContent(updated);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 bg-[#0a0a0c] select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3 shadow-lg">
          <Code2 className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">Editor de Código Pronto</h3>
        <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
          Nenhum código gerado ainda. Peça à IA no chat à esquerda para criar o seu site ou crie um ficheiro manualmente com o botão (+).
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      {/* Code Area: Gutter + Syntax Highlighted Overlay */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-12 py-3 bg-[#08080a] text-neutral-600 select-none text-right pr-3 border-r border-neutral-800/60 overflow-hidden leading-[20px] font-mono text-[13px] shrink-0"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i} className="tabular-nums">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Viewport with True Syntax Highlighting Overlay */}
        <div className="flex-1 relative overflow-hidden bg-[#0a0a0c]">
          {/* Layer 1: Syntax Highlighted Preview (Pre) */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="editor-layer absolute inset-0 m-0 p-3 overflow-hidden pointer-events-none text-neutral-100 select-none"
            dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
          />

          {/* Layer 2: Editable Transparent Textarea on top with Native Cursor */}
          <textarea
            ref={textareaRef}
            value={file.content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="editor-layer absolute inset-0 w-full h-full m-0 p-3 bg-transparent text-transparent caret-white resize-none focus:outline-none overflow-auto selection:bg-blue-500/35 selection:text-transparent"
          />
        </div>
      </div>
    </div>
  );
};
