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
import { Auth, StoredUser } from '../../core/auth/auth';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-toolbar',
  imports: [LanguageSwitcher, TranslatePipe],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
    '(window:online)': 'isOnline.set(true)',
    '(window:offline)': 'isOnline.set(false)',
  },
})
export class Toolbar implements OnInit, OnDestroy {
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private languageService = inject(LanguageService);
  private auth = inject(Auth);
  private authService = inject(AuthService);

  protected readonly direction = this.languageService.direction;

  currentTime = signal('00:00:00');
  isDarkMode = signal(false);
  isOnline = signal(true);
  profileOpen = signal(false);
  dropdownTop = signal<number>(64);
  dropdownRight = signal<number>(20);
  dropdownLeft = signal<number>(20);

  user = signal<StoredUser | null>(null);

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.user.set(this.auth.getStoredUser());

    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);
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
    if (this.profileOpen() && isPlatformBrowser(this.platformId)) {
      // Move focus into the menu so keyboard / screen-reader users land on its first item
      setTimeout(() => {
        this.elRef.nativeElement.querySelector('[role="menuitem"]')?.focus();
      });
    }
  }

  changePassword(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/auth/change-password']);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.authService.signOut();
  }

  /** Escape closes the profile menu and returns focus to its trigger. */
  onEscape(): void {
    if (!this.profileOpen()) return;
    this.profileOpen.set(false);
    this.elRef.nativeElement.querySelector('.profile-trigger')?.focus();
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.profileOpen.set(false);
    }
  }
}
