import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseVoiceInteractionOptions {
  onSendMessage?: (text: string) => void;
  lang?: string;
}

export function useVoiceInteraction(options?: UseVoiceInteractionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isVoiceModeRef = useRef(false);
  const isListeningRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef('');

  useEffect(() => {
    isVoiceModeRef.current = isVoiceModeActive;
  }, [isVoiceModeActive]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Stop hardware audio meter
  const stopAudioMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start real-time volume level meter using Web Audio API
  const startAudioMeter = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('O navegador não suporta captura de microfone.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          if (!analyserRef.current || !isListeningRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale from 0 to 100
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animFrameRef.current = requestAnimationFrame(updateMeter);
      }

      setMicError(null);
      return stream;
    } catch (err: any) {
      console.warn('Erro ao obter microfone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Permissão do microfone foi negada. Por favor, clique no ícone de permissões/cadeado da barra de endereço e autorize o microfone.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicError('Nenhum microfone detetado. Conecte um microfone para continuar.');
      } else {
        setMicError(err.message || 'Erro ao inicializar microfone.');
      }
      return null;
    }
  }, []);

  // Text-to-Speech
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    isAiSpeakingRef.current = true;

    // Pause recognition while speaking so AI doesn't listen to itself
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'código omitido da leitura')
      .replace(/[*#_`]/g, '')
      .replace(/\(.*?\)/g, '')
      .slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const navLang = navigator.language || 'pt-PT';
    utterance.lang = navLang.startsWith('pt') ? navLang : 'pt-PT';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const resumeRecognition = () => {
      isAiSpeakingRef.current = false;
      onEnd?.();

      if (isVoiceModeRef.current) {
        setTimeout(() => {
          if (isVoiceModeRef.current && !isListeningRef.current) {
            startListeningInternal();
          }
        }, 300);
      }
    };

    utterance.onend = resumeRecognition;
    utterance.onerror = resumeRecognition;

    window.speechSynthesis.speak(utterance);
  }, []);

  // Internal start listening logic
  const startListeningInternal = useCallback(async (): Promise<boolean> => {
    if (isAiSpeakingRef.current) return false;

    // 1. Request hardware microphone stream & audio visualizer
    const stream = await startAudioMeter();
    if (!stream) {
      setIsListening(false);
      return false;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicError('O seu navegador não suporta a API de reconhecimento de fala direta (Web Speech). Pode usar o Chrome, Edge ou Safari mais recentes.');
      setIsListening(false);
      return false;
    }

    try {
      // Abort old instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      const navLang = navigator.language || 'pt-PT';
      recognition.lang = navLang.startsWith('pt') ? navLang : 'pt-PT';
      recognition.maxAlternatives = 1;

      accumulatedTranscriptRef.current = '';
      setLiveTranscript('');

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript + ' ';
          } else {
            interimText += result[0].transcript;
          }
        }

        const fullSaid = (finalText + interimText).trim();
        accumulatedTranscriptRef.current = fullSaid;
        setLiveTranscript(fullSaid);

        // In Voice Mode, if the user pauses for 2.2s after speaking something substantial, auto-send
        if (isVoiceModeRef.current && fullSaid.length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (isVoiceModeRef.current && accumulatedTranscriptRef.current.trim().length > 2) {
              const toSend = accumulatedTranscriptRef.current.trim();
              accumulatedTranscriptRef.current = '';
              setLiveTranscript('');
              if (options?.onSendMessage) {
                options.onSendMessage(toSend);
              }
            }
          }, 2200);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('SpeechRecognition error:', error);

        if (error === 'no-speech') {
          // Normal timeout when silence; keep listening if in voice mode
          if (isVoiceModeRef.current && !isAiSpeakingRef.current) {
            // Keep going or will restart in onend
          }
          return;
        }

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          setMicError('Permissão do microfone negada. Autorize o microfone no navegador.');
          setIsListening(false);
          stopAudioMeter();
        } else if (error === 'audio-capture') {
          setMicError('Nenhum microfone encontrado ou o hardware de áudio está ocupado.');
          setIsListening(false);
          stopAudioMeter();
        } else if (error === 'network') {
          setMicError('Erro de ligação de rede ao serviço de reconhecimento de voz.');
        }
      };

      recognition.onend = () => {
        // If Voice Mode is active and AI is not speaking, automatically restart to keep conversational loop open
        if (isVoiceModeRef.current && !isAiSpeakingRef.current) {
          setTimeout(() => {
            if (isVoiceModeRef.current && !isListeningRef.current && !isAiSpeakingRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          }, 600);
        } else {
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioMeter();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      isListeningRef.current = true;
      return true;
    } catch (err: any) {
      console.warn('Falha ao iniciar SpeechRecognition:', err);
      setMicError(err.message || 'Falha ao iniciar o microfone.');
      setIsListening(false);
      stopAudioMeter();
      return false;
    }
  }, [startAudioMeter, stopAudioMeter, options]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    stopAudioMeter();
  }, [stopAudioMeter]);

  // Toggle single speech recording
  const toggleListening = useCallback(async () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      await startListeningInternal();
    }
  }, [startListeningInternal, stopListening]);

  // Toggle in-place Voice Mode
  const toggleVoiceMode = useCallback(async (greeting = 'Olá! Estou a ouvir. Como posso ajudar você hoje por voz?') => {
    if (isVoiceModeRef.current) {
      // Turn OFF
      setIsVoiceModeActive(false);
      isVoiceModeRef.current = false;
      stopListening();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      // Turn ON
      setIsVoiceModeActive(true);
      isVoiceModeRef.current = true;
      setMicError(null);

      // Speak greeting first, then start listening on utterance end
      speakText(greeting, () => {
        startListeningInternal();
      });
    }
  }, [speakText, startListeningInternal, stopListening]);

  // Send current accumulated transcript now
  const commitCurrentTranscript = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const text = accumulatedTranscriptRef.current.trim() || liveTranscript.trim();
    if (text && options?.onSendMessage) {
      options.onSendMessage(text);
      accumulatedTranscriptRef.current = '';
      setLiveTranscript('');
      if (!isVoiceModeRef.current) {
        stopListening();
      }
    }
  }, [liveTranscript, options, stopListening]);

  const clearMicError = useCallback(() => {
    setMicError(null);
  }, []);

  return {
    isListening,
    isVoiceModeActive,
    liveTranscript,
    audioLevel,
    micError,
    isSupported,
    toggleListening,
    toggleVoiceMode,
    stopListening,
    speakText,
    commitCurrentTranscript,
    clearMicError,
  };
}
