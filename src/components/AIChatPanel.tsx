import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  Loader2, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  FileCode, 
  RotateCcw,
  Sparkles,
  Code2,
  FolderOpen,
  CheckCircle2
} from 'lucide-react';
import { ChatMessage, ProjectFile, Project, ArchitecturePlanResult } from '../types';
import { apiService } from '../services/api';
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import { VoiceActivityHUD } from './VoiceActivityHUD';

interface AIChatPanelProps {
  currentFile?: ProjectFile | null;
  project?: Project;
  onUpdateFile?: (filePath: string, newContent: string) => void;
  onUpdateFiles?: (files: Record<string, string>) => void;
  onProjectReady?: (projectData: {
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
    architecturePlan?: ArchitecturePlanResult;
  }) => void;
  selectedModel?: string;
}

interface GeneratingProgress {
  active: boolean;
  stage: string;
  steps: string[];
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  currentFile,
  project,
  onUpdateFile,
  onUpdateFiles,
  onProjectReady,
  selectedModel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Como posso ajudar no seu projeto hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<GeneratingProgress | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachFileContext, setAttachFileContext] = useState(true);
  
  // Voice & Speech Synthesis states
  const voice = useVoiceInteraction({
    onSendMessage: (spokenText) => {
      handleSend(spokenText);
    },
  });

  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, generatingProgress]);

  useEffect(() => {
    if (voice.liveTranscript) {
      setInput(voice.liveTranscript);
    }
  }, [voice.liveTranscript]);

  const speakText = voice.speakText;

  const toggleVoiceMode = () => {
    if (voice.isVoiceModeActive) {
      voice.toggleVoiceMode();
      setVoiceSpeechEnabled(false);
    } else {
      setVoiceSpeechEnabled(true);
      const greetingText = 'Olá! Estou a ouvir. Como posso ajudar com o seu projeto por voz?';
      const greetingMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `🎙️ **Modo de Voz Ativo:** ${greetingText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'openrouter',
        model: selectedModel || 'MiniMax M3.1',
      };
      setMessages((prev) => [...prev, greetingMsg]);
      voice.toggleVoiceMode(greetingText);
    }
  };

  const toggleListening = () => {
    voice.toggleListening();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Typewriter streaming helper: streams text calmly word-by-word
  const streamTypewriter = async (targetMsgId: string, fullContent: string, delayMs = 18) => {
    const words = fullContent.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      setMessages((prev) =>
        prev.map((m) => (m.id === targetMsgId ? { ...m, content: currentText } : m))
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileReference: attachFileContext && currentFile ? currentFile.path : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Greeting detection: answer calmly and guide the user on what to create
      const isGreeting = /^(?:ol[áa]|oi|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|como\s+vai|e\s+a[ií]|hey|hello)[\s\!\?\.]*$/i.test(text.trim());
      if (isGreeting) {
        const greetingReply = `Olá! Sou o assistente de desenvolvimento do **IMCH AI Developer** e estou aqui pronto para programar com calma e precisão. 🚀

O ambiente de pastas está limpo e sem ficheiros antigos. Qual website ou aplicação você gostaria de criar hoje?
Algumas ideias prontas:
1. **Website de Padaria ou Confeitaria** com catálogo, imagens e botão de pedidos
2. **Aplicação Completa em React** com componentes, estado e renderização interativa
3. **Landing Page Corporativa** com visual moderno, serviços e formulário
4. **Loja Virtual E-Commerce** com carrinho e catálogo de produtos
5. **Dashboard de Métricas** com gráficos interativos

Escreva abaixo o seu prompt e eu analisarei a sua ideia, criarei pasta por pasta e ficheiro por ficheiro em tempo real!`;

        const assistantMsgId = Math.random().toString();
        const placeholderMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'openrouter',
          model: 'MiniMax M3.1',
        };
        setMessages((prev) => [...prev, placeholderMsg]);
        await streamTypewriter(assistantMsgId, greetingReply, 15);
        speakText('Olá! Qual website ou aplicação gostaria de criar hoje?');
        setIsLoading(false);
        return;
      }

      // 2. Incremental edit to existing project files
      const isEditRequest = project && Object.keys(project.files).length > 0 &&
        /(?:muda|altera|troca|define|adiciona|acrescenta|remove|retira|corrige|atualiza)\s+/i.test(text);

      if (isEditRequest && project) {
        let targetFile = currentFile?.path || 'index.html';
        if (/(?:app\.js|preço|carrinho|whatsapp|função|script|dados)/i.test(text) && 'scripts/app.js' in project.files) {
          targetFile = 'scripts/app.js';
        } else if (/(?:style\.css|css|cor|estilo|fundo|tema)/i.test(text) && 'styles/style.css' in project.files) {
          targetFile = 'styles/style.css';
        } else if (/(?:app\.jsx|react|componente)/i.test(text) && 'src/App.jsx' in project.files) {
          targetFile = 'src/App.jsx';
        }

        setGeneratingProgress({
          active: true,
          stage: `A analisar alteração solicitada para o ficheiro ${targetFile}...`,
          steps: [`Ficheiro alvo identificado: ${targetFile}`],
        });

        const fileContentMap: Record<string, string> = {};
        Object.entries(project.files).forEach(([p, f]) => {
          fileContentMap[p] = f.content;
        });

        const res = await apiService.editSite({
          prompt: text,
          currentFile: targetFile,
          currentCode: fileContentMap[targetFile] || '',
          allFiles: fileContentMap,
        });

        setGeneratingProgress((prev) => ({
          active: true,
          stage: `A atualizar código e a sincronizar pré-visualização...`,
          steps: [...(prev?.steps || []), `Código modificado em ${res.updatedFile?.name || targetFile}`],
        }));
        await new Promise((r) => setTimeout(r, 600));

        if (res.updatedFile && onUpdateFile) {
          onUpdateFile(res.updatedFile.name, res.updatedFile.content);
        }

        setGeneratingProgress(null);

        const assistantMsgId = Math.random().toString();
        const placeholderMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'openrouter',
          model: 'MiniMax M3.1',
          updatedFileInfo: res.updatedFile ? {
            filePath: res.updatedFile.name,
            description: res.summary,
          } : undefined,
        };
        setMessages((prev) => [...prev, placeholderMsg]);
        await streamTypewriter(assistantMsgId, res.reply, 18);
        speakText(res.reply);
        return;
      }

      // 3. FULL PROJECT CREATION: 2-step site generation pipeline (Planner -> Coder)
      setGeneratingProgress({
        active: true,
        stage: 'Etapa 1 (Planner): A analisar briefing, paleta de cores e copy final...',
        steps: ['Análise de briefing em curso'],
      });

      const res = await apiService.generateSite({
        prompt: text,
        model: selectedModel,
      });

      if (res && res.files && Object.keys(res.files).length > 0) {
        setGeneratingProgress((prev) => ({
          active: true,
          stage: 'Etapa 2 (Coder): A compilar ficheiros (index.html, styles.css, app.js)...',
          steps: [...(prev?.steps || []), 'Especificação aprovada pelo Planner', 'Ficheiros gerados pelo Coder'],
        }));
        await new Promise((r) => setTimeout(r, 400));

        // Inject all files into workspace
        onUpdateFiles?.(res.files);

        // Set entry file as active
        if (res.files['index.html']) {
          onUpdateFile?.('index.html', res.files['index.html']);
        }

        setGeneratingProgress((prev) => ({
          active: true,
          stage: '✨ Ficheiros sincronizados. A ativar pré-visualização ao vivo...',
          steps: [...(prev?.steps || []), 'Website compilado com sucesso'],
        }));
        await new Promise((r) => setTimeout(r, 300));

        onProjectReady?.({
          projectName: res.projectName || 'Website IMCH',
          description: res.description || text,
          entryFile: res.entryFile || 'index.html',
          files: res.files,
        });

        setGeneratingProgress(null);

        const filesMarkdownList = Object.keys(res.files).map((f) => `- 📄 \`${f}\``).join('\n');

        const fullExplanation = `Gerei o website **${res.projectName}** com sucesso através do gerador de sites IMCH AI em 2 etapas! 🚀

📄 **Ficheiros Gerados (${Object.keys(res.files).length} ficheiros):**
${filesMarkdownList}

💡 **O que foi implementado:**
${res.summary || 'Website moderno gerado com precisão semântica em HTML5, Tailwind CSS e JavaScript interativo.'}

O website já se encontra aberto no editor de código no centro e em execução ao vivo na pré-visualização à direita. Pode editar os ficheiros diretamente ou solicitar novas alterações aqui no chat!`;

        const assistantMsgId = Math.random().toString();
        const placeholderMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'openrouter',
          model: 'MiniMax M3.1',
          projectGenerated: {
            projectName: res.projectName,
            description: res.description,
            entryFile: res.entryFile,
            files: res.files,
          },
          architecturePlan: res.architecturePlan,
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        // Calm typewriter streaming so the user reads peacefully
        await streamTypewriter(assistantMsgId, fullExplanation, 16);
        speakText(`Projeto ${res.projectName} criado com sucesso.`);
        return;
      }

      // 4. Fallback chat if not site creation
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const chatRes = await apiService.sendChat({
        messages: history,
        mode: 'developer',
        model: selectedModel,
        currentFile: attachFileContext && currentFile ? currentFile.path : undefined,
        currentCode: attachFileContext && currentFile ? currentFile.content : undefined,
      });

      const assistantMsgId = Math.random().toString();
      const placeholderMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'openrouter',
        model: chatRes.model || 'MiniMax M3.1',
      };
      setMessages((prev) => [...prev, placeholderMsg]);
      await streamTypewriter(assistantMsgId, chatRes.reply, 18);
      speakText(chatRes.reply);
    } catch (error: any) {
      setGeneratingProgress(null);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚠️ Ocorreu um erro ao processar a tua instrução: ${error.message || 'Erro inesperado'}. Podes tentar novamente.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'openrouter',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setGeneratingProgress(null);
    }
  };

  const quickPrompts = [
    'Criar site de padaria com catálogo e encomendas',
    'Criar site em React com componentes e estado',
    'Landing page corporativa moderna com formulário',
    'Loja virtual com catálogo e carrinho de compras',
    'Dashboard de métricas com gráficos interativos',
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0c0e] border-r border-neutral-200 dark:border-neutral-800/80 select-none overflow-hidden transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-[#0f0f12]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            AI Developer
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: 'welcome-' + Date.now(),
                  role: 'assistant',
                  content: 'Nova sessão iniciada. Em que posso ajudar no seu projeto?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Iniciar uma nova conversa"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Nova Conversa</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mb-1">
              <span>{m.role === 'user' ? 'Tu' : 'IMCH AI Developer'}</span>
              <span>·</span>
              <span>{m.timestamp}</span>
              {m.fileReference && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[120px] text-neutral-500">{m.fileReference}</span>
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-lg text-xs leading-relaxed max-w-[95%] whitespace-pre-wrap select-text ${
                m.role === 'user'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-800'
                  : 'bg-neutral-50 dark:bg-[#101014] text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800/80 shadow-xs'
              }`}
            >
              {m.content}

              {/* Incremental update pill */}
              {m.updatedFileInfo && (
                <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                  <span>✅</span>
                  <span><strong>{m.updatedFileInfo.filePath}</strong> atualizado • Pré-visualização sincronizada</span>
                </div>
              )}

              {/* Project Generated info */}
              {m.projectGenerated && (
                <div className="mt-2.5 p-2.5 bg-blue-50 dark:bg-[#101624] border border-blue-200 dark:border-blue-900/60 rounded text-[11px] space-y-1.5">
                  <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span>✨</span>
                    <span>{m.projectGenerated.projectName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {Object.keys(m.projectGenerated.files).map((f) => (
                      <span key={f} className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-blue-200/60 dark:border-blue-800/60 rounded text-blue-900 dark:text-blue-300">
                        📁 {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {m.role === 'assistant' && m.content && (
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800/60">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {m.timestamp}
                  </span>
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Progressive Creation Box */}
        {generatingProgress && (
          <div className="p-3.5 bg-neutral-900 text-white rounded-xl border border-neutral-700/80 shadow-2xl space-y-2.5 animate-fadeIn font-sans">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>{generatingProgress.stage}</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                A desenvolver...
              </span>
            </div>

            {generatingProgress.steps.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-[11px] font-mono max-h-36 overflow-y-auto">
                {generatingProgress.steps.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{st}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading && !generatingProgress && (
          <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-[#101014] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>IMCH AI Developer a pensar na resposta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Strip */}
      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-[#0a0a0c] flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#08080a] shrink-0">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono mb-2">
          {currentFile && (
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-200">
              <input
                type="checkbox"
                checked={attachFileContext}
                onChange={(e) => setAttachFileContext(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-700 bg-transparent text-blue-600 focus:ring-0"
              />
              <FileCode className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate max-w-[180px] font-medium text-neutral-700 dark:text-neutral-300">
                {currentFile.path}
              </span>
            </label>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                voiceSpeechEnabled 
                  ? 'text-emerald-600 bg-emerald-500/10' 
                  : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title={voiceSpeechEnabled ? 'Voz ativada' : 'Ativar voz'}
            >
              {voiceSpeechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {messages.length > 1 && (
              <button
                onClick={() => setMessages(messages.slice(0, 1))}
                className="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                title="Reiniciar conversa"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Voice Activity HUD with real-time waveform and transcript */}
        <VoiceActivityHUD
          isListening={voice.isListening}
          isVoiceModeActive={voice.isVoiceModeActive}
          audioLevel={voice.audioLevel}
          liveTranscript={voice.liveTranscript}
          micError={voice.micError}
          onCommit={() => voice.commitCurrentTranscript()}
          onCancel={() => voice.stopListening()}
          onClearError={() => voice.clearMicError()}
        />

        <div className="relative bg-neutral-50 dark:bg-[#121215] border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={voice.isVoiceModeActive ? "Fale agora com a IA por voz ou digite..." : "Qual website ou código gostaria de criar hoje? (ex: padaria, React, portfólio...)"}
            className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between mt-1 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px]">
            <div className="flex items-center gap-1 text-neutral-400">
              <span className="font-mono text-[10px]">Enter para enviar</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Button Voz: In-Place Voice Mode with visual signal */}
              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer select-none ${
                  voice.isVoiceModeActive
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-200/80 hover:bg-neutral-300 dark:bg-[#1e1e24] dark:hover:bg-[#282832] text-neutral-700 dark:text-neutral-200 border border-neutral-300/80 dark:border-neutral-700/60'
                }`}
                title={voice.isVoiceModeActive ? "Voz ativa (clique para desativar)" : "Ativar conversa por voz com a IA"}
              >
                {voice.isVoiceModeActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                )}
                <span>Voz</span>
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  voice.isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title={voice.isListening ? 'A escutar... Fale agora' : 'Falar por voz'}
              >
                {voice.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded transition-colors cursor-pointer"
                title="Enviar prompt e gerar site"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
