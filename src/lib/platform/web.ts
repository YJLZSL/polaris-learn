import { openDB, type DBSchema } from 'idb';
import type {
  Clipboard,
  Haptic,
  PlatformCapabilities,
  SafeArea,
  SafeAreaInsets,
  SecureStorage,
  STT,
  STTError,
  STTResult,
  TTS,
  Update,
} from './types';

const DB_NAME = 'polaris-platform-keyval';
const STORE_NAME = 'keyval';

interface KeyValSchema extends DBSchema {
  keyval: {
    key: string;
    value: string;
  };
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

let activeRecognition: SpeechRecognition | null = null;

function obscure(value: string): string {
  const encoded = btoa(encodeURIComponent(value));
  return encoded.split('').reverse().join('');
}

function deobscure(value: string): string | null {
  try {
    const reversed = value.split('').reverse().join('');
    return decodeURIComponent(atob(reversed));
  } catch {
    return null;
  }
}

async function openKeyval() {
  return openDB<KeyValSchema>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

const webSecureStorage: SecureStorage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    try {
      const db = await openKeyval();
      const raw = await db.get(STORE_NAME, key);
      if (raw === undefined) return null;
      return deobscure(raw);
    } catch {
      const raw = localStorage.getItem(key);
      return raw ? deobscure(raw) : null;
    }
  },
  async set(key, value) {
    if (typeof window === 'undefined') return;
    try {
      const db = await openKeyval();
      await db.put(STORE_NAME, obscure(value), key);
    } catch {
      localStorage.setItem(key, obscure(value));
    }
  },
  async remove(key) {
    if (typeof window === 'undefined') return;
    try {
      const db = await openKeyval();
      await db.delete(STORE_NAME, key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

const webTTS: TTS = {
  async speak(text, options) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang ?? 'zh-CN';
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;
      utterance.onend = () => {
        options?.onEnd?.();
        resolve();
      };
      utterance.onerror = () => {
        options?.onEnd?.();
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  },
  async stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
};

function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const Constructor = (window.SpeechRecognition ?? window.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined;
  if (!Constructor) return null;
  return new Constructor();
}

const webSTT: STT = {
  async start(options) {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      const error: STTError = { message: '当前浏览器不支持语音识别' };
      options?.onError?.(error);
      return;
    }
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        void 0;
      }
    }
    activeRecognition = recognition;
    recognition.lang = options?.lang ?? 'zh-CN';
    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = options?.interimResults ?? true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (!result) return;
      const alternative = result[0];
      if (!alternative) return;
      const value: STTResult = {
        transcript: alternative.transcript,
        isFinal: result.isFinal,
        confidence: alternative.confidence,
      };
      options?.onResult?.(value);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const error: STTError = {
        message: event.message || event.error,
        code: event.error,
      };
      options?.onError?.(error);
    };
    recognition.onend = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
    };
    recognition.start();
  },
  async stop() {
    const recognition = activeRecognition;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      void 0;
    }
    activeRecognition = null;
  },
};

const webClipboard: Clipboard = {
  async readText() {
    if (typeof window === 'undefined' || !navigator.clipboard?.readText) {
      return '';
    }
    return navigator.clipboard.readText();
  },
  async writeText(text) {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(text);
  },
};

const webSafeArea: SafeArea = {
  async getInsets(): Promise<SafeAreaInsets> {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  },
};

const webUpdate: Update = {
  async checkForUpdate() {
    return { updateAvailable: false };
  },
  async quitAndInstall() {
  },
};

function vibrate(pattern: number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

const webHaptic: Haptic = {
  async impact(style) {
    if (style === 'error') vibrate([40, 30, 40]);
    else if (style === 'warning') vibrate([30, 50, 30]);
    else if (style === 'success') vibrate([20]);
    else if (style === 'heavy') vibrate([25]);
    else vibrate([10]);
  },
  async notification(type) {
    if (type === 'error') vibrate([40, 30, 40]);
    else if (type === 'warning') vibrate([30, 50, 30]);
    else vibrate([20]);
  },
};

export const webCapabilities: PlatformCapabilities = {
  secureStorage: webSecureStorage,
  tts: webTTS,
  stt: webSTT,
  clipboard: webClipboard,
  safeArea: webSafeArea,
  update: webUpdate,
  haptic: webHaptic,
};
