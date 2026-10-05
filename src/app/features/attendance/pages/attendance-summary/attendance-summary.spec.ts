import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AttendanceSummary } from './attendance-summary';
import { AttendanceService } from '../../services/attendance.service';
import { Auth } from '../../../../core/auth/auth';

const result = { created: 3, corrected: 1, employeesRefreshed: 8 };

function setup(roles: string[], regenerate: () => unknown = () => of(result)) {
  const svc = {
    getEmployeeSummary: vi.fn(() => of(null)),
    getYearlySummary: vi.fn(() => of([])),
    regenerateDayRecords: vi.fn(regenerate),
  };
  const snack = { open: vi.fn() };
  TestBed.configureTestingModule({
    imports: [AttendanceSummary, NoopAnimationsModule],
    providers: [
      provideTranslateService(),
      { provide: AttendanceService, useValue: svc },
      {
        provide: Auth,
        useValue: {
          getEmployeeId: () => 5,
          hasAnyRole: (...wanted: string[]) => wanted.some((r) => roles.includes(r)),
        },
      },
    ],
  });
  // The component imports MatSnackBarModule, so its own injector provides MatSnackBar.
  TestBed.overrideComponent(AttendanceSummary, {
    set: { providers: [{ provide: MatSnackBar, useValue: snack }] },
  });
  const fixture = TestBed.createComponent(AttendanceSummary);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, snack, svc };
}

describe('Attendance summary: regenerate day records', () => {
  beforeEach(() => {
    // Monday 2026-10-05, midday: the selected month defaults to October, so yesterday is Oct 4.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('shows the card to HR_ADMIN only', () => {
    for (const [roles, shown] of [
      [['HR_ADMIN'], true],
      [['HR_MANAGER'], false],
      [['EMPLOYEE'], false],
      [[], false],
    ] as const) {
      TestBed.resetTestingModule();
      const { fixture } = setup([...roles]);
      expect(fixture.nativeElement.querySelector('.backfill-card') !== null).toBe(shown);
    }
  });

  it('regenerates from the 1st of the selected month up to yesterday and reloads the summary', () => {
    const { component, snack, svc } = setup(['HR_ADMIN']);
    svc.getEmployeeSummary.mockClear();

    component.regenerateDayRecords();

    expect(svc.regenerateDayRecords).toHaveBeenCalledWith('2026-10-01', '2026-10-04');
    expect(svc.getEmployeeSummary).toHaveBeenCalled();
    const [message, , options] = snack.open.mock.calls[0];
    expect(message).toContain('backfill.done');
    expect(options).toEqual({ duration: 8000, panelClass: 'snack-success' });
    expect(component.regenerating()).toBe(false);
  });

  it('covers the whole month when it is already over', () => {
    const { component, svc } = setup(['HR_ADMIN']);
    component.filterForm.patchValue({ month: 8 });

    component.regenerateDayRecords();

    expect(svc.regenerateDayRecords).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
  });

  it('does not call the server for a month with no finished day', () => {
    const { component, snack, svc } = setup(['HR_ADMIN']);
    component.filterForm.patchValue({ month: 11 });

    component.regenerateDayRecords();

    expect(svc.regenerateDayRecords).not.toHaveBeenCalled();
    expect(snack.open.mock.calls[0][2]).toEqual({ panelClass: 'snack-error' });
  });

  it('keeps the server error on screen and re-enables the button', () => {
    const refusal = 'Range is too long: at most 62 days.';
    const { component, snack } = setup(['HR_ADMIN'], () =>
      throwError(() => ({ status: 400, error: { message: refusal } })),
    );

    component.regenerateDayRecords();

    const [message, , options] = snack.open.mock.calls[0];
    expect(message).toBe(refusal);
    expect(options).toEqual({ panelClass: 'snack-error' });
    expect(component.regenerating()).toBe(false);
  });
});
