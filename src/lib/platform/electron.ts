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
  UpdateInfo,
} from './types';

type ElectronAPI = NonNullable<Window['electronAPI']> & {
  secureStorageGet?: (key: string) => Promise<string | null>;
  secureStorageSet?: (key: string, value: string) => Promise<void>;
  secureStorageRemove?: (key: string) => Promise<void>;
  clipboardReadText?: () => Promise<string>;
  clipboardWriteText?: (text: string) => Promise<void>;
  checkForUpdate?: () => Promise<UpdateInfo>;
  quitAndInstall?: () => Promise<void>;
};

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

function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.electronAPI as ElectronAPI | undefined;
}

function safeEncode(value: string): string {
  return btoa(encodeURIComponent(value));
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return null;
  }
}

const electronSecureStorage: SecureStorage = {
  async get(key) {
    const api = getElectronAPI();
    if (api?.secureStorageGet) return api.secureStorageGet(key);
    const raw = localStorage.getItem(key);
    return raw ? safeDecode(raw) : null;
  },
  async set(key, value) {
    const api = getElectronAPI();
    if (api?.secureStorageSet) {
      await api.secureStorageSet(key, value);
      return;
    }
    localStorage.setItem(key, safeEncode(value));
  },
  async remove(key) {
    const api = getElectronAPI();
    if (api?.secureStorageRemove) {
      await api.secureStorageRemove(key);
      return;
    }
    localStorage.removeItem(key);
  },
};

const electronTTS: TTS = {
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

const electronSTT: STT = {
  async start(options) {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      const error: STTError = { message: '当前环境不支持语音识别' };
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

const electronClipboard: Clipboard = {
  async readText() {
    const api = getElectronAPI();
    if (api?.clipboardReadText) return api.clipboardReadText();
    if (typeof window !== 'undefined' && navigator.clipboard?.readText) {
      return navigator.clipboard.readText();
    }
    return '';
  },
  async writeText(text) {
    const api = getElectronAPI();
    if (api?.clipboardWriteText) {
      await api.clipboardWriteText(text);
      return;
    }
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  },
};

const electronSafeArea: SafeArea = {
  async getInsets(): Promise<SafeAreaInsets> {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  },
};

const electronUpdate: Update = {
  async checkForUpdate() {
    const api = getElectronAPI();
    if (api?.checkForUpdate) return api.checkForUpdate();
    return { updateAvailable: false };
  },
  async quitAndInstall() {
    const api = getElectronAPI();
    if (api?.quitAndInstall) {
      await api.quitAndInstall();
    }
  },
};

const electronHaptic: Haptic = {
  async impact() {
    // Electron 桌面端暂不提供触觉反馈
  },
  async notification() {
    // Electron 桌面端暂不提供触觉反馈
  },
};

export const electronCapabilities: PlatformCapabilities = {
  secureStorage: electronSecureStorage,
  tts: electronTTS,
  stt: electronSTT,
  clipboard: electronClipboard,
  safeArea: electronSafeArea,
  update: electronUpdate,
  haptic: electronHaptic,
};
