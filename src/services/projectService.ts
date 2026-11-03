import { Project, ProjectFile, ProjectVersion } from '../types';

const PROJECTS_STORAGE_PREFIX = 'imch_user_projects_';
const ACTIVE_PROJECT_PREFIX = 'imch_active_project_id_';

export const projectService = {
  // Get all projects for a user
  getProjects(userId: string = 'guest'): Project[] {
    try {
      const data = localStorage.getItem(`${PROJECTS_STORAGE_PREFIX}${userId}`);
      if (!data) return [];
      const parsed: Project[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  // Get active project ID
  getActiveProjectId(userId: string = 'guest'): string | null {
    try {
      return localStorage.getItem(`${ACTIVE_PROJECT_PREFIX}${userId}`);
    } catch {
      return null;
    }
  },

  setActiveProjectId(projectId: string | null, userId: string = 'guest'): void {
    try {
      if (projectId) {
        localStorage.setItem(`${ACTIVE_PROJECT_PREFIX}${userId}`, projectId);
      } else {
        localStorage.removeItem(`${ACTIVE_PROJECT_PREFIX}${userId}`);
      }
    } catch {}
  },

  // Save or update a project, automatically saving a version snapshot if requested
  saveProject(
    project: Project, 
    userId: string = 'guest', 
    versionSummary?: string
  ): { project: Project; versionCreated?: ProjectVersion } {
    try {
      const projects = this.getProjects(userId);
      const existingIndex = projects.findIndex((p) => p.id === project.id);

      const existingProject = existingIndex >= 0 ? projects[existingIndex] : null;
      const currentVersions = existingProject?.versions || project.versions || [];

      // Determine if a new version snapshot should be created
      let updatedVersions = [...currentVersions];
      let newVersion: ProjectVersion | undefined = undefined;

      const hasFiles = Object.keys(project.files).length > 0;
      if (hasFiles) {
        const nextVersionNum = updatedVersions.length + 1;
        const versionLabel = versionSummary || (nextVersionNum === 1 ? 'Versão 1 - Criação Inicial' : `Versão ${nextVersionNum} - Alteração`);

        newVersion = {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          versionNumber: nextVersionNum,
          label: versionLabel,
          description: versionSummary || project.description,
          timestamp: new Date().toISOString(),
          entryFile: project.entryFile || 'index.html',
          files: JSON.parse(JSON.stringify(project.files)),
        };

        updatedVersions.unshift(newVersion);
        // Keep max 20 versions to avoid storage overflow
        if (updatedVersions.length > 20) {
          updatedVersions = updatedVersions.slice(0, 20);
        }
      }

      const updatedProject: Project = {
        ...project,
        updatedAt: new Date().toISOString(),
        versions: updatedVersions,
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = updatedProject;
      } else {
        projects.unshift(updatedProject);
      }

      localStorage.setItem(`${PROJECTS_STORAGE_PREFIX}${userId}`, JSON.stringify(projects));
      this.setActiveProjectId(updatedProject.id, userId);

      return { project: updatedProject, versionCreated: newVersion };
    } catch (err) {
      console.error('Falha ao salvar projeto:', err);
      return { project };
    }
  },

  // Restore a specific version of a project (Rollback)
  restoreVersion(projectId: string, versionId: string, userId: string = 'guest'): Project | null {
    try {
      const projects = this.getProjects(userId);
      const project = projects.find((p) => p.id === projectId);
      if (!project || !project.versions) return null;

      const targetVersion = project.versions.find((v) => v.id === versionId);
      if (!targetVersion) return null;

      // Create a rollback version so user can also revert the restore if they want!
      const rollbackVersionNum = project.versions.length + 1;
      const restoredFiles: Record<string, ProjectFile> = JSON.parse(JSON.stringify(targetVersion.files));

      const rollbackSnapshot: ProjectVersion = {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        versionNumber: rollbackVersionNum,
        label: `Versão ${rollbackVersionNum} - Restaurado para Versão ${targetVersion.versionNumber}`,
        description: `Restauração automática para a ${targetVersion.label}`,
        timestamp: new Date().toISOString(),
        entryFile: targetVersion.entryFile,
        files: restoredFiles,
      };

      const updatedVersions = [rollbackSnapshot, ...project.versions];

      const restoredProject: Project = {
        ...project,
        files: restoredFiles,
        entryFile: targetVersion.entryFile,
        activeFilePath: targetVersion.entryFile,
        updatedAt: new Date().toISOString(),
        versions: updatedVersions,
      };

      const index = projects.findIndex((p) => p.id === projectId);
      projects[index] = restoredProject;
      localStorage.setItem(`${PROJECTS_STORAGE_PREFIX}${userId}`, JSON.stringify(projects));

      return restoredProject;
    } catch (err) {
      console.error('Falha ao restaurar versão:', err);
      return null;
    }
  },

  // Delete project
  deleteProject(projectId: string, userId: string = 'guest'): Project[] {
    try {
      const projects = this.getProjects(userId);
      const filtered = projects.filter((p) => p.id !== projectId);
      localStorage.setItem(`${PROJECTS_STORAGE_PREFIX}${userId}`, JSON.stringify(filtered));

      const activeId = this.getActiveProjectId(userId);
      if (activeId === projectId) {
        this.setActiveProjectId(filtered[0]?.id || null, userId);
      }

      return filtered;
    } catch {
      return [];
    }
  },
};
