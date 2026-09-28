import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';

/**
 * Fetches translation JSON over HTTP in the browser, as usual.
 *
 * On the server, a relative /i18n/{lang}.json request has no origin to
 * resolve against and hangs indefinitely — and since every route in this
 * app renders with RenderMode.Client (see app.routes.server.ts), the server
 * never needs real translated content, only to boot far enough to enumerate
 * routes. So on the server this returns an empty translation set instead of
 * making a request that would otherwise block every build.
 */
@Injectable()
export class SsrSafeTranslateLoader implements TranslateLoader {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  getTranslation(lang: string): Observable<TranslationObject> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({});
    }
    return this.http.get<TranslationObject>(`/i18n/${lang}.json`);
  }
}
