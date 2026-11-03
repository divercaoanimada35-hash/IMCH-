import {
  CollaborationInvite,
  CollaboratorUser,
  CollaborationChatMessage,
  CollaborationActivityItem,
  UserProfile,
  DirectSMSMessage,
} from '../types';

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  avatarUrl?: string;
}

export interface CodeUpdateEvent {
  filePath: string;
  code: string;
  content: string;
  modifiedBy: string;
  user?: string;
}

type CodeUpdateListener = (
  eventOrFilePath: any,
  content?: string,
  modifiedBy?: string
) => void;
type PresenceListener = (collaborators: CollaboratorUser[]) => void;
type ChatListener = (message: CollaborationChatMessage) => void;
type ActivityListener = (activity: CollaborationActivityItem) => void;
type InviteListener = (invite: CollaborationInvite) => void;
type DirectSMSListener = (message: DirectSMSMessage) => void;

class CollaborationService {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentUser: UserProfile | null = null;
  private isConnecting = false;
  private reconnectTimer: any = null;

  private codeUpdateListeners: CodeUpdateListener[] = [];
  private presenceListeners: PresenceListener[] = [];
  private chatListeners: ChatListener[] = [];
  private activityListeners: ActivityListener[] = [];
  private inviteListeners: InviteListener[] = [];
  private directSMSListeners: DirectSMSListener[] = [];

  // Cached state for current room
  public collaborators: CollaboratorUser[] = [];
  public chatMessages: CollaborationChatMessage[] = [];
  public activityHistory: CollaborationActivityItem[] = [];
  public myColor = '#3b82f6';

  constructor() {
    // Auto-connect socket to listen for incoming invites when user is identified
  }

  public initUser(user: UserProfile) {
    this.currentUser = user;
    this.ensureConnected();
    this.syncUserWithServer(user);
  }

  public identify(id: string, name: string, email: string, plan: 'free' | 'pro' = 'free') {
    this.initUser({
      id,
      name,
      email,
      plan,
      credits: 0,
      createdAt: new Date().toISOString(),
    });
  }

  private syncUserWithServer(user: UserProfile) {
    fetch('/api/collaboration/users/register-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        plan: user.plan,
      }),
    }).catch(() => {});
  }

  private ensureConnected(): Promise<WebSocket> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(this.ws);
    }

    return new Promise((resolve) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;

      try {
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          if (this.currentUser) {
            socket.send(
              JSON.stringify({
                type: 'identify_user',
                payload: { email: this.currentUser.email },
              })
            );
          }
          resolve(socket);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleSocketMessage(data);
          } catch (err) {
            console.error('[CollaborationService] Erro ao ler mensagem WS:', err);
          }
        };

        socket.onclose = () => {
          this.ws = null;
          // Reconnect attempt after 3s
          if (this.currentUser && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.ensureConnected();
            }, 3000);
          }
        };

        socket.onerror = () => {
          // Handled in onclose
        };
      } catch {
        resolve(this.ws as any);
      }
    });
  }

  private handleSocketMessage(data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'room_state': {
        this.collaborators = payload.collaborators || [];
        this.chatMessages = payload.chatMessages || [];
        this.activityHistory = payload.activityHistory || [];
        this.myColor = payload.myColor || '#3b82f6';
        this.notifyPresence(this.collaborators);
        break;
      }

      case 'presence_updated': {
        this.collaborators = payload.collaborators || [];
        this.notifyPresence(this.collaborators);
        if (payload.activity) {
          this.activityHistory.push(payload.activity);
          this.notifyActivity(payload.activity);
        }
        break;
      }

      case 'code_updated': {
        const { filePath, content, modifiedBy, activity } = payload;
        this.notifyCodeUpdate(filePath, content, modifiedBy);
        if (activity) {
          this.activityHistory.push(activity);
          this.notifyActivity(activity);
        }
        break;
      }

      case 'chat_message_received': {
        this.chatMessages.push(payload);
        this.notifyChat(payload);
        break;
      }

      case 'invitation_received': {
        this.notifyInvite(payload);
        break;
      }

      case 'sms_received': {
        this.notifyDirectSMS(payload);
        break;
      }

      case 'invitation_accepted': {
        const sysMsg: CollaborationChatMessage = {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'Sistema',
          senderEmail: 'system@imch.ao',
          text: `🎉 ${payload.acceptedBy} aceitou o teu convite para colaborar no projeto "${payload.projectName}"!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'system',
        };
        this.chatMessages.push(sysMsg);
        this.notifyChat(sysMsg);
        break;
      }
    }
  }

  // --- Room Actions ---

  public async joinRoom(
    projectId: string,
    projectNameOrUser: string | UserProfile,
    maybeUser?: UserProfile,
    initialFiles?: Record<string, any>
  ) {
    let projectName = 'Projeto Colaborativo';
    let user: UserProfile;

    if (typeof projectNameOrUser === 'string') {
      projectName = projectNameOrUser;
      user = maybeUser || this.currentUser || {
        id: 'guest',
        name: 'Dev Colaborador',
        email: 'dev@imch.ao',
        plan: 'free',
        credits: 0,
        createdAt: new Date().toISOString(),
      };
    } else {
      user = projectNameOrUser;
      projectName = (typeof maybeUser === 'string' ? maybeUser : undefined) || 'Projeto Colaborativo';
    }

    this.currentRoomId = projectId;
    this.currentUser = user;

    const socket = await this.ensureConnected();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'join_room',
          payload: {
            projectId,
            projectName,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              plan: user.plan,
            },
            initialFiles,
          },
        })
      );
    }
  }

  public leaveRoom() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomId) {
      this.ws.send(
        JSON.stringify({
          type: 'leave_room',
          payload: { projectId: this.currentRoomId },
        })
      );
    }
    this.currentRoomId = null;
    this.collaborators = [];
    this.chatMessages = [];
    this.activityHistory = [];
  }

  public sendCodeEdit(
    filePath: string,
    content: string,
    language?: string,
    user?: UserProfile
  ) {
    if (!this.currentRoomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const activeUser = user || this.currentUser || {
      id: 'guest',
      name: 'Colaborador',
      email: 'dev@imch.ao',
      plan: 'free',
      credits: 0,
      createdAt: '',
    };

    let lang = language;
    if (!lang) {
      if (filePath.endsWith('.css')) lang = 'css';
      else if (filePath.endsWith('.js')) lang = 'javascript';
      else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) lang = 'typescript';
      else if (filePath.endsWith('.json')) lang = 'json';
      else lang = 'html';
    }

    this.ws.send(
      JSON.stringify({
        type: 'code_edit',
        payload: {
          projectId: this.currentRoomId,
          filePath,
          content,
          language: lang,
          userId: activeUser.id,
          userName: activeUser.name,
        },
      })
    );
  }

  public async getRoom(projectId: string): Promise<any> {
    try {
      const res = await fetch(`/api/collaboration/rooms/${projectId}`);
      if (res.ok) {
        const json = await res.json();
        return json.room || json;
      }
      return { projectId, projectName: 'Projeto', files: {}, collaborators: [] };
    } catch {
      return { projectId, projectName: 'Projeto', files: {}, collaborators: [] };
    }
  }

  public sendFileFocus(filePath: string) {
    if (!this.currentRoomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: 'file_focus',
        payload: { filePath },
      })
    );
  }

  public sendChatMessage(text: string, user: UserProfile) {
    if (!this.currentRoomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: 'chat_message',
        payload: {
          senderId: user.id,
          senderName: user.name,
          senderEmail: user.email,
          text,
        },
      })
    );
  }

  public sendAudioMessage(audioData: string, durationSeconds: number, user: UserProfile) {
    if (!this.currentRoomId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: 'audio_message',
        payload: {
          senderId: user.id,
          senderName: user.name,
          senderEmail: user.email,
          audioData,
          audioDuration: durationSeconds,
        },
      })
    );
  }

  // --- HTTP API Calls ---

  public async getRegisteredUsers(query?: string): Promise<RegisteredUser[]> {
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/collaboration/users${q}`);
      if (res.ok) {
        const json = await res.json();
        return json.users || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  public async getInvites(userEmail: string): Promise<CollaborationInvite[]> {
    try {
      const res = await fetch(`/api/collaboration/invites?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const json = await res.json();
        return json.invites || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  public async sendInvite(params: {
    fromUser: UserProfile;
    toEmail: string;
    projectId: string;
    projectName: string;
    projectDescription?: string;
    message?: string;
  }): Promise<{ success: boolean; invite?: CollaborationInvite; error?: string }> {
    try {
      const res = await fetch('/api/collaboration/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Erro ao enviar convite.' };
      }
      return { success: true, invite: json.invite };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede ao enviar convite.' };
    }
  }

  public async acceptInvite(
    inviteId: string,
    userEmail: string
  ): Promise<{ success: boolean; invite?: CollaborationInvite; room?: any; error?: string }> {
    try {
      const res = await fetch(`/api/collaboration/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Erro ao aceitar convite.' };
      }
      return { success: true, invite: json.invite, room: json.room };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede.' };
    }
  }

  public async declineInvite(inviteId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/collaboration/invites/${inviteId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      const json = await res.json();
      return { success: Boolean(json.success), error: json.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- Subscription Listeners ---

  public onCodeUpdate(cb: CodeUpdateListener) {
    this.codeUpdateListeners.push(cb);
    return () => {
      this.codeUpdateListeners = this.codeUpdateListeners.filter((l) => l !== cb);
    };
  }

  public onPresence(cb: PresenceListener) {
    this.presenceListeners.push(cb);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((l) => l !== cb);
    };
  }

  public onChat(cb: ChatListener) {
    this.chatListeners.push(cb);
    return () => {
      this.chatListeners = this.chatListeners.filter((l) => l !== cb);
    };
  }

  public onActivity(cb: ActivityListener) {
    this.activityListeners.push(cb);
    return () => {
      this.activityListeners = this.activityListeners.filter((l) => l !== cb);
    };
  }

  // --- Direct SMS Messages (WhatsApp / SMS style) ---

  public async getDirectMessages(userEmail: string, partnerEmail?: string): Promise<DirectSMSMessage[]> {
    try {
      const url = partnerEmail 
        ? `/api/collaboration/messages?email=${encodeURIComponent(userEmail)}&with=${encodeURIComponent(partnerEmail)}`
        : `/api/collaboration/messages?email=${encodeURIComponent(userEmail)}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.messages || [];
    } catch (err) {
      console.error('[CollaborationService] Erro ao obter mensagens SMS:', err);
      return [];
    }
  }

  public async sendDirectSMS(params: {
    fromEmail: string;
    fromName?: string;
    toEmail: string;
    toName?: string;
    text?: string;
    audioData?: string;
    audioDuration?: number;
    projectInvite?: any;
  }): Promise<{ success: boolean; message?: DirectSMSMessage; error?: string }> {
    try {
      // 1. Try sending over WebSocket if open for instant delivery
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'sms_send',
            payload: params,
          })
        );
      }

      // 2. Persist to API
      const res = await fetch('/api/collaboration/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      return { success: Boolean(json.success), message: json.message, error: json.error };
    } catch (err: any) {
      console.error('[CollaborationService] Erro ao enviar SMS:', err);
      return { success: false, error: err.message };
    }
  }

  public async markSMSAsRead(userEmail: string, partnerEmail: string): Promise<void> {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'sms_read',
            payload: { userEmail, partnerEmail },
          })
        );
      }
      await fetch('/api/collaboration/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, partnerEmail }),
      });
    } catch {}
  }

  public onDirectSMS(cb: DirectSMSListener) {
    this.directSMSListeners.push(cb);
    return () => {
      this.directSMSListeners = this.directSMSListeners.filter((l) => l !== cb);
    };
  }

  private notifyDirectSMS(msg: DirectSMSMessage) {
    this.directSMSListeners.forEach((l) => {
      try {
        l(msg);
      } catch (err) {
        console.error('[CollaborationService] Error in direct SMS listener:', err);
      }
    });
  }

  public onInvite(cb: InviteListener) {
    this.inviteListeners.push(cb);
    return () => {
      this.inviteListeners = this.inviteListeners.filter((l) => l !== cb);
    };
  }

  private notifyCodeUpdate(filePath: string, content: string, modifiedBy: string) {
    const eventObj: CodeUpdateEvent = {
      filePath,
      code: content,
      content,
      modifiedBy,
      user: modifiedBy,
    };
    this.codeUpdateListeners.forEach((l) => {
      try {
        l(eventObj, content, modifiedBy);
      } catch (err) {
        console.error('[CollaborationService] Error in code update listener:', err);
      }
    });
  }

  private notifyPresence(collabs: CollaboratorUser[]) {
    this.presenceListeners.forEach((l) => l(collabs));
  }

  private notifyChat(msg: CollaborationChatMessage) {
    this.chatListeners.forEach((l) => l(msg));
  }

  private notifyActivity(act: CollaborationActivityItem) {
    this.activityListeners.forEach((l) => l(act));
  }

  private notifyInvite(inv: CollaborationInvite) {
    this.inviteListeners.forEach((l) => l(inv));
  }
}

export const collaborationService = new CollaborationService();
