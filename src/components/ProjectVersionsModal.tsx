import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Folder, 
  Calendar, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  FileCode,
  ArrowRight,
  Layers
} from 'lucide-react';
import { Project, ProjectVersion } from '../types';
import { projectService } from '../services/projectService';

interface ProjectVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  userId?: string;
  onSelectProject: (project: Project) => void;
  onProjectRestored: (restoredProject: Project) => void;
  onCreateNewProject: () => void;
}

export const ProjectVersionsModal: React.FC<ProjectVersionsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  userId = 'guest',
  onSelectProject,
  onProjectRestored,
  onCreateNewProject,
}) => {
  const [activeTab, setActiveTab] = useState<'versions' | 'projects'>('versions');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const projects = projectService.getProjects(userId);
  const versions = currentProject?.versions || [];

  const handleRestore = (versionId: string) => {
    if (!currentProject) return;
    const restored = projectService.restoreVersion(currentProject.id, versionId, userId);
    if (restored) {
      onProjectRestored(restored);
      onClose();
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tens a certeza que desejas eliminar este projeto?')) {
      projectService.deleteProject(projectId, userId);
      const remaining = projectService.getProjects(userId);
      if (remaining.length > 0) {
        onSelectProject(remaining[0]);
      } else {
        onCreateNewProject();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c0c0e] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-neutral-900 dark:text-neutral-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold tracking-tight uppercase font-mono text-neutral-900 dark:text-white">
              Histórico de Projetos & Versões
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-[#121216] px-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'versions'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Versões do Projeto ({versions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'projects'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos os Projetos ({projects.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'versions' && (
            <div className="space-y-3">
              {!currentProject || versions.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-500" />
                  <p className="font-semibold text-neutral-300">Nenhuma versão anterior gravada</p>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-sm mx-auto">
                    Quando a IA cria ou altera ficheiros no seu projeto, cada alteração é salva automaticamente aqui como um ponto de restauração.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-neutral-500 mb-2">
                    Projeto atual: <strong className="text-neutral-200">{currentProject.name}</strong>. Pode reverter para qualquer versão anterior com 1 clique caso queira desfazer erros.
                  </p>

                  {versions.map((ver, idx) => {
                    const isLatest = idx === 0;
                    const dateFormatted = new Date(ver.timestamp).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });

                    return (
                      <div
                        key={ver.id}
                        className={`p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-4 ${
                          isLatest
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                            : 'bg-neutral-50 dark:bg-[#111115] border-neutral-200 dark:border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isLatest
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}>
                            v{ver.versionNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-neutral-900 dark:text-white">
                                {ver.label}
                              </h4>
                              {isLatest && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 font-mono rounded">
                                  Atual
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {dateFormatted} • {Object.keys(ver.files).length} ficheiros salvos
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isLatest ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(ver.id)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar</span>
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400 font-mono px-2 py-1">
                              Versão ativa
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  Lista de projetos criados na sua conta.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onCreateNewProject();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Projeto</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-500" />
                  <p className="font-semibold text-neutral-300">Nenhum projeto gravado</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Crie o seu primeiro site conversando com a IA ou clicando em Novo Projeto.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const isSelected = currentProject?.id === p.id;
                    const dateFormatted = new Date(p.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          onClose();
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                            : 'bg-neutral-50 dark:bg-[#111115] border-neutral-200 dark:border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-blue-500 shrink-0">
                            <Folder className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-neutral-900 dark:text-white">
                                {p.name}
                              </h4>
                              {isSelected && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 font-mono rounded">
                                  Em Aberto
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {Object.keys(p.files).length} ficheiros • {p.versions?.length || 1} versões • {dateFormatted}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(p.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 rounded transition-colors"
                            title="Eliminar projeto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
