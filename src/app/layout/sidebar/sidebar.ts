import { Component, OnInit, signal, inject, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MenuService, MenuDto } from '../../core/services/menu.service';
import { AuthService } from '../../core/auth/auth.service';
import { SIDEBAR_MENU_CACHE_KEY } from '../../core/auth/auth';

// ── Icon color map — keyed by Material icon name ──────────
export const ICON_COLOR_MAP: Record<string, { color: string; bg: string; activeBg: string }> = {
  'space_dashboard':       { color: '#6366f1', bg: '#eef2ff', activeBg: '#6366f1' },
  'dashboard':             { color: '#6366f1', bg: '#eef2ff', activeBg: '#6366f1' },
  'badge':                 { color: '#3b82f6', bg: '#eff6ff', activeBg: '#3b82f6' },
  'people':                { color: '#3b82f6', bg: '#eff6ff', activeBg: '#3b82f6' },
  'people_alt':            { color: '#3b82f6', bg: '#eff6ff', activeBg: '#3b82f6' },
  'fingerprint':           { color: '#0d9488', bg: '#f0fdfa', activeBg: '#0d9488' },
  'task_alt':              { color: '#0d9488', bg: '#f0fdfa', activeBg: '#0d9488' },
  'event_available':       { color: '#8b5cf6', bg: '#f5f3ff', activeBg: '#8b5cf6' },
  'event_note':            { color: '#8b5cf6', bg: '#f5f3ff', activeBg: '#8b5cf6' },
  'beach_access':          { color: '#8b5cf6', bg: '#f5f3ff', activeBg: '#8b5cf6' },
  'paid':                  { color: '#059669', bg: '#ecfdf5', activeBg: '#059669' },
  'payments':              { color: '#059669', bg: '#ecfdf5', activeBg: '#059669' },
  'insights':              { color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b' },
  'analytics':             { color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b' },
  'leaderboard':           { color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b' },
  'bar_chart':             { color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b' },
  'notifications':         { color: '#f43f5e', bg: '#fff1f2', activeBg: '#f43f5e' },
  'notifications_active':  { color: '#f43f5e', bg: '#fff1f2', activeBg: '#f43f5e' },
  'support_agent':         { color: '#0891b2', bg: '#ecfeff', activeBg: '#0891b2' },
  'headset_mic':           { color: '#0891b2', bg: '#ecfeff', activeBg: '#0891b2' },
  'tune':                  { color: '#64748b', bg: '#f8fafc', activeBg: '#64748b' },
  'build':                 { color: '#64748b', bg: '#f8fafc', activeBg: '#64748b' },
  'settings':              { color: '#64748b', bg: '#f8fafc', activeBg: '#64748b' },
  'admin_panel_settings':  { color: '#7c3aed', bg: '#f5f3ff', activeBg: '#7c3aed' },
  'shield':                { color: '#7c3aed', bg: '#f5f3ff', activeBg: '#7c3aed' },
  'inventory_2':           { color: '#d97706', bg: '#fffbeb', activeBg: '#d97706' },
  'corporate_fare':        { color: '#d97706', bg: '#fffbeb', activeBg: '#d97706' },
  'rocket_launch':         { color: '#ec4899', bg: '#fdf2f8', activeBg: '#ec4899' },
  'power_settings_new':    { color: '#ef4444', bg: '#fef2f2', activeBg: '#ef4444' },
  'logout':                { color: '#ef4444', bg: '#fef2f2', activeBg: '#ef4444' },
};

const DEFAULT_ICON_STYLE = { color: '#64748b', bg: '#f8fafc', activeBg: '#64748b' };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class Sidebar implements OnInit {

  router      = inject(Router);
  private elRef       = inject(ElementRef);
  private menuSvc     = inject(MenuService);
  private authService = inject(AuthService);

  // ── State ─────────────────────────────────────────────
  navItems    = signal<MenuDto[]>([]);
  loading     = signal(true);
  loadFailed  = signal(false);
  activeMenu  = signal<string | null>(null);  // id of the menu whose submenu is open
  flyoutTop   = signal<number>(0);

  // Delay timer — prevents flicker when the mouse moves between
  // the icon button and the flyout panel
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  // The button that opened the current flyout, so Escape can return focus to it
  private lastTrigger: HTMLElement | null = null;

  ngOnInit(): void {
    this.loadMenu();
  }

  /** Loads the menu from the session cache, else from the API (and caches it). */
  private loadMenu(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    // The cache is per browser tab and is cleared on sign-out / sign-in (Auth.clearSession),
    // so one user's menu never leaks to the next.
    const cached = sessionStorage.getItem(SIDEBAR_MENU_CACHE_KEY);
    if (cached) {
      try {
        this.navItems.set(JSON.parse(cached));
        this.loading.set(false);
        return;
      } catch {
        sessionStorage.removeItem(SIDEBAR_MENU_CACHE_KEY);
      }
    }

    this.menuSvc.getSidebarMenu().subscribe({
      next: (res) => {
        if (res.success) {
          this.navItems.set(res.data);
          sessionStorage.setItem(SIDEBAR_MENU_CACHE_KEY, JSON.stringify(res.data));
        } else {
          this.loadFailed.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  reload(): void {
    sessionStorage.removeItem(SIDEBAR_MENU_CACHE_KEY);
    this.loadMenu();
  }

  // ── Icon color helpers ─────────────────────────────────
  getIconStyle(icon: string): { color: string; bg: string; activeBg: string } {
    return ICON_COLOR_MAP[icon] ?? DEFAULT_ICON_STYLE;
  }

  getIconColor(icon: string, isActive: boolean): string {
    const s = this.getIconStyle(icon);
    return isActive ? '#ffffff' : s.color;
  }

  getIconBg(icon: string, isActive: boolean): string {
    const s = this.getIconStyle(icon);
    return isActive ? s.activeBg : 'transparent';
  }

  // ── Active check ───────────────────────────────────────
  isActive(item: MenuDto): boolean {
    if (item.route) return this.router.url.startsWith(item.route);
    return item.children?.some(c =>
      this.router.url.startsWith(c.subMenuAction)) ?? false;
  }

  isChildActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasChildren(item: MenuDto): boolean {
    return !!item.children?.length;
  }

  // ── Click / keyboard (Enter, Space) — the primary way to use the menu ─────
  // Hover still opens submenus for mouse users, but a click/keypress works for keyboard,
  // touch and screen-reader users, who never trigger hover.
  onItemClick(item: MenuDto, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;
    if (this.hasChildren(item)) {
      const id = item.mainMenuId.toString();
      if (this.activeMenu() === id) {
        this.activeMenu.set(null);
      } else {
        this.openMenu(id, trigger);
      }
    } else if (item.route) {
      this.navigate(item.route);
    }
  }

  private openMenu(id: string, trigger: HTMLElement): void {
    this.flyoutTop.set(trigger.getBoundingClientRect().top);
    this.lastTrigger = trigger;
    this.activeMenu.set(id);
  }

  // ── Hover flyout — mouseenter on rail-item ─────────────
  onMenuEnter(item: MenuDto, event: MouseEvent): void {
    if (!this.hasChildren(item)) return;
    // Cancel any pending hide
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    const li = event.currentTarget as HTMLElement;
    const trigger = li.querySelector<HTMLElement>('.rail-btn') ?? li;
    this.openMenu(item.mainMenuId.toString(), trigger);
  }

  // ── Hover flyout — mouseleave on rail-item OR flyout ───
  // 180ms delay prevents flicker when mouse travels to flyout
  onMenuLeave(): void {
    this.hideTimer = setTimeout(() => {
      this.activeMenu.set(null);
    }, 180);
  }

  // Called when mouse enters the flyout panel itself
  onFlyoutEnter(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  // Called when mouse leaves the flyout panel
  onFlyoutLeave(): void {
    this.hideTimer = setTimeout(() => {
      this.activeMenu.set(null);
    }, 120);
  }

  /** Keyboard focus moved out of a menu group (item + its flyout) → close its flyout. */
  onGroupFocusOut(event: FocusEvent): void {
    const group = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (!next || !group.contains(next)) {
      this.activeMenu.set(null);
    }
  }

  /** Escape closes an open flyout and puts focus back on the button that opened it. */
  onEscape(): void {
    if (this.activeMenu() === null) return;
    this.activeMenu.set(null);
    this.lastTrigger?.focus();
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
    this.activeMenu.set(null);
  }

  signOut(): void {
    this.authService.signOut();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target as HTMLElement)) {
      this.activeMenu.set(null);
    }
  }
}
