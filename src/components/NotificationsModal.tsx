import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Clock, 
  Search, 
  Plus, 
  FolderGit2, 
  User, 
  ArrowRight, 
  Loader2, 
  Volume2, 
  MessageSquare,
  Sparkles,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  FileCode
} from 'lucide-react';
import { UserProfile, CollaborationInvite, Project, DirectSMSMessage } from '../types';
import { collaborationService } from '../services/collaborationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  user?: UserProfile | null;
  invites?: CollaborationInvite[];
  projects?: Project[];
  currentProject?: Project;
  onRefreshInvites?: () => void;
  onAcceptAndOpenProject: (inviteOrProjectId: any, projectName?: string, files?: Record<string, any>) => void;
}

interface ChatContact {
  name: string;
  email: string;
  plan: 'free' | 'pro';
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
  avatarColor: string;
}

const DEFAULT_PARTNERS: ChatContact[] = [];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser: propCurrentUser,
  user: directUser,
  invites: propInvites,
  projects = [],
  currentProject,
  onRefreshInvites,
  onAcceptAndOpenProject,
}) => {
  const activeUser = directUser || propCurrentUser || {
    id: 'usr-imch-solucoes',
    name: 'IMCH Soluções Digitais',
    email: 'imchsolucoes@gmail.com',
    plan: 'pro' as const,
    credits: 99999,
    createdAt: new Date().toISOString(),
  };

  const actingAsUser = activeUser;

  const [activePartnerEmail, setActivePartnerEmail] = useState<string>('');
  const [messages, setMessages] = useState<DirectSMSMessage[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>(() => {
    try {
      const saved = localStorage.getItem('imch_real_chat_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'chat' | 'project'>('chat');
  const [newChatEmail, setNewChatEmail] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [selectedProjectIdToShare, setSelectedProjectIdToShare] = useState<string>('');
  const [projectShareMessage, setProjectShareMessage] = useState('');
  const [isSendingProjectInvite, setIsSendingProjectInvite] = useState(false);
  const [projectInviteFeedback, setProjectInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAttachProjectOpen, setIsAttachProjectOpen] = useState(false);
  const [selectedProjectToAttach, setSelectedProjectToAttach] = useState<Project | null>(null);

  // Available projects created in Developer to share with partners
  const availableProjects: Project[] = React.useMemo(() => {
    const list: Project[] = [];
    if (currentProject && currentProject.id) {
      list.push(currentProject);
    }
    projects.forEach((p) => {
      if (!list.some((existing) => existing.id === p.id)) {
        list.push(p);
      }
    });
    if (list.length === 0) {
      list.push({
        id: 'imch-starter-proj',
        name: 'Projeto IMCH Developer',
        description: 'Projeto web desenvolvido no IMCH AI Developer',
        files: {},
        activeFilePath: '',
        entryFile: 'index.html',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  }, [currentProject, projects]);

  useEffect(() => {
    if (availableProjects.length > 0 && !selectedProjectIdToShare) {
      setSelectedProjectIdToShare(availableProjects[0].id);
    }
  }, [availableProjects, selectedProjectIdToShare]);

  // Audio Voice Note Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Audio Player State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all direct messages for current user
  const fetchMessages = async () => {
    if (!actingAsUser.email) return;
    setIsLoadingMessages(true);
    try {
      const allMsgs = await collaborationService.getDirectMessages(actingAsUser.email);
      setMessages(allMsgs);

      // Mark messages from active partner as read
      if (activePartnerEmail) {
        collaborationService.markSMSAsRead(actingAsUser.email, activePartnerEmail);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens SMS:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load messages on open or user change
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, actingAsUser.email, activePartnerEmail]);

  // Real-time listener for incoming SMS
  useEffect(() => {
    const unsub = collaborationService.onDirectSMS((newMsg) => {
      const myEmail = actingAsUser.email.toLowerCase();
      const msgFrom = newMsg.fromEmail.toLowerCase();
      const msgTo = newMsg.toEmail.toLowerCase();

      if (msgFrom === myEmail || msgTo === myEmail) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // If from active partner, mark as read
        if (msgFrom === activePartnerEmail.toLowerCase()) {
          collaborationService.markSMSAsRead(actingAsUser.email, activePartnerEmail);
        }
      }
    });

    return unsub;
  }, [actingAsUser.email, activePartnerEmail]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePartnerEmail]);

  if (!isOpen) return null;

  // Filter messages for active thread (between actingAsUser and activePartnerEmail)
  const currentThread = messages.filter((m) => {
    const u = actingAsUser.email.toLowerCase();
    const p = activePartnerEmail.toLowerCase();
    const from = m.fromEmail.toLowerCase();
    const to = m.toEmail.toLowerCase();
    return (from === u && to === p) || (from === p && to === u);
  });

  const activePartner = contacts.find(
    (c) => c.email.toLowerCase() === activePartnerEmail.toLowerCase()
  ) || {
    name: activePartnerEmail.split('@')[0],
    email: activePartnerEmail,
    plan: 'free' as const,
    unreadCount: 0,
    isOnline: true,
    avatarColor: '#3b82f6',
  };

  // Send Direct SMS Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = textInput.trim();
    if (!content && !selectedProjectToAttach) return;

    const projectInviteData = selectedProjectToAttach ? {
      inviteId: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: selectedProjectToAttach.id,
      projectName: selectedProjectToAttach.name || 'Projeto IMCH',
      projectDescription: selectedProjectToAttach.description || 'Projeto criado no IMCH AI Developer',
      status: 'pending' as const,
    } : undefined;

    const newSMS: DirectSMSMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromEmail: actingAsUser.email,
      fromName: actingAsUser.name || actingAsUser.email.split('@')[0],
      toEmail: activePartner.email,
      toName: activePartner.name,
      text: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false,
      projectInvite: projectInviteData,
    };

    // Optimistically update thread
    setMessages((prev) => [...prev, newSMS]);
    setTextInput('');
    setSelectedProjectToAttach(null);
    setIsAttachProjectOpen(false);

    // Send through service
    await collaborationService.sendDirectSMS({
      fromEmail: newSMS.fromEmail,
      fromName: newSMS.fromName,
      toEmail: newSMS.toEmail,
      toName: newSMS.toName,
      text: newSMS.text,
      projectInvite: newSMS.projectInvite,
    });
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

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const duration = recordingSeconds || 2;

          const audioMsg: DirectSMSMessage = {
            id: `sms-audio-${Date.now()}`,
            fromEmail: actingAsUser.email,
            fromName: actingAsUser.name || actingAsUser.email.split('@')[0],
            toEmail: activePartner.email,
            toName: activePartner.name,
            text: '🎤 Mensagem de voz',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString(),
            read: false,
            audioData: base64Data,
            audioDuration: duration,
          };

          setMessages((prev) => [...prev, audioMsg]);
          await collaborationService.sendDirectSMS(audioMsg);
        };
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Não foi possível aceder ao microfone: ' + err.message);
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

  // Play audio voice note
  const handlePlayAudio = (msgId: string, audioData: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioData);
    audioPlayerRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
    });
  };

  // Handle Accept Project Invite inside chat bubble
  const handleAcceptProjectInvite = async (inviteData: any) => {
    if (!inviteData?.inviteId) return;

    // Send accept SMS back
    const acceptSMS: DirectSMSMessage = {
      id: `sms-${Date.now()}-accept`,
      fromEmail: actingAsUser.email,
      fromName: actingAsUser.name || actingAsUser.email.split('@')[0],
      toEmail: activePartner.email,
      toName: activePartner.name,
      text: `✅ Aceitei o teu convite! Já entrei no projeto "${inviteData.projectName}". Vamos editar o código juntos!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) =>
      prev.map((m) =>
        m.projectInvite && m.projectInvite.inviteId === inviteData.inviteId
          ? {
              ...m,
              projectInvite: {
                inviteId: m.projectInvite.inviteId,
                projectId: m.projectInvite.projectId,
                projectName: m.projectInvite.projectName,
                projectDescription: m.projectInvite.projectDescription,
                status: 'accepted' as const,
              },
            }
          : m
      ).concat(acceptSMS)
    );

    const res = await collaborationService.acceptInvite(inviteData.inviteId, actingAsUser.email);
    await collaborationService.sendDirectSMS(acceptSMS);

    onAcceptAndOpenProject(inviteData, inviteData.projectName, res.room?.files || {});
    onClose();
  };

  // Handle Start New Conversation with a partner email
  const handleStartNewChat = () => {
    if (!newChatEmail.trim()) return;
    const cleanEmail = newChatEmail.toLowerCase().trim();

    const existing = contacts.find((c) => c.email.toLowerCase() === cleanEmail);
    if (!existing) {
      const newContact: ChatContact = {
        name: newChatName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        plan: 'free',
        unreadCount: 0,
        isOnline: true,
        avatarColor: '#ec4899',
      };
      setContacts((prev) => [newContact, ...prev]);
    }

    setActivePartnerEmail(cleanEmail);
    setIsNewChatModalOpen(false);
    setNewChatEmail('');
    setNewChatName('');
  };

  // Handle Share Project Invite: allows owner to choose a project to share with a partner to edit together
  const handleShareProjectInvite = async () => {
    if (!newChatEmail.trim()) {
      setProjectInviteFeedback({ type: 'error', text: 'Por favor, insira o e-mail do parceiro.' });
      return;
    }
    const cleanEmail = newChatEmail.toLowerCase().trim();
    if (cleanEmail === actingAsUser.email.toLowerCase()) {
      setProjectInviteFeedback({ type: 'error', text: 'Não pode enviar convite para si mesmo.' });
      return;
    }

    const projToShare = availableProjects.find((p) => p.id === selectedProjectIdToShare) || availableProjects[0];
    if (!projToShare) return;

    setIsSendingProjectInvite(true);
    setProjectInviteFeedback(null);

    try {
      const inviteMessageText = projectShareMessage.trim() || `Olá! Convido-te a colaborar e editar o projeto "${projToShare.name}" comigo em tempo real.`;

      const inviteRes = await collaborationService.sendInvite({
        fromUser: actingAsUser,
        toEmail: cleanEmail,
        projectId: projToShare.id,
        projectName: projToShare.name,
        projectDescription: projToShare.description,
        message: inviteMessageText,
      });

      if (!inviteRes.success) {
        setProjectInviteFeedback({ type: 'error', text: inviteRes.error || 'Erro ao enviar convite.' });
        setIsSendingProjectInvite(false);
        return;
      }

      const inviteId = inviteRes.invite?.id || `inv-${Date.now()}`;
      const projectInviteData = {
        inviteId,
        projectId: projToShare.id,
        projectName: projToShare.name,
        projectDescription: projToShare.description,
        status: 'pending' as const,
      };

      const newInviteMsg: DirectSMSMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fromEmail: actingAsUser.email,
        fromName: actingAsUser.name || actingAsUser.email.split('@')[0],
        toEmail: cleanEmail,
        toName: newChatName.trim() || cleanEmail.split('@')[0],
        text: inviteMessageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        read: false,
        projectInvite: projectInviteData,
      };

      const existing = contacts.find((c) => c.email.toLowerCase() === cleanEmail);
      if (!existing) {
        const newContact: ChatContact = {
          name: newChatName.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          plan: 'free',
          unreadCount: 0,
          isOnline: true,
          avatarColor: '#10b981',
        };
        setContacts((prev) => [newContact, ...prev]);
      }

      setMessages((prev) => [...prev, newInviteMsg]);
      setActivePartnerEmail(cleanEmail);
      await collaborationService.sendDirectSMS(newInviteMsg);
      onRefreshInvites?.();

      setProjectInviteFeedback({
        type: 'success',
        text: `Convite enviado com sucesso para ${cleanEmail}! O parceiro verá o convite no seu perfil e notificações para aceitar e editar o projeto juntos.`,
      });

      setTimeout(() => {
        setIsNewChatModalOpen(false);
        setProjectInviteFeedback(null);
        setNewChatEmail('');
        setNewChatName('');
        setProjectShareMessage('');
      }, 1500);
    } catch (err: any) {
      setProjectInviteFeedback({ type: 'error', text: err?.message || 'Erro inesperado ao enviar convite.' });
    } finally {
      setIsSendingProjectInvite(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-[#111b21] text-[#e9edef] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-[#222d34] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* LEFT PANEL: CONVERSATIONS / CONTACTS LIST (WhatsApp Style) */}
        {/* ========================================================= */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-[#222d34] bg-[#111b21] shrink-0">
          {/* Top Bar of Left Panel */}
          <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34] shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {actingAsUser.name ? actingAsUser.name.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#202c33]"></span>
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-[#e9edef] truncate">
                  {actingAsUser.name}
                </div>
                <div className="text-[11px] text-[#8696a0] truncate font-mono">
                  {actingAsUser.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-white transition-colors cursor-pointer"
                title="Nova conversa ou partilhar projeto"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-[#111b21] border-b border-[#222d34]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#202c33] text-[#8696a0] focus-within:text-[#00a884]">
              <Search className="w-4 h-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar conversa ou contacto..."
                className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/40">
            {filteredContacts.length === 0 && (
              <div className="p-6 text-center text-[#8696a0] text-xs space-y-3">
                <Users className="w-8 h-8 mx-auto text-[#8696a0]/50" />
                <p>Nenhuma conversa iniciada ainda.</p>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Iniciar Conversa com Parceiro
                </button>
              </div>
            )}
            {filteredContacts.map((contact) => {
              const isSelected = contact.email.toLowerCase() === activePartnerEmail.toLowerCase();
              
              // Find last message in this thread
              const threadMsgs = messages.filter((m) => {
                const u = actingAsUser.email.toLowerCase();
                const p = contact.email.toLowerCase();
                return (
                  (m.fromEmail.toLowerCase() === u && m.toEmail.toLowerCase() === p) ||
                  (m.fromEmail.toLowerCase() === p && m.toEmail.toLowerCase() === u)
                );
              });
              const lastMsg = threadMsgs[threadMsgs.length - 1];
              const snippet = lastMsg ? (lastMsg.audioData ? '🎤 Nota de voz' : lastMsg.text || 'Projeto partilhado') : contact.lastMessageText;
              const time = lastMsg ? lastMsg.timestamp : contact.lastMessageTime;

              return (
                <div
                  key={contact.email}
                  onClick={() => {
                    setActivePartnerEmail(contact.email);
                    collaborationService.markSMSAsRead(actingAsUser.email, contact.email);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div 
                      className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-sm shadow-sm"
                      style={{ backgroundColor: contact.avatarColor }}
                    >
                      {contact.name.slice(0, 1).toUpperCase()}
                    </div>
                    {contact.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111b21]"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-[#e9edef] truncate">
                        {contact.name}
                      </h4>
                      <span className="text-[10px] text-[#8696a0] font-mono shrink-0 ml-1">
                        {time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8696a0]">
                      <p className="truncate text-[12px] flex items-center gap-1">
                        {lastMsg && lastMsg.fromEmail.toLowerCase() === actingAsUser.email.toLowerCase() && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                        )}
                        <span className="truncate">{snippet}</span>
                      </p>

                      {contact.unreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#00a884] text-white text-[10px] font-bold shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: WHATSAPP ACTIVE CHAT THREAD CANVAS */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col bg-[#0b141a] relative min-w-0">
          {/* Top Header of Active Chat */}
          <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34] shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div 
                  className="w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-sm shadow-md"
                  style={{ backgroundColor: activePartner.avatarColor }}
                >
                  {activePartner.name.slice(0, 1).toUpperCase()}
                </div>
                {activePartner.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#202c33]"></span>
                )}
              </div>

              <div className="truncate">
                <h3 className="font-bold text-sm text-[#e9edef] truncate flex items-center gap-2">
                  <span>{activePartner.name}</span>
                  {activePartner.plan === 'pro' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PRO
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[#00a884] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-pulse"></span>
                  <span>online agora</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-white transition-colors cursor-pointer"
                title="Fechar Mensagens"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Canvas Area (WhatsApp wallpaper effect) */}
          <div 
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.03) 0, rgba(0, 0, 0, 0) 100%)',
            }}
          >
            {/* Date separator badge */}
            <div className="flex justify-center my-2">
              <span className="px-3 py-1 rounded-lg bg-[#182229] border border-[#222d34] text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider shadow-xs">
                Colaboração em Tempo Real
              </span>
            </div>

            {currentThread.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8696a0] space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto text-[#00a884] opacity-50" />
                <p className="font-semibold text-[#e9edef]">
                  Inicia a conversa com {activePartner.name}
                </p>
                <p className="text-[11px] max-w-sm mx-auto text-[#8696a0]">
                  Envia uma mensagem, anexa um projeto criado no Developer ou envia uma nota de voz.
                </p>
              </div>
            ) : (
              currentThread.map((msg) => {
                const isSentByMe = msg.fromEmail.toLowerCase() === actingAsUser.email.toLowerCase();

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} animate-in fade-in`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md ${
                        isSentByMe
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                      }`}
                    >
                      {/* Sender label for incoming */}
                      {!isSentByMe && (
                        <div className="text-[11px] font-bold text-[#00a884] mb-1">
                          {msg.fromName || activePartner.name}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.text && (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                          {msg.text}
                        </div>
                      )}

                      {/* Attached Audio Voice Note */}
                      {msg.audioData && (
                        <div className="flex items-center gap-3 my-1.5 p-2 rounded-xl bg-black/20 border border-white/10 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(msg.id, msg.audioData!)}
                            className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer shadow-md"
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4 fill-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center gap-1 h-4">
                              <span className={`w-1 h-3 rounded-full bg-white/80 ${playingAudioId === msg.id ? 'animate-pulse' : ''}`}></span>
                              <span className={`w-1 h-5 rounded-full bg-white/80 ${playingAudioId === msg.id ? 'animate-pulse delay-75' : ''}`}></span>
                              <span className={`w-1 h-2 rounded-full bg-white/80 ${playingAudioId === msg.id ? 'animate-pulse delay-100' : ''}`}></span>
                              <span className={`w-1 h-4 rounded-full bg-white/80 ${playingAudioId === msg.id ? 'animate-pulse delay-150' : ''}`}></span>
                              <span className={`w-1 h-3 rounded-full bg-white/80 ${playingAudioId === msg.id ? 'animate-pulse' : ''}`}></span>
                            </div>
                            <span className="text-[10px] text-white/70 font-mono">
                              0:0{msg.audioDuration || 3}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Attached Project Card */}
                      {msg.projectInvite && (
                        <div className="my-2 p-3 rounded-xl bg-[#111b21] border border-[#2a3942] text-xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold text-white">
                              <FolderGit2 className="w-4 h-4 text-[#00a884] shrink-0" />
                              <span className="truncate">{msg.projectInvite.projectName}</span>
                            </div>

                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                                msg.projectInvite.status === 'accepted'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : msg.projectInvite.status === 'declined'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              }`}
                            >
                              {msg.projectInvite.status === 'accepted'
                                ? 'Aceite'
                                : msg.projectInvite.status === 'declined'
                                ? 'Recusado'
                                : 'Pendente'}
                            </span>
                          </div>

                          {msg.projectInvite.projectDescription && (
                            <p className="text-[11px] text-[#8696a0] line-clamp-2">
                              {msg.projectInvite.projectDescription}
                            </p>
                          )}

                          {/* Action Buttons if Pending and Recipient */}
                          {!isSentByMe && msg.projectInvite.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-2 border-t border-[#222d34]">
                              <button
                                type="button"
                                onClick={() => handleAcceptProjectInvite(msg.projectInvite)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Aceitar e Abrir Projeto</span>
                              </button>
                            </div>
                          )}

                          {/* If already accepted */}
                          {msg.projectInvite.status === 'accepted' && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.projectInvite) {
                                    onAcceptAndOpenProject(msg.projectInvite, msg.projectInvite.projectName);
                                    onClose();
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-bold text-xs transition-colors border border-[#00a884]/40 cursor-pointer"
                              >
                                <span>Abrir no Editor de Código</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamp & Double Checkmarks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                        <span>{msg.timestamp}</span>
                        {isSentByMe && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Project Attachment Popover */}
          {isAttachProjectOpen && (
            <div className="p-3 bg-[#202c33] border-t border-[#222d34] animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#e9edef] flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>Escolhe um Projeto do Developer para Anexar:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAttachProjectOpen(false)}
                  className="text-[#8696a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {(projects.length > 0 ? projects : (currentProject ? [currentProject] : [])).map((p) => {
                  const isSelected = selectedProjectToAttach?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectToAttach(p)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'border-[#00a884] bg-[#00a884]/10 text-white'
                          : 'border-[#2a3942] bg-[#111b21] hover:border-[#8696a0] text-[#e9edef]'
                      }`}
                    >
                      <div className="font-bold truncate">{p.name || 'Projeto IMCH'}</div>
                      <div className="text-[10px] text-[#8696a0] truncate">
                        {Object.keys(p.files || {}).length} ficheiros • Entrada: {p.entryFile || 'index.html'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedProjectToAttach && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#00a884]">
                  <span>Projeto selecionado: <strong>{selectedProjectToAttach.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => setIsAttachProjectOpen(false)}
                    className="px-2 py-0.5 rounded bg-[#00a884] text-white text-[11px] font-bold"
                  >
                    Confirmar Anexo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attached project indicator above input */}
          {selectedProjectToAttach && !isAttachProjectOpen && (
            <div className="px-4 py-1.5 bg-[#182229] border-t border-[#222d34] flex items-center justify-between text-xs text-[#00a884]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Projeto anexado: <strong>{selectedProjectToAttach.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectToAttach(null)}
                className="text-[#8696a0] hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom WhatsApp Input Bar */}
          <div className="p-3 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 shrink-0">
            {/* Paperclip / Attach Project button */}
            <button
              type="button"
              onClick={() => setIsAttachProjectOpen(!isAttachProjectOpen)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isAttachProjectOpen || selectedProjectToAttach
                  ? 'bg-[#00a884] text-white'
                  : 'text-[#8696a0] hover:text-white hover:bg-[#374248]'
              }`}
              title="Anexar projeto do Developer para partilhar"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Input Form or Audio Recording Indicator */}
            {isRecordingAudio ? (
              <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>A gravar nota de voz: {recordingSeconds}s</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecordingAudio}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Parar e Enviar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Escreve uma mensagem..."
                  className="flex-1 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884] transition-all"
                />

                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={startRecordingAudio}
                  className="p-2.5 rounded-full text-[#8696a0] hover:text-white hover:bg-[#374248] transition-colors cursor-pointer"
                  title="Gravar nota de voz (sem gastar créditos de IA)"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!textInput.trim() && !selectedProjectToAttach}
                  className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white transition-all shadow-md cursor-pointer shrink-0"
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* New Chat & Project Share Modal */}
      {isNewChatModalOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setIsNewChatModalOpen(false);
            setProjectInviteFeedback(null);
          }}
        >
          <div 
            className="w-full max-w-lg bg-[#202c33] border border-[#2a3942] rounded-2xl p-6 shadow-2xl space-y-4 text-[#e9edef]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: without the old descriptive text from Image 1 */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00a884]" />
                <span>Nova Conversa / Convidar Parceiro</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setProjectInviteFeedback(null);
                }}
                className="text-[#8696a0] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#2a3942] gap-1">
              <button
                type="button"
                onClick={() => {
                  setNewChatTab('chat');
                  setProjectInviteFeedback(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  newChatTab === 'chat'
                    ? 'border-[#00a884] text-[#00a884]'
                    : 'border-transparent text-[#8696a0] hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Conversa Direta</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewChatTab('project');
                  setProjectInviteFeedback(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  newChatTab === 'project'
                    ? 'border-[#00a884] text-[#00a884]'
                    : 'border-transparent text-[#8696a0] hover:text-white'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Compartilhar Projeto</span>
              </button>
            </div>

            {/* TAB 1: Conversa Direta */}
            {newChatTab === 'chat' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    E-mail do Parceiro:
                  </label>
                  <input
                    type="email"
                    value={newChatEmail}
                    onChange={(e) => setNewChatEmail(e.target.value)}
                    placeholder="ex: parceiro@imch.pt"
                    className="w-full px-3 py-2 rounded-lg bg-[#111b21] border border-[#2a3942] text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    Nome (opcional):
                  </label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="ex: João Silva"
                    className="w-full px-3 py-2 rounded-lg bg-[#111b21] border border-[#2a3942] text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewChatModalOpen(false);
                      setProjectInviteFeedback(null);
                    }}
                    className="px-4 py-2 rounded-lg text-xs text-[#8696a0] hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    disabled={!newChatEmail.trim()}
                    className="px-5 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    Iniciar Conversa
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Compartilhar Projeto para Editarem Juntos */}
            {newChatTab === 'project' && (
              <div className="space-y-3 pt-1">
                {/* Escolher Projeto do Proprietário */}
                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1.5 flex items-center justify-between">
                    <span>Projeto a Compartilhar:</span>
                    <span className="text-[10px] text-[#00a884] font-mono">Editar Juntos em Tempo Real</span>
                  </label>

                  <select
                    value={selectedProjectIdToShare}
                    onChange={(e) => setSelectedProjectIdToShare(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111b21] border border-[#2a3942] text-sm text-white focus:outline-none focus:border-[#00a884] cursor-pointer"
                  >
                    {availableProjects.map((p) => {
                      const fileCount = Object.keys(p.files || {}).length;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({fileCount} {fileCount === 1 ? 'ficheiro' : 'ficheiros'})
                        </option>
                      );
                    })}
                  </select>

                  {/* Selected Project Card Preview */}
                  {(() => {
                    const currentSelected = availableProjects.find((p) => p.id === selectedProjectIdToShare) || availableProjects[0];
                    if (!currentSelected) return null;
                    const fileCount = Object.keys(currentSelected.files || {}).length;
                    return (
                      <div className="mt-2 p-2.5 rounded-lg bg-[#111b21] border border-[#2a3942] flex items-center gap-2.5">
                        <FolderGit2 className="w-4 h-4 text-[#00a884] shrink-0" />
                        <div className="truncate flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {currentSelected.name}
                          </div>
                          <div className="text-[10px] text-[#8696a0] truncate">
                            {fileCount} {fileCount === 1 ? 'ficheiro' : 'ficheiros'} • Entrada: {currentSelected.entryFile || 'index.html'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* E-mail do Parceiro com quem quer compartilhar */}
                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    E-mail do Parceiro (registado no AI Developer):
                  </label>
                  <input
                    type="email"
                    value={newChatEmail}
                    onChange={(e) => {
                      setNewChatEmail(e.target.value);
                      if (projectInviteFeedback) setProjectInviteFeedback(null);
                    }}
                    placeholder="ex: parceiro@imch.pt"
                    className="w-full px-3 py-2 rounded-lg bg-[#111b21] border border-[#2a3942] text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                  />
                </div>

                {/* Mensagem do Convite */}
                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    Mensagem de Convite:
                  </label>
                  <textarea
                    rows={2}
                    value={projectShareMessage}
                    onChange={(e) => setProjectShareMessage(e.target.value)}
                    placeholder="Olá! Convido-te a colaborar e editar este projeto comigo em tempo real."
                    className="w-full px-3 py-2 rounded-lg bg-[#111b21] border border-[#2a3942] text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] resize-none"
                  />
                </div>

                {/* Feedback message */}
                {projectInviteFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      projectInviteFeedback.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-700/60 text-emerald-300'
                        : 'bg-red-950/40 border border-red-700/60 text-red-300'
                    }`}
                  >
                    {projectInviteFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{projectInviteFeedback.text}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewChatModalOpen(false);
                      setProjectInviteFeedback(null);
                    }}
                    className="px-4 py-2 rounded-lg text-xs text-[#8696a0] hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleShareProjectInvite}
                    disabled={isSendingProjectInvite || !newChatEmail.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    {isSendingProjectInvite ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>A enviar convite...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Convite de Colaboração</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
