import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      class="lang-select"
      aria-label="Select language"
      [value]="languageService.getCurrentLanguage()"
      (change)="languageService.setLanguage($any($event.target).value)"
    >
      @for (lang of languageService.languages; track lang.code) {
        <option [value]="lang.code">{{ lang.label }}</option>
      }
    </select>
  `,
  styles: [
    `
      .lang-select {
        height: 34px;
        padding: 0 10px;
        border: 1.5px solid #e8edf0;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'Outfit', sans-serif;
        background: #fff;
        color: #1a2332;
        cursor: pointer;
        outline: none;
      }
      .lang-select:focus {
        border-color: #13c9b4;
      }
    `,
  ],
})
export class LanguageSwitcher {
  protected languageService = inject(LanguageService);
}
