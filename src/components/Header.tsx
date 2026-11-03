import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Download, 
  Github, 
  Plus,
  Crown,
  Coins,
  User,
  LogOut,
  ChevronDown,
  UserPlus,
  MessageSquare,
  FolderGit2,
  Check
} from 'lucide-react';
import { UserProfile, CollaborationInvite } from '../types';

interface HeaderProps {
  currentView: 'chat' | 'developer' | 'generator';
  onSelectView: (view: 'chat' | 'developer' | 'generator') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  workspaceLayout: 'split' | 'code-only' | 'preview-only';
  onSelectLayout: (layout: 'split' | 'code-only' | 'preview-only') => void;
  onNewProject: () => void;
  onExportZip: () => void;
  onOpenGithub: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  onLogout: () => void;
  selectedModel: string;
  onOpenModelModal: () => void;
  onOpenInvitePartner?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onSwitchUser?: (email: string) => void;
  onOpenRegister?: () => void;
  invites?: CollaborationInvite[];
  onAcceptInvite?: (invite: CollaborationInvite) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  theme,
  onToggleTheme,
  workspaceLayout,
  onSelectLayout,
  onNewProject,
  onExportZip,
  onOpenGithub,
  user,
  onOpenAuth,
  onOpenPricing,
  onLogout,
  selectedModel,
  onOpenModelModal,
  onOpenInvitePartner,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onSwitchUser,
  onOpenRegister,
  invites = [],
  onAcceptInvite,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const myInvites = user?.email
    ? invites.filter((i) => i.toUserEmail.toLowerCase() === user.email.toLowerCase())
    : [];
  const pendingInvitesCount = myInvites.filter((i) => i.status === 'pending').length;

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#08080a] text-neutral-900 dark:text-neutral-100 shrink-0 z-30 transition-colors select-none">
      {/* Left / Navigation: [ GERADOR DE SITES ] [ IMChat ] [ IMCH AI DEVELOPER ] */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 whitespace-nowrap shrink-0">
        <button
          type="button"
          onClick={() => onSelectView('generator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer ${
            currentView === 'generator'
              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
          title="Abrir Gerador de Sites em 2 Etapas (Planner + Coder)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gerador de Sites</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('chat')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer ${
            currentView === 'chat'
              ? 'bg-white text-black dark:bg-white dark:text-black shadow-xs ring-1 ring-neutral-300 dark:ring-neutral-300'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
          title="Abrir IMChat"
        >
          IMChat
        </button>

        <button
          type="button"
          onClick={() => onSelectView('developer')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer ${
            currentView === 'developer'
              ? 'bg-white text-black dark:bg-white dark:text-black shadow-xs ring-1 ring-neutral-300 dark:ring-neutral-300'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
          title="Abrir ambiente IMCH AI Developer"
        >
          IMCH AI DEVELOPER
        </button>
      </div>

      {/* Right: Controls, Credits/Plan & Tools */}
      <div className="flex items-center gap-2 shrink-0">
        {/* If in Developer view, show layout and export tools */}
        {currentView === 'developer' && (
          <>
            {/* Layout controls */}
            <div className="hidden md:flex items-center gap-0.5 bg-neutral-100 dark:bg-[#121215] border border-neutral-300 dark:border-neutral-800 rounded p-0.5 text-xs">
              <button
                onClick={() => onSelectLayout('split')}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  workspaceLayout === 'split'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Divisão completa"
              >
                Divisão
              </button>
              <button
                onClick={() => onSelectLayout('code-only')}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  workspaceLayout === 'code-only'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Apenas código"
              >
                Código
              </button>
              <button
                onClick={() => onSelectLayout('preview-only')}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  workspaceLayout === 'preview-only'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Apenas pré-visualização"
              >
                Prévia
              </button>
            </div>

            {/* Export & GitHub */}
            <div className="flex items-center gap-1 border-r border-neutral-200 dark:border-neutral-800 pr-1">
              <button
                onClick={onExportZip}
                className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors whitespace-nowrap cursor-pointer"
                title="Exportar ZIP"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden lg:inline text-[11px]">ZIP</span>
              </button>

              <button
                onClick={onOpenGithub}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer border border-neutral-300 dark:border-neutral-800"
                title="Conectar ao GitHub e Exportar Website"
              >
                <Github className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200" />
                <span className="inline text-[11px] font-mono">GitHub</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Conexão com GitHub ativa" />
              </button>
            </div>

            {/* Novo Projeto */}
            <button
              onClick={onNewProject}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-neutral-200 dark:text-black rounded transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Novo</span>
            </button>
          </>
        )}

        {/* Pricing / Credits Section - ONLY visible when user is logged in */}
        {user && (
          user.plan === 'pro' ? (
            <button
              type="button"
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-102"
              title="Plano PRO Ilimitado Ativo"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>PRO</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenPricing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#141418] hover:bg-neutral-200 dark:hover:bg-[#1e1e24] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 font-mono transition-colors cursor-pointer"
                title="Clique para obter mais créditos ou ativar Plano PRO"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold">{user.credits}</span>
                <span className="text-[10px] text-neutral-500">créditos</span>
              </button>

              <button
                type="button"
                onClick={onOpenPricing}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Fazer upgrade para Plano PRO"
              >
                <Crown className="w-3 h-3" />
                <span>Obter PRO</span>
              </button>
            </div>
          )
        )}

        {/* Active OpenRouter AI Model Button */}
        <button
          type="button"
          onClick={onOpenModelModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#141418] dark:hover:bg-[#1f1f26] border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-all cursor-pointer shadow-xs"
          title="Ver detalhes da chave OpenRouter e alternar inteligência artificial"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="font-mono text-[11px] truncate max-w-[120px] hidden sm:inline">
            {selectedModel.split('/')[1] || selectedModel}
          </span>
          <span className="text-[10px] text-neutral-400 uppercase font-bold sm:hidden">IA</span>
        </button>

        {/* SMS / Notifications icon button next to profile */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} nova(s) mensagem` : 'Mensagens'}
        >
          <MessageSquare className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* User Account Menu / Login Button */}
        {user ? (
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-xs"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isUserMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-[#121216] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-2 z-50 text-xs font-sans animate-in fade-in"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="p-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                  <div className="font-bold text-neutral-900 dark:text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {user.email}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Plano:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      user.plan === 'pro' 
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {user.plan === 'pro' ? '⭐ PRO Ilimitado' : `${user.credits} Créditos`}
                    </span>
                  </div>
                </div>

                {/* Convites de Projetos Recebidos para Colaborar */}
                <div className="p-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Convites de Projetos</span>
                    </span>
                    {pendingInvitesCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500 text-white animate-pulse">
                        {pendingInvitesCount} novo(s)
                      </span>
                    )}
                  </div>

                  {myInvites.length === 0 ? (
                    <div className="text-[10px] text-neutral-400 py-1 italic">
                      Nenhum convite pendente.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {myInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-1.5 rounded-lg bg-neutral-50 dark:bg-[#18181f] border border-neutral-200 dark:border-neutral-700/60 flex flex-col gap-1 text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[130px]">
                              {inv.projectName}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                              inv.status === 'accepted'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {inv.status === 'accepted' ? 'Aceite' : 'Pendente'}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            De: {inv.fromUserName || inv.fromUserEmail}
                          </div>
                          {inv.message && (
                            <div className="text-[10px] text-neutral-400 italic line-clamp-1">
                              "{inv.message}"
                            </div>
                          )}
                          {inv.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsUserMenuOpen(false);
                                onAcceptInvite?.(inv);
                              }}
                              className="mt-0.5 w-full py-1 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Aceitar e Editar Juntos</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsUserMenuOpen(false);
                                onAcceptInvite?.(inv);
                              }}
                              className="mt-0.5 w-full py-1 px-2 rounded-md bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Abrir no Editor</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gerir Plano & Recargas</span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors flex items-center gap-2 cursor-pointer mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminar Sessão</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <User className="w-3.5 h-3.5" />
            <span>Entrar / Cadastrar</span>
          </button>
        )}

        {/* Theme Toggle (Sun & Moon) */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          aria-label="Alternar modo claro e escuro"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-800" />
          )}
        </button>
      </div>
    </header>
  );
};
