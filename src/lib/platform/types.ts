export enum Platform {
  WEB = 'WEB',
  ELECTRON = 'ELECTRON',
  CAPACITOR = 'CAPACITOR',
}

export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}

export interface TTS {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): Promise<void>;
}

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface STTError {
  message: string;
  code?: string;
}

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: STTResult) => void;
  onError?: (error: STTError) => void;
}

export interface STT {
  start(options?: STTOptions): Promise<void>;
  stop(): Promise<void>;
}

export interface Clipboard {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeArea {
  getInsets(): Promise<SafeAreaInsets>;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
}

export interface Update {
  checkForUpdate(): Promise<UpdateInfo>;
  quitAndInstall(): Promise<void>;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface Haptic {
  impact(style: HapticImpactStyle): Promise<void>;
  notification(type: HapticNotificationType): Promise<void>;
}

export interface PlatformCapabilities {
  secureStorage: SecureStorage;
  tts: TTS;
  stt: STT;
  clipboard: Clipboard;
  safeArea: SafeArea;
  update: Update;
  haptic: Haptic;
}

declare global {
  interface Window {
    process?: {
      versions?: {
        electron?: string;
      };
    };
  }
}

export {};
