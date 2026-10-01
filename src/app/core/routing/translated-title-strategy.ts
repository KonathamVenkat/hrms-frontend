import { Injectable, Injector, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const TITLE_SUFFIX = ' · EHRMS';

/**
 * Lets a route's `title` be a translation key (for example `employee.routes.list`). The browser
 * title is translated, given the app suffix and refreshed when the language changes. A title that
 * is not a key (already plain text such as "Dashboard · EHRMS") is used as it is.
 *
 * TranslateService is looked up lazily, on the first navigation: the router creates this strategy,
 * and resolving TranslateService here would loop back to the router through the HTTP interceptor
 * (translation loader -> HttpClient -> jwtInterceptor -> Auth -> Router).
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly injector = inject(Injector);
  private translate: TranslateService | undefined;
  private routeTitle: string | undefined;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.routeTitle = this.buildTitle(snapshot);
    this.apply();
  }

  private apply(): void {
    if (this.routeTitle === undefined) return;
    const translate = this.translateService();
    const translated = translate.instant(this.routeTitle);
    // instant() returns the key itself when there is no such translation.
    this.title.setTitle(translated === this.routeTitle ? translated : translated + TITLE_SUFFIX);
  }

  private translateService(): TranslateService {
    if (!this.translate) {
      this.translate = this.injector.get(TranslateService);
      this.translate.onLangChange.subscribe(() => this.apply());
      this.translate.onTranslationChange.subscribe(() => this.apply());
    }
    return this.translate;
  }
}
