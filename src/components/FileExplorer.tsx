import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  FileText, 
  Braces, 
  File, 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2, 
  X,
  Code2,
  Lock,
  Share2,
  ChevronUp
} from 'lucide-react';
import { Project, ProjectFile, UserProfile } from '../types';

interface FileExplorerProps {
  project: Project;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onAddFile: (path: string, content?: string) => void;
  onDeleteFile: (path: string) => void;
  onClose?: () => void;
  userProjects?: Project[];
  onSelectProject?: (project: Project) => void;
  onNewProject?: () => void;
  currentUser?: UserProfile | null;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children?: Record<string, TreeNode>;
  file?: ProjectFile;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  activeFilePath,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onClose,
  userProjects = [],
  onSelectProject,
  onNewProject,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemPath, setNewItemPath] = useState('');
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);

  // Build tree from flat project.files paths
  const tree = useMemo(() => {
    const root: Record<string, TreeNode> = {};

    Object.values(project.files).forEach((file) => {
      // Split path into segments: e.g. "src/components/Navbar.js" -> ["src", "components", "Navbar.js"]
      const cleanPath = file.path.replace(/^\/+/, '');
      const parts = cleanPath.split('/');

      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (isLast) {
          // File node
          currentLevel[part] = {
            name: part,
            fullPath: file.path,
            isFolder: false,
            file,
          };
        } else {
          // Folder node
          if (!currentLevel[part]) {
            currentLevel[part] = {
              name: part,
              fullPath: currentPath,
              isFolder: true,
              children: {},
            };
          }
          currentLevel = currentLevel[part].children!;
        }
      });
    });

    return root;
  }, [project.files]);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const collapseAll = () => {
    const allFolders: Record<string, boolean> = {};
    const collectFolders = (nodes: Record<string, TreeNode>) => {
      Object.values(nodes).forEach((node) => {
        if (node.isFolder) {
          allFolders[node.fullPath] = true;
          if (node.children) collectFolders(node.children);
        }
      });
    };
    collectFolders(tree);
    setCollapsedFolders(allFolders);
  };

  const expandAll = () => {
    setCollapsedFolders({});
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemPath.trim();
    if (!trimmed) return;

    onAddFile(trimmed);
    setNewItemPath('');
    setIsAddingItem(false);
  };

  // Icon selector according to file extension matching image_6f8b6905
  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      return <span className="text-orange-500 font-mono text-[11px] font-bold">&lt;&gt;</span>;
    }
    if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.sass')) {
      return <span className="text-pink-400 font-mono text-[11px] font-bold">#</span>;
    }
    if (lower.endsWith('.json')) {
      return <span className="text-lime-400 font-mono text-[11px] font-bold">&#123;&#125;</span>;
    }
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
      return (
        <span className="text-sky-400 font-mono text-[11px] font-bold flex items-center">
          <span className="text-[10px] tracking-tighter">TS</span>
        </span>
      );
    }
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
      return <span className="text-yellow-400 font-mono text-[11px] font-bold">JS</span>;
    }
    if (lower.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };

  // Recursive renderer for tree nodes
  const renderTreeNodes = (nodes: Record<string, TreeNode>, depth = 0) => {
    // Sort: Folders first alphabetically, then files alphabetically
    const sortedKeys = Object.keys(nodes).sort((a, b) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (nodeA.isFolder && !nodeB.isFolder) return -1;
      if (!nodeA.isFolder && nodeB.isFolder) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => {
      const node = nodes[key];
      const indent = depth * 14 + 10;

      // Filter by search query if active
      if (searchQuery) {
        const matches = node.fullPath.toLowerCase().includes(searchQuery.toLowerCase());
        if (!node.isFolder && !matches) return null;
      }

      if (node.isFolder) {
        const isCollapsed = !!collapsedFolders[node.fullPath];
        return (
          <div key={node.fullPath} className="select-none">
            <div
              onClick={() => toggleFolder(node.fullPath)}
              style={{ paddingLeft: `${indent}px` }}
              className="flex items-center gap-1.5 py-1 pr-2 text-neutral-300 hover:text-white hover:bg-neutral-800/40 rounded-sm cursor-pointer transition-colors text-xs font-mono group"
            >
              <span className="text-neutral-500 group-hover:text-neutral-300">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
              {isCollapsed ? (
                <Folder className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200" />
              ) : (
                <FolderOpen className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white" />
              )}
              <span className="truncate">{node.name}</span>
            </div>

            {/* Folder Children */}
            {!isCollapsed && node.children && (
              <div className="relative">
                {/* Visual branch vertical guide line */}
                <div 
                  className="absolute left-0 top-0 bottom-0 border-l border-neutral-800/80 pointer-events-none"
                  style={{ left: `${indent + 6}px` }}
                />
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      // File item
      const isActive = node.fullPath === activeFilePath;
      const isEntry = node.fullPath === project.entryFile;

      return (
        <div
          key={node.fullPath}
          onClick={() => onSelectFile(node.fullPath)}
          style={{ paddingLeft: `${indent}px` }}
          className={`group relative flex items-center justify-between py-1 pr-2 text-xs font-mono cursor-pointer transition-all select-none ${
            isActive
              ? 'bg-[#18181f] text-white font-medium rounded-sm border-l-2 border-blue-500'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
            {isEntry && (
              <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 text-blue-400 rounded font-sans uppercase">
                entry
              </span>
            )}
          </div>

          {/* Quick Menu / Delete Button on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEntry && Object.keys(project.files).length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(node.fullPath);
                }}
                className="p-0.5 text-neutral-500 hover:text-red-400 rounded"
                title="Eliminar ficheiro"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenPath(menuOpenPath === node.fullPath ? null : node.fullPath);
              }}
              className="p-0.5 text-neutral-500 hover:text-neutral-200 rounded"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-56 sm:w-64 h-full flex flex-col shrink-0 bg-[#0c0c0e] border-r border-neutral-800/80 text-neutral-200 select-none overflow-hidden transition-all">
      {/* User's Isolated Private Workspace Header */}
      <div className="p-2.5 border-b border-neutral-800/80 bg-[#08080a]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="truncate max-w-[130px]">
              Explorador de Ficheiros
            </span>
          </div>
          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
              title="Criar novo projeto"
            >
              + Novo
            </button>
          )}
        </div>

        {/* Current Project Dropdown Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="w-full flex items-center justify-between p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 truncate">
              {project.isShared ? (
                <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="font-semibold text-xs text-white truncate">
                {project.name || 'Novo Projeto'}
              </span>
            </div>
            {isProjectDropdownOpen ? (
              <ChevronUp className="w-3 h-3 text-neutral-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
            )}
          </button>

          {/* Dropdown list of user's private & shared projects */}
          {isProjectDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121216] border border-neutral-700/80 rounded-xl shadow-2xl py-1 text-xs overflow-hidden max-h-56 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                Os seus projetos ({userProjects.length})
              </div>
              {userProjects.map((p) => {
                const isSelected = p.id === project.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProject?.(p);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 font-semibold'
                        : 'hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {p.isShared ? (
                        <Share2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate text-xs">{p.name}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-blue-400">ativo</span>
                    )}
                  </button>
                );
              })}
              {onNewProject && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    onNewProject();
                  }}
                  className="w-full text-left px-2.5 py-2 text-xs text-blue-400 hover:bg-neutral-800 flex items-center gap-1.5 border-t border-neutral-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Novo Projeto</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Explorer Header (matching image_de35e65a) */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 bg-[#0a0a0c] text-xs shrink-0">
        <span className="font-sans font-semibold text-neutral-300 text-[11px] tracking-wide">
          File explorer...
        </span>

        <div className="flex items-center gap-1">
          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1 rounded transition-colors ${
              isSearchOpen ? 'text-blue-400 bg-neutral-800' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
            title="Procurar ficheiro"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Add File / Folder Button */}
          <button
            type="button"
            onClick={() => setIsAddingItem(!isAddingItem)}
            className={`p-1 rounded transition-colors ${
              isAddingItem ? 'text-blue-400 bg-neutral-800' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
            title="Novo ficheiro ou pasta"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Collapse All */}
          <button
            type="button"
            onClick={() => {
              if (Object.keys(collapsedFolders).length > 0) {
                expandAll();
              } else {
                collapseAll();
              }
            }}
            className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded transition-colors"
            title="Colapsar / Expandir tudo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Optional close button if drawer */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/60 rounded transition-colors ml-1"
              title="Fechar explorador"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Search Bar */}
      {isSearchOpen && (
        <div className="p-2 border-b border-neutral-800/80 bg-[#09090b]">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar ficheiros..."
              className="w-full bg-[#141418] border border-neutral-700/80 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline Add File / Folder Form */}
      {isAddingItem && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-neutral-800/80 bg-[#121216]">
          <div className="text-[10px] text-neutral-400 font-mono mb-1">
            Nome do ficheiro ou pasta:
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newItemPath}
              onChange={(e) => setNewItemPath(e.target.value)}
              placeholder="ex: styles/theme.css ou scripts/cart.js"
              className="flex-1 bg-[#1a1a20] border border-blue-500/80 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
            >
              Ok
            </button>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[9px] text-neutral-500 mt-1">
            Dica: Usa <code className="text-neutral-400">pasta/ficheiro.ext</code> para criar dentro de pasta.
          </div>
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 scrollbar-thin scrollbar-thumb-neutral-800 flex flex-col justify-center">
        {Object.keys(project.files).length === 0 ? (
          <div className="p-4 text-center space-y-2 text-neutral-500 my-auto">
            <Folder className="w-8 h-8 mx-auto opacity-30 text-neutral-400" />
            <p className="text-xs font-semibold text-neutral-400">Nenhum ficheiro criado</p>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Escreva no chat o website que gostaria de criar. As pastas e ficheiros serão organizados aqui.
            </p>
          </div>
        ) : (
          renderTreeNodes(tree)
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 border-t border-neutral-800/80 bg-[#09090b] text-[10px] font-mono text-neutral-500 flex items-center justify-between">
        <span>{Object.keys(project.files).length} ficheiros</span>
        <span className="truncate max-w-[110px] text-neutral-400">{project.name}</span>
      </div>
    </div>
  );
};
