import React, { useState, useEffect } from 'react';
import { 
  Github, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2,
  Terminal,
  FolderGit2,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Radio,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  GitCommit,
  Webhook
} from 'lucide-react';
import { Project } from '../types';
import { apiService } from '../services/api';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

interface GitStatusData {
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
}

const GITHUB_TOKEN_STORAGE_KEY = 'imch_github_pat_token';

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose, project }) => {
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'config' | 'terminal'>('sync');

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/github/webhook` : '';

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const data = await apiService.getGitHubStatus();
      setGitStatus(data);
      setAutoSync(data.autoSyncEnabled);
    } catch (err: any) {
      console.warn('Erro ao carregar estado do GitHub:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveToken = async () => {
    localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token.trim());
    try {
      await apiService.configureGitHub({
        token: token.trim(),
        autoSync,
      });
      setActionStatus({ type: 'success', message: 'Token e configuração do GitHub salvos com sucesso!' });
      fetchStatus();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'Erro ao guardar configuração' });
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSync(enabled);
    try {
      await apiService.configureGitHub({ autoSync: enabled });
      fetchStatus();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePull = async () => {
    setIsSyncing(true);
    setActionStatus({ type: 'info', message: 'A puxar alterações mais recentes do GitHub (git pull)...' });
    try {
      const res = await apiService.pullGitHub(token.trim() || undefined);
      if (res.success) {
        setActionStatus({ type: 'success', message: res.message });
      } else {
        setActionStatus({ type: 'error', message: res.message });
      }
      fetchStatus();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'Falha ao puxar do GitHub' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!token && !gitStatus?.hasToken) {
      setActionStatus({
        type: 'error',
        message: 'Por favor introduza o seu Personal Access Token (PAT) do GitHub abaixo para efetuar push.',
      });
      setActiveTab('config');
      return;
    }

    setIsSyncing(true);
    setActionStatus({ type: 'info', message: 'A preparar ficheiros, efetuar commit e push para o GitHub...' });
    try {
      const res = await apiService.pushGitHub({
        message: commitMessage.trim() || `feat: atualização de projeto ${project.name} via IMCH AI Developer`,
        token: token.trim() || undefined,
        authorName: 'IMCH Soluções Digitais',
        authorEmail: 'imchsolucoes@gmail.com',
      });
      if (res.success) {
        setActionStatus({ type: 'success', message: res.message });
        setCommitMessage('');
      } else {
        setActionStatus({ type: 'error', message: res.message });
      }
      fetchStatus();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'Falha ao enviar para o GitHub' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    setActionStatus({ type: 'info', message: 'A executar sincronização completa em tempo real (Pull + Push)...' });
    try {
      const res = await apiService.syncGitHub({
        message: commitMessage.trim() || `chore: sincronização em tempo real [${new Date().toLocaleTimeString('pt-PT')}]`,
        token: token.trim() || undefined,
      });
      if (res.success) {
        setActionStatus({ type: 'success', message: res.message });
      } else {
        setActionStatus({ type: 'error', message: res.message });
      }
      fetchStatus();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'Erro na sincronização' });
    } finally {
      setIsSyncing(false);
    }
  };

  const terminalCommands = `# Repositório remoto configurado:
# https://github.com/Willian5720/IMCH-AI.git

# 1. Verificar estado local
git status

# 2. Puxar alterações do GitHub em tempo real
git pull origin main

# 3. Adicionar e enviar alterações
git add .
git commit -m "feat: atualização ${project.name}"
git push origin main`;

  const copyCommands = () => {
    navigator.clipboard.writeText(terminalCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-neutral-900 dark:bg-[#0c0c0e] border border-neutral-700 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center">
              <Github className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight text-white uppercase font-mono">
                  Sincronização com GitHub
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Tempo Real
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                Willian5720/IMCH-AI • branch: main
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-5 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sincronização & Estado
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Credenciais & Webhook
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'terminal'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Guia Git Terminal
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {actionStatus && (
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-start gap-2 ${
                actionStatus.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-800/80 text-emerald-300'
                  : actionStatus.type === 'error'
                  ? 'bg-rose-950/40 border border-rose-800/80 text-rose-300'
                  : 'bg-blue-950/40 border border-blue-800/80 text-blue-300'
              }`}
            >
              {actionStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : actionStatus.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words">{actionStatus.message}</div>
            </div>
          )}

          {activeTab === 'sync' && (
            <>
              {/* Repo status box */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-mono">
                    <FolderGit2 className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Repositório:</span>
                  </span>
                  <a
                    href="https://github.com/Willian5720/IMCH-AI"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Willian5720/IMCH-AI</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 flex items-center gap-1.5 font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Branch Ativa:</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    main
                  </span>
                </div>

                {gitStatus?.currentCommit && (
                  <div className="pt-2 border-t border-neutral-800/80 text-[11px] font-mono space-y-1">
                    <div className="text-neutral-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-neutral-400" />
                        Último commit:
                      </span>
                      <span className="text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                        {gitStatus.currentCommit.shortHash}
                      </span>
                    </div>
                    <p className="text-neutral-200 text-[11px] truncate" title={gitStatus.currentCommit.message}>
                      {gitStatus.currentCommit.message}
                    </p>
                    <div className="text-[10px] text-neutral-500 flex justify-between">
                      <span>{gitStatus.currentCommit.author}</span>
                      <span>{gitStatus.currentCommit.date}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-mono">Alterações locais pendentes:</span>
                  <span className="font-mono font-bold text-neutral-200">
                    {gitStatus?.uncommittedChanges || 0} ficheiros
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Mensagem de Commit (opcional)
                  </label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder={`feat: atualização de ${project.name}`}
                    className="w-full bg-neutral-800/70 border border-neutral-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handlePull}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>Puxar (Pull)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePush}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviar (Push)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleFullSync}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>A sincronizar com GitHub em tempo real...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span>Sincronizar em Tempo Real (Pull + Push)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time auto-sync toggle */}
              <div className="p-3 bg-neutral-950/50 border border-neutral-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-sincronização em Segundo Plano</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Sincroniza automaticamente a cada 45s com o repositório GitHub.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            </>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-mono text-neutral-300 font-semibold">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    <span>Gerar Token (escopo: repo)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                  Necessário para autorizar o envio direto de alterações (push) para o repositório <strong className="text-white">Willian5720/IMCH-AI</strong>.
                </p>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="mt-2.5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                >
                  Salvar Token para Sincronização
                </button>
              </div>

              {/* Webhook Configuration for instant live push */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Webhook className="w-3.5 h-3.5 text-blue-400" />
                  <span>Webhook de Sincronização Imediata (Push-to-Deploy)</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Para que alterações feitas no GitHub sejam descarregadas instantaneamente na plataforma, configure este URL como Webhook no repositório GitHub (Settings → Webhooks → Add webhook):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-black/60 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-[11px] text-neutral-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={copyWebhook}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded border border-neutral-700 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Comandos do Terminal Git:</span>
                </span>
                <button
                  onClick={copyCommands}
                  className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Copiado' : 'Copiar Comandos'}</span>
                </button>
              </div>

              <pre className="p-3 bg-black/60 border border-neutral-800 rounded-lg font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre leading-relaxed">
                {terminalCommands}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
