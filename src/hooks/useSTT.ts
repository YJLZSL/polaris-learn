/**
 * Task 8.5: useSTT hook
 * 桌面端用 SpeechRecognition / webkitSpeechRecognition
 * 移动端用 MediaRecorder（简化处理，Whisper API 集成留 TODO）
 */
import { useState, useCallback, useRef } from 'react';

/* ---------- 类型定义（TS DOM lib 未内置 SpeechRecognition） ---------- */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSTTResult {
  isListening: boolean;
  transcript: string;
  startListening: (onFinal?: (text: string) => void) => void;
  stopListening: () => void;
}

export function useSTT(): UseSTTResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  const startListening = useCallback((onFinal?: (text: string) => void) => {
    setTranscript('');
    onFinalRef.current = onFinal || null;

    // 桌面端：优先 SpeechRecognition API
    const SpeechRecognitionImpl =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (SpeechRecognitionImpl) {
      try {
        const recognition = new SpeechRecognitionImpl();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          setTranscript(text);
          const last = event.results[event.results.length - 1];
          if (last.isFinal && onFinalRef.current) {
            onFinalRef.current(text);
            onFinalRef.current = null;
          }
        };
        recognition.onerror = () => {
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        return;
      } catch {
        // SpeechRecognition 构造失败，降级到 MediaRecorder
      }
    }

    // 移动端 fallback：MediaRecorder
    // TODO: 接入 Whisper API 进行云端语音识别
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = () => {
            // 收集音频分片
          };
          recorder.onstop = () => {
            // TODO: 将 audio blob 发送到 Whisper API 进行识别
            // const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            // const formData = new FormData();
            // formData.append('audio', audioBlob);
            // fetch('https://api.openai.com/v1/audio/transcriptions', { ... })
            console.info('[useSTT] MediaRecorder stopped — Whisper API 集成待实现');
            setIsListening(false);
            if (onFinalRef.current) {
              onFinalRef.current('');
              onFinalRef.current = null;
            }
            // 关闭麦克风
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          };
          mediaRecorderRef.current = recorder;
          recorder.start();
          setIsListening(true);
        })
        .catch(() => {
          setIsListening(false);
        });
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // silent
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // silent
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening };
}
