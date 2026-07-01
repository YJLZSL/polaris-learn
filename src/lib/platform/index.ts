import { Capacitor } from '@capacitor/core';
import { capacitorCapabilities } from './capacitor';
import { electronCapabilities } from './electron';
import { webCapabilities } from './web';
import { Platform, type PlatformCapabilities } from './types';

export * from './types';

let platformCache: Platform | null = null;
let capabilitiesCache: PlatformCapabilities | null = null;

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window.electronAPI?.isElectron ||
    window.process?.versions?.electron != null
  );
}

export function isCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWeb(): boolean {
  return !isElectron() && !isCapacitor();
}

export function getPlatform(): Platform {
  if (platformCache) return platformCache;
  if (isElectron()) {
    platformCache = Platform.ELECTRON;
  } else if (isCapacitor()) {
    platformCache = Platform.CAPACITOR;
  } else {
    platformCache = Platform.WEB;
  }
  return platformCache;
}

function resolveCapabilities(): PlatformCapabilities {
  if (capabilitiesCache) return capabilitiesCache;
  switch (getPlatform()) {
    case Platform.ELECTRON:
      capabilitiesCache = electronCapabilities;
      break;
    case Platform.CAPACITOR:
      capabilitiesCache = capacitorCapabilities;
      break;
    default:
      capabilitiesCache = webCapabilities;
  }
  return capabilitiesCache;
}

export const platform: PlatformCapabilities = resolveCapabilities();
