import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export interface LanguageOption {
  code: string;
  label: string;
}

export type Direction = 'ltr' | 'rtl';

const STORAGE_KEY = 'hrms_lang';
const DEFAULT_LANG = 'en';
const RTL_LANGS = new Set(['ar']);

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  private readonly currentLangSignal = signal(DEFAULT_LANG);

  readonly currentLang = this.currentLangSignal.asReadonly();
  readonly direction = computed<Direction>(() =>
    RTL_LANGS.has(this.currentLangSignal()) ? 'rtl' : 'ltr',
  );

  readonly languages: LanguageOption[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ];

  /** Applies the persisted language choice (if any). Called once at app startup. */
  init(): void {
    const stored = this.readStoredLanguage();
    if (stored && stored !== this.translate.currentLang) {
      this.translate.use(stored);
    }
    this.applyLanguage(stored ?? this.translate.currentLang ?? DEFAULT_LANG);
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang || DEFAULT_LANG;
  }

  setLanguage(code: string): void {
    this.translate.use(code);
    this.applyLanguage(code);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // private browsing / storage disabled — language just won't persist
      }
    }
  }

  private applyLanguage(code: string): void {
    this.currentLangSignal.set(code);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.lang = code;
      document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
    }
  }

  private readStoredLanguage(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
