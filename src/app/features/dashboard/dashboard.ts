import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';

import { Auth } from '../../core/auth/auth';
import { AttendanceService } from '../attendance/services/attendance.service';
import { AttendanceLogResponse } from '../attendance/models/attendance.model';
import { LeaveBalanceService } from '../leave/services/leave-balance.service';
import { LeaveBalance } from '../leave/models/leave-balance.model';
import { HolidayService } from '../admin/holiday-calendar/services/holiday-calendar';
import { Holiday } from '../admin/holiday-calendar/models/holiday-calendar';
import { DashboardService } from './services/dashboard.service';
import { HrDashboardSummary } from './models/dashboard.model';

const UPCOMING_HOLIDAY_LIMIT = 4;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly auth = inject(Auth);
  private readonly dashboardSvc = inject(DashboardService);
  private readonly attendanceSvc = inject(AttendanceService);
  private readonly balanceSvc = inject(LeaveBalanceService);
  private readonly holidaySvc = inject(HolidayService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  private readonly lang = toSignal(this.translate.onLangChange.pipe(map((e) => e.lang)), {
    initialValue: this.translate.currentLang,
  });

  // ── State ─────────────────────────────────────────────────
  readonly isHr = signal(false);
  readonly displayName = signal('');
  readonly loading = signal(true);
  readonly loadFailed = signal(false);

  readonly hrSummary = signal<HrDashboardSummary | null>(null);
  readonly todayLog = signal<AttendanceLogResponse | null>(null);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly holidays = signal<Holiday[]>([]);

  // ── Derived ───────────────────────────────────────────────
  readonly workforceCards = computed(() => {
    const s = this.hrSummary();
    if (!s) return [];
    return [
      { key: 'totalStrength', icon: 'groups', value: s.totalStrength },
      { key: 'newJoinersToday', icon: 'person_add', value: s.newJoinersToday },
      { key: 'joiningThisWeek', icon: 'calendar_today', value: s.joiningThisWeek },
      { key: 'onLeaveToday', icon: 'event_busy', value: s.onLeaveToday },
    ];
  });

  readonly approvalCards = computed(() => {
    const s = this.hrSummary();
    if (!s) return [];
    return [
      {
        key: 'leaveRequests',
        icon: 'event_available',
        count: s.pendingLeaveRequests,
        link: '/app/leave/approval',
      },
      {
        key: 'regularizations',
        icon: 'fact_check',
        count: s.pendingRegularizations,
        link: '/app/attendance/request-approval',
      },
      {
        key: 'overtimeRequests',
        icon: 'more_time',
        count: s.pendingOvertimeRequests,
        link: '/app/attendance/overtime-approval',
      },
    ];
  });

  readonly attendanceMessage = computed(() => {
    this.lang(); // recompute when the UI language changes
    const log = this.todayLog();
    if (!log?.checkInTime) return this.translate.instant('dashboard.employee.notCheckedIn');
    if (log.checkOutTime) {
      return this.translate.instant('dashboard.employee.checkedOutAt', {
        time: formatDate(log.checkOutTime, 'shortTime', this.locale),
      });
    }
    return this.translate.instant('dashboard.employee.checkedInAt', {
      time: formatDate(log.checkInTime, 'shortTime', this.locale),
    });
  });

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.displayName.set(user?.fullName || user?.username || '');

    if (this.auth.hasAnyRole('HR_ADMIN', 'HR_MANAGER')) {
      this.isHr.set(true);
      this.loadHr();
    } else {
      this.loadEmployee(this.auth.getEmployeeId());
    }
  }

  holidayName(h: Holiday): string {
    return this.lang() === 'ar' && h.holidayNameAr ? h.holidayNameAr : h.holidayName;
  }

  holidayDate(h: Holiday): string {
    return formatDate(h.holidayDate, 'EEE, d MMM', this.locale);
  }

  availableLabel(b: LeaveBalance): string {
    return this.translate.instant('dashboard.employee.availableOfTotal', {
      available: b.availableDays,
      total: b.totalDays,
    });
  }

  private loadHr(): void {
    this.dashboardSvc
      .getHrSummary()
      .pipe(
        catchError(() => {
          this.loadFailed.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((summary) => {
        this.hrSummary.set(summary);
        this.loading.set(false);
      });
  }

  /**
   * The three sections load independently, so one failing (e.g. no leave balances
   * initialised yet) doesn't blank the others; the page just notes something was missing.
   */
  private loadEmployee(employeeId: number): void {
    const year = new Date().getFullYear();
    let pending = 3;
    const done = (): void => {
      pending -= 1;
      if (pending === 0) this.loading.set(false);
    };
    const fail = (): void => this.loadFailed.set(true);

    this.attendanceSvc
      .getTodayLog(employeeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (log) => {
          this.todayLog.set(log ?? null);
          done();
        },
        error: () => {
          fail();
          done();
        },
      });

    this.balanceSvc
      .getEmployeeBalances(employeeId, year)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.balances.set((res.data ?? []).filter((b) => b.totalDays > 0));
          done();
        },
        error: () => {
          fail();
          done();
        },
      });

    this.holidaySvc
      .getActiveByYear(year)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
          this.holidays.set(
            (res.data ?? [])
              .filter((h) => h.holidayDate >= today)
              .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
              .slice(0, UPCOMING_HOLIDAY_LIMIT),
          );
          done();
        },
        error: () => {
          fail();
          done();
        },
      });
  }
}
