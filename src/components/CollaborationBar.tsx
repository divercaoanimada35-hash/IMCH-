import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  LogOut, 
  ChevronRight,
  FileCode
} from 'lucide-react';
import { CollaboratorUser, UserProfile, Project } from '../types';

interface CollaborationBarProps {
  project?: Project;
  projectName?: string;
  isShared?: boolean;
  isOwner?: boolean;
  currentUser: UserProfile | null;
  collaborators: CollaboratorUser[];
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  onOpenInviteModal?: () => void;
  onInvitePartner?: () => void;
  onLeaveCollaboration?: () => void;
}

export const CollaborationBar: React.FC<CollaborationBarProps> = ({
  project,
  projectName: directProjectName,
  isShared: directIsShared,
  isOwner: directIsOwner,
  currentUser,
  collaborators,
  onToggleDrawer,
  isDrawerOpen,
  onOpenInviteModal,
  onInvitePartner,
  onLeaveCollaboration,
}) => {
  const isShared = directIsShared ?? project?.isShared ?? false;
  if (!isShared) return null;

  const projectName = directProjectName || project?.name || 'Projeto';
  const isOwner = directIsOwner ?? (project?.role === 'owner' || project?.ownerEmail === currentUser?.email);
  const handleInvite = onInvitePartner || onOpenInviteModal || (() => {});

  const onlineCollaborators = collaborators.filter((c) => c.isOnline);
  const otherPartners = collaborators.filter(
    (c) => c.email.toLowerCase() !== (currentUser?.email || '').toLowerCase()
  );

  return (
    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-950/40 via-neutral-900 to-emerald-950/30 border-b border-blue-900/40 text-xs flex items-center justify-between gap-3 shrink-0 select-none animate-in fade-in">
      {/* Left: Real-time badge & Project Name */}
      <div className="flex items-center gap-2.5 truncate">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>EM TEMPO REAL</span>
        </span>

        <span className="text-neutral-300 font-semibold truncate hidden sm:inline">
          {projectName}
        </span>

        <span className="text-neutral-500 text-[11px] hidden md:inline">•</span>

        {/* Collaborators Avatar Stack */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {collaborators.map((c) => {
            const isMe = c.email.toLowerCase() === (currentUser?.email || '').toLowerCase();
            return (
              <div
                key={c.userId}
                style={{ backgroundColor: c.color }}
                className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-neutral-900 shadow-xs cursor-pointer relative ${
                  c.isOnline ? 'opacity-100' : 'opacity-40 grayscale'
                }`}
                title={`${c.name} (${c.role === 'owner' ? 'Dono' : 'Editor'})${
                  c.activeFile ? ` — A ver: ${c.activeFile}` : ''
                }${c.isOnline ? ' [Online]' : ' [Offline]'}`}
              >
                {c.name.slice(0, 1).toUpperCase()}
                {c.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
                )}
              </div>
            );
          })}
        </div>

        {/* Active Partner viewing file indicator */}
        {otherPartners.some((p) => p.isOnline && p.activeFile) && (
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 font-mono truncate max-w-[220px]">
            <FileCode className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {otherPartners.find((p) => p.isOnline && p.activeFile)?.name.split(' ')[0]}:{' '}
              {otherPartners.find((p) => p.isOnline && p.activeFile)?.activeFile}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions (Invite, Open Chat/Voice Drawer) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInvite}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition-colors cursor-pointer border border-neutral-700/60"
          title="Convidar parceiro de código"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Convidar</span>
        </button>

        <button
          type="button"
          onClick={onToggleDrawer}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isDrawerOpen
              ? 'bg-blue-600 text-white ring-1 ring-blue-500'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
          }`}
          title="Abrir Chat da Comunidade, Mensagens de Áudio e Histórico"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat & Voz</span>
        </button>
      </div>
    </div>
  );
};
