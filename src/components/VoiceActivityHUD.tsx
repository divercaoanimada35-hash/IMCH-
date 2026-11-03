import React from 'react';
import { Mic, MicOff, Send, X, AlertCircle, Volume2 } from 'lucide-react';

interface VoiceActivityHUDProps {
  isListening: boolean;
  isVoiceModeActive: boolean;
  audioLevel: number;
  liveTranscript: string;
  micError: string | null;
  onCommit: () => void;
  onCancel: () => void;
  onClearError: () => void;
}

export const VoiceActivityHUD: React.FC<VoiceActivityHUDProps> = ({
  isListening,
  isVoiceModeActive,
  audioLevel,
  liveTranscript,
  micError,
  onCommit,
  onCancel,
  onClearError,
}) => {
  if (!isListening && !isVoiceModeActive && !micError) {
    return null;
  }

  // Bar scale calculation based on real-time audioLevel (0 - 100)
  const isSoundDetected = audioLevel > 8;

  return (
    <div className="w-full mb-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {micError ? (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs shadow-md flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{micError}</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Dica: Verifique se o microfone do seu sistema não está silenciado e se autorizou o acesso no navegador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1 rounded cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#141b24] text-white border border-emerald-500/30 shadow-xl flex flex-col gap-2 relative overflow-hidden">
          {/* Top Status & Audio Waveform */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isSoundDetected ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/50' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                <Mic className="w-4 h-4" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {isVoiceModeActive ? 'Modo de Conversa por Voz' : 'Microfone Ativo'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    {isSoundDetected ? 'Voz detetada' : 'À escuta...'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-sans">
                  {liveTranscript ? 'A transcrever o que diz...' : 'Fale normalmente para o microfone'}
                </p>
              </div>
            </div>

            {/* Real-Time Audio Level Frequency Bars */}
            <div className="flex items-center gap-1 h-6 px-2 bg-black/40 rounded-lg border border-neutral-800">
              {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.3].map((factor, idx) => {
                const heightPercent = isSoundDetected 
                  ? Math.max(15, Math.min(100, Math.round(audioLevel * factor * 1.5))) 
                  : 15;
                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isSoundDetected ? 'bg-emerald-400' : 'bg-neutral-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Transcript Display Box */}
          {liveTranscript ? (
            <div className="p-2.5 rounded-xl bg-black/50 border border-neutral-700/80 text-xs text-neutral-100 flex items-center justify-between gap-2">
              <span className="font-sans italic line-clamp-2">
                «{liveTranscript}»
              </span>
              <button
                type="button"
                onClick={onCommit}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                title="Enviar agora o que foi dito"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80">
              <span>{isSoundDetected ? 'Voz a ser capturada...' : 'Aguardando voz (fale quando quiser)...'}</span>
              <button
                type="button"
                onClick={onCancel}
                className="text-neutral-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                title="Cancelar escuta"
              >
                <X className="w-3 h-3" />
                <span>Cancelar</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
