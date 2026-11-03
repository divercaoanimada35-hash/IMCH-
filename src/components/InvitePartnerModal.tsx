import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Mail, 
  FolderGit2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  ChevronDown,
  Layers
} from 'lucide-react';
import { UserProfile, Project } from '../types';
import { collaborationService } from '../services/collaborationService';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  currentUser?: UserProfile | null;
  currentProject?: Project;
  projects?: Project[];
  currentProjectId?: string;
  onOpenPricing: () => void;
  onInviteSuccess?: (invite?: any) => void;
  onSuccess?: (invite?: any) => void;
  onRequireAuth?: () => void;
}

export const InvitePartnerModal: React.FC<InvitePartnerModalProps> = ({
  isOpen,
  onClose,
  user: directUser,
  currentUser,
  currentProject: directProject,
  projects = [],
  currentProjectId,
  onOpenPricing,
  onInviteSuccess,
  onSuccess,
  onRequireAuth,
}) => {
  const user = directUser || currentUser || null;

  // Compute available projects created in Developer
  const availableProjects: Project[] = React.useMemo(() => {
    const list: Project[] = [];
    if (directProject && directProject.id) {
      list.push(directProject);
    }
    projects.forEach((p) => {
      if (!list.some((existing) => existing.id === p.id)) {
        list.push(p);
      }
    });
    if (list.length === 0) {
      list.push({
        id: 'imch-project-starter',
        name: 'Novo Projeto IMCH',
        description: 'Projeto web desenvolvido no IMCH AI Developer',
        files: {},
        activeFilePath: '',
        entryFile: 'index.html',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  }, [directProject, projects]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return currentProjectId || directProject?.id || (projects[0]?.id || availableProjects[0]?.id || '');
  });

  useEffect(() => {
    if (currentProjectId && availableProjects.some((p) => p.id === currentProjectId)) {
      setSelectedProjectId(currentProjectId);
    } else if (directProject?.id) {
      setSelectedProjectId(directProject.id);
    } else if (availableProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(availableProjects[0].id);
    }
  }, [currentProjectId, directProject, availableProjects, selectedProjectId]);

  const activeProject = availableProjects.find((p) => p.id === selectedProjectId) || availableProjects[0];

  const [partnerEmail, setPartnerEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState(
    'Olá! Gostaria de te convidar para colaborar em tempo real comigo neste projeto no IMCH AI Developer.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setPartnerEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth?.();
      return;
    }

    const cleanEmail = partnerEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setStatusMessage({ type: 'error', text: 'Por favor, insira o e-mail do parceiro.' });
      return;
    }

    if (cleanEmail === user.email.toLowerCase()) {
      setStatusMessage({ type: 'error', text: 'Não pode enviar convite para o seu próprio e-mail.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await collaborationService.sendInvite({
      fromUser: user,
      toEmail: cleanEmail,
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectDescription: activeProject.description,
      message: inviteMessage.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Não foi possível enviar o convite.',
      });
    } else {
      setStatusMessage({
        type: 'success',
        text: `Convite enviado com sucesso para ${cleanEmail}! Quando o parceiro entrar na sua conta no IMCH AI Developer, verá a notificação de colaboração para entrar na sessão.`,
      });
      setTimeout(() => {
        onInviteSuccess?.(result.invite);
        onSuccess?.(result.invite);
        onClose();
      }, 1500);
    }
  };

  const isFreePlan = user?.plan === 'free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0f1117] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#141720]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Convidar Parceiro de Código
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Tempo Real
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Colaboração simultânea e chat com áudio sem gastar créditos de IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Limit Banner */}
        <div className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
          isFreePlan 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {isFreePlan ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> : <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span>
              {isFreePlan ? (
                <>
                  <strong>Modo Free:</strong> Permite partilhar <strong>1 projeto</strong> com <strong>1 parceiro</strong>.
                </>
              ) : (
                <>
                  <strong>Plano PRO Ativo:</strong> Partilha de projetos e parceiros <strong>ilimitados</strong>.
                </>
              )}
            </span>
          </div>

          {isFreePlan && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 shrink-0 cursor-pointer text-[11px]"
            >
              Fazer Upgrade
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Project selected for sharing - user can select among projects created in Developer */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Projeto a Partilhar (criado no Developer):
            </label>

            {availableProjects.length > 1 ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full appearance-none bg-neutral-100 dark:bg-[#161922] border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-neutral-900 dark:text-neutral-100 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {availableProjects.map((p) => {
                      const fileCount = Object.keys(p.files || {}).length;
                      return (
                        <option key={p.id} value={p.id} className="bg-white dark:bg-[#12141c] text-neutral-900 dark:text-white">
                          {p.name} ({fileCount} {fileCount === 1 ? 'ficheiro' : 'ficheiros'})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-neutral-400 pointer-events-none" />
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-[#12141c] border border-neutral-200 dark:border-neutral-800/80">
                  <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="truncate flex-1">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">
                      {activeProject.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {Object.keys(activeProject.files || {}).length} ficheiros • Entrada: {activeProject.entryFile || 'index.html'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-100 dark:bg-[#161922] border border-neutral-200 dark:border-neutral-800">
                <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="truncate flex-1">
                  <div className="font-bold text-neutral-900 dark:text-white truncate">
                    {activeProject.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {Object.keys(activeProject.files || {}).length} ficheiros • Entrada: {activeProject.entryFile || 'index.html'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Partner Email Input - ONLY direct input for the partner they know */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              E-mail do Parceiro (registado no AI Developer):
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => {
                  setPartnerEmail(e.target.value);
                  if (statusMessage) setStatusMessage(null);
                }}
                placeholder="Insira o e-mail do parceiro que conhece..."
                required
                className="w-full bg-neutral-50 dark:bg-[#161922] border border-neutral-300 dark:border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
              * Apenas utilizadores já registados no IMCH AI Developer podem ser convidados.
            </p>
          </div>

          {/* Invitation Message */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Mensagem do Convite:
            </label>
            <textarea
              rows={2}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-[#161922] border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            />
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="text-xs">{statusMessage.text}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !partnerEmail.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-all cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A enviar...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Convite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
