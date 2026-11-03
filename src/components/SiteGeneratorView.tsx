import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileCode,
  FolderGit2,
  Eye,
  Code2,
  Download,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Layers,
  Palette,
  Type,
  FileText,
  Loader2,
  X,
  RefreshCw,
  Cpu,
  Info
} from 'lucide-react';
import {
  SiteSpec,
  GenerationProgressStep,
  GenerationError,
  GenerationResult,
} from '../types/generator';
import { generatorApi } from '../services/generatorApi';
import { bundleFilesForIframe } from '../utils/previewBundler';
import { downloadFilesAsZip } from '../utils/zipExporter';

interface SiteGeneratorViewProps {
  onOpenInDeveloper?: (project: {
    name: string;
    description: string;
    files: Record<string, any>;
  }) => void;
  selectedModel: string;
  onOpenModelModal: () => void;
  onSelectModel?: (modelId: string) => void;
}

const EXAMPLE_BRIEFINGS = [
  {
    title: 'Clínica Odontológica Moderna',
    brief:
      'Crie um website moderno e acolhedor para a Clínica Sorriso Perfeito em Luanda. Especializada em ortodontia invisível, implantes e estética dental. Inclua hero impactante com agendamento direto, lista de tratamentos com fotos e valores médios, equipe de doutores renomados, depoimentos em vídeo de pacientes satisfeitos, localização no Talatona e botão de WhatsApp flutuante.',
  },
  {
    title: 'SaaS Financeiro B2B',
    brief:
      'Crie uma landing page de alta conversão para o NexoPay, um software de automação financeira e emissão de notas fiscais para PMEs. Destaque dashboards em tempo real, integração bancária instantânea, planos Starter, Pro e Enterprise com tabela comparativa detalhada, perguntas frequentes e garantia de 14 dias sem cartão.',
  },
  {
    title: 'Empresa de Logística e Fretes',
    brief:
      'Website institucional completo para a TransLog Express. Serviços de transporte rodoviário de cargas pesadas, logística reversa e armazenamento inteligente. Inclua calculadora interativa de cotação de fretes, mapa de rotas nacionais, certificações de segurança e formulário de contato com atendimento 24/7.',
  },
  {
    title: 'Estúdio de Arquitetura & Design',
    brief:
      'Website elegante com tema minimalista escuro para o Atelier Vanguarda Arquitetura. Focado em projetos residenciais de luxo e espaços comerciais sustentáveis. Apresente galeria de projetos com visual limpo, metodologia de trabalho em 4 fases, prêmios internacionais e formulário de consulta com o arquiteto principal.',
  },
];

export const SiteGeneratorView: React.FC<SiteGeneratorViewProps> = ({
  onOpenInDeveloper,
  selectedModel,
  onOpenModelModal,
  onSelectModel,
}) => {
  const [briefing, setBriefing] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgressStep | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [spec, setSpec] = useState<SiteSpec | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'spec'>('preview');
  const [selectedFileForCode, setSelectedFileForCode] = useState<string>('index.html');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check OpenRouter server status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setHasServerKey(Boolean(data.hasOpenRouterKey));
      })
      .catch(() => {
        setHasServerKey(false);
      });
  }, []);

  // Compute bundled HTML for the iframe
  const bundledHtml = useMemo(() => {
    return bundleFilesForIframe(files);
  }, [files]);

  // Handle Generate
  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanBriefing = briefing.trim();
    if (!cleanBriefing || isGenerating) return;

    setError(null);
    setWarnings([]);
    setIsGenerating(true);
    setProgress({
      phase: 'planning',
      message: 'Iniciando gerador de sites IMCH AI (Planner)…',
      percent: 5,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await generatorApi.generateSite({
        briefing: cleanBriefing,
        model: selectedModel,
        signal: controller.signal,
        onProgress: (step) => {
          setProgress(step);
          if (step.phase === 'completed') {
            setIsGenerating(false);
          }
        },
      });

      setSpec(result.spec);
      setFiles(result.files);
      setWarnings(result.warnings || []);
      const firstFile = Object.keys(result.files)[0] || 'index.html';
      setSelectedFileForCode(result.files['index.html'] ? 'index.html' : firstFile);
      setActiveTab('preview');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProgress(null);
        return;
      }
      setError({
        status: err.status || 500,
        message: err.message || 'Erro inesperado na geração do site.',
        details: err.details,
        finishReason: err.finishReason,
      });
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const handleCopyCode = () => {
    const code = files[selectedFileForCode] || '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleDownloadZip = () => {
    if (Object.keys(files).length === 0) return;
    const siteSlug = (spec?.siteName || 'website-imch')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    downloadFilesAsZip(files, `${siteSlug || 'website'}.zip`);
  };

  const handleSendToDeveloper = () => {
    if (!onOpenInDeveloper || Object.keys(files).length === 0) return;
    const formattedFiles: Record<string, any> = {};
    Object.entries(files).forEach(([path, content]) => {
      let language = 'html';
      if (path.endsWith('.css')) language = 'css';
      else if (path.endsWith('.js')) language = 'javascript';
      else if (path.endsWith('.json')) language = 'json';
      formattedFiles[path] = {
        name: path.split('/').pop() || path,
        path,
        content,
        language,
      };
    });

    onOpenInDeveloper({
      name: spec?.siteName || 'Website Gerado',
      description: spec?.description || 'Website construído pelo IMCH AI Site Generator',
      files: formattedFiles,
    });
  };

  const generatedFileList = Object.keys(files);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] text-neutral-100 overflow-y-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="px-6 py-4 border-b border-neutral-800 bg-[#0d0f17]/90 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                IMCH AI — Gerador de Sites
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Fluxo em 2 Etapas
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Planner (arquitetura e copy final em JSON) → Coder (geração individual com JSON Schema estrito)
            </p>
          </div>
        </div>

        {/* Server & Model Status */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenModelModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition-colors cursor-pointer"
            title="Selecionar inteligência artificial no OpenRouter"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-[11px] text-white">
              {selectedModel.split('/')[1] || selectedModel}
            </span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono text-[11px] ${
              hasServerKey
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
                : 'bg-amber-950/30 border-amber-800/60 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasServerKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{hasServerKey ? 'OpenRouter Ativo' : 'Verificar Chave'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Briefing Input / Right Side Workspace Result */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: BRIEFING FORM & GENERATE CONTROLS (4 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 p-6 border-r border-neutral-800/80 bg-[#0c0d14] flex flex-col overflow-y-auto">
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Briefing do Website</span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                {briefing.length} caracteres
              </span>
            </div>

            <div className="relative">
              <textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={7}
                placeholder="Descreva detalhadamente o website que pretende gerar: nome da empresa, nicho, público-alvo, seções desejadas (hero, sobre, serviços, depoimentos, formulário de contato), proposta de valor e preferências visuais..."
                className="w-full p-4 rounded-xl bg-[#12141f] border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none shadow-inner leading-relaxed"
                disabled={isGenerating}
              />

              {briefing.length > 0 && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setBriefing('')}
                  className="absolute right-3 top-3 p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Limpar briefing"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <div className="text-[11px] font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Exemplos de briefings completos da vida real:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_BRIEFINGS.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBriefing(ex.brief)}
                    disabled={isGenerating}
                    className="p-2.5 rounded-lg bg-[#141724] hover:bg-[#1a1f33] border border-neutral-800/80 hover:border-blue-500/40 text-left text-xs transition-all cursor-pointer group"
                  >
                    <div className="font-semibold text-neutral-200 group-hover:text-blue-400 transition-colors">
                      {ex.title}
                    </div>
                    <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                      {ex.brief}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Strict Rules Badges */}
            <div className="p-3 rounded-xl bg-[#10121d] border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
              <div className="font-bold text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Conformidade com os Padrões Rigorosos:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-neutral-400 pl-1">
                <li>Briefing literal entre tags <code className="text-blue-300 font-mono">&lt;briefing&gt;</code>.</li>
                <li>Planner com temperatura 0.3 e Coder com temperatura 0.1.</li>
                <li>Limite de 16.000 tokens e verificação de tamanho (<code className="text-amber-300 font-mono">finish_reason</code>).</li>
                <li>JSON Schema estrito e verificação anti-lorem ipsum.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-sm font-bold transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar Geração</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!briefing.trim() || isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Gerar Website</span>
                </button>
              )}
            </div>
          </form>

          {/* Real-time Loading HUD Panel */}
          {isGenerating && progress && (
            <div className="mt-5 p-4 rounded-xl bg-[#131726] border border-blue-500/40 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {progress.phase === 'planning' ? 'Etapa 1: Planner' : 'Etapa 2: Coder'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Step Message */}
              <p className="text-xs text-neutral-300 font-medium">
                {progress.message}
              </p>

              {progress.currentFile && (
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Arquivo atual: <strong>{progress.currentFile}</strong>{' '}
                    {progress.fileIndex && progress.totalFiles
                      ? `(${progress.fileIndex} de ${progress.totalFiles})`
                      : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Panel (HTTP status & OpenRouter message) */}
          {error && (
            <div className="mt-5 p-4 rounded-xl bg-red-950/30 border border-red-500/60 shadow-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Erro na Geração</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 text-[10px] font-mono font-bold border border-red-700/60">
                  HTTP {error.status}
                </span>
              </div>

              <p className="text-xs text-red-200 leading-relaxed font-medium">
                {error.message}
              </p>

              {error.finishReason === 'length' && (
                <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/50 text-[11px] text-red-300">
                  <strong>Aviso de Limite de Tokens:</strong> A resposta foi truncada pelo modelo (finish_reason: length). Tente simplificar as seções solicitadas no briefing.
                </div>
              )}

              {error.status === 402 && (
                <div className="p-3 rounded-lg bg-red-900/40 border border-red-700/50 text-[11px] text-red-200 space-y-1.5">
                  <p>
                    <strong>Conta sem saldo de créditos pagos (HTTP 402):</strong> A chave OpenRouter configurada está no plano gratuito. Modelos comerciais exigem saldo de créditos.
                  </p>
                  <p className="text-emerald-300 font-semibold">
                    💡 Solução: Utilize o modelo gratuito da OpenRouter (<code>openrouter/free</code>), que é 100% grátis e funciona sem recargas.
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                {error.status === 402 && (
                  <>
                    <a
                      href="https://openrouter.ai/settings/credits"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Comprar Créditos ($)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectModel?.('openrouter/free');
                        localStorage.setItem('imch_selected_model', 'openrouter/free');
                        setTimeout(() => {
                          handleGenerate();
                        }, 50);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Usar Modelo Grátis (openrouter/free)</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}

          {/* Warnings Banner (Anti-Lorem retry feedback) */}
          {warnings.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-600/50 text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Avisos de Validação:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90 pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: WORKSPACE (PREVIEW / CODE INSPECTOR / SPEC) (7 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col bg-[#07080b] min-h-[500px] overflow-hidden">
          {/* Workspace Tabs Header */}
          <div className="h-14 px-6 border-b border-neutral-800 bg-[#0c0e17] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pré-visualização</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Código-fonte ({generatedFileList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('spec')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'spec'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>SPEC do Planner</span>
              </button>
            </div>

            {/* Action Tools (ZIP download, Developer open) */}
            {generatedFileList.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  title="Baixar todos os arquivos como arquivo ZIP"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Baixar ZIP</span>
                </button>

                {onOpenInDeveloper && (
                  <button
                    type="button"
                    onClick={handleSendToDeveloper}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Carregar este projeto no ambiente completo do IMCH AI Developer"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Abrir no Editor</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB CONTENT 1: LIVE PREVIEW (Responsive Iframe with srcdoc) */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-[#050608] relative overflow-hidden">
              {/* Responsive Device Toolbar */}
              <div className="h-10 px-4 bg-[#0a0c12] border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewportMode === 'desktop'
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Desktop (100%)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('tablet')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewportMode === 'tablet'
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewportMode === 'mobile'
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-mono text-neutral-500">
                  {viewportMode === 'desktop' && '100% • Desktop Fluido'}
                  {viewportMode === 'tablet' && '768px • Tablet'}
                  {viewportMode === 'mobile' && '375px • Smartphone'}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (iframeRef.current) {
                      iframeRef.current.srcdoc = bundledHtml;
                    }
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Recarregar preview"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Iframe Container */}
              <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto">
                <div
                  className={`h-full transition-all duration-300 shadow-2xl rounded-lg overflow-hidden border border-neutral-800 bg-white ${
                    viewportMode === 'desktop'
                      ? 'w-full'
                      : viewportMode === 'tablet'
                      ? 'w-[768px]'
                      : 'w-[375px]'
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    title="IMCH AI Live Preview"
                    srcDoc={bundledHtml}
                    sandbox="allow-scripts allow-modals allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: CODE INSPECTOR */}
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* File list sidebar */}
              <div className="w-full md:w-56 p-3 border-r border-neutral-800 bg-[#090b10] flex flex-col gap-1 overflow-y-auto shrink-0">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1 mb-1">
                  Arquivos Gerados
                </div>
                {generatedFileList.map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setSelectedFileForCode(path)}
                    className={`flex items-center justify-between w-full p-2 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer ${
                      selectedFileForCode === path
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{path}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {(files[path]?.length || 0) > 1024
                        ? `${((files[path]?.length || 0) / 1024).toFixed(1)}k`
                        : `${files[path]?.length || 0}b`}
                    </span>
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="flex-1 flex flex-col bg-[#06070a] overflow-hidden">
                <div className="h-10 px-4 bg-[#0a0c12] border-b border-neutral-800 flex items-center justify-between text-xs shrink-0">
                  <span className="font-mono text-neutral-300 font-semibold flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    {selectedFileForCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors cursor-pointer"
                  >
                    {isCopiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  <pre className="font-mono text-xs text-neutral-200 leading-relaxed whitespace-pre font-normal selection:bg-blue-600/40">
                    <code>{files[selectedFileForCode] || '// Arquivo vazio'}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: SPEC INSPECTOR */}
          {activeTab === 'spec' && (
            <div className="flex-1 p-6 bg-[#07080b] overflow-y-auto space-y-6">
              {spec ? (
                <>
                  {/* Brand & Purpose Card */}
                  <div className="p-4 rounded-xl bg-[#0d0f17] border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {spec.siteName}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {spec.language}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {spec.description}
                    </p>
                  </div>

                  {/* Palette & Typography */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Color Palette */}
                    <div className="p-4 rounded-xl bg-[#0d0f17] border border-neutral-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                        <Palette className="w-4 h-4 text-blue-400" />
                        <span>Paleta de Cores Harmônica</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(spec.palette).map(([name, hex]) => (
                          <div
                            key={name}
                            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1 text-[11px]"
                          >
                            <div
                              className="w-full h-7 rounded shadow-inner"
                              style={{ backgroundColor: hex }}
                            />
                            <span className="font-semibold text-neutral-300 capitalize">
                              {name}
                            </span>
                            <span className="font-mono text-neutral-400 text-[10px]">
                              {hex}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="p-4 rounded-xl bg-[#0d0f17] border border-neutral-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                        <Type className="w-4 h-4 text-indigo-400" />
                        <span>Google Fonts Selecionadas</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 uppercase font-mono block">
                            Fonte de Títulos
                          </span>
                          <span className="text-sm font-bold text-white">
                            {spec.fonts.heading}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 uppercase font-mono block">
                            Fonte de Corpo e Textos
                          </span>
                          <span className="text-sm font-medium text-white">
                            {spec.fonts.body}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section by Section Final Copy */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        <span>Copy Final por Seção (Palavra por Palavra)</span>
                      </h4>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {spec.sections.length} seções
                      </span>
                    </div>

                    <div className="space-y-3">
                      {spec.sections.map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className="p-4 rounded-xl bg-[#0d0f17] border border-neutral-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">
                              {idx + 1}. {sec.title}
                            </span>
                            <span className="font-mono text-[10px] text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                              #{sec.id}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800/60 text-neutral-200 leading-relaxed whitespace-pre-wrap">
                            {sec.copy}
                          </div>
                          {sec.details && (
                            <p className="text-[11px] text-neutral-400 italic">
                              Instruções: {sec.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  Nenhuma especificação disponível. Escreva o briefing e gere o site.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
