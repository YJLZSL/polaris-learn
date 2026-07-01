declare module '@capacitor/preferences' {
  export interface PreferencesPlugin {
    get(options: { key: string }): Promise<{ value: string | null }>;
    set(options: { key: string; value: string }): Promise<void>;
    remove(options: { key: string }): Promise<void>;
  }
  export const Preferences: PreferencesPlugin;
}

declare module '@capacitor/clipboard' {
  export interface ClipboardPlugin {
    read(): Promise<{ value: string }>;
    write(options: { string: string }): Promise<void>;
  }
  export const Clipboard: ClipboardPlugin;
}

declare module 'capacitor-plugin-safe-area' {
  export interface SafeArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }
  export interface SafeAreaPlugin {
    getSafeAreaInsets(): Promise<{ insets: SafeArea }>;
  }
  export const SafeArea: SafeAreaPlugin;
}
