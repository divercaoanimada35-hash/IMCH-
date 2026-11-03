import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Mic, 
  MicOff, 
  ArrowUp, 
  Copy, 
  Check, 
  Volume2, 
  Loader2, 
  Bot, 
  User, 
  Code2, 
  RotateCcw, 
  Paperclip, 
  X, 
  History, 
  MessageSquare, 
  Trash2, 
  Search, 
  Clock,
  Sparkles,
  Radio
} from 'lucide-react';
import { ChatMessage, OpenRouterStatus, UserProfile } from '../types';
import { apiService } from '../services/api';
import { historyService, ChatSession } from '../services/history';
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import { VoiceActivityHUD } from './VoiceActivityHUD';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  content: string;
}

interface IMCHChatViewProps {
  onOpenDeveloperWithPrompt: (promptText: string) => void;
  onProjectReady?: (projectData: {
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
    architecturePlan?: any;
    qualityReport?: any;
  }) => void;
  onUpdateFile?: (filePath: string, newContent: string) => void;
  onSwitchToDeveloper?: () => void;
  currentProjectFiles?: Record<string, { content: string }>;
  user?: UserProfile | null;
  onRequireAuth?: (pendingPrompt?: string) => void;
  selectedModel?: string;
}

export const IMCHChatView: React.FC<IMCHChatViewProps> = ({
  onOpenDeveloperWithPrompt,
  onProjectReady,
  onUpdateFile,
  onSwitchToDeveloper,
  currentProjectFiles,
  user,
  onRequireAuth,
  selectedModel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat History Management States
  const [sessions, setSessions] = useState<ChatSession[]>(() => historyService.getSessions(user?.id));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Reload history sessions when user logs in or switches
  useEffect(() => {
    setSessions(historyService.getSessions(user?.id));
  }, [user?.id]);

  // OpenRouter status probe
  const [openRouterStatus, setOpenRouterStatus] = useState<OpenRouterStatus>({
    configured: false,
    model: 'minimax/minimax-m3.1-flash',
  });

  useEffect(() => {
    apiService.getOpenRouterStatus().then(setOpenRouterStatus).catch(() => {});
  }, []);

  // File attachments state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Animated rotating prompts for typewriter effect under title
  const animatedSuggestions = [
    'Escreve uma reflexão sobre inovação e inteligência artificial...',
    'Ajuda-me a criar um prompt para uma landing page moderna...',
    'Explica a diferença entre microsserviços e arquitetura monolítica...',
    'Como posso estruturar uma proposta comercial de tecnologia...',
    'Sugere ideias criativas de nomes para um novo projeto web...',
  ];

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentSuggestion = animatedSuggestions[suggestionIndex];
    let timer: any;

    if (!isDeleting && typedText.length < currentSuggestion.length) {
      timer = setTimeout(() => {
        setTypedText(currentSuggestion.slice(0, typedText.length + 1));
      }, 50);
    } else if (!isDeleting && typedText.length === currentSuggestion.length) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2500);
    } else if (isDeleting && typedText.length > 0) {
      timer = setTimeout(() => {
        setTypedText(currentSuggestion.slice(0, typedText.length - 1));
      }, 20);
    } else if (isDeleting && typedText.length === 0) {
      setIsDeleting(false);
      setSuggestionIndex((prev) => (prev + 1) % animatedSuggestions.length);
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, suggestionIndex]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Hook up voice interaction
  const voice = useVoiceInteraction({
    onSendMessage: (spokenText) => {
      handleSend(spokenText);
    },
  });

  // Sync live transcription into input so user sees what is being recognized
  useEffect(() => {
    if (voice.liveTranscript) {
      setInput(voice.liveTranscript);
    }
  }, [voice.liveTranscript]);

  const speakText = voice.speakText;

  // Toggle in-place voice mode with greeting
  const toggleVoiceMode = () => {
    if (voice.isVoiceModeActive) {
      voice.toggleVoiceMode();
    } else {
      const greetingText = 'Olá! Estou a ouvir. Como posso ajudar você hoje por voz?';
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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');

      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newAttachedFile: AttachedFile = {
          id: Math.random().toString(),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          previewUrl: isImg ? result : undefined,
          content: result || '',
        };
        setAttachedFiles((prev) => [...prev, newAttachedFile]);
      };

      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Active session and search filtering
  const activeSession = sessions.find((s) => s.id === currentSessionId);
  const filteredSessions = sessions.filter((s) => 
    s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
    (s.previewSnippet && s.previewSnippet.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const saveToHistory = (msgs: ChatMessage[], firstPrompt?: string) => {
    const userId = user?.id || 'guest';
    let targetId = currentSessionId;
    let title = activeSession?.title;

    if (!targetId) {
      targetId = `session_${Date.now()}`;
      setCurrentSessionId(targetId);
      if (firstPrompt) {
        title = firstPrompt.slice(0, 42) + (firstPrompt.length > 42 ? '...' : '');
      } else {
        title = 'Nova Conversa';
      }
    }

    const sessionObj: ChatSession = {
      id: targetId,
      userId,
      title: title || 'Conversa IMCH',
      createdAt: activeSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: msgs,
    };

    historyService.saveSession(sessionObj);
    const updated = historyService.getSessions(userId);
    setSessions(updated);
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const userId = user?.id || 'guest';
    const updated = historyService.deleteSession(sessionId, userId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Tens a certeza que desejas limpar todo o histórico de conversas?')) {
      const userId = user?.id || 'guest';
      historyService.clearAll(userId);
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  // Normal conversational send for IMCH Chat
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;

    if (voice.isListening) {
      voice.stopListening();
    }

    const currentFiles = [...attachedFiles];
    setAttachedFiles([]);

    let filesContext = '';
    if (currentFiles.length > 0) {
      filesContext = '\n\n[FICHEIROS ANEXADOS PELO UTILIZADOR]:\n' + currentFiles.map((f) => {
        if (f.type.startsWith('image/')) {
          return `Imagem anexada: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
        }
        const snippet = f.content.slice(0, 10000);
        return `Ficheiro: ${f.name} (${(f.size / 1024).toFixed(1)} KB):\n\`\`\`\n${snippet}\n\`\`\``;
      }).join('\n\n');
    }

    const fullContent = (text || 'Analisa os ficheiros anexados e responde-me.') + filesContext;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text || 'Ficheiros enviados para análise',
      attachedFiles: currentFiles.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: f.previewUrl,
      })),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    saveToHistory(nextMessages, text);
    setInput('');
    setIsLoading(true);

    try {
      // Conversational flow: IMCH Chat is for general dialogue, ideas, prompts, text
      const history = [...messages, { ...userMsg, content: fullContent }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiService.sendChat({
        messages: history,
        mode: voice.isVoiceModeActive ? 'voice' : 'chat',
        model: selectedModel,
      });

      const assistantMsgId = Math.random().toString();
      const placeholderMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'openrouter',
        model: res.model || 'MiniMax M3.1',
      };

      setMessages([...nextMessages, placeholderMsg]);

      // Stream words calmly like someone thinking and writing
      const words = res.reply.split(' ');
      let currentText = '';
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: currentText } : m))
        );
        await new Promise((r) => setTimeout(r, 18));
      }

      const completedMsg: ChatMessage = {
        ...placeholderMsg,
        content: res.reply,
      };
      saveToHistory([...nextMessages, completedMsg]);

      if (voice.isVoiceModeActive) {
        voice.speakText(res.reply);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚠️ Ocorreu um erro ao processar a resposta: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'openrouter',
      };
      const finalMessages = [...nextMessages, errorMsg];
      setMessages(finalMessages);
      saveToHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const promptSuggestions = [
    { 
      title: 'Conversar livremente sobre qualquer assunto', 
      desc: 'Perguntas, ideias, filosofia, ciência e tecnologia', 
      action: () => handleSend('Fala-me sobre como a inteligência artificial está a transformar o dia a dia e que oportunidades existem.') 
    },
    { 
      title: 'Criar prompt para novo website', 
      desc: 'Escrever uma descrição perfeita para o AI Developer', 
      action: () => handleSend('Cria um prompt detalhado e completo para eu construir um website inovador no IMCH AI Developer.') 
    },
    { 
      title: 'Escrever ou revisar um texto profissional', 
      desc: 'Artigos, emails, propostas ou relatórios', 
      action: () => handleSend('Ajuda-me a redigir uma introdução marcante para uma apresentação de projeto inovador.') 
    },
    { 
      title: 'Planeamento de arquitetura de software', 
      desc: 'Como desenhar e estruturar um website full-stack moderno', 
      action: () => handleSend('Quais são as melhores práticas para organizar pastas e serviços numa aplicação full-stack escalável?') 
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0d12] text-neutral-100 transition-colors relative selection:bg-blue-600/30 selection:text-white">
      {/* Developer Grid Background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:24px_24px] opacity-35 z-0" />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        multiple
        className="hidden"
      />

      {/* Top Chat Subheader with History, Voice Call Button and New Chat */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-800/80 bg-[#0a0b10]/90 backdrop-blur-md text-xs shrink-0 select-none z-10 transition-colors">
        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isHistoryOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-[#121216] border-neutral-800 text-neutral-300 hover:bg-neutral-800'
            }`}
            title={isHistoryOpen ? 'Fechar Histórico' : 'Abrir Histórico de Conversas'}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
            {sessions.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isHistoryOpen ? 'bg-blue-800 text-blue-100' : 'bg-neutral-800 text-neutral-300'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1e1e24] border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors cursor-pointer"
            title="Iniciar nova conversa em branco"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Nova Conversa</span>
          </button>
        </div>

        {/* Status indicator when in voice mode */}
        {voice.isVoiceModeActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Voz Ativa com IA</span>
          </div>
        )}
      </div>

      {/* Main Body Area: History Sidebar + Chat Thread Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Histórico Sidebar (Left Panel) */}
        {isHistoryOpen && (
          <aside className="w-72 sm:w-80 shrink-0 h-full border-r border-neutral-800/80 bg-[#0a0b10] flex flex-col z-20 transition-all select-none animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                  Histórico de Conversas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 cursor-pointer"
                title="Fechar painel de histórico"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 border-b border-neutral-800/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Pesquisar conversas..."
                  className="w-full bg-[#121216] border border-neutral-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">Nenhuma conversa encontrada</p>
                  <p className="text-[11px] mt-1 text-neutral-500">
                    {historySearch ? 'Tente outro termo de pesquisa' : 'As conversas que tiver serão guardadas aqui automaticamente'}
                  </p>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isSelected = s.id === currentSessionId;
                  const dateFormatted = new Date(s.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100 shadow-xs'
                          : 'bg-white dark:bg-[#0f0f13] hover:bg-neutral-100 dark:hover:bg-[#15151b] border-neutral-200/80 dark:border-neutral-800/80 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 font-semibold text-xs truncate max-w-[190px]">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'}`} />
                          <span className="truncate">{s.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1 rounded transition-opacity cursor-pointer shrink-0"
                          title="Eliminar esta conversa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {s.previewSnippet && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-1.5">
                          {s.previewSnippet}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{dateFormatted}</span>
                        <span>{s.messages.length} {s.messages.length === 1 ? 'msg' : 'msgs'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {sessions.length > 0 && (
              <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-neutral-500 hover:text-red-500 text-[11px] flex items-center gap-1 cursor-pointer transition-colors px-2 py-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar histórico</span>
                </button>
                <span className="text-[10px] font-mono text-neutral-400">
                  {sessions.length} {sessions.length === 1 ? 'conversa' : 'conversas'}
                </span>
              </div>
            )}
          </aside>
        )}

        {/* Chat Thread Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Messages Thread (or Initial Centered State) */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {messages.length === 0 ? (
              /* Initial Centered Landing View */
              <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full my-auto text-center select-none">
                <div className="relative mb-6 flex flex-col items-center">
                  <div className="absolute -inset-x-12 -top-8 h-28 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-purple-500/10 blur-3xl pointer-events-none rounded-full" />

                  <div className="flex items-center justify-center mb-3 relative">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight font-sans animate-text-shimmer transition-all">
                      Por onde começamos?
                    </h1>
                  </div>

                  {/* Suggestion typewriter pill */}
                  <button
                    type="button"
                    onClick={() => {
                      setInput(animatedSuggestions[suggestionIndex]);
                    }}
                    className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100/90 dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800/80 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-neutral-200/60 dark:hover:bg-[#18181f] text-xs transition-all cursor-pointer shadow-xs max-w-xl"
                    title="Clica para preencher esta sugestão"
                  >
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                      Sugestão
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-300 font-sans truncate">
                      «{typedText}»
                    </span>
                    <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-caret rounded-xs -ml-1" />
                  </button>
                </div>

                {/* Main Pill Input Box */}
                <div className="w-full flex flex-col items-center">
                  {attachedFiles.length > 0 && (
                    <div className="w-full flex flex-wrap gap-2 mb-3 px-2 justify-start">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 bg-neutral-100 dark:bg-[#18181c] border border-neutral-300 dark:border-neutral-700/80 rounded-lg px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 shadow-xs"
                        >
                          {file.previewUrl ? (
                            <img src={file.previewUrl} alt={file.name} className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span className="font-mono text-xs max-w-[160px] truncate">{file.name}</span>
                          <span className="text-[10px] text-neutral-400">({(file.size / 1024).toFixed(0)} KB)</span>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(file.id)}
                            className="text-neutral-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                            title="Remover ficheiro"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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

                  <div className="w-full bg-[#13151c] border border-neutral-800 rounded-full px-4 py-2.5 shadow-sm focus-within:border-neutral-600 focus-within:ring-2 focus-within:ring-neutral-800 transition-all flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleFileClick}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                      title="Adicionar ficheiros, documentos ou imagens"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={voice.isVoiceModeActive ? "Fale agora com a IA por voz ou digite..." : "Pergunta qualquer coisa, conversa ou anexa ficheiros..."}
                      className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none font-sans px-2"
                    />

                    {/* Button Voz: In-Place Voice Mode with visual signal */}
                    <button
                      type="button"
                      onClick={toggleVoiceMode}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                        voice.isVoiceModeActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                          : 'bg-neutral-200/80 hover:bg-neutral-300 dark:bg-[#202026] dark:hover:bg-[#282832] text-neutral-700 dark:text-neutral-200 border border-neutral-300/80 dark:border-neutral-700/60'
                      }`}
                      title={voice.isVoiceModeActive ? "Voz ativa (clique para desativar)" : "Ativar conversa por voz com a IA"}
                    >
                      {voice.isVoiceModeActive && (
                        <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      )}
                      <span>Voz</span>
                    </button>

                    {/* Microphone Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-2 rounded-full transition-all cursor-pointer ${
                        voice.isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                      title={voice.isListening ? 'A escutar... Fale agora' : 'Gravar por voz (Ditado)'}
                    >
                      {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Submit Arrow Button */}
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        input.trim() || attachedFiles.length > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-600 cursor-not-allowed'
                      }`}
                      title="Enviar mensagem"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 w-full max-w-2xl">
                  {promptSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={s.action}
                      className="p-3.5 bg-neutral-50 dark:bg-[#0c0c0e] hover:bg-neutral-100 dark:hover:bg-[#121215] border border-neutral-200 dark:border-neutral-800/80 rounded-xl cursor-pointer text-left transition-all group shadow-xs"
                    >
                      <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {s.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Chat Thread */
              <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className={`space-y-1.5 max-w-[85%] ${m.role === 'user' ? 'items-end' : ''}`}>
                      {m.attachedFiles && m.attachedFiles.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 mb-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {m.attachedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-1.5 bg-neutral-200 dark:bg-[#202026] border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 font-mono"
                            >
                              {file.previewUrl ? (
                                <img src={file.previewUrl} alt={file.name} className="w-3.5 h-3.5 rounded object-cover" />
                              ) : (
                                <Paperclip className="w-3 h-3 text-blue-500" />
                              )}
                              <span className="truncate max-w-[140px] text-[11px]">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap select-text ${
                          m.role === 'user'
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-tr-xs'
                            : 'bg-transparent text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {m.content}

                        {m.role === 'assistant' && (
                          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-xs text-neutral-500 font-mono">
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => speakText(m.content)}
                              className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="Ouvir em áudio"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Ouvir</span>
                            </button>

                            {/* Button to open in Developer if prompt can be built */}
                            <button
                              onClick={() => onOpenDeveloperWithPrompt(m.content.slice(0, 300))}
                              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-sans font-medium cursor-pointer"
                              title="Criar aplicação com esta ideia no IMCH AI Developer"
                            >
                              <Code2 className="w-3.5 h-3.5" />
                              <span>Construir no Developer</span>
                            </button>

                            <span className="ml-auto text-[10px] text-neutral-400 font-mono hidden xs:inline">
                              OpenRouter
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-neutral-200 text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 max-w-3xl">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-3 flex items-center gap-2 text-sm text-neutral-500">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>A processar resposta...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Persistent Bottom Input Bar when in active chat thread */}
          {messages.length > 0 && (
            <div className="p-4 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800/80 shrink-0">
              <div className="max-w-3xl mx-auto w-full flex flex-col">
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 bg-neutral-100 dark:bg-[#18181c] border border-neutral-300 dark:border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 shadow-xs"
                      >
                        {file.previewUrl ? (
                          <img src={file.previewUrl} alt={file.name} className="w-3.5 h-3.5 rounded object-cover" />
                        ) : (
                          <Paperclip className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="font-mono text-xs max-w-[150px] truncate">{file.name}</span>
                        <span className="text-[10px] text-neutral-400">({(file.size / 1024).toFixed(0)} KB)</span>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(file.id)}
                          className="text-neutral-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                          title="Remover ficheiro"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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

                <div className="w-full bg-[#13151c] border border-neutral-800 rounded-full px-4 py-2 shadow-sm focus-within:border-neutral-600 transition-all flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                    title="Nova conversa"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                    title="Adicionar ficheiros ou anexos"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={voice.isVoiceModeActive ? "Fale agora com a IA por voz ou digite..." : "Envia uma mensagem para conversar..."}
                    className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none font-sans px-2"
                  />

                  {/* Button Voz: In-Place Voice Mode with visual signal */}
                  <button
                    type="button"
                    onClick={toggleVoiceMode}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                      voice.isVoiceModeActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                        : 'bg-neutral-200/80 hover:bg-neutral-300 dark:bg-[#202026] dark:hover:bg-[#282832] text-neutral-700 dark:text-neutral-200 border border-neutral-300/80 dark:border-neutral-700/60'
                    }`}
                    title={voice.isVoiceModeActive ? "Voz ativa (clique para desativar)" : "Ativar conversa por voz com a IA"}
                  >
                    {voice.isVoiceModeActive && (
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    )}
                    <span>Voz</span>
                  </button>

                  {/* Microphone Voice Dictation Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      voice.isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title={voice.isListening ? 'A escutar... Fale agora' : 'Gravar por voz (Ditado)'}
                  >
                    {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      input.trim() || attachedFiles.length > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-600 cursor-not-allowed'
                    }`}
                    title="Enviar mensagem"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
