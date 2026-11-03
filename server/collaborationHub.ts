import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface CollaborationInvite {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserEmail: string;
  toUserName?: string;
  projectId: string;
  projectName: string;
  projectDescription?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export interface DirectSMSMessage {
  id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  text: string;
  timestamp: string;
  createdAt: string;
  read: boolean;
  audioData?: string;
  audioDuration?: number;
  projectInvite?: {
    inviteId: string;
    projectId: string;
    projectName: string;
    projectDescription?: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}

export interface CollaboratorUser {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'editor';
  color: string;
  activeFile?: string;
  cursorLine?: number;
  isOnline: boolean;
  lastSeen: string;
}

export interface CollaborationChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  text?: string;
  audioData?: string; // base64 data url for voice notes
  audioDuration?: number;
  timestamp: string;
  type: 'text' | 'audio' | 'system';
}

export interface CollaborationActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
}

interface RoomState {
  projectId: string;
  projectName: string;
  ownerEmail: string;
  files: Record<string, { name: string; path: string; content: string; language: string }>;
  collaborators: Map<string, CollaboratorUser>;
  chatMessages: CollaborationChatMessage[];
  activityHistory: CollaborationActivityItem[];
  clients: Set<WebSocket>;
}

// User registry (seeded with pre-registered developer community users for immediate testing)
export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  avatarUrl?: string;
}

const registeredUsers: RegisteredUser[] = [];

// Real invitations store (starts empty)
const invitations: CollaborationInvite[] = [];

// In-memory Direct SMS messages store (starts empty)
const directMessages: DirectSMSMessage[] = [];

// Active collaboration rooms
const rooms = new Map<string, RoomState>();

// User socket map to deliver instant real-time invite notifications
const userSockets = new Map<string, Set<WebSocket>>();

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export class CollaborationHub {
  private wss: WebSocketServer | null = null;

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws/collaboration' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let currentRoomId: string | null = null;
      let currentUserEmail: string | null = null;
      let currentUserId: string | null = null;

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          const { type, payload } = data;

          switch (type) {
            case 'identify_user': {
              const { email } = payload;
              if (email && typeof email === 'string') {
                const normalized = email.toLowerCase().trim();
                currentUserEmail = normalized;
                if (!userSockets.has(normalized)) {
                  userSockets.set(normalized, new Set());
                }
                userSockets.get(normalized)!.add(ws);
              }
              break;
            }

            case 'join_room': {
              const { projectId, projectName, user, initialFiles } = payload;
              if (!projectId || !user) return;

              currentRoomId = projectId;
              currentUserId = user.id;
              currentUserEmail = user.email.toLowerCase().trim();

              // Track user socket for notifications
              if (currentUserEmail) {
                if (!userSockets.has(currentUserEmail)) {
                  userSockets.set(currentUserEmail, new Set());
                }
                userSockets.get(currentUserEmail)!.add(ws);
              }

              let room = rooms.get(projectId);
              if (!room) {
                room = {
                  projectId,
                  projectName: projectName || 'Projeto Partilhado',
                  ownerEmail: user.email,
                  files: initialFiles || {},
                  collaborators: new Map(),
                  chatMessages: [
                    {
                      id: `sys-${Date.now()}`,
                      senderId: 'system',
                      senderName: 'Sistema de Colaboração',
                      senderEmail: 'system@imch.ao',
                      text: `🎉 Sala de colaboração em tempo real criada para "${projectName || 'Projeto'}". Chat e edições sincronizados sem custo de créditos de IA.`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      type: 'system',
                    },
                  ],
                  activityHistory: [
                    {
                      id: `act-${Date.now()}`,
                      userId: user.id,
                      userName: user.name,
                      action: 'criou',
                      detail: `Iniciou a sala de colaboração para "${projectName || 'Projeto'}"`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ],
                  clients: new Set(),
                };
                rooms.set(projectId, room);
              }

              // Update initial files if room had none and user provided them
              if (Object.keys(room.files).length === 0 && initialFiles && Object.keys(initialFiles).length > 0) {
                room.files = initialFiles;
              }

              room.clients.add(ws);

              const userColor = PALETTE[room.collaborators.size % PALETTE.length];
              const isOwner = room.ownerEmail.toLowerCase() === user.email.toLowerCase();

              const collaborator: CollaboratorUser = {
                userId: user.id,
                name: user.name || 'Desenvolvedor',
                email: user.email,
                role: isOwner ? 'owner' : 'editor',
                color: userColor,
                activeFile: undefined,
                cursorLine: 1,
                isOnline: true,
                lastSeen: new Date().toISOString(),
              };

              room.collaborators.set(user.id, collaborator);

              // Add activity log
              const joinAct: CollaborationActivityItem = {
                id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                userId: user.id,
                userName: user.name,
                action: 'entrou',
                detail: `Entrou na sessão de colaboração em tempo real`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              room.activityHistory.push(joinAct);

              // Send initial state to the joined user
              ws.send(
                JSON.stringify({
                  type: 'room_state',
                  payload: {
                    projectId: room.projectId,
                    projectName: room.projectName,
                    ownerEmail: room.ownerEmail,
                    files: room.files,
                    collaborators: Array.from(room.collaborators.values()),
                    chatMessages: room.chatMessages.slice(-100),
                    activityHistory: room.activityHistory.slice(-50),
                    myColor: userColor,
                  },
                })
              );

              // Broadcast presence & activity to all peers in the room
              this.broadcastToRoom(room, {
                type: 'presence_updated',
                payload: {
                  collaborators: Array.from(room.collaborators.values()),
                  activity: joinAct,
                },
              }, ws);

              break;
            }

            case 'code_edit': {
              if (!currentRoomId) return;
              const room = rooms.get(currentRoomId);
              if (!room) return;

              const { filePath, content, language, userName, userId } = payload;
              if (!filePath || content === undefined) return;

              // Update authoritative room file state
              room.files[filePath] = {
                name: filePath,
                path: filePath,
                content,
                language: language || 'javascript',
              };

              // Record in activity history
              const editAct: CollaborationActivityItem = {
                id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                userId: userId || 'usr',
                userName: userName || 'Parceiro',
                action: 'editou',
                detail: `Modificou o ficheiro ${filePath}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              room.activityHistory.push(editAct);

              // Broadcast code update to ALL OTHER clients in room
              this.broadcastToRoom(room, {
                type: 'code_updated',
                payload: {
                  filePath,
                  content,
                  language,
                  modifiedBy: userName || 'Parceiro',
                  activity: editAct,
                },
              }, ws);

              break;
            }

            case 'file_focus': {
              if (!currentRoomId || !currentUserId) return;
              const room = rooms.get(currentRoomId);
              if (!room) return;

              const { filePath } = payload;
              const collab = room.collaborators.get(currentUserId);
              if (collab) {
                collab.activeFile = filePath;
                this.broadcastToRoom(room, {
                  type: 'presence_updated',
                  payload: {
                    collaborators: Array.from(room.collaborators.values()),
                  },
                });
              }
              break;
            }

            case 'cursor_move': {
              if (!currentRoomId || !currentUserId) return;
              const room = rooms.get(currentRoomId);
              if (!room) return;

              const { line, column, filePath } = payload;
              const collab = room.collaborators.get(currentUserId);
              if (collab) {
                collab.cursorLine = line;
                collab.activeFile = filePath;
                this.broadcastToRoom(room, {
                  type: 'cursor_updated',
                  payload: {
                    userId: currentUserId,
                    userName: collab.name,
                    color: collab.color,
                    line,
                    column,
                    filePath,
                  },
                }, ws);
              }
              break;
            }

            case 'chat_message': {
              if (!currentRoomId) return;
              const room = rooms.get(currentRoomId);
              if (!room) return;

              const { senderId, senderName, senderEmail, text } = payload;
              if (!text || !text.trim()) return;

              const msg: CollaborationChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                senderId,
                senderName,
                senderEmail,
                text: text.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text',
              };

              room.chatMessages.push(msg);

              // Broadcast to everyone in room including sender
              this.broadcastToRoom(room, {
                type: 'chat_message_received',
                payload: msg,
              });

              break;
            }

            case 'audio_message': {
              if (!currentRoomId) return;
              const room = rooms.get(currentRoomId);
              if (!room) return;

              const { senderId, senderName, senderEmail, audioData, audioDuration } = payload;
              if (!audioData) return;

              const msg: CollaborationChatMessage = {
                id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                senderId,
                senderName,
                senderEmail,
                audioData,
                audioDuration: audioDuration || 3,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'audio',
              };

              room.chatMessages.push(msg);

              this.broadcastToRoom(room, {
                type: 'chat_message_received',
                payload: msg,
              });

              break;
            }

            case 'leave_room': {
              if (currentRoomId && currentUserId) {
                this.handleClientLeave(ws, currentRoomId, currentUserId);
              }
              currentRoomId = null;
              break;
            }

            case 'sms_send': {
              const { fromEmail, fromName, toEmail, toName, text, audioData, audioDuration, projectInvite } = payload;
              if (!fromEmail || !toEmail) return;
              const msg = this.sendDirectMessage({
                fromEmail,
                fromName,
                toEmail,
                toName,
                text,
                audioData,
                audioDuration,
                projectInvite,
              });
              ws.send(JSON.stringify({ type: 'sms_sent', payload: msg }));
              break;
            }

            case 'sms_read': {
              const { userEmail, partnerEmail } = payload;
              if (userEmail && partnerEmail) {
                this.markDirectMessagesAsRead(userEmail, partnerEmail);
              }
              break;
            }
          }
        } catch (err) {
          console.error('[CollaborationHub] Erro no processamento de mensagem WS:', err);
        }
      });

      ws.on('close', () => {
        if (currentUserEmail && userSockets.has(currentUserEmail)) {
          const set = userSockets.get(currentUserEmail);
          if (set) {
            set.delete(ws);
            if (set.size === 0) userSockets.delete(currentUserEmail);
          }
        }
        if (currentRoomId) {
          this.handleClientLeave(ws, currentRoomId, currentUserId);
        }
      });
    });

    console.log('[CollaborationHub] WebSocket inicializado em /ws/collaboration');
  }

  private handleClientLeave(ws: WebSocket, roomId: string, userId: string | null) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.clients.delete(ws);
    if (userId) {
      const collab = room.collaborators.get(userId);
      if (collab) {
        collab.isOnline = false;
        collab.lastSeen = new Date().toISOString();

        const leaveAct: CollaborationActivityItem = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          userName: collab.name,
          action: 'saiu',
          detail: 'Desconectou-se da sessão de colaboração',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        room.activityHistory.push(leaveAct);

        this.broadcastToRoom(room, {
          type: 'presence_updated',
          payload: {
            collaborators: Array.from(room.collaborators.values()),
            activity: leaveAct,
          },
        });
      }
    }
  }

  private broadcastToRoom(room: RoomState, message: any, excludeClient?: WebSocket) {
    const payload = JSON.stringify(message);
    room.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.warn('[CollaborationHub] Falha no broadcast para cliente:', err);
        }
      }
    });
  }

  // Notify a specific user in real-time if online
  public notifyUser(email: string, message: any) {
    const sockets = userSockets.get(email.toLowerCase().trim());
    if (sockets && sockets.size > 0) {
      const payload = JSON.stringify(message);
      sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) {
          try {
            s.send(payload);
          } catch {}
        }
      });
    }
  }

  // --- HTTP Handlers & API Helpers ---

  public getRegisteredUsers(query?: string): RegisteredUser[] {
    if (!query) return registeredUsers;
    const q = query.toLowerCase().trim();
    return registeredUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  public registerUser(name: string, email: string, plan: 'free' | 'pro' = 'free'): RegisteredUser {
    const cleanEmail = email.toLowerCase().trim();
    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      existing.name = name;
      existing.plan = plan;
      return existing;
    }
    const newUser: RegisteredUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      email: cleanEmail,
      plan,
    };
    registeredUsers.push(newUser);
    return newUser;
  }

  public getInvites(userEmail: string): CollaborationInvite[] {
    const cleanEmail = userEmail.toLowerCase().trim();
    return invitations.filter(
      (inv) => inv.toUserEmail.toLowerCase() === cleanEmail || inv.fromUserEmail.toLowerCase() === cleanEmail
    );
  }

  public createInvite(params: {
    fromUser: { id: string; name: string; email: string; plan: 'free' | 'pro' };
    toEmail: string;
    projectId: string;
    projectName: string;
    projectDescription?: string;
    message?: string;
  }): { success: boolean; invite?: CollaborationInvite; smsMessage?: DirectSMSMessage; error?: string } {
    const { fromUser, toEmail, projectId, projectName, projectDescription, message } = params;
    const targetEmail = toEmail.toLowerCase().trim();
    const senderEmail = fromUser.email.toLowerCase().trim();

    if (targetEmail === senderEmail) {
      return { success: false, error: 'Não podes convidar o teu próprio e-mail.' };
    }

    // 1. Verify recipient is registered
    const recipient = registeredUsers.find((u) => u.email.toLowerCase() === targetEmail);
    if (!recipient) {
      return {
        success: false,
        error: `O parceiro com o e-mail "${toEmail}" ainda não está registado no AI Developer. Apenas utilizadores já registados podem ser convidados.`,
      };
    }

    // 2. Enforce Plan Limits
    // Free Mode: only 1 project can be shared, and only with 1 partner
    if (fromUser.plan === 'free') {
      // Find all projects already shared by this user (where invite is accepted or pending)
      const existingSharedProjects = new Set(
        invitations
          .filter((inv) => inv.fromUserEmail.toLowerCase() === senderEmail && inv.status !== 'declined')
          .map((inv) => inv.projectId)
      );

      // If user is trying to share a DIFFERENT project and already has 1 shared
      if (existingSharedProjects.size >= 1 && !existingSharedProjects.has(projectId)) {
        return {
          success: false,
          error:
            'Limite do Plano Free atingido: No modo Free, só podes partilhar 1 projeto. Atualiza para o Plano PRO para partilhar múltiplos projetos.',
        };
      }

      // Check how many partners are invited/active on this project
      const partnersOnThisProject = invitations.filter(
        (inv) =>
          inv.fromUserEmail.toLowerCase() === senderEmail &&
          inv.projectId === projectId &&
          inv.status !== 'declined'
      );

      if (partnersOnThisProject.length >= 1) {
        return {
          success: false,
          error:
            'Limite do Plano Free atingido: No modo Free, só podes convidar 1 utilizador para o projeto. Atualiza para o Plano PRO para colaborar com múltiplos parceiros.',
        };
      }
    }

    // 3. Create invite
    const newInvite: CollaborationInvite = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      fromUserEmail: fromUser.email,
      toUserEmail: recipient.email,
      toUserName: recipient.name,
      projectId,
      projectName,
      projectDescription,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    invitations.unshift(newInvite);

    // Create corresponding Direct SMS message with the attached project invite
    const smsMsg: DirectSMSMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromEmail: fromUser.email,
      fromName: fromUser.name,
      toEmail: recipient.email,
      toName: recipient.name,
      text: message || `Olá! Convido-te a colaborar em tempo real comigo no projeto "${projectName}" no IMCH AI Developer.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false,
      projectInvite: {
        inviteId: newInvite.id,
        projectId,
        projectName,
        projectDescription,
        status: 'pending',
      },
    };
    directMessages.push(smsMsg);

    // 4. Notify recipient if online
    this.notifyUser(recipient.email, {
      type: 'invitation_received',
      payload: newInvite,
    });
    this.notifyUser(recipient.email, {
      type: 'sms_received',
      payload: smsMsg,
    });

    return { success: true, invite: newInvite, smsMessage: smsMsg };
  }

  public acceptInvite(inviteId: string, userEmail: string): { success: boolean; invite?: CollaborationInvite; room?: any; error?: string } {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invite = invitations.find((i) => i.id === inviteId);

    if (!invite) {
      return { success: false, error: 'Convite não encontrado.' };
    }

    if (invite.toUserEmail.toLowerCase() !== cleanEmail) {
      return { success: false, error: 'Não tens permissão para aceitar este convite.' };
    }

    invite.status = 'accepted';
    invite.respondedAt = new Date().toISOString();

    // Update direct SMS message status
    directMessages.forEach((m) => {
      if (m.projectInvite && m.projectInvite.inviteId === inviteId) {
        m.projectInvite.status = 'accepted';
      }
    });

    // Send a reply SMS in thread
    this.sendDirectMessage({
      fromEmail: cleanEmail,
      fromName: cleanEmail.split('@')[0],
      toEmail: invite.fromUserEmail,
      toName: invite.fromUserName,
      text: `✅ Aceitei o teu convite! Vamos colaborar juntos no projeto "${invite.projectName}".`,
    });

    // Create room if not present
    let room = rooms.get(invite.projectId);
    if (!room) {
      room = {
        projectId: invite.projectId,
        projectName: invite.projectName,
        ownerEmail: invite.fromUserEmail,
        files: {},
        collaborators: new Map(),
        chatMessages: [
          {
            id: `sys-${Date.now()}`,
            senderId: 'system',
            senderName: 'Sistema de Colaboração',
            senderEmail: 'system@imch.ao',
            text: `🤝 Convite aceite por ${userEmail}! Esta sala de colaboração em tempo real está ativa.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'system',
          },
        ],
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            userId: 'usr',
            userName: userEmail,
            action: 'aceitou',
            detail: `Aceitou o convite para colaborar em "${invite.projectName}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
        clients: new Set(),
      };
      rooms.set(invite.projectId, room);
    }

    // Notify sender that invite was accepted
    this.notifyUser(invite.fromUserEmail, {
      type: 'invitation_accepted',
      payload: {
        inviteId: invite.id,
        acceptedBy: userEmail,
        projectName: invite.projectName,
      },
    });

    return {
      success: true,
      invite,
      room: {
        projectId: room.projectId,
        projectName: room.projectName,
        ownerEmail: room.ownerEmail,
        files: room.files,
      },
    };
  }

  public declineInvite(inviteId: string, userEmail: string): { success: boolean; error?: string } {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invite = invitations.find((i) => i.id === inviteId);
    if (!invite) return { success: false, error: 'Convite não encontrado.' };
    if (invite.toUserEmail.toLowerCase() !== cleanEmail) {
      return { success: false, error: 'Sem permissão.' };
    }
    invite.status = 'declined';
    invite.respondedAt = new Date().toISOString();

    // Update direct SMS message status
    directMessages.forEach((m) => {
      if (m.projectInvite && m.projectInvite.inviteId === inviteId) {
        m.projectInvite.status = 'declined';
      }
    });

    this.sendDirectMessage({
      fromEmail: cleanEmail,
      fromName: cleanEmail.split('@')[0],
      toEmail: invite.fromUserEmail,
      toName: invite.fromUserName,
      text: `Recusei o convite para o projeto "${invite.projectName}".`,
    });

    return { success: true };
  }

  public getDirectMessages(userEmail: string, partnerEmail?: string): DirectSMSMessage[] {
    const u = userEmail.toLowerCase().trim();
    if (partnerEmail) {
      const p = partnerEmail.toLowerCase().trim();
      return directMessages.filter(
        (m) =>
          (m.fromEmail.toLowerCase() === u && m.toEmail.toLowerCase() === p) ||
          (m.fromEmail.toLowerCase() === p && m.toEmail.toLowerCase() === u)
      );
    }
    return directMessages.filter(
      (m) => m.fromEmail.toLowerCase() === u || m.toEmail.toLowerCase() === u
    );
  }

  public sendDirectMessage(params: {
    fromEmail: string;
    fromName?: string;
    toEmail: string;
    toName?: string;
    text?: string;
    audioData?: string;
    audioDuration?: number;
    projectInvite?: any;
  }): DirectSMSMessage {
    const fromEmail = params.fromEmail.toLowerCase().trim();
    const toEmail = params.toEmail.toLowerCase().trim();
    const recipientUser = registeredUsers.find((u) => u.email.toLowerCase() === toEmail);

    const msg: DirectSMSMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromEmail,
      fromName: params.fromName || fromEmail.split('@')[0],
      toEmail,
      toName: params.toName || recipientUser?.name || toEmail.split('@')[0],
      text: params.text || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false,
      audioData: params.audioData,
      audioDuration: params.audioDuration,
      projectInvite: params.projectInvite,
    };

    directMessages.push(msg);

    // Notify recipient immediately if online
    this.notifyUser(toEmail, {
      type: 'sms_received',
      payload: msg,
    });

    return msg;
  }

  public markDirectMessagesAsRead(userEmail: string, partnerEmail: string) {
    const u = userEmail.toLowerCase().trim();
    const p = partnerEmail.toLowerCase().trim();
    directMessages.forEach((m) => {
      if (m.toEmail.toLowerCase() === u && m.fromEmail.toLowerCase() === p) {
        m.read = true;
      }
    });
  }

  public getRoom(projectId: string): RoomState | undefined {
    return rooms.get(projectId);
  }
}

export const collaborationHub = new CollaborationHub();
