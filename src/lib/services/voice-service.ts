/**
 * Task 8.1-8.3: 语音合成服务（TTS）
 *
 * Tier 1: 优先 window.speechSynthesis（Web 标准），Capacitor 环境降级到 @capacitor-community/text-to-speech
 * Tier 2: 可选高质量云端 TTS（MiniMax 中文 / OpenAI 英文），需配置 API Key 并按字符计费
 */

export type TtsEngine = 'web' | 'capacitor' | 'minimax' | 'openai';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  /** Task 8.3: 指定云端引擎（minimax/openai），未配置时回退到 Tier 1 */
  cloudEngine?: 'minimax' | 'openai';
  /** 云端 API Key（Tier 2） */
  cloudApiKey?: string;
}

/** 语音设置（持久化到 localStorage） */
export interface VoiceSettings {
  enabled: boolean;
  engine: TtsEngine;
  lang: string;
  rate: number;
  pitch: number;
  /** 是否启用高质量云端 TTS */
  cloudEnabled: boolean;
  cloudEngine: 'minimax' | 'openai';
  cloudApiKey: string;
}

const VOICE_SETTINGS_KEY = 'polaris_voice_settings';

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  engine: 'web',
  lang: 'zh-CN',
  rate: 1.0,
  pitch: 1.0,
  cloudEnabled: false,
  cloudEngine: 'minimax',
  cloudApiKey: '',
};

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function saveVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  const current = loadVoiceSettings();
  const next = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(next));
  }
  return next;
}

/** 检测 Web Speech API 是否可用 */
export function isWebSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 检测是否在 Capacitor 原生环境 */
export function isCapacitorEnvironment(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: unknown }).Capacitor;
}

/**
 * Tier 1: 使用 Web Speech API 朗读
 */
function speakWithWebAPI(text: string, options?: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || 'zh-CN';
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      utterance.onend = () => {
        options?.onEnd?.();
        resolve();
      };
      utterance.onerror = () => {
        options?.onEnd?.();
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      options?.onEnd?.();
      resolve();
    }
  });
}

/**
 * Tier 1 fallback: 使用 Capacitor @capacitor-community/text-to-speech
 * 动态 import 避免在纯 Web 环境加载原生模块
 */
async function speakWithCapacitor(text: string, options?: SpeakOptions): Promise<void> {
  try {
    const mod = await import('@capacitor-community/text-to-speech');
    const { TextToSpeech } = mod;
    await TextToSpeech.speak({
      text,
      lang: options?.lang || 'zh-CN',
      rate: options?.rate ?? 1.0,
      pitch: options?.pitch ?? 1.0,
      volume: options?.volume ?? 1.0,
    });
    options?.onEnd?.();
  } catch {
    // Capacitor 模块不可用，静默失败
    options?.onEnd?.();
  }
}

/**
 * Task 8.3: Tier 2 高质量云端 TTS
 * - MiniMax 中文 TTS：约 0.1 元/千字符
 * - OpenAI TTS 英文：约 $0.015/千字符
 * 需配置 API Key，未配置时回退到 Tier 1
 */
async function speakWithCloud(
  text: string,
  engine: 'minimax' | 'openai',
  apiKey: string,
  options?: SpeakOptions
): Promise<void> {
  if (!apiKey) {
    console.warn(`[voice-service] 云端 TTS (${engine}) 未配置 API Key，回退到本地 TTS`);
    return speak(text, options);
  }

  const charCount = text.length;
  const costHint =
    engine === 'minimax'
      ? `约 ${(charCount / 1000 * 0.1).toFixed(2)} 元`
      : `约 $${(charCount / 1000 * 0.015).toFixed(4)}`;
  console.info(`[voice-service] 云端 TTS (${engine})，字符数 ${charCount}，计费 ${costHint}`);

  // TODO: 实现云端 TTS API 调用
  // MiniMax: POST https://api.minimax.chat/v1/t2a_v2
  // OpenAI: POST https://api.openai.com/v1/audio/speech
  // 当前未实现，回退到本地 TTS
  console.warn(`[voice-service] 云端 TTS (${engine}) 尚未实现，回退到本地 TTS`);
  return speak(text, options);
}

/**
 * Task 8.1: 朗读文本
 * Tier 1: Web Speech API → Capacitor TTS
 * Tier 2: 云端 TTS（需指定 cloudEngine + cloudApiKey）
 */
export async function speak(text: string, options?: SpeakOptions): Promise<void> {
  if (!text) {
    options?.onEnd?.();
    return;
  }

  // Task 8.3: Tier 2 云端 TTS
  if (options?.cloudEngine && options?.cloudApiKey) {
    return speakWithCloud(text, options.cloudEngine, options.cloudApiKey, options);
  }

  // Task 8.2: Tier 1 Web Speech API
  if (isWebSpeechAvailable()) {
    return speakWithWebAPI(text, options);
  }

  // Task 8.2: Tier 1 fallback Capacitor TTS
  return speakWithCapacitor(text, options);
}

/** 停止朗读 */
export async function stopSpeaking(): Promise<void> {
  if (isWebSpeechAvailable()) {
    window.speechSynthesis.cancel();
    return;
  }
  try {
    const mod = await import('@capacitor-community/text-to-speech');
    await mod.TextToSpeech.stop();
  } catch {
    // silent
  }
}

/**
 * 测试语音（用于设置页"测试语音"按钮）
 */
export async function testVoice(settings?: VoiceSettings): Promise<void> {
  const s = settings || loadVoiceSettings();
  const testText = s.lang?.startsWith('en')
    ? 'Hello, this is a voice test from Polaris.'
    : '你好，这是来自北极星的语音测试。';
  await speak(testText, {
    lang: s.lang,
    rate: s.rate,
    pitch: s.pitch,
    cloudEngine: s.cloudEnabled ? s.cloudEngine : undefined,
    cloudApiKey: s.cloudEnabled ? s.cloudApiKey : undefined,
  });
}
