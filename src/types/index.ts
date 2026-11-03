export type ProviderType = 'openrouter';

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  credits: number;
  avatarUrl?: string;
  createdAt: string;
}

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  label: string;
  description?: string;
  timestamp: string;
  entryFile: string;
  files: Record<string, ProjectFile>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: Record<string, ProjectFile>;
  activeFilePath: string;
  entryFile: string;
  createdAt: string;
  updatedAt: string;
  versions?: ProjectVersion[];
  architecturePlan?: ArchitecturePlanResult;
  qualityReport?: QualityAuditResult;
  isShared?: boolean;
  ownerEmail?: string;
  ownerName?: string;
  sharedWith?: string[];
  role?: 'owner' | 'editor';
}

export interface CollaborationInvite {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserEmail: string;
  toUserName?: string;
  projectId: string;
  projectName: string;
  projectDescription?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export interface DirectSMSMessage {
  id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  text: string;
  timestamp: string;
  createdAt: string;
  read: boolean;
  audioData?: string;
  audioDuration?: number;
  projectInvite?: {
    inviteId: string;
    projectId: string;
    projectName: string;
    projectDescription?: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}

export interface CollaboratorUser {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'editor';
  color: string;
  activeFile?: string;
  cursorLine?: number;
  isOnline: boolean;
  lastSeen: string;
}

export interface CollaborationChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  text?: string;
  audioData?: string;
  audioDuration?: number;
  timestamp: string;
  type: 'text' | 'audio' | 'system';
}

export interface CollaborationActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: ProviderType;
  model?: string;
  fileReference?: string;
  attachedFiles?: { id: string; name: string; size: number; type: string; previewUrl?: string }[];
  projectGenerated?: {
    projectName: string;
    description: string;
    entryFile: string;
    files: Record<string, string>;
  };
  architecturePlan?: ArchitecturePlanResult;
  qualityReport?: QualityAuditResult;
  updatedFileInfo?: {
    filePath: string;
    description?: string;
  };
}

export interface OpenRouterStatus {
  configured: boolean;
  model: string;
  message?: string;
}

export interface SystemStatus {
  status: string;
  platform: string;
  company: string;
  hasOpenRouterKey?: boolean;
  openRouterModel?: string;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface QualityCheckItem {
  id: string;
  title: string;
  category: 'structure' | 'imports' | 'services' | 'security' | 'contracts';
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface QualityAuditResult {
  score: number; // 0 - 100
  status: 'passed' | 'warning' | 'failed';
  totalFiles: number;
  checks: QualityCheckItem[];
  correctionsApplied: string[];
  remainingRecommendations: string[];
  blueprintMatchRate: number; // percentage (0 - 100)
}

export interface PlannedFileNode {
  path: string;
  description: string;
  layer: 'frontend' | 'service' | 'server' | 'database' | 'config' | 'doc';
  requiredExports?: string[];
}

export interface ArchitecturePlanResult {
  projectName: string;
  projectCategory: 'prototype' | 'institutional' | 'web-application' | 'enterprise';
  description: string;
  stack: 'react' | 'vanilla' | 'fullstack';
  features: string[];
  plannedDirectories: string[];
  fileTree: PlannedFileNode[];
  dependencies: { name: string; version: string; purpose: string }[];
  implementationOrder: string[];
}

export interface TemplateProject {
  id: string;
  title: string;
  category: string;
  description: string;
  previewThumbnail: string;
  files: Record<string, { content: string; language: ProjectFile['language'] }>;
  entryFile: string;
}

