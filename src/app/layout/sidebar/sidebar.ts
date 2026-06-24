import {
  Component, OnInit, signal, inject,
  HostListener, ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuService, MenuDto } from '../../core/services/menu.service';

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

// Cache key for sessionStorage
const MENU_CACHE_KEY = 'ehrms_sidebar_menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {

  router      = inject(Router);
  private elRef    = inject(ElementRef);
  private menuSvc  = inject(MenuService);

  // ── State ─────────────────────────────────────────────
  navItems    = signal<MenuDto[]>([]);
  loading     = signal(true);
  activeMenu  = signal<string | null>(null);  // currently hovered menu id
  flyoutTop   = signal<number>(0);

  // Delay timer — prevents flicker when mouse moves between
  // the icon button and the flyout panel
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // ── Try cache first — eliminates the slow API load ────
    const cached = sessionStorage.getItem(MENU_CACHE_KEY);
    if (cached) {
      try {
        this.navItems.set(JSON.parse(cached));
        this.loading.set(false);
        return; // skip API call
      } catch {
        sessionStorage.removeItem(MENU_CACHE_KEY);
      }
    }

    // ── Fetch from API and cache result ───────────────────
    this.menuSvc.getSidebarMenu().subscribe({
      next: (res) => {
        if (res.success) {
          this.navItems.set(res.data);
          // Cache for this browser session
          sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(res.data));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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

  // ── Hover flyout — mouseenter on rail-item ─────────────
  onMenuEnter(id: string, event: MouseEvent): void {
    // Cancel any pending hide
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.flyoutTop.set(rect.top);
    this.activeMenu.set(id);
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

  navigate(route: string): void {
    this.router.navigateByUrl(route);
    this.activeMenu.set(null);
  }

  // ── Invalidate cache when needed (call from outside) ───
  clearMenuCache(): void {
    sessionStorage.removeItem(MENU_CACHE_KEY);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target as HTMLElement)) {
      this.activeMenu.set(null);
    }
  }
}
