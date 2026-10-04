import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AttendanceLogComponent } from './attendance-log';
import { AttendanceService } from '../../services/attendance.service';
import { Auth } from '../../../../core/auth/auth';

const log = { checkInTime: '2026-10-05T08:00:00', checkOutTime: null, workingMinutes: 0 };

function setup(checkIn: () => unknown) {
  const svc = {
    getTodayLog: vi.fn(() => of(null)),
    getMonthlyLogs: vi.fn(() => of([])),
    getEmployeeSummary: vi.fn(() => of(null)),
    checkIn: vi.fn(checkIn),
    checkOut: vi.fn(() => of(log)),
  };
  const snack = { open: vi.fn() };
  TestBed.configureTestingModule({
    imports: [AttendanceLogComponent, NoopAnimationsModule],
    providers: [
      provideTranslateService(),
      { provide: AttendanceService, useValue: svc },
      { provide: Auth, useValue: { getEmployeeId: () => 5 } },
    ],
  });
  // The component imports MatSnackBarModule, so its own injector provides MatSnackBar.
  TestBed.overrideComponent(AttendanceLogComponent, {
    set: { providers: [{ provide: MatSnackBar, useValue: snack }] },
  });
  const fixture = TestBed.createComponent(AttendanceLogComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, snack, svc };
}

describe('Attendance log messages', () => {
  it('keeps a refusal on screen until the user dismisses it, without an emoji', () => {
    const refusal = 'Today is a weekend. Overtime must be approved before you check in.';
    const { component, snack } = setup(() =>
      throwError(() => ({ status: 422, error: { message: refusal } })),
    );

    component.onCheckIn();

    const [message, , options] = snack.open.mock.calls[0];
    expect(message).toBe(refusal);
    expect(options).toEqual({ panelClass: 'snack-error' }); // no duration: stays open
  });

  it('closes a success message by itself after five seconds, without an emoji', () => {
    const { component, snack } = setup(() => of(log));

    component.onCheckIn();

    const [message, , options] = snack.open.mock.calls[0];
    expect(message).not.toMatch(/[✅❌⚠]/u);
    expect(options).toEqual({ duration: 5000, panelClass: 'snack-success' });
  });
});
