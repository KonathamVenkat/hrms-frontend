import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ElementRef,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../core/components/language-switcher/language-switcher';
import { LanguageService } from '../../core/services/language.service';

const isBrowser = typeof window !== 'undefined';

function storageGet(key: string): string | null {
  return isBrowser ? localStorage.getItem(key) : null;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
}

@Component({
  selector: 'app-toolbar',
  imports: [LanguageSwitcher, TranslatePipe],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Toolbar implements OnInit, OnDestroy {
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private languageService = inject(LanguageService);

  protected readonly direction = this.languageService.direction;

  currentTime = signal('00:00:00');
  isDarkMode = signal(false);
  isOnline = signal(true);
  profileOpen = signal(false);
  notifCount = signal(0);
  dropdownTop = signal<number>(64);
  dropdownRight = signal<number>(20);
  dropdownLeft = signal<number>(20);

  user = signal<AuthUser | null>(null);

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const raw = storageGet('hrms_user');
    if (raw) {
      try {
        this.user.set(JSON.parse(raw));
      } catch {}
    }

    if (isPlatformBrowser(this.platformId)) {
      this.tick();
      this.clockInterval = setInterval(() => this.tick(), 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private tick(): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    this.currentTime.set(`${hh}:${mm}:${ss}`);
  }

  get initials(): string {
    const name = this.user()?.fullName || 'User';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get roleLabel(): string {
    const role = this.user()?.role || '';
    return role.replace(/_/g, ' ');
  }

  toggleDarkMode(): void {
    this.isDarkMode.update((v) => !v);
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.toggle('dark-mode', this.isDarkMode());
    }
  }

  /**
   * The dropdown is `position: fixed`, so it anchors to raw viewport coordinates — those
   * don't mirror automatically under `dir="rtl"`. We anchor to the button's trailing edge
   * in both directions: its right edge in LTR, its left edge in RTL (see toolbar.html).
   */
  toggleProfile(event: MouseEvent): void {
    if (isPlatformBrowser(this.platformId)) {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.dropdownTop.set(rect.bottom + 8);
      this.dropdownRight.set(window.innerWidth - rect.right);
      this.dropdownLeft.set(rect.left);
    }
    this.profileOpen.update((v) => !v);
  }

  goToProfile(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/app/employee/profile']);
  }

  changeUsername(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/app/settings/username']);
  }

  changePassword(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/auth/change-password']);
  }

  logout(): void {
    this.profileOpen.set(false);
    if (isBrowser) localStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.profileOpen.set(false);
    }
  }
}
