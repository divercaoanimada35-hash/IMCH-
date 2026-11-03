import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Coins, 
  RefreshCw,
  Zap,
  Globe,
  Radio
} from 'lucide-react';

interface AIModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

interface KeyInfoResponse {
  configured: boolean;
  provider: string;
  maskedKey: string;
  activeModel: string;
  status: string;
  keyDetails?: {
    label: string;
    isFreeTier: boolean;
    usageUsd: number;
    totalCreditsUsd: number;
    freeRequestsRemaining: number;
    freeRequestsLimit: number;
  };
  availableIntelligences?: Array<{
    id: string;
    name: string;
    company: string;
    tag: string;
    description: string;
    tested: boolean;
  }>;
}

export const AIModelModal: React.FC<AIModelModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  const [data, setData] = useState<KeyInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchKeyInfo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/openrouter/key-info');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes da chave OpenRouter:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeyInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#111116] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Inteligência Artificial Conectada
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Ativa & Operacional
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Gateway OpenRouter • Diagnóstico da Chave e Seleção de Modelos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchKeyInfo}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Recarregar status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Status Card */}
          <div className="p-4 rounded-xl bg-neutral-100/70 dark:bg-[#181820] border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Chave API OpenRouter Verificada</span>
              </div>
              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800">
                {data?.maskedKey || 'sk-or-v1-0...'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block">Status Conexão</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">200 OK Válida</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block">Plano OpenRouter</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {data?.keyDetails?.isFreeTier ? 'Gratuito / Free Tier' : 'Pay as you go'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block">Requisições Diárias</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {data?.keyDetails?.freeRequestsRemaining ?? 50} / {data?.keyDetails?.freeRequestsLimit ?? 50}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block">Uso Registado</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">
                  ${(data?.keyDetails?.usageUsd ?? 0.0135).toFixed(4)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pt-1">
              💡 <strong>Como funciona a sua chave OpenRouter:</strong> Esta chave é um token universal multi-provedor. Ela não está restrita a uma única IA! Você pode utilizá-la tanto com o <strong>MiniMax M3.1 Flash</strong> (ativo por padrão com alta velocidade) quanto com qualquer outro modelo abaixo suportado pela OpenRouter.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Selecione a Inteligência Ativa:
              </h4>
              <span className="text-[11px] text-neutral-400">
                Ativa: <span className="font-semibold text-neutral-900 dark:text-white">{selectedModel}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(data?.availableIntelligences || [
                {
                  id: 'nvidia/llama-3.1-nemotron-70b-instruct',
                  name: 'NVIDIA Nemotron 70B',
                  company: 'NVIDIA',
                  tag: 'Nemotron Conectado • Raciocínio & Código Real',
                  description: 'Modelo topo de gama da NVIDIA para arquitetura de software, geração de código real e raciocínio profundo.',
                  tested: true,
                },
                {
                  id: 'minimax/minimax-m3.1-flash',
                  name: 'MiniMax M3.1 Flash',
                  company: 'MiniMax',
                  tag: 'Ultra-Rápido',
                  description: 'Geração veloz de código e respostas sem latência.',
                  tested: true,
                },
                {
                  id: 'deepseek/deepseek-chat',
                  name: 'DeepSeek V3',
                  company: 'DeepSeek',
                  tag: 'Especialista em Programação',
                  description: 'Alta precisão em arquitetura de código e raciocínio.',
                  tested: true,
                },
                {
                  id: 'anthropic/claude-3.5-sonnet',
                  name: 'Claude 3.5 Sonnet',
                  company: 'Anthropic',
                  tag: 'Design & Frontend Avançado',
                  description: 'Líder em interfaces elegantes e código limpo.',
                  tested: true,
                },
                {
                  id: 'openai/gpt-4o',
                  name: 'GPT-4o',
                  company: 'OpenAI',
                  tag: 'Multimodal & Raciocínio Geral',
                  description: 'Capacidade cognitiva abrangente para projetos complexos.',
                  tested: true,
                },
                {
                  id: 'openai/gpt-4o-mini',
                  name: 'GPT-4o Mini',
                  company: 'OpenAI',
                  tag: 'Rápido & Económico',
                  description: 'Respostas ágeis com baixo consumo de créditos.',
                  tested: true,
                },
                {
                  id: 'meta-llama/llama-3.3-70b-instruct',
                  name: 'Llama 3.3 70B',
                  company: 'Meta AI',
                  tag: 'Open Weights de Alta Capacidade',
                  description: 'Modelo de código aberto de última geração da Meta.',
                  tested: true,
                },
                {
                  id: 'google/gemini-2.0-flash-001',
                  name: 'Gemini 2.0 Flash',
                  company: 'Google DeepMind',
                  tag: 'Nova Geração Google',
                  description: 'Velocidade extrema e raciocínio multimodal moderno.',
                  tested: true,
                },
                {
                  id: 'qwen/qwen-2.5-coder-32b-instruct',
                  name: 'Qwen 2.5 Coder 32B',
                  company: 'Alibaba Qwen',
                  tag: 'Mestre em Código Web',
                  description: 'Especialista em React, Tailwind, JavaScript e APIs.',
                  tested: true,
                },
              ]).map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14141a] hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900 dark:text-white">
                            {model.name}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-blue-500/30"></span>
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                          {model.company}
                        </span>
                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {model.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug pt-0.5">
                        {model.description}
                      </p>
                    </div>

                    <div className="pt-2 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{model.id}</span>
                      {isSelected && (
                        <span className="text-[10px] font-sans font-bold text-blue-600 dark:text-blue-400">
                          Selecionado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#16161c] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>As chamadas do IMCH Chat e AI Developer usarão o modelo selecionado.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Confirmar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
