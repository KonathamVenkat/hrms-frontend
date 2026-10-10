import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuditEvents } from './audit-events';
import { AuditEventService } from '../../services/audit-event';

const page = (content: unknown[] = []) => ({
  success: true,
  message: '',
  statusCode: 200,
  data: { content, totalElements: content.length, totalPages: 1, size: 20, number: 0, first: true, last: true },
});

function setup(search: () => unknown = () => of(page())) {
  const svc = { search: vi.fn(search) };
  TestBed.configureTestingModule({
    imports: [AuditEvents, NoopAnimationsModule],
    providers: [provideTranslateService(), { provide: AuditEventService, useValue: svc }],
  });
  const fixture = TestBed.createComponent(AuditEvents);
  fixture.detectChanges();
  return { component: fixture.componentInstance, svc };
}

describe('Audit events screen', () => {
  it('loads the newest page when it opens', () => {
    const { svc } = setup();

    expect(svc.search).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20 }));
  });

  it('does not ask the backend when the end date is before the start date', () => {
    const { component, svc } = setup();
    svc.search.mockClear();
    component.filterForm.patchValue({ from: '2026-10-05', to: '2026-10-01' });

    component.onSearch();

    expect(svc.search).not.toHaveBeenCalled();
    expect(component.error()).toBeTruthy();
  });

  it('goes back to the first page when the filters change', () => {
    const { component, svc } = setup();
    component.onPageChange({ pageIndex: 3, pageSize: 20, length: 100 });
    component.filterForm.patchValue({ actor: 'admin' });

    component.onSearch();

    expect(svc.search).toHaveBeenLastCalledWith(expect.objectContaining({ actor: 'admin', page: 0 }));
  });

  it('shows the backend message when loading fails', () => {
    const { component } = setup(() => throwError(() => ({ error: { message: 'You do not have permission' } })));

    expect(component.error()).toBe('You do not have permission');
    expect(component.loading()).toBe(false);
  });
});
