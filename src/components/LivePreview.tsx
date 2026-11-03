import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Terminal, 
  ExternalLink,
  ChevronDown,
  Trash2,
  Globe,
  Sparkles,
  Eye
} from 'lucide-react';
import { Project, DeviceMode } from '../types';

interface LivePreviewProps {
  project?: Project | null;
  isDragging?: boolean;
}

interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  text: string;
  time: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ project, isDragging = false }) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasFiles = Boolean(project && project.files && Object.keys(project.files).length > 0);

  // Bundle project files into a self-contained HTML document
  const bundledHtml = useMemo(() => {
    if (!project || !project.files || Object.keys(project.files).length === 0) {
      return '';
    }

    const entry = project.files[project.entryFile] || project.files['index.html'];
    if (!entry) return '<html><body style="font-family:sans-serif;background:#111;color:#888;padding:24px;">Nenhum ficheiro HTML de entrada (index.html) encontrado.</body></html>';

    let html = entry.content;

    // Inject styles (matching full relative path e.g. styles/style.css or base name style.css)
    Object.entries(project.files).forEach(([path, file]) => {
      if (path.endsWith('.css')) {
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filename = (path.split('/').pop() || path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkTagRegex = new RegExp(`<link[^>]*href=["'](?:\\./)?(?:${escapedPath}|${filename})["'][^>]*>`, 'gi');
        if (linkTagRegex.test(html)) {
          html = html.replace(linkTagRegex, `<style>/* ${path} */\n${file.content}\n</style>`);
        } else {
          html = html.replace('</head>', `<style>/* Injected ${path} */\n${file.content}\n</style></head>`);
        }
      }
    });

    // Console logger injection script
    const consoleInterceptor = `
      <script>
        (function() {
          const sendLog = (type, args) => {
            try {
              const text = Array.from(args).map(a => {
                if (typeof a === 'object') return JSON.stringify(a);
                return String(a);
              }).join(' ');
              window.parent.postMessage({ type: 'IMCH_PREVIEW_CONSOLE', logType: type, text: text, time: new Date().toLocaleTimeString() }, '*');
            } catch (e) {}
          };
          const origLog = console.log;
          const origWarn = console.warn;
          const origError = console.error;
          const origInfo = console.info;

          console.log = function() { origLog.apply(console, arguments); sendLog('log', arguments); };
          console.warn = function() { origWarn.apply(console, arguments); sendLog('warn', arguments); };
          console.error = function() { origError.apply(console, arguments); sendLog('error', arguments); };
          console.info = function() { origInfo.apply(console, arguments); sendLog('info', arguments); };

          window.addEventListener('error', function(e) {
            sendLog('error', [e.message + ' at ' + (e.filename || '') + ':' + e.lineno]);
          });
        })();
      </script>
    `;

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${consoleInterceptor}</head>`);
    } else {
      html = `${consoleInterceptor}${html}`;
    }

    // Ensure Tailwind browser CDN is present for styling
    if (!html.includes('tailwindcss')) {
      const twCdn = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>';
      html = html.includes('<head>') ? html.replace('<head>', `<head>${twCdn}`) : `${twCdn}${html}`;
    }

    // Check if project uses React or JSX/TSX
    const isReact = Object.keys(project.files).some((p) => p.endsWith('.jsx') || p.endsWith('.tsx')) ||
      Object.values(project.files).some((f) => f.content.includes('React.') || f.content.includes('useState') || f.content.includes('ReactDOM'));

    if (isReact) {
      if (!html.includes('react.production.min.js')) {
        const reactCdns = `
          <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        `;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${reactCdns}`);
        } else {
          html = `${reactCdns}${html}`;
        }
      }
      if (!html.includes('id="root"')) {
        html = html.replace('<body>', '<body><div id="root"></div>');
      }
      // Ensure Babel standalone has typescript & react presets
      html = html.replace(/<script\s+type="text\/babel"(?!.*data-presets)/gi, '<script type="text/babel" data-presets="env,react,typescript"');
    }

    const hasInlineRenderer = html.includes('ReactDOM.createRoot') || html.includes('ReactDOM.render');

    // Inject or replace scripts
    Object.entries(project.files).forEach(([path, file]) => {
      // Exclude server-side files, backend services, configs, and node files from client browser preview
      if (
        path.startsWith('server') ||
        path.startsWith('Servidor') ||
        path.startsWith('.aistudio') ||
        path === 'server.ts' ||
        path.endsWith('.config.ts') ||
        path.endsWith('.config.js') ||
        path.endsWith('.d.ts') ||
        file.content.includes('import express') ||
        file.content.includes('require("express")')
      ) {
        return;
      }

      const isScript = path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx');
      if (isScript && !path.endsWith('.json')) {
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filename = (path.split('/').pop() || path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const scriptTagRegex = new RegExp(`<script[^>]*src=["'](?:\\./)?(?:${escapedPath}|${filename})["'][^>]*>\\s*</script>`, 'gi');
        const scriptType = (isReact || path.endsWith('.jsx') || path.endsWith('.tsx')) ? 'type="text/babel" data-presets="env,react,typescript"' : '';

        // Strip module imports/exports for clean in-browser standalone execution
        const cleanContent = file.content
          .replace(/import\s+(?:(?:\*\s+as\s+\w+)|(?:{[^}]+})|(?:\w+))\s+from\s+['"][^'"]+['"];?/g, '')
          .replace(/import\s+['"][^'"]+['"];?/g, '')
          .replace(/export\s+(?:default\s+)?/g, '');

        if (scriptTagRegex.test(html)) {
          html = html.replace(scriptTagRegex, `<script ${scriptType}>/* ${path} */\n${cleanContent}\n</script>`);
        } else if (!hasInlineRenderer && !html.includes(file.content) && (path === 'src/App.jsx' || path === 'src/App.tsx' || path === 'scripts/app.js' || path === 'app.js')) {
          html = html.replace('</body>', `<script ${scriptType}>/* Injected ${path} */\n${cleanContent}\n</script></body>`);
        }
      }
    });

    return html;
  }, [project?.files, project?.entryFile, refreshKey]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'IMCH_PREVIEW_CONSOLE') {
        const newMsg: ConsoleMessage = {
          id: Math.random().toString(),
          type: e.data.logType || 'log',
          text: e.data.text || '',
          time: e.data.time || new Date().toLocaleTimeString(),
        };
        setConsoleLogs((prev) => [...prev.slice(-100), newMsg]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOpenNewWindow = () => {
    const blob = new Blob([bundledHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getContainerClasses = () => {
    if (deviceMode === 'mobile') {
      return 'w-full max-w-[375px] h-[680px] my-auto rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 shadow-2xl overflow-hidden';
    }
    if (deviceMode === 'tablet') {
      return 'w-full max-w-[768px] h-full my-auto rounded-xl border border-neutral-300 dark:border-neutral-800 shadow-xl overflow-hidden';
    }
    // Desktop: Uses 100% of available viewport space
    return 'w-full h-full';
  };

  return (
    <div className={`flex-1 flex flex-col bg-neutral-100 dark:bg-[#050505] overflow-hidden ${isFullScreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Top Preview Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/60 dark:bg-[#0a0a0a] text-xs shrink-0 select-none">
        {/* Device Switcher */}
        <div className="flex items-center gap-0.5 bg-neutral-200/60 dark:bg-[#121212] border border-neutral-300/80 dark:border-neutral-800 rounded p-0.5">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-1.5 rounded transition-colors ${
              deviceMode === 'desktop' 
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
            title="Desktop 100% (Aproveitamento total)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1.5 rounded transition-colors ${
              deviceMode === 'tablet' 
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
            title="Tablet 768px"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded transition-colors ${
              deviceMode === 'mobile' 
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
            title="Mobile 375px"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Indicator */}
        <div className="text-neutral-500 text-xs font-mono hidden sm:flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Pré-visualização</span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-400 uppercase text-[10px]">{deviceMode}</span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setRefreshKey((k) => k + 1);
              setConsoleLogs([]);
            }}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors"
            title="Recarregar"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              isConsoleOpen 
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
            title="Abrir Consola"
          >
            <Terminal className="w-3 h-3" />
            <span>Consola</span>
            {consoleLogs.length > 0 && (
              <span className="text-[10px] bg-neutral-300 dark:bg-neutral-700 px-1 rounded font-mono">
                {consoleLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenNewWindow}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors"
            title="Abrir em Nova Aba"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors"
            title={isFullScreen ? 'Sair do Ecrã Inteiro' : 'Ecrã Inteiro'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preview Viewport Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center relative bg-neutral-200/50 dark:bg-[#030303]">
        {/* Transparent overlay during divider drag so iframe does not intercept mouse movements */}
        {isDragging && <div className="absolute inset-0 z-30 bg-transparent cursor-col-resize" />}

        {!hasFiles ? (
          <div className="text-center p-8 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-200 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-400">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Nenhuma pré-visualização ativa
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              O AI Developer está limpo. Peça no chat para criar um website (ex: "crie um site de padaria", "crie um site em React") para visualizar o resultado aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className={`transition-all duration-150 flex flex-col bg-white shadow-xs ${getContainerClasses()}`}>
            <iframe
              ref={iframeRef}
              key={refreshKey}
              srcDoc={bundledHtml}
              title="IMCH Live Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        )}
      </div>

      {/* Bottom Console Drawer */}
      {isConsoleOpen && (
        <div className="h-44 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#090909] flex flex-col font-mono text-xs shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-[#0e0e0e] border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-neutral-900 dark:text-white" />
              <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-200">Consola de Execução do Sandbox</span>
              <span className="text-neutral-400">·</span>
              <span className="text-[10px] text-neutral-500 tabular-nums">{consoleLogs.length} eventos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setConsoleLogs([])}
                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="Limpar Consola"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100 dark:divide-neutral-900/50">
            {consoleLogs.length === 0 ? (
              <div className="text-neutral-400 dark:text-neutral-600 text-[11px] italic p-1">
                Nenhum log emitido. Mensagens de console.log aparecerão aqui em tempo real.
              </div>
            ) : (
              consoleLogs.map((log) => (
                <div key={log.id} className="pt-1 flex items-start gap-2 text-[11px]">
                  <span className="text-neutral-400 dark:text-neutral-600 shrink-0 text-[10px]">{log.time}</span>
                  <span
                    className={`font-semibold shrink-0 uppercase text-[10px] ${
                      log.type === 'error'
                        ? 'text-red-500'
                        : log.type === 'warn'
                        ? 'text-amber-500'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    [{log.type}]
                  </span>
                  <span className="text-neutral-800 dark:text-neutral-200 break-all">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
