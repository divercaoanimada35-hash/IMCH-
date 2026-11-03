export interface SiteColorPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface SiteFonts {
  heading: string;
  body: string;
}

export interface SiteSectionSpec {
  id: string;
  title: string;
  copy: string;
  details: string;
}

export interface SiteSpec {
  siteName: string;
  language: string;
  description: string;
  palette: SiteColorPalette;
  fonts: SiteFonts;
  files: string[];
  sections: SiteSectionSpec[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  sizeBytes?: number;
}

export type GenerationPhase = 'idle' | 'planning' | 'coding' | 'completed' | 'error';

export interface GenerationProgressStep {
  phase: GenerationPhase;
  currentFile?: string;
  fileIndex?: number;
  totalFiles?: number;
  message: string;
  percent: number;
}

export interface GenerationError {
  status: number;
  message: string;
  details?: string;
  finishReason?: string;
}

export interface GenerationResult {
  spec: SiteSpec;
  files: Record<string, string>;
  warnings?: string[];
  durationMs?: number;
}
