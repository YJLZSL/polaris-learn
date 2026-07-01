import { Capacitor } from '@capacitor/core';
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

const DEVICE_ID_KEY = 'polaris_capacitor_device_id';
const CIPHER_SALT = new Uint8Array([
  0x70, 0x6f, 0x6c, 0x61, 0x72, 0x69, 0x73, 0x2d, 0x73, 0x61, 0x6c, 0x74,
]);
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000;

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
let cachedAesKey: CryptoKey | null = null;

function generateUuid(): string {
  const cryptoInstance = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoInstance && 'randomUUID' in cryptoInstance) {
    return cryptoInstance.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function getDeviceIdentifier(): Promise<string> {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return `${Capacitor.getPlatform()}:${id}`;
}

function uint8ArrayToBase64(array: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

async function getAesKey(): Promise<CryptoKey> {
  if (cachedAesKey) return cachedAesKey;
  const password = await getDeviceIdentifier();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  cachedAesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: CIPHER_SALT,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return cachedAesKey;
}

async function aesEncrypt(plaintext: string): Promise<string> {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return uint8ArrayToBase64(combined);
}

async function aesDecrypt(encrypted: string): Promise<string | null> {
  try {
    const key = await getAesKey();
    const data = base64ToUint8Array(encrypted);
    const iv = data.slice(0, IV_LENGTH);
    const ciphertext = data.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function getPreferences() {
  const module = await import('@capacitor/preferences');
  return module.Preferences;
}

const capacitorSecureStorage: SecureStorage = {
  async get(key) {
    try {
      const Preferences = await getPreferences();
      const { value } = await Preferences.get({ key });
      if (!value) return null;
      return aesDecrypt(value);
    } catch {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return aesDecrypt(raw);
    }
  },
  async set(key, value) {
    const encrypted = await aesEncrypt(value);
    try {
      const Preferences = await getPreferences();
      await Preferences.set({ key, value: encrypted });
    } catch {
      localStorage.setItem(key, encrypted);
    }
  },
  async remove(key) {
    try {
      const Preferences = await getPreferences();
      await Preferences.remove({ key });
    } catch {
      void 0;
    }
    localStorage.removeItem(key);
  },
};

const capacitorTTS: TTS = {
  async speak(text, options) {
    if (!text) {
      options?.onEnd?.();
      return;
    }
    try {
      const module = await import('@capacitor-community/text-to-speech');
      await module.TextToSpeech.speak({
        text,
        lang: options?.lang ?? 'zh-CN',
        rate: options?.rate ?? 1,
        pitch: options?.pitch ?? 1,
        volume: options?.volume ?? 1,
      });
      options?.onEnd?.();
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
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
      }
      options?.onEnd?.();
    }
  },
  async stop() {
    try {
      const module = await import('@capacitor-community/text-to-speech');
      await module.TextToSpeech.stop();
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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

const capacitorSTT: STT = {
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

const capacitorClipboard: Clipboard = {
  async readText() {
    try {
      const module = await import('@capacitor/clipboard');
      const { value } = await module.Clipboard.read();
      return value;
    } catch {
      if (typeof window !== 'undefined' && navigator.clipboard?.readText) {
        return navigator.clipboard.readText();
      }
      return '';
    }
  },
  async writeText(text) {
    try {
      const module = await import('@capacitor/clipboard');
      await module.Clipboard.write({ string: text });
    } catch {
      if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    }
  },
};

function readCssSafeAreaInset(side: 'top' | 'bottom' | 'left' | 'right'): number {
  if (typeof window === 'undefined') return 0;
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style[side] = `env(safe-area-inset-${side})`;
  document.body.appendChild(div);
  const value = getComputedStyle(div)[side];
  document.body.removeChild(div);
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const capacitorSafeArea: SafeArea = {
  async getInsets(): Promise<SafeAreaInsets> {
    try {
      const module = await import('capacitor-plugin-safe-area');
      const response = await module.SafeArea.getSafeAreaInsets();
      return response.insets;
    } catch {
      return {
        top: readCssSafeAreaInset('top'),
        bottom: readCssSafeAreaInset('bottom'),
        left: readCssSafeAreaInset('left'),
        right: readCssSafeAreaInset('right'),
      };
    }
  },
};

const capacitorUpdate: Update = {
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

const capacitorHaptic: Haptic = {
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

export const capacitorCapabilities: PlatformCapabilities = {
  secureStorage: capacitorSecureStorage,
  tts: capacitorTTS,
  stt: capacitorSTT,
  clipboard: capacitorClipboard,
  safeArea: capacitorSafeArea,
  update: capacitorUpdate,
  haptic: capacitorHaptic,
};
