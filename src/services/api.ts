import { OpenRouterStatus, SystemStatus } from '../types';

export interface ChatRequestPayload {
  messages: { role: string; content: string }[];
  currentFile?: string;
  currentCode?: string;
  systemInstruction?: string;
  mode?: 'chat' | 'developer' | 'voice';
  model?: string;
}

export interface GenerateSitePayload {
  prompt: string;
  projectType?: string;
  model?: string;
  stack?: 'react' | 'vanilla' | 'fullstack';
}

export interface EditSitePayload {
  prompt: string;
  currentFile?: string;
  currentCode?: string;
  allFiles?: Record<string, string>;
}

export interface CodeActionPayload {
  action: 'explain' | 'refactor' | 'fix' | 'optimize' | 'add-feature';
  code: string;
  filePath?: string;
  instruction?: string;
}

export interface ArchitecturePlanRequest {
  prompt: string;
  projectType?: string;
}

export interface ArchitecturePlanResult {
  projectName: string;
  projectCategory: 'prototype' | 'institutional' | 'web-application' | 'enterprise';
  description: string;
  stack: 'react' | 'vanilla' | 'fullstack';
  features: string[];
  plannedDirectories: string[];
  fileTree: {
    path: string;
    description: string;
    layer: 'frontend' | 'service' | 'server' | 'database' | 'config' | 'doc';
  }[];
  dependencies: { name: string; version: string; purpose: string }[];
  implementationOrder: string[];
}

export interface QualityAuditResult {
  score: number; // 0-100
  status: 'passed' | 'warning' | 'failed';
  totalFiles: number;
  checks: {
    id: string;
    title: string;
    category: 'structure' | 'imports' | 'services' | 'security' | 'contracts';
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
  correctionsApplied: string[];
  remainingRecommendations: string[];
  blueprintMatchRate: number; // percentage
}

class ApiService {
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Falha ao obter estado do sistema');
      return await res.json();
    } catch {
      return {
        status: 'online',
        platform: 'IMCH AI Developer',
        company: 'IMCH Soluções Digitais',
        hasOpenRouterKey: true,
        openRouterModel: 'minimax/minimax-m3.1-flash',
      };
    }
  }

  async setActiveModel(model: string): Promise<void> {
    try {
      await fetch('/api/openrouter/set-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
    } catch (e) {
      console.warn('Erro ao sincronizar modelo ativo no servidor:', e);
    }
  }

  async getOpenRouterStatus(model?: string): Promise<OpenRouterStatus> {
    try {
      const url = model ? `/api/openrouter/status?model=${encodeURIComponent(model)}` : '/api/openrouter/status';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao verificar OpenRouter');
      return await res.json();
    } catch {
      return {
        configured: true,
        model: model || 'minimax/minimax-m3.1-flash',
        message: 'OpenRouter ativo',
      };
    }
  }

  async getOpenRouterKeyInfo(model?: string): Promise<any> {
    const url = model ? `/api/openrouter/key-info?model=${encodeURIComponent(model)}` : '/api/openrouter/key-info';
    const res = await fetch(url);
    return await res.json();
  }

  async sendChat(payload: ChatRequestPayload): Promise<{ reply: string; model?: string }> {
    const res = await fetch('/api/openrouter/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao enviar mensagem');
    }
    return await res.json();
  }

  async planArchitecture(payload: ArchitecturePlanRequest): Promise<ArchitecturePlanResult> {
    const res = await fetch('/api/openrouter/architect-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao planear arquitetura');
    }
    return await res.json();
  }

  async generateSite(payload: GenerateSitePayload): Promise<{
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
    summary?: string;
    architecturePlan?: ArchitecturePlanResult;
    qualityReport?: QualityAuditResult;
    steps?: string[];
  }> {
    const res = await fetch('/api/openrouter/generate-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao gerar website');
    }
    return await res.json();
  }

  async editSite(payload: EditSitePayload): Promise<{
    reply: string;
    updatedFile?: { name: string; content: string } | null;
    summary?: string;
  }> {
    const res = await fetch('/api/openrouter/edit-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao alterar ficheiro');
    }
    return await res.json();
  }

  async executeCodeAction(payload: CodeActionPayload): Promise<{ result: string }> {
    const res = await fetch('/api/openrouter/code-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro na ação de código');
    }
    return await res.json();
  }

  async runQualityAudit(payload: {
    files: Record<string, string>;
    blueprint?: ArchitecturePlanResult;
    prompt?: string;
  }): Promise<QualityAuditResult> {
    const res = await fetch('/api/openrouter/quality-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao auditar qualidade do projeto');
    }
    return await res.json();
  }

  async searchImages(query: string, category?: string, limit = 6): Promise<{
    query: string;
    category: string;
    count: number;
    results: Array<{
      id: string;
      title: string;
      description: string;
      url: string;
      thumbnail: string;
      category: string;
      tags: string[];
      source: string;
      author: string;
    }>;
  }> {
    const res = await fetch(`/api/image-search?query=${encodeURIComponent(query)}&category=${encodeURIComponent(category || '')}&limit=${limit}`);
    if (!res.ok) {
      return { query, category: category || '', count: 0, results: [] };
    }
    return await res.json();
  }

  // GitHub Real-Time Sync API
  async getGitHubStatus(): Promise<{
    connected: boolean;
    repoUrl: string;
    repoName: string;
    branch: string;
    currentCommit: {
      hash: string;
      shortHash: string;
      message: string;
      author: string;
      date: string;
    } | null;
    hasToken: boolean;
    autoSyncEnabled: boolean;
    autoSyncIntervalSeconds: number;
    lastSyncedAt: string | null;
    uncommittedChanges: number;
    uncommittedFiles: string[];
    isSyncing: boolean;
    lastError: string | null;
    lastLog: string | null;
  }> {
    const res = await fetch('/api/github/status');
    if (!res.ok) {
      throw new Error('Falha ao obter estado do GitHub');
    }
    return await res.json();
  }

  async pullGitHub(token?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/github/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return await res.json();
  }

  async pushGitHub(payload: {
    message?: string;
    token?: string;
    authorName?: string;
    authorEmail?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/github/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  async syncGitHub(payload?: {
    message?: string;
    token?: string;
    authorName?: string;
    authorEmail?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/github/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    return await res.json();
  }

  async configureGitHub(payload: {
    token?: string;
    autoSync?: boolean;
    intervalSeconds?: number;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/github/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }
}

export const apiService = new ApiService();
