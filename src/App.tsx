import React, { useState, useEffect, useCallback } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  SiteGeneratorView 
} from './components/SiteGeneratorView';
import { 
  IMCHChatView 
} from './components/IMCHChatView';
import { 
  AIChatPanel 
} from './components/AIChatPanel';
import { 
  CodeEditor 
} from './components/CodeEditor';
import { 
  LivePreview 
} from './components/LivePreview';
import { 
  NewProjectModal 
} from './components/NewProjectModal';
import { 
  GitHubModal 
} from './components/GitHubModal';
import { 
  AuthModal 
} from './components/AuthModal';
import { 
  PricingModal 
} from './components/PricingModal';
import { 
  AIModelModal 
} from './components/AIModelModal';
import { 
  Project, 
  UserProfile
} from './types';
import { 
  exportProjectToZip 
} from './utils/exporter';
import { 
  authService 
} from './services/auth';
import { 
  apiService 
} from './services/api';
import { 
  FileExplorer 
} from './components/FileExplorer';
import { 
  InvitePartnerModal 
} from './components/InvitePartnerModal';
import { 
  NotificationsModal 
} from './components/NotificationsModal';
import { 
  CollaborationBar 
} from './components/CollaborationBar';
import { 
  CollaborationDrawer 
} from './components/CollaborationDrawer';
import { 
  collaborationService 
} from './services/collaborationService';
import { 
  CollaboratorUser, 
  CollaborationInvite 
} from './types';
import { 
  FileCode, 
  FileText, 
  Code as CodeIcon, 
  Plus, 
  X, 
  ChevronDown,
  Eye,
  Code2,
  Folder,
  FolderOpen
} from 'lucide-react';

const createCleanStarterProject = (user?: UserProfile | null): Project => {
  const userName = user?.name ? user.name.split(' ')[0] : 'Convidado';
  const userPrefix = user?.id || 'guest';
  return {
    id: `proj-${Date.now()}`,
    name: 'Novo Projeto IMCH',
    description: 'Ambiente pronto para criação',
    entryFile: '',
    activeFilePath: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    files: {},
    isShared: false,
  };
};

export default function App() {
  // Primary application view: 'developer' (3-panel workspace powered by the 2-step site generator) | 'chat' | 'generator'
  const [currentView, setCurrentView] = useState<'developer' | 'chat' | 'generator'>('developer');

  // Theme state: dark | light (persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('imch_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  // Workspace Layout mode: 'split' | 'code-only' | 'preview-only'
  const [workspaceLayout, setWorkspaceLayout] = useState<'split' | 'code-only' | 'preview-only'>('split');

  // Panel resizing widths (in pixels)
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem('imch_chat_width');
    return saved ? Math.max(220, Math.min(540, Number(saved))) : 320;
  });

  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    const saved = localStorage.getItem('imch_preview_width');
    return saved ? Math.max(300, Math.min(960, Number(saved))) : 520;
  });

  // Dragging states
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // New file modal / quick add state inside developer editor
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

  // Authentication & Plan / Monetization States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingModalReason, setPricingModalReason] = useState<string | undefined>(undefined);

  // Subscribe to auth changes across windows / sessions
  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      setCurrentUser(u);
    });
    return unsub;
  }, []);

  // OpenRouter Model selection & Modal (default to openrouter/free)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('imch_selected_model');
    if (!saved || saved === 'openrouter/auto' || saved.includes('nemotron-70b')) {
      return 'openrouter/free';
    }
    return saved;
  });
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // Synchronize active model to backend whenever selectedModel changes or initializes
  useEffect(() => {
    apiService.setActiveModel(selectedModel).catch(() => {});
  }, [selectedModel]);

  // Active Project (isolated per-user private workspace)
  const [project, setProject] = useState<Project>(() => createCleanStarterProject(currentUser));

  // Saved Developer Projects created by user (isolated in localStorage per-user key)
  const [developerProjects, setDeveloperProjects] = useState<Project[]>([]);

  // Load user-specific projects whenever currentUser logs in or switches
  useEffect(() => {
    if (!currentUser) return;
    const userStorageKey = `imch_projects_${currentUser.email.toLowerCase().trim()}`;
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDeveloperProjects(parsed);
          setProject(parsed[0]);
          return;
        }
      }
    } catch {}

    const freshProject = createCleanStarterProject(currentUser);
    setDeveloperProjects([freshProject]);
    setProject(freshProject);
  }, [currentUser?.email]);

  // Track and save user-specific developer projects into their private isolated storage
  useEffect(() => {
    if (!currentUser) return;
    const userStorageKey = `imch_projects_${currentUser.email.toLowerCase().trim()}`;
    if (project && project.name) {
      setDeveloperProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        const nextList = exists
          ? prev.map((p) => (p.id === project.id ? project : p))
          : [project, ...prev];
        try {
          localStorage.setItem(userStorageKey, JSON.stringify(nextList.slice(0, 20)));
        } catch {}
        return nextList;
      });
    }
  }, [project, currentUser?.email]);

  // Community & Real-time Collaboration States
  const [isInvitePartnerModalOpen, setIsInvitePartnerModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [unreadSMSCount, setUnreadSMSCount] = useState<number>(1);
  const [isCollabDrawerOpen, setIsCollabDrawerOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<CollaborationInvite[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorUser[]>([]);

  // Real-time direct SMS listener
  useEffect(() => {
    const unsub = collaborationService.onDirectSMS((newSMS) => {
      const myEmail = (currentUser?.email || '').toLowerCase();
      if (newSMS.toEmail.toLowerCase() === myEmail) {
        setUnreadSMSCount((prev) => prev + 1);
      }
    });
    return unsub;
  }, [currentUser?.email]);

  // User synchronization with Collaboration Server & Websocket identification
  useEffect(() => {
    if (currentUser) {
      fetch('/api/collaboration/users/register-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          plan: currentUser.plan,
        }),
      }).catch(() => {});

      collaborationService.identify(
        currentUser.id,
        currentUser.name,
        currentUser.email,
        currentUser.plan
      );

      collaborationService.getInvites(currentUser.email).then((invites) => {
        setPendingInvites(invites);
      }).catch(() => {});
    }
  }, [currentUser]);

  // Real-time invites listener via WebSocket
  useEffect(() => {
    const unsubscribeInvite = collaborationService.onInvite((newInvite) => {
      setPendingInvites((prev) => {
        if (prev.some((i) => i.id === newInvite.id)) return prev;
        return [newInvite, ...prev];
      });
    });
    return unsubscribeInvite;
  }, []);

  // Shared project WebSocket room & real-time code synchronization
  useEffect(() => {
    if (project.isShared) {
      const user: UserProfile = currentUser || {
        id: 'guest',
        name: 'Dev Colaborador',
        email: 'dev@imch.ao',
        plan: 'free',
        credits: 0,
        createdAt: new Date().toISOString(),
      };

      collaborationService.joinRoom(project.id, user);

      const unsubscribeCode = collaborationService.onCodeUpdate(({ filePath, code }) => {
        setProject((prev) => {
          const existing = prev.files[filePath];
          return {
            ...prev,
            updatedAt: new Date().toISOString(),
            files: {
              ...prev.files,
              [filePath]: {
                name: filePath,
                path: filePath,
                content: code,
                language: existing ? existing.language : 'typescript',
              },
            },
          };
        });
      });

      const unsubscribePresence = collaborationService.onPresence((collabs) => {
        setActiveCollaborators(collabs);
      });

      return () => {
        unsubscribeCode();
        unsubscribePresence();
      };
    }
  }, [project.id, project.isShared, currentUser]);

  const handleAcceptInvite = async (invite: CollaborationInvite) => {
    if (!currentUser) return;
    try {
      const accepted = await collaborationService.acceptInvite(invite.id, currentUser.email);
      setPendingInvites((prev) =>
        prev.map((i) => (i.id === invite.id ? { ...i, status: 'accepted' as const } : i))
      );

      const roomData = accepted.room || (await collaborationService.getRoom(invite.projectId));
      const fileEntries = Object.entries(roomData.files || {});
      const firstPath = fileEntries[0] ? fileEntries[0][0] : '';

      setProject({
        id: roomData.projectId,
        name: roomData.projectName,
        description: `Projeto colaborativo partilhado por ${roomData.ownerName || roomData.ownerEmail}`,
        entryFile: firstPath,
        activeFilePath: firstPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: fileEntries.reduce((acc, [path, content]) => {
          let language: any = 'typescript';
          if (path.endsWith('.css')) language = 'css';
          else if (path.endsWith('.html')) language = 'html';
          else if (path.endsWith('.json')) language = 'json';
          acc[path] = {
            name: path,
            path,
            content: content as string,
            language,
          };
          return acc;
        }, {} as Record<string, any>),
        isShared: true,
        ownerEmail: roomData.ownerEmail,
        ownerName: roomData.ownerName,
        sharedWith: roomData.collaborators.map((c: any) => c.email),
        role: 'editor',
      });

      setIsNotificationsModalOpen(false);
      setCurrentView('developer');
    } catch (err) {
      console.error('Falha ao aceitar convite de parceiro:', err);
    }
  };

  // Sync theme with HTML root class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('imch_theme', theme);
  }, [theme]);

  // Persist panel widths
  useEffect(() => {
    localStorage.setItem('imch_chat_width', String(chatWidth));
  }, [chatWidth]);

  useEffect(() => {
    localStorage.setItem('imch_preview_width', String(previewWidth));
  }, [previewWidth]);

  // Subscribe to real-time authentication & credit changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((updatedUser) => {
      setCurrentUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  // Left divider dragging handler
  const handleLeftDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.min(540, Math.max(220, moveEvent.clientX));
      setChatWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDraggingLeft(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, []);

  // Right divider dragging handler
  const handleRightDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.min(
        window.innerWidth - 380,
        Math.max(300, window.innerWidth - moveEvent.clientX)
      );
      setPreviewWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDraggingRight(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectFile = (path: string) => {
    if (project.files[path]) {
      setProject((prev) => ({
        ...prev,
        activeFilePath: path,
      }));
      if (project.isShared) {
        collaborationService.sendFileFocus(path);
      }
    }
  };

  const handleChangeContent = (newContent: string) => {
    const activePath = project.activeFilePath;
    setProject((prev) => {
      if (!prev.files[activePath]) return prev;

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        files: {
          ...prev.files,
          [activePath]: {
            ...prev.files[activePath],
            content: newContent,
          },
        },
      };
    });

    if (project.isShared && activePath) {
      collaborationService.sendCodeEdit(activePath, newContent);
    }
  };

  const handleUpdateSingleFile = (filePath: string, newContent: string) => {
    setProject((prev) => {
      const existing = prev.files[filePath];
      let language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' = 'html';

      if (filePath.endsWith('.css')) language = 'css';
      else if (filePath.endsWith('.js')) language = 'javascript';
      else if (filePath.endsWith('.ts')) language = 'typescript';
      else if (filePath.endsWith('.json')) language = 'json';
      else if (filePath.endsWith('.md')) language = 'markdown';

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        activeFilePath: filePath,
        files: {
          ...prev.files,
          [filePath]: {
            name: filePath,
            path: filePath,
            content: newContent,
            language: existing ? existing.language : language,
          },
        },
      };
    });

    if (project.isShared) {
      collaborationService.sendCodeEdit(filePath, newContent);
    }
  };

  const handleUpdateMultipleFiles = (files: Record<string, string>) => {
    setProject((prev) => {
      const updatedFiles = { ...prev.files };

      Object.entries(files).forEach(([filePath, content]) => {
        let language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' = 'html';
        if (filePath.endsWith('.css')) language = 'css';
        else if (filePath.endsWith('.js')) language = 'javascript';
        else if (filePath.endsWith('.ts')) language = 'typescript';
        else if (filePath.endsWith('.json')) language = 'json';
        else if (filePath.endsWith('.md')) language = 'markdown';

        updatedFiles[filePath] = {
          name: filePath,
          path: filePath,
          content,
          language,
        };
      });

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        files: updatedFiles,
      };
    });
  };

  const handleAddFile = (filePath: string, initialContent = '') => {
    const cleanPath = filePath.trim();
    if (!cleanPath) return;

    let language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' = 'html';
    if (cleanPath.endsWith('.css')) language = 'css';
    else if (cleanPath.endsWith('.js')) language = 'javascript';
    else if (cleanPath.endsWith('.ts')) language = 'typescript';
    else if (cleanPath.endsWith('.json')) language = 'json';
    else if (cleanPath.endsWith('.md')) language = 'markdown';

    setProject((prev) => ({
      ...prev,
      activeFilePath: cleanPath,
      updatedAt: new Date().toISOString(),
      files: {
        ...prev.files,
        [cleanPath]: {
          name: cleanPath,
          path: cleanPath,
          content: initialContent,
          language,
        },
      },
    }));

    setIsCreatingFile(false);
    setNewFileName('');
  };

  const handleDeleteFile = (filePath: string) => {
    if (Object.keys(project.files).length <= 1) {
      alert('Não é possível remover o último ficheiro do projeto.');
      return;
    }

    setProject((prev) => {
      const nextFiles = { ...prev.files };
      delete nextFiles[filePath];

      let nextActive = prev.activeFilePath;
      if (nextActive === filePath) {
        nextActive = Object.keys(nextFiles)[0];
      }

      return {
        ...prev,
        activeFilePath: nextActive,
        updatedAt: new Date().toISOString(),
        files: nextFiles,
      };
    });
  };

  const handleAddFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddFile(newFileName);
  };

  const handleProjectReady = (projectData: {
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
    architecturePlan?: any;
    qualityReport?: any;
  }) => {
    const projectFiles: Project['files'] = {};

    Object.entries(projectData.files).forEach(([p, content]) => {
      let language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' = 'html';
      if (p.endsWith('.css')) language = 'css';
      else if (p.endsWith('.js')) language = 'javascript';
      else if (p.endsWith('.ts')) language = 'typescript';
      else if (p.endsWith('.json')) language = 'json';
      else if (p.endsWith('.md')) language = 'markdown';

      projectFiles[p] = {
        name: p,
        path: p,
        content,
        language,
      };
    });

    setProject({
      id: Math.random().toString(),
      name: projectData.projectName,
      description: projectData.description,
      entryFile: projectData.entryFile || 'index.html',
      activeFilePath: projectData.entryFile || 'index.html',
      files: projectFiles,
      architecturePlan: projectData.architecturePlan,
      qualityReport: projectData.qualityReport,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExportZip = async () => {
    await exportProjectToZip(project);
  };

  const handleCheckCreditsAndProceed = (): boolean => {
    if (!currentUser) {
      setAuthModalReason('Inicie sessão ou crie uma conta para continuar.');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return false;
    }

    const result = authService.consumeCredit();
    if (!result.allowed) {
      setPricingModalReason(result.reason || 'Esgotou os seus créditos de IA. Obtenha mais créditos ou ative o Plano PRO Ilimitado.');
      setIsPricingModalOpen(true);
      return false;
    }

    return true;
  };

  const handleOpenDeveloperWithPrompt = async (promptText: string) => {
    if (!handleCheckCreditsAndProceed()) return;
    setCurrentView('developer');

    if (promptText && promptText.trim()) {
      try {
        const res = await apiService.generateSite({
          prompt: promptText.trim(),
          model: selectedModel,
        });

        if (res && res.files) {
          handleProjectReady({
            projectName: res.projectName || 'Website IMCH',
            description: res.description || promptText,
            entryFile: res.entryFile || 'index.html',
            files: res.files,
            architecturePlan: res.architecturePlan,
          });
        }
      } catch (err) {
        setIsNewProjectModalOpen(true);
      }
    } else {
      setIsNewProjectModalOpen(true);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) return <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    if (fileName.endsWith('.css')) return <FileCode className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return <CodeIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };

  const activeFile = (project.activeFilePath && project.files[project.activeFilePath]) 
    ? project.files[project.activeFilePath] 
    : Object.values(project.files)[0] || null;
  const isDraggingAny = isDraggingLeft || isDraggingRight;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 antialiased font-sans transition-colors ${isDraggingAny ? 'select-none cursor-col-resize' : ''}`}>
      {/* Top Bar with Brand, Mode Segmented Control [ Chat ] [ ✦ IMCH AI Developer ], Controls & Tools */}
      <Header
        currentView={currentView}
        onSelectView={(v) => {
          if (v === 'developer' && !currentUser) {
            setAuthModalReason('Inicie sessão ou crie uma conta para aceder ao ambiente IMCH AI Developer.');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setCurrentView(v);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        workspaceLayout={workspaceLayout}
        onSelectLayout={setWorkspaceLayout}
        onNewProject={() => {
          if (!handleCheckCreditsAndProceed()) return;
          setIsNewProjectModalOpen(true);
        }}
        onExportZip={handleExportZip}
        onOpenGithub={() => setIsGithubModalOpen(true)}
        user={currentUser}
        onOpenAuth={() => {
          setAuthModalReason(undefined);
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onOpenPricing={() => {
          setPricingModalReason(undefined);
          setIsPricingModalOpen(true);
        }}
        onLogout={() => {
          authService.logout();
        }}
        selectedModel={selectedModel}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        onOpenRegister={() => {
          setAuthModalReason('Crie uma nova conta com área reservada própria.');
          setAuthModalMode('register');
          setIsAuthModalOpen(true);
        }}
        onOpenInvitePartner={() => {
          if (!currentUser) {
            setAuthModalReason('Inicie sessão para convidar um parceiro e partilhar projetos.');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setIsInvitePartnerModalOpen(true);
        }}
        onOpenNotifications={() => {
          if (!currentUser) {
            setAuthModalReason('Inicie sessão para consultar as suas notificações e convites recebidos.');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setUnreadSMSCount(0);
          setIsNotificationsModalOpen(true);
        }}
        unreadNotificationsCount={Math.max(pendingInvites.filter((i) => i.status === 'pending').length, unreadSMSCount)}
        invites={pendingInvites}
        onAcceptInvite={handleAcceptInvite}
      />

      {/* Main View Area: All views are kept in DOM to preserve state when switching */}
      <div className={`flex-1 flex overflow-hidden ${currentView === 'generator' ? '' : 'hidden'}`}>
        <SiteGeneratorView
          selectedModel={selectedModel}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          onSelectModel={(modelId) => {
            setSelectedModel(modelId);
            localStorage.setItem('imch_selected_model', modelId);
            apiService.setActiveModel(modelId).catch(() => {});
          }}
          onOpenInDeveloper={(genProject) => {
            const entry = genProject.files['index.html'] ? 'index.html' : Object.keys(genProject.files)[0] || '';
            const newProj: Project = {
              id: `proj-${Date.now()}`,
              name: genProject.name,
              description: genProject.description,
              entryFile: entry,
              activeFilePath: entry,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              files: genProject.files,
              isShared: false,
            };
            setProject(newProj);
            setDeveloperProjects((prev) => [newProj, ...prev]);
            setCurrentView('developer');
          }}
        />
      </div>

      <div className={`flex-1 flex overflow-hidden ${currentView === 'chat' ? '' : 'hidden'}`}>
        <IMCHChatView
          onOpenDeveloperWithPrompt={(promptText) => {
            if (!currentUser) {
              setAuthModalReason('Inicie sessão ou crie uma conta para abrir o ambiente de desenvolvimento.');
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
              return;
            }
            handleOpenDeveloperWithPrompt(promptText);
          }}
          onProjectReady={handleProjectReady}
          onUpdateFile={handleUpdateSingleFile}
          onSwitchToDeveloper={() => {
            if (!currentUser) {
              setAuthModalReason('Inicie sessão ou crie uma conta para aceder ao ambiente de desenvolvimento.');
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
              return;
            }
            setCurrentView('developer');
          }}
          currentProjectFiles={project.files}
          user={currentUser}
          onRequireAuth={() => {
            setAuthModalReason('Inicie sessão ou crie uma conta para enviar mensagens e conversar com a IA.');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          selectedModel={selectedModel}
        />
      </div>

      <main className={`flex-1 flex overflow-hidden relative ${currentView === 'developer' ? '' : 'hidden'}`}>
        {/* PANEL 1 (LEFT): Intelligent AI Developer Chat Assistant */}
        {workspaceLayout === 'split' && (
          <div
            style={{ width: `${chatWidth}px` }}
            className="h-full flex flex-col shrink-0 overflow-hidden border-r border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#070707] transition-colors"
          >
            <AIChatPanel
              currentFile={activeFile}
              project={project}
              onUpdateFile={handleUpdateSingleFile}
              onUpdateFiles={handleUpdateMultipleFiles}
              onProjectReady={handleProjectReady}
              selectedModel={selectedModel}
            />
          </div>
        )}

        {/* DRAGGABLE DIVIDER BAR 1 */}
        {workspaceLayout === 'split' && (
          <div
            onPointerDown={handleLeftDragStart}
            className={`w-[6px] shrink-0 h-full relative cursor-col-resize flex items-center justify-center transition-colors z-20 group ${
              isDraggingLeft
                ? 'bg-blue-600'
                : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-blue-600 dark:hover:bg-blue-500'
            }`}
            title="Arrasta para redimensionar"
          >
            <div className="w-1 h-6 rounded-full bg-neutral-400 dark:bg-neutral-600 group-hover:bg-white flex flex-col items-center justify-center gap-1 opacity-70">
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
            </div>
          </div>
        )}

        {/* PANEL 2 (CENTER): Professional Code Editor with Integrated File Explorer */}
        {(workspaceLayout === 'split' || workspaceLayout === 'code-only') && (
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-[340px] bg-[#0a0a0c]">
            {/* Tab Bar for Files + Top Controls [ 👁️ ] [ <> Code ] [ 📁 ] */}
            <div className="flex items-center justify-between px-2 bg-neutral-100 dark:bg-[#0c0c0e] border-b border-neutral-200 dark:border-neutral-800 text-xs shrink-0 select-none overflow-x-auto transition-colors">
              <div className="flex items-center gap-2 py-1">
                <div className="inline-flex items-center p-0.5 rounded-lg bg-neutral-200/80 dark:bg-[#141418] border border-neutral-300 dark:border-neutral-800 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setWorkspaceLayout('preview-only')}
                    className="p-1.5 rounded-md transition-all cursor-pointer text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    title="Alternar para ecrã de pré-visualização completa"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceLayout('split')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      workspaceLayout === 'split'
                        ? 'bg-white dark:bg-[#202026] text-neutral-900 dark:text-white shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title="Modo Dividido: Código + Pré-visualização"
                  >
                    <div className="flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">Split</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceLayout('code-only')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      workspaceLayout === 'code-only'
                        ? 'bg-white dark:bg-[#202026] text-neutral-900 dark:text-white shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title="Apenas Editor de Código"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* File Explorer Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsFileExplorerOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    isFileExplorerOpen
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
                  }`}
                  title={isFileExplorerOpen ? 'Ocultar Explorador de Pastas' : 'Mostrar Explorador de Pastas'}
                >
                  {isFileExplorerOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span className="hidden sm:inline">Pastas</span>
                </button>

                <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-800 mx-0.5 shrink-0" />

                {/* Open File Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {Object.keys(project.files).length === 0 ? (
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono italic px-2">
                      Nenhum ficheiro aberto
                    </span>
                  ) : (
                    Object.values(project.files).map((file) => {
                      const isActive = file.path === project.activeFilePath;
                      const isEntry = file.path === project.entryFile;

                      return (
                        <div
                          key={file.path}
                          onClick={() => handleSelectFile(file.path)}
                          className={`group flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer transition-all whitespace-nowrap ${
                            isActive
                              ? 'bg-white dark:bg-[#151518] text-neutral-900 dark:text-white font-semibold shadow-xs border-b-2 border-blue-600 dark:border-blue-500'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          {getFileIcon(file.path)}
                          <span className="font-mono">{file.path}</span>
                          {isEntry && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-sans">
                              •
                            </span>
                          )}

                          {!isEntry && Object.keys(project.files).length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.path);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 rounded text-neutral-400 transition-opacity ml-1 cursor-pointer"
                              title="Fechar ficheiro"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Inline Add File Button or Input */}
                  {isCreatingFile ? (
                    <form onSubmit={handleAddFileSubmit} className="flex items-center gap-1 px-1">
                      <input
                        type="text"
                        autoFocus
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="ex: styles/theme.css"
                        className="bg-white dark:bg-[#18181b] border border-blue-500 rounded px-2 py-1 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none w-36"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer"
                      >
                        Ok
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingFile(false)}
                        className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsCreatingFile(true)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      title="Adicionar Ficheiro"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Body: File Explorer Sidebar (Tree) + Code Editor */}
            <div className="flex-1 flex overflow-hidden">
              {isFileExplorerOpen && (
                <FileExplorer
                  project={project}
                  activeFilePath={project.activeFilePath}
                  onSelectFile={handleSelectFile}
                  onAddFile={(newPath) => handleAddFile(newPath, '')}
                  onDeleteFile={handleDeleteFile}
                  onClose={() => setIsFileExplorerOpen(false)}
                  userProjects={developerProjects}
                  onSelectProject={(selectedP) => setProject(selectedP)}
                  onNewProject={() => setIsNewProjectModalOpen(true)}
                  currentUser={currentUser}
                />
              )}

              {/* Code Editor */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <CollaborationBar
                  project={project}
                  currentUser={currentUser}
                  collaborators={activeCollaborators}
                  onInvitePartner={() => setIsInvitePartnerModalOpen(true)}
                  onToggleDrawer={() => setIsCollabDrawerOpen((prev) => !prev)}
                  isDrawerOpen={isCollabDrawerOpen}
                />
                <CodeEditor
                  file={activeFile}
                  onChangeContent={handleChangeContent}
                />
              </div>

              {/* Real-time Collaboration Drawer: Chat (text & audio notes without AI credits), Shared History & Team */}
              {isCollabDrawerOpen && (
                <CollaborationDrawer
                  project={project}
                  currentUser={currentUser}
                  collaborators={activeCollaborators}
                  isOpen={isCollabDrawerOpen}
                  onClose={() => setIsCollabDrawerOpen(false)}
                  onOpenInvite={() => setIsInvitePartnerModalOpen(true)}
                />
              )}
            </div>
          </div>
        )}

        {/* DRAGGABLE DIVIDER BAR 2 */}
        {workspaceLayout === 'split' && (
          <div
            onPointerDown={handleRightDragStart}
            className={`w-[6px] shrink-0 h-full relative cursor-col-resize flex items-center justify-center transition-colors z-20 group ${
              isDraggingRight
                ? 'bg-blue-600'
                : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-blue-600 dark:hover:bg-blue-500'
            }`}
            title="Arrasta para redimensionar"
          >
            <div className="w-1 h-6 rounded-full bg-neutral-400 dark:bg-neutral-600 group-hover:bg-white flex flex-col items-center justify-center gap-1 opacity-70">
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
              <span className="w-0.5 h-0.5 rounded-full bg-current" />
            </div>
          </div>
        )}

        {/* PANEL 3 (RIGHT): Live Project Preview */}
        {(workspaceLayout === 'split' || workspaceLayout === 'preview-only') && (
          <div
            style={workspaceLayout === 'split' ? { width: `${previewWidth}px` } : undefined}
            className={`h-full flex flex-col shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-800/80 bg-neutral-100 dark:bg-[#050505] transition-colors ${
              workspaceLayout === 'preview-only' ? 'flex-1' : ''
            }`}
          >
            <LivePreview
              project={project}
              isDragging={isDraggingAny}
            />
          </div>
        )}
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectReady={handleProjectReady}
      />

      {/* GitHub Integration Modal */}
      <GitHubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        project={project}
      />

      {/* Auth Modal (Cadastro & Iniciar Sessão) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        customMessage={authModalReason}
        onSuccess={(loggedUser) => {
          setCurrentUser(loggedUser);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Pricing / Monetization Modal (Planos PRO & Créditos) */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentUser={currentUser}
        promptReason={pricingModalReason}
        onUpgradeSuccess={(upgradedUser) => {
          setCurrentUser(upgradedUser);
        }}
      />

      {/* OpenRouter AI Model & Key Details Modal */}
      <AIModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
          localStorage.setItem('imch_selected_model', modelId);
          apiService.setActiveModel(modelId);
        }}
      />

      {/* Invite Partner Modal (Comunidade & Colaboração) */}
      <InvitePartnerModal
        isOpen={isInvitePartnerModalOpen}
        onClose={() => setIsInvitePartnerModalOpen(false)}
        currentUser={currentUser}
        currentProject={project}
        projects={developerProjects.length > 0 ? developerProjects : [project]}
        currentProjectId={project.id}
        onSuccess={(invite) => {
          if (project.id === invite.projectId) {
            setProject((prev) => ({
              ...prev,
              isShared: true,
              sharedWith: [...(prev.sharedWith || []), invite.toEmail],
            }));
          }
          if (currentUser?.email) {
            collaborationService.getInvites(currentUser.email).then(setPendingInvites).catch(() => {});
          }
        }}
        onOpenPricing={() => {
          setPricingModalReason('O plano Gratuito permite partilhar 1 projeto com 1 parceiro. Para partilhar múltiplos projetos com mais colaboradores, atualize para o Plano PRO.');
          setIsPricingModalOpen(true);
        }}
        onRequireAuth={() => {
          setAuthModalReason('Inicie sessão para convidar parceiros e colaborar em tempo real.');
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* WhatsApp / SMS Direct Messenger & Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        currentUser={currentUser}
        invites={pendingInvites}
        projects={developerProjects.length > 0 ? developerProjects : [project]}
        currentProject={project}
        onRefreshInvites={() => {
          if (currentUser?.email) {
            collaborationService.getInvites(currentUser.email).then(setPendingInvites).catch(() => {});
          }
        }}
        onAcceptAndOpenProject={handleAcceptInvite}
      />
    </div>
  );
}
