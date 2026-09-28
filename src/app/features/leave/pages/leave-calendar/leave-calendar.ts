import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../../environments/environment';

// ── Calendar models ───────────────────────────────────────────

export interface CalendarLeaveEntry {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface CalendarHolidayEntry {
  holidayId: number;
  holidayName: string;
  holidayNameAr?: string;
  holidayType: string;
}

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  dayOfWeek: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  holidays: CalendarHolidayEntry[];
  leaves: CalendarLeaveEntry[];
  onLeaveCount: number;
  pendingCount: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  days: CalendarDay[];
  totalApproved: number;
  totalPending: number;
  totalHolidays: number;
  onLeaveToday: number;
  todaysLeaves: CalendarLeaveEntry[];
}

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './leave-calendar.html',
  styleUrl: './leave-calendar.css',
})
export class LeaveCalendarPage implements OnInit {
  private http = inject(HttpClient);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  calendar = signal<CalendarMonth | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // ── Current view ──────────────────────────────────────────
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth() + 1); // 1-based

  // ── Selected day for detail popup ─────────────────────────
  selectedDay = signal<CalendarDay | null>(null);

  // ── Week headers — Mon–Sun (Oman: Sat-Fri work week) ──────
  readonly weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // ── Computed calendar grid (7 cols) ───────────────────────
  readonly weeks = computed(() => {
    const days = this.calendar()?.days ?? [];
    const result: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  });

  ngOnInit(): void {
    this.loadCalendar();
  }

  // ── Load ──────────────────────────────────────────────────
  loadCalendar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedDay.set(null);

    const params = new HttpParams().set('year', this.viewYear()).set('month', this.viewMonth());

    this.http
      .get<any>(`${environment.serviceUrl}/api/v1/leave/calendar`, { params })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.calendar.set(res.data);
          else this.error.set(res.message);
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.calendar.errors.loadFailed'),
          ),
      });
  }

  // ── Navigation ────────────────────────────────────────────
  prevMonth(): void {
    if (this.viewMonth() === 1) {
      this.viewMonth.set(12);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.loadCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth() === 12) {
      this.viewMonth.set(1);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.loadCalendar();
  }

  goToToday(): void {
    this.viewYear.set(new Date().getFullYear());
    this.viewMonth.set(new Date().getMonth() + 1);
    this.loadCalendar();
  }

  // ── Day click ─────────────────────────────────────────────
  selectDay(day: CalendarDay): void {
    if (this.selectedDay()?.date === day.date) {
      this.selectedDay.set(null); // toggle off
    } else {
      this.selectedDay.set(day);
    }
  }

  closePopup(): void {
    this.selectedDay.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────
  getTypeColor(code: string): string {
    const map: Record<string, string> = {
      ANNUAL: '#13c9b4',
      SICK: '#e11d48',
      CASUAL: '#f59e0b',
      MATERNITY: '#8b5cf6',
      PATERNITY: '#06b6d4',
      COMP_OFF: '#10b981',
      HAJJ: '#f97316',
      BEREAVEMENT: '#94a3b8',
      STUDY: '#3b82f6',
      UNPAID: '#64748b',
    };
    return map[code] ?? '#64748b';
  }

  getHolidayColor(type: string): string {
    const map: Record<string, string> = {
      PUBLIC: '#e11d48',
      RELIGIOUS: '#8b5cf6',
      OPTIONAL: '#f59e0b',
      RESTRICTED: '#06b6d4',
    };
    return map[type] ?? '#64748b';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getDayClass(day: CalendarDay): string {
    const classes: string[] = ['cal-day'];
    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isWeekend) classes.push('weekend');
    if (day.isHoliday) classes.push('holiday');
    if (day.isToday) classes.push('today');
    if (day.onLeaveCount > 0) classes.push('has-leaves');
    if (this.selectedDay()?.date === day.date) classes.push('selected');
    return classes.join(' ');
  }
}
