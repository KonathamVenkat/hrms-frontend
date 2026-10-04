import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Sidebar } from './sidebar';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/auth/auth.service';

function setup(menu: unknown[] = []) {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    imports: [Sidebar],
    providers: [
      provideTranslateService(),
      provideRouter([]),
      { provide: MenuService, useValue: { getSidebarMenu: () => of({ success: true, message: '', statusCode: 200, data: menu }) } },
      { provide: AuthService, useValue: { signOut: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(Sidebar);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('Sidebar "My profile"', () => {
  afterEach(() => sessionStorage.clear());

  it('is shown first even when the role has no menu rows at all', () => {
    const { el } = setup([]);

    const labels = [...el.querySelectorAll('.rail-btn')].map((b) => b.getAttribute('aria-label'));
    expect(labels[0]).toBe('layout.sidebar.myProfile');
  });

  it('is shown ahead of the menu loaded for the role', () => {
    const { el } = setup([
      { mainMenuId: 1, mainMenuName: 'Leave Management', icon: 'beach_access', sortOrder: 1, route: '/app/leave', children: null },
    ]);

    const labels = [...el.querySelectorAll('.rail-btn')].map((b) => b.getAttribute('aria-label'));
    expect(labels.slice(0, 2)).toEqual(['layout.sidebar.myProfile', 'Leave Management']);
  });

  it('opens the profile page and shows as the current page there', () => {
    const { fixture, component, el } = setup([]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    (el.querySelector('.rail-btn') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith('/app/profile');

    vi.spyOn(component.router, 'url', 'get').mockReturnValue('/app/profile');
    fixture.detectChanges();
    expect(el.querySelector('.rail-btn')?.getAttribute('aria-current')).toBe('page');
  });
});
