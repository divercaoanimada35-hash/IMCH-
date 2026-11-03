import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface GitHubSyncStatus {
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
  remoteCommit: {
    hash: string;
    shortHash: string;
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

class GitHubSyncService {
  private repoDir: string = process.cwd();
  private repoUrl: string = 'https://github.com/Willian5720/IMCH-AI.git';
  private branch: string = 'main';
  private token: string = process.env.GITHUB_TOKEN || '';
  private autoSyncEnabled: boolean = true;
  private autoSyncIntervalSeconds: number = 45;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private lastLog: string | null = null;

  constructor() {
    // Initial setup
    this.ensureGitConfig();
    this.startAutoSync();
  }

  private async runGit(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
      cwd: this.repoDir,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
      timeout: 30000,
    });
    return (stdout || '').trim();
  }

  private async ensureGitConfig() {
    try {
      await this.runGit(['config', 'user.name', 'IMCH Soluções Digitais']);
      await this.runGit(['config', 'user.email', 'imchsolucoes@gmail.com']);
    } catch {
      // Ignored if fails
    }
  }

  public setToken(token: string) {
    this.token = token.trim();
  }

  public getToken(): string {
    return this.token;
  }

  public setAutoSync(enabled: boolean, intervalSeconds = 45) {
    this.autoSyncEnabled = enabled;
    this.autoSyncIntervalSeconds = Math.max(15, intervalSeconds);
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  public startAutoSync() {
    if (this.autoSyncTimer) return;
    this.autoSyncTimer = setInterval(async () => {
      if (this.autoSyncEnabled && !this.isSyncing) {
        try {
          await this.pullSilent();
        } catch (err: any) {
          // Keep silent on periodic background tick
        }
      }
    }, this.autoSyncIntervalSeconds * 1000);
  }

  public async getStatus(): Promise<GitHubSyncStatus> {
    let currentCommit = null;
    let remoteCommit = null;
    let uncommittedFiles: string[] = [];

    try {
      const commitLog = await this.runGit(['log', '-1', '--format=%H|||%h|||%s|||%an|||%ad']);
      const [hash, shortHash, message, author, date] = commitLog.split('|||');
      if (hash) {
        currentCommit = { hash, shortHash, message, author, date };
      }
    } catch {
      // Not yet committed or error
    }

    try {
      const statusOutput = await this.runGit(['status', '--porcelain']);
      if (statusOutput) {
        uncommittedFiles = statusOutput.split('\n').filter(Boolean).map(l => l.trim());
      }
    } catch {}

    const repoName = this.repoUrl.replace(/.*github\.com\//, '').replace(/\.git$/, '');

    return {
      connected: true,
      repoUrl: this.repoUrl,
      repoName: repoName || 'Willian5720/IMCH-AI',
      branch: this.branch,
      currentCommit,
      remoteCommit,
      hasToken: Boolean(this.token && this.token.length > 0),
      autoSyncEnabled: this.autoSyncEnabled,
      autoSyncIntervalSeconds: this.autoSyncIntervalSeconds,
      lastSyncedAt: this.lastSyncedAt,
      uncommittedChanges: uncommittedFiles.length,
      uncommittedFiles,
      isSyncing: this.isSyncing,
      lastError: this.lastError,
      lastLog: this.lastLog,
    };
  }

  private getAuthenticatedRemoteUrl(tokenToUse?: string): string {
    const token = tokenToUse || this.token;
    if (!token) {
      return this.repoUrl;
    }
    const cleanUrl = this.repoUrl.replace(/^https?:\/\//, '').replace(/^.*@github\.com/, 'github.com');
    return `https://${token}@${cleanUrl}`;
  }

  private sanitizeOutput(text: string): string {
    if (!this.token) return text;
    return text.replace(new RegExp(this.token, 'g'), '***');
  }

  /**
   * Pull latest changes from GitHub into this applet
   */
  public async pull(token?: string): Promise<{ success: boolean; message: string; output?: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Já existe uma sincronização em curso.' };
    }
    this.isSyncing = true;
    this.lastError = null;

    try {
      const authUrl = this.getAuthenticatedRemoteUrl(token);
      
      // 1. Fetch remote origin
      await this.runGit(['fetch', authUrl, this.branch]);

      // 2. Check if working tree has unstaged changes
      const statusOutput = await this.runGit(['status', '--porcelain']);
      const hasUnstaged = Boolean(statusOutput && statusOutput.trim().length > 0);

      let pullMsg = '';
      if (hasUnstaged) {
        // Stash local changes, merge, then pop
        try {
          await this.runGit(['stash']);
          await this.runGit(['merge', `FETCH_HEAD`, '-m', 'Merge remote changes from GitHub [auto-sync]']);
          await this.runGit(['stash', 'pop']).catch(() => {});
          pullMsg = 'Alterações remotas mescladas com sucesso preservando modificações locais.';
        } catch {
          // Fallback to fetch head merge
          await this.runGit(['merge', 'FETCH_HEAD', '--no-edit']);
          pullMsg = 'Alterações do GitHub sincronizadas com sucesso.';
        }
      } else {
        await this.runGit(['merge', 'FETCH_HEAD', '--ff-only']).catch(async () => {
          await this.runGit(['merge', 'FETCH_HEAD', '--no-edit']);
        });
        pullMsg = 'Repositório atualizado a partir do GitHub com sucesso!';
      }

      this.lastSyncedAt = new Date().toISOString();
      this.lastLog = pullMsg;
      return { success: true, message: pullMsg };
    } catch (err: any) {
      const sanitized = this.sanitizeOutput(err.message || String(err));
      this.lastError = sanitized;
      return { success: false, message: `Erro ao obter alterações do GitHub: ${sanitized}` };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullSilent() {
    try {
      const authUrl = this.getAuthenticatedRemoteUrl();
      await this.runGit(['fetch', authUrl, this.branch]);
      // If no local modifications, fast-forward
      const statusOutput = await this.runGit(['status', '--porcelain']);
      if (!statusOutput || statusOutput.trim().length === 0) {
        await this.runGit(['merge', 'FETCH_HEAD', '--ff-only']).catch(() => {});
        this.lastSyncedAt = new Date().toISOString();
      }
    } catch {
      // Background silent tick ignore
    }
  }

  /**
   * Push changes to GitHub
   */
  public async push(options: {
    message?: string;
    token?: string;
    authorName?: string;
    authorEmail?: string;
  } = {}): Promise<{ success: boolean; message: string; output?: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Já existe uma sincronização em curso.' };
    }
    const token = options.token || this.token;
    if (!token) {
      return {
        success: false,
        message: 'Personal Access Token (PAT) do GitHub é necessário para enviar alterações para o repositório remoto.',
      };
    }

    this.isSyncing = true;
    this.lastError = null;

    try {
      // Check for unstaged or uncommitted changes
      await this.runGit(['add', '-A']);
      
      const statusOutput = await this.runGit(['status', '--porcelain']);
      const hasChangesToCommit = Boolean(statusOutput && statusOutput.trim().length > 0);

      const commitMessage = options.message?.trim() || `chore: sincronização IMCH AI Developer [${new Date().toLocaleString('pt-PT')}]`;

      if (hasChangesToCommit) {
        const authorName = options.authorName || 'IMCH Soluções Digitais';
        const authorEmail = options.authorEmail || 'imchsolucoes@gmail.com';
        await this.runGit([
          '-c', `user.name=${authorName}`,
          '-c', `user.email=${authorEmail}`,
          'commit', '-m', commitMessage
        ]);
      }

      const authUrl = this.getAuthenticatedRemoteUrl(token);
      await this.runGit(['push', authUrl, `HEAD:${this.branch}`]);

      this.lastSyncedAt = new Date().toISOString();
      const successMsg = `Alterações enviadas e sincronizadas com sucesso no GitHub (${this.repoUrl})!`;
      this.lastLog = successMsg;
      return { success: true, message: successMsg };
    } catch (err: any) {
      const sanitized = this.sanitizeOutput(err.message || String(err));
      this.lastError = sanitized;
      return { success: false, message: `Erro ao enviar para o GitHub: ${sanitized}` };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Complete sync (Pull + Push)
   */
  public async syncAll(options: {
    message?: string;
    token?: string;
    authorName?: string;
    authorEmail?: string;
  } = {}): Promise<{ success: boolean; message: string }> {
    const token = options.token || this.token;
    
    // 1. Pull first
    const pullRes = await this.pull(token);
    if (!pullRes.success && !pullRes.message.includes('preservando modificações')) {
      // If pull strictly failed, log warning but continue if token present
    }

    // 2. If token present, push
    if (token) {
      const pushRes = await this.push(options);
      return pushRes;
    }

    return {
      success: true,
      message: 'Sincronização de leitura concluída. Para sincronização de escrita (push), configure o seu Token GitHub.',
    };
  }
}

export const githubSyncService = new GitHubSyncService();
