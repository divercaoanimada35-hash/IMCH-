import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2,
  FilePlus2
} from 'lucide-react';
import { apiService } from '../services/api';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectReady: (projectData: {
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
  }) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectReady,
}) => {
  const [tab, setTab] = useState<'ai' | 'blank'>('ai');
  const [prompt, setPrompt] = useState('');
  const [blankName, setBlankName] = useState('Novo Projeto IMCH');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      setStepText('A gerar código da aplicação com IMCH AI Developer...');

      const res = await apiService.generateSite({
        prompt: prompt.trim(),
      });

      if (res && res.files && Object.keys(res.files).length > 0) {
        onProjectReady({
          projectName: res.projectName || 'Aplicação Web IMCH',
          description: res.description || prompt,
          entryFile: res.entryFile || 'index.html',
          files: res.files,
        });
        onClose();
      } else {
        throw new Error('Formato de resposta inválido.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao gerar projeto.');
    } finally {
      setIsGenerating(false);
      setStepText('');
    }
  };

  const handleCreateBlank = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = blankName.trim() || 'Novo Projeto';
    onProjectReady({
      projectName: cleanName,
      description: 'Projeto web em branco criado no IMCH AI Developer',
      entryFile: 'index.html',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-neutral-950 text-white min-h-screen flex items-center justify-center p-6 antialiased">
  <div class="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 shadow-2xl">
    <h1 class="text-2xl font-bold tracking-tight text-white">${cleanName}</h1>
    <p class="text-sm text-neutral-400">Criado com o IMCH AI Developer. Peça à IA para construir qualquer funcionalidade ou edite o código diretamente.</p>
    <button onclick="handleClick()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-blue-600/20 cursor-pointer">
      Testar Botão
    </button>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
        'style.css': `/* Estilos do projeto */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
`,
        'app.js': `function handleClick() {
  alert('Botão acionado com sucesso no projeto!');
}
console.log('Projeto IMCH iniciado.');
`,
        'README.md': `# ${cleanName}

Criado no IMCH AI Developer.
`,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#0c0c0e] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white uppercase font-mono">
              Iniciar Novo Projeto
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Escolha como deseja inicializar o seu ambiente de desenvolvimento
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-[#111] px-6 text-xs font-medium">
          <button
            onClick={() => setTab('ai')}
            className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'ai'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Criar com Inteligência Artificial</span>
          </button>

          <button
            onClick={() => setTab('blank')}
            className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'blank'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Projeto em Branco</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === 'ai' && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    O que quer construir hoje?
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                    OpenRouter · AI Developer
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Crie um website completo para uma clínica odontológica com marcação de consultas online, secção de equipa, preços e depoimentos com design moderno..."
                  className="w-full bg-neutral-100 dark:bg-[#141416] border border-neutral-300 dark:border-neutral-800 rounded-lg p-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 leading-relaxed"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition-opacity cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{stepText || 'A gerar...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Website</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {tab === 'blank' && (
            <form onSubmit={handleCreateBlank} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  required
                  value={blankName}
                  onChange={(e) => setBlankName(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-[#141416] border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                Serão criados os ficheiros iniciais <code className="font-mono text-neutral-800 dark:text-neutral-200">index.html</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">style.css</code> e <code className="font-mono text-neutral-800 dark:text-neutral-200">app.js</code> prontos para desenvolvimento no editor e pré-visualização.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Criar em Branco
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
