// src/app/features/attendance/pages/attendance-summary/attendance-summary.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { endOfMonth, format, min, startOfMonth, subDays } from 'date-fns';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AttendanceService } from '../../services/attendance.service';
import { AttendanceSummaryResponse } from '../../models/attendance.model';
import { Auth } from '../../../../core/auth/auth';

@Component({
  selector: 'app-attendance-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './attendance-summary.html',
  styleUrls: ['./attendance-summary.css'],
})
export class AttendanceSummary implements OnInit {
  private readonly svc = inject(AttendanceService);
  private readonly auth = inject(Auth);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHrAdmin = this.auth.hasAnyRole('HR_ADMIN');
  readonly regenerating = signal(false);

  // ── State signals ──────────────────────────────────────────
  readonly mySummary = signal<AttendanceSummaryResponse | null>(null);
  readonly yearlySummary = signal<AttendanceSummaryResponse[]>([]);
  readonly allSummaries = signal<AttendanceSummaryResponse[]>([]);
  readonly loading = signal(false);
  readonly loadingAll = signal(false);
  readonly totalElements = signal(0);
  readonly employeeId = signal(0);

  // ── Filter form — initialized at field level to avoid NG01052 ──
  readonly filterForm = new FormGroup({
    year: new FormControl<number>(new Date().getFullYear()),
    month: new FormControl<number>(new Date().getMonth() + 1),
  });

  // ── Month/Year options ─────────────────────────────────────
  // `label` values are ngx-translate keys — the template pipes them through `| translate`.
  readonly months = [
    { value: 1, label: 'common.months.january' },
    { value: 2, label: 'common.months.february' },
    { value: 3, label: 'common.months.march' },
    { value: 4, label: 'common.months.april' },
    { value: 5, label: 'common.months.may' },
    { value: 6, label: 'common.months.june' },
    { value: 7, label: 'common.months.july' },
    { value: 8, label: 'common.months.august' },
    { value: 9, label: 'common.months.september' },
    { value: 10, label: 'common.months.october' },
    { value: 11, label: 'common.months.november' },
    { value: 12, label: 'common.months.december' },
  ];

  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // ── Computed ───────────────────────────────────────────────
  readonly attendanceColor = computed(() => {
    const pct = this.mySummary()?.attendancePercentage ?? 0;
    if (pct >= 90) return '#059669';
    if (pct >= 75) return '#d97706';
    return '#dc2626';
  });

  // ── Table columns ──────────────────────────────────────────
  readonly displayedColumns = [
    'employeeCode',
    'employeeName',
    'presentDays',
    'absentDays',
    'lateDays',
    'leaveDays',
    'totalWorkingHours',
    'attendancePercentage',
  ];

  page = 0;
  pageSize = 20;

  ngOnInit(): void {
    const id = this.auth.getEmployeeId();
    this.employeeId.set(id);
    this.loadMySummary();
    this.loadYearlySummary();
  }

  // ── Load my summary (current employee) ────────────────────
  loadMySummary(): void {
    const { year, month } = this.filterForm.value;
    if (!year || !month) return;

    this.loading.set(true);
    this.svc.getEmployeeSummary(this.employeeId(), year, month).subscribe({
      next: (s) => {
        this.mySummary.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Load yearly trend ──────────────────────────────────────
  loadYearlySummary(): void {
    const year = this.filterForm.value.year ?? new Date().getFullYear();
    this.svc.getYearlySummary(this.employeeId(), year).subscribe({
      next: (list) => this.yearlySummary.set(list),
    });
  }

  // ── Load all employees (HR view) ───────────────────────────
  loadAllSummaries(): void {
    const { year, month } = this.filterForm.value;
    if (!year || !month) return;

    this.loadingAll.set(true);
    this.svc.getAllEmployeesSummary(year, month, this.page, this.pageSize).subscribe({
      next: (paged) => {
        this.allSummaries.set(paged.content);
        this.totalElements.set(paged.totalElements);
        this.loadingAll.set(false);
      },
      error: () => this.loadingAll.set(false),
    });
  }

  // ── HR_ADMIN: regenerate day records for the selected month (up to yesterday) ──
  regenerateDayRecords(): void {
    if (this.regenerating()) return; // the button stays focusable while busy, so ignore a second press
    const { year, month } = this.filterForm.value;
    if (!year || !month) return;

    const first = startOfMonth(new Date(year, month - 1, 1));
    const last = min([endOfMonth(first), subDays(new Date(), 1)]);
    const close = this.translate.instant('attendance.log.close');
    if (first > last) {
      this.snack.open(this.translate.instant('attendance.summary.backfill.nothing'), close, {
        panelClass: 'snack-error',
      });
      return;
    }

    this.regenerating.set(true);
    this.svc.regenerateDayRecords(format(first, 'yyyy-MM-dd'), format(last, 'yyyy-MM-dd')).subscribe({
      next: (r) => {
        this.regenerating.set(false);
        this.snack.open(
          this.translate.instant('attendance.summary.backfill.done', {
            created: r.created,
            corrected: r.corrected,
            employees: r.employeesRefreshed,
          }),
          close,
          { duration: 8000, panelClass: 'snack-success' },
        );
        this.loadMySummary();
        this.loadYearlySummary();
      },
      error: (err) => {
        this.regenerating.set(false);
        this.snack.open(
          err.error?.message || this.translate.instant('attendance.summary.backfill.failed'),
          close,
          { panelClass: 'snack-error' },
        );
      },
    });
  }

  onFilterChange(): void {
    this.page = 0;
    this.loadMySummary();
    this.loadYearlySummary();
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadAllSummaries();
  }

  getProgressColor(pct: number): string {
    if (pct >= 90) return 'primary';
    if (pct >= 75) return 'accent';
    return 'warn';
  }

  formatPct(pct: number): string {
    return pct?.toFixed(1) + '%';
  }
}
