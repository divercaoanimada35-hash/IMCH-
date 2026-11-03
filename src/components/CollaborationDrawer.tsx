import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  History, 
  Users, 
  Send, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Clock, 
  FileCode, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Project, UserProfile, CollaboratorUser, CollaborationChatMessage, CollaborationActivityItem } from '../types';
import { collaborationService } from '../services/collaborationService';

interface CollaborationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  currentUser?: UserProfile | null;
  project?: Project;
  projectName?: string;
  projectId?: string;
  collaborators?: CollaboratorUser[];
  isOwner?: boolean;
  onOpenInvite?: () => void;
}

export const CollaborationDrawer: React.FC<CollaborationDrawerProps> = ({
  isOpen,
  onClose,
  user: directUser,
  currentUser,
  project,
  projectName: directProjectName,
  projectId: directProjectId,
  collaborators: propCollaborators,
  isOwner: directIsOwner,
  onOpenInvite,
}) => {
  const user: UserProfile = directUser || currentUser || {
    id: 'guest',
    name: 'Dev Colaborador',
    email: 'dev@imch.ao',
    plan: 'free',
    credits: 0,
    createdAt: '',
  };
  const projectName = directProjectName || project?.name || 'Projeto IMCH';
  const projectId = directProjectId || project?.id || 'imch-project';
  const isOwner = directIsOwner ?? (project?.role === 'owner' || project?.ownerEmail === user.email);

  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'partners'>('chat');
  const [chatMessages, setChatMessages] = useState<CollaborationChatMessage[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>(propCollaborators || []);
  const [activityHistory, setActivityHistory] = useState<CollaborationActivityItem[]>([]);
  const [textInput, setTextInput] = useState('');

  // Audio Note Recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state from service
  useEffect(() => {
    setCollaborators([...collaborationService.collaborators]);
    setChatMessages([...collaborationService.chatMessages]);
    setActivityHistory([...collaborationService.activityHistory]);

    const unsubPresence = collaborationService.onPresence((collabs) => {
      setCollaborators([...collabs]);
    });

    const unsubChat = collaborationService.onChat((msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    const unsubActivity = collaborationService.onActivity((act) => {
      setActivityHistory((prev) => [...prev, act]);
    });

    return () => {
      unsubPresence();
      unsubChat();
      unsubActivity();
    };
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const handleSendText = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return;
    collaborationService.sendChatMessage(textInput.trim(), user);
    setTextInput('');
  };

  // --- Voice / Audio Note Recording ---
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64 Data URL to broadcast via WebSocket
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          collaborationService.sendAudioMessage(base64Data, recordingSeconds || 3, user);
        };
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Não foi possível aceder ao microfone para gravar a nota de voz: ' + err.message);
    }
  };

  const stopRecordingAudio = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const cancelRecordingAudio = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecordingAudio) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  return (
    <div className="w-80 sm:w-96 h-full flex flex-col border-l border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#0c0e14] text-neutral-900 dark:text-neutral-100 shrink-0 z-20 shadow-2xl transition-colors font-sans">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-[#11131a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[190px]">
              {projectName}
            </h4>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              ● Colaboração Ativa ({collaborators.filter((c) => c.isOnline).length} online)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/60 dark:bg-[#090b10] text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0e1017]'
              : 'border-transparent hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0e1017]'
              : 'border-transparent hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Histórico</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          className={`py-2 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'partners'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0e1017]'
              : 'border-transparent hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Equipa ({collaborators.length})</span>
        </button>
      </div>

      {/* Free Plan Notice: No AI Credits Consumed */}
      <div className="px-3 py-1.5 bg-neutral-50 dark:bg-[#11131a] border-b border-neutral-200/60 dark:border-neutral-800/60 text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Comunidade direta</span>
        </span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          0 créditos de IA gastos
        </span>
      </div>

      {/* Tab 1: Chat (Text & Voice Notes) */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {chatMessages.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-xs space-y-1">
                <MessageSquare className="w-6 h-6 mx-auto opacity-40 mb-1" />
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-[10px]">Escreva texto ou envie uma nota de áudio com a sua voz!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderEmail.toLowerCase() === user.email.toLowerCase();
                const isSys = msg.type === 'system';

                if (isSys) {
                  return (
                    <div
                      key={msg.id}
                      className="p-2 rounded-lg bg-neutral-100 dark:bg-[#141720] text-[11px] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 text-center italic"
                    >
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in`}
                  >
                    <div className="text-[10px] text-neutral-400 font-mono mb-0.5 px-1 flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                        {isMe ? 'Você' : msg.senderName}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {msg.type === 'audio' ? (
                      <div
                        className={`p-2.5 rounded-2xl max-w-[85%] border shadow-xs ${
                          isMe
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-neutral-100 dark:bg-[#171a24] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-semibold">Nota de Voz</span>
                          <span className="text-[10px] opacity-75 font-mono ml-auto">
                            {msg.audioDuration}s
                          </span>
                        </div>
                        <audio controls src={msg.audioData} className="w-48 h-8 rounded mt-1" />
                      </div>
                    ) : (
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-neutral-100 dark:bg-[#171a24] text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700/80 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recording Banner when active */}
          {isRecordingAudio && (
            <div className="p-3 bg-red-500/10 border-t border-red-500/30 flex items-center justify-between text-xs text-red-600 dark:text-red-400 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="font-bold">A gravar voz: {recordingSeconds}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecordingAudio}
                  className="px-2 py-1 text-[11px] rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAudio}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          )}

          {/* Chat Input */}
          <form
            onSubmit={handleSendText}
            className="p-2.5 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#0c0e14] flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={startRecordingAudio}
              disabled={isRecordingAudio}
              className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Gravar nota de voz para a equipa"
            >
              <Mic className="w-4 h-4 text-emerald-500" />
            </button>

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Mensagem para o parceiro..."
              className="flex-1 bg-white dark:bg-[#161922] border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!textInput.trim() || isRecordingAudio}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
              title="Enviar mensagem"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Activity History */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Registo de Atividades em Tempo Real
          </div>

          {activityHistory.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 text-xs">
              Nenhuma atividade registada ainda.
            </div>
          ) : (
            activityHistory
              .slice()
              .reverse()
              .map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#141720] border border-neutral-200/80 dark:border-neutral-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {act.userName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {act.timestamp}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <FileCode className="w-3 h-3 text-blue-500 shrink-0" />
                    <span>{act.detail}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Tab 3: Team / Partners */}
      {activeTab === 'partners' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            Membros da Sessão
          </div>

          {collaborators.map((c) => {
            const isMe = c.email.toLowerCase() === user.email.toLowerCase();

            return (
              <div
                key={c.userId}
                className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141720] border border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="truncate">
                    <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                      <span>{c.name}</span>
                      {isMe && <span className="text-[10px] text-neutral-400 font-normal">(Você)</span>}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono truncate">
                      {c.email}
                    </div>
                    {c.activeFile && (
                      <div className="text-[10px] text-blue-500 flex items-center gap-1 mt-0.5 font-mono">
                        <FileCode className="w-2.5 h-2.5" />
                        <span className="truncate">{c.activeFile}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      c.role === 'owner'
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                    }`}
                  >
                    {c.role === 'owner' ? 'Dono' : 'Editor'}
                  </span>

                  <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        c.isOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                      }`}
                    />
                    <span>{c.isOnline ? 'Online' : 'Offline'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
