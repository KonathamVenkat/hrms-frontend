import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
//import { RouterLinkActive } from '@angular/router';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { LanguageService } from './core/services/language.service';
import { SsrSafeTranslateLoader } from './core/i18n/ssr-safe-translate-loader';
import { TranslatedTitleStrategy } from './core/routing/translated-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
    provideClientHydration(withEventReplay()),
    provideTranslateService({
      loader: provideTranslateLoader(SsrSafeTranslateLoader),
      lang: 'en',
      fallbackLang: 'en',
    }),
    // Apply the visitor's previously-chosen language (if any) before first render.
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};
