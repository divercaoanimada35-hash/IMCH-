import { ChatMessage } from '../types';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  previewSnippet?: string;
}

const STORAGE_PREFIX = 'imch_chat_sessions_';

export const historyService = {
  getSessions(userId: string = 'guest'): ChatSession[] {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (!data) {
        // Provide a default introductory session
        const defaultSession: ChatSession = {
          id: 'welcome-session',
          userId,
          title: 'Bem-vindo ao IMCH AI Developer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'msg-welcome-ai',
              role: 'assistant',
              content: 'Olá! Sou o seu assistente de programação da IMCH Soluções Digitais. Como posso ajudar com os seus projetos hoje?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
          previewSnippet: 'Olá! Sou o seu assistente de programação da IMCH...',
        };
        this.saveSession(defaultSession);
        return [defaultSession];
      }
      const parsed: ChatSession[] = JSON.parse(data);
      return parsed.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch {
      return [];
    }
  },

  getSession(sessionId: string, userId: string = 'guest'): ChatSession | null {
    const sessions = this.getSessions(userId);
    return sessions.find((s) => s.id === sessionId) || null;
  },

  saveSession(session: ChatSession): void {
    try {
      const sessions = this.getSessions(session.userId);
      const existingIndex = sessions.findIndex((s) => s.id === session.id);
      
      const updated: ChatSession = {
        ...session,
        updatedAt: new Date().toISOString(),
        previewSnippet:
          session.messages.length > 0
            ? session.messages[session.messages.length - 1].content.slice(0, 90)
            : 'Sessão sem mensagens',
      };

      if (existingIndex >= 0) {
        sessions[existingIndex] = updated;
      } else {
        sessions.unshift(updated);
      }

      localStorage.setItem(
        `${STORAGE_PREFIX}${session.userId}`,
        JSON.stringify(sessions)
      );
    } catch (e) {
      console.error('Failed to save chat session', e);
    }
  },

  createNewSession(userId: string = 'guest', title: string = 'Nova Conversa'): ChatSession {
    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      previewSnippet: 'Nova conversa iniciada',
    };

    const sessions = this.getSessions(userId);
    sessions.unshift(newSession);
    localStorage.setItem(
      `${STORAGE_PREFIX}${userId}`,
      JSON.stringify(sessions)
    );
    return newSession;
  },

  deleteSession(sessionId: string, userId: string = 'guest'): ChatSession[] {
    try {
      const sessions = this.getSessions(userId);
      const filtered = sessions.filter((s) => s.id !== sessionId);
      localStorage.setItem(
        `${STORAGE_PREFIX}${userId}`,
        JSON.stringify(filtered)
      );
      return filtered;
    } catch {
      return [];
    }
  },

  clearAll(userId: string = 'guest'): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  },
};
