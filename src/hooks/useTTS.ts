/**
 * Task 8.4: useTTS hook
 * 暴露 speak / stop / isSpeaking 状态，封装 voice-service
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  speak as voiceSpeak,
  stopSpeaking,
  loadVoiceSettings,
  type SpeakOptions,
} from '@/lib/services/voice-service';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTextRef = useRef<string>('');

  const speak = useCallback(async (text: string, options?: Omit<SpeakOptions, 'onEnd'>) => {
    // 若正在朗读，先停止
    if (speakingTextRef.current) {
      await stopSpeaking();
    }
    speakingTextRef.current = text;
    setIsSpeaking(true);

    const settings = loadVoiceSettings();
    await voiceSpeak(text, {
      lang: settings.lang,
      rate: settings.rate,
      pitch: settings.pitch,
      ...options,
      onEnd: () => {
        speakingTextRef.current = '';
        setIsSpeaking(false);
      },
    });
  }, []);

  const stop = useCallback(async () => {
    await stopSpeaking();
    speakingTextRef.current = '';
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      // 组件卸载时停止朗读
      stopSpeaking();
    };
  }, []);

  return { speak, stop, isSpeaking };
}
