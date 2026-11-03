import {
  GenerationResult,
  GenerationError,
  GenerationProgressStep,
  SiteSpec,
} from '../types/generator';

export interface GenerateSiteRequestOptions {
  briefing: string;
  model?: string;
  onProgress?: (step: GenerationProgressStep) => void;
  signal?: AbortSignal;
}

export class GeneratorApiService {
  /**
   * Executa a geração em 2 etapas com streaming de progresso em tempo real
   */
  public async generateSite(
    options: GenerateSiteRequestOptions
  ): Promise<GenerationResult> {
    const { briefing, model, onProgress, signal } = options;

    onProgress?.({
      phase: 'planning',
      message: 'Conectando ao OpenRouter e iniciando etapa do Planner…',
      percent: 5,
    });

    const response = await fetch('/api/generate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      signal,
      body: JSON.stringify({
        briefing,
        model,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Erro ao processar solicitação de geração.';
      let finishReason: string | undefined;
      try {
        const errJson = await response.json();
        errorMessage = errJson.error || errJson.message || errorMessage;
        finishReason = errJson.finishReason;
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }

      const error: GenerationError = {
        status: response.status,
        message: errorMessage,
        finishReason,
      };
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw {
        status: 500,
        message: 'O servidor não retornou um fluxo de dados legível.',
      } as GenerationError;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult: GenerationResult | null = null;
    let currentSpec: SiteSpec | null = null;
    const accumulatedFiles: Record<string, string> = {};
    const accumulatedWarnings: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const payload = JSON.parse(jsonStr);

          if (payload.step === 'error') {
            throw {
              status: payload.status || 500,
              message: payload.message || 'Erro durante a geração com OpenRouter.',
              finishReason: payload.finishReason,
            } as GenerationError;
          }

          if (payload.step === 'planning') {
            if (payload.spec) currentSpec = payload.spec;
            onProgress?.({
              phase: 'planning',
              message: payload.message || 'Planejando estrutura e copy do site…',
              percent: payload.percent || 20,
            });
          } else if (payload.step === 'coding') {
            onProgress?.({
              phase: 'coding',
              currentFile: payload.file,
              fileIndex: payload.fileIndex,
              totalFiles: payload.totalFiles,
              message: payload.message || `Gerando ${payload.file}…`,
              percent: payload.percent || 45,
            });
          } else if (payload.step === 'file_done') {
            if (payload.fileData) {
              accumulatedFiles[payload.fileData.path] = payload.fileData.content;
            }
            onProgress?.({
              phase: 'coding',
              currentFile: payload.file,
              fileIndex: payload.fileIndex,
              totalFiles: payload.totalFiles,
              message: payload.message || `Arquivo ${payload.file} finalizado.`,
              percent: payload.percent || 65,
            });
          } else if (payload.step === 'warning') {
            if (payload.message) accumulatedWarnings.push(payload.message);
            onProgress?.({
              phase: 'coding',
              currentFile: payload.file,
              fileIndex: payload.fileIndex,
              totalFiles: payload.totalFiles,
              message: payload.message,
              percent: payload.percent || 50,
            });
          } else if (payload.step === 'done') {
            finalResult = {
              spec: payload.spec || currentSpec,
              files: payload.files || accumulatedFiles,
              warnings: payload.warnings || accumulatedWarnings,
              durationMs: payload.durationMs,
            };
            onProgress?.({
              phase: 'completed',
              message: payload.message || 'Website gerado com sucesso!',
              percent: 100,
            });
          }
        } catch (err: any) {
          if (err.status) throw err;
          console.warn('[GeneratorApiService] Erro ao analisar evento SSE:', err);
        }
      }
    }

    if (!finalResult) {
      if (currentSpec && Object.keys(accumulatedFiles).length > 0) {
        return {
          spec: currentSpec,
          files: accumulatedFiles,
          warnings: accumulatedWarnings,
        };
      }
      throw {
        status: 502,
        message: 'A geração foi finalizada prematuramente sem retornar o pacote completo de arquivos.',
      } as GenerationError;
    }

    return finalResult;
  }
}

export const generatorApi = new GeneratorApiService();
