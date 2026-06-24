// src/app/features/attendance/pages/attendance-log/attendance-log.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { AttendanceService } from '../../services/attendance.service';
import {
  AttendanceLogResponse,
  AttendanceSummaryResponse,
  STATUS_CONFIG,
} from '../../models/attendance.model';
import { Auth } from '../../../../core/auth/auth';

@Component({
  selector: 'app-attendance-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './attendance-log.html',
  styleUrls: ['./attendance-log.css'],
})
export class AttendanceLogComponent implements OnInit {
  private readonly svc = inject(AttendanceService);
  private readonly auth = inject(Auth);
  private readonly snack = inject(MatSnackBar);

  // ── Signals ────────────────────────────────────────────────
  readonly todayLog = signal<AttendanceLogResponse | null>(null);
  readonly logs = signal<AttendanceLogResponse[]>([]);
  readonly summary = signal<AttendanceSummaryResponse | null>(null);
  readonly loading = signal(false);
  readonly checkingIn = signal(false);
  readonly checkingOut = signal(false);
  readonly totalElements = signal(0);

  readonly statusConfig = STATUS_CONFIG;
  readonly employeeId = signal<number>(0);

  // ── Computed ───────────────────────────────────────────────
  readonly canCheckIn = computed(() => {
    const log = this.todayLog();
    return !log || log.checkInTime === null;
  });

  readonly canCheckOut = computed(() => {
    const log = this.todayLog();
    return !!log?.checkInTime && !log?.checkOutTime;
  });

  readonly workingTimeDisplay = computed(() => {
    const log = this.todayLog();
    if (!log?.checkInTime) return '--';
    if (!log.checkOutTime) return 'In Progress';
    return this.formatMinutes(log.workingMinutes);
  });

  // ── Table columns ──────────────────────────────────────────
  readonly displayedColumns = [
    'attendanceDate',
    'checkInTime',
    'checkOutTime',
    'workingHours',
    'status',
    'lateMinutes',
    'shiftName',
  ];

  // ── Filter form ────────────────────────────────────────────
  readonly filterForm = new FormGroup({
    from: new FormControl<Date | null>(this.firstDayOfMonth()),
    to: new FormControl<Date | null>(new Date()),
  });

  // ── Pagination ─────────────────────────────────────────────
  page = 0;
  pageSize = 20;
  today = new Date();

  ngOnInit(): void {
    const empId = this.auth.getEmployeeId();
    this.employeeId.set(empId);
    this.loadTodayLog();
    this.loadMonthlyLogs();
    this.loadMonthlySummary();
  }

  // ── Check-in ───────────────────────────────────────────────
  onCheckIn(): void {
    this.checkingIn.set(true);
    this.svc.checkIn({ employeeId: this.employeeId() }).subscribe({
      next: (log) => {
        this.todayLog.set(log);
        this.snack.open('✅ Checked in at ' + this.formatTime(log.checkInTime), 'Close', {
          duration: 4000,
          panelClass: 'snack-success',
        });
        this.checkingIn.set(false);
        this.loadMonthlyLogs();
      },
      error: (err) => {
        this.snack.open('❌ ' + (err.error?.message || 'Check-in failed'), 'Close', {
          duration: 4000,
          panelClass: 'snack-error',
        });
        this.checkingIn.set(false);
      },
    });
  }

  // ── Check-out ──────────────────────────────────────────────
  onCheckOut(): void {
    this.checkingOut.set(true);
    this.svc.checkOut({ employeeId: this.employeeId() }).subscribe({
      next: (log) => {
        this.todayLog.set(log);
        this.snack.open(
          '✅ Checked out — Working: ' + this.formatMinutes(log.workingMinutes),
          'Close',
          { duration: 4000, panelClass: 'snack-success' },
        );
        this.checkingOut.set(false);
        this.loadMonthlyLogs();
        this.loadMonthlySummary();
      },
      error: (err) => {
        this.snack.open('❌ ' + (err.error?.message || 'Check-out failed'), 'Close', {
          duration: 4000,
          panelClass: 'snack-error',
        });
        this.checkingOut.set(false);
      },
    });
  }

  // ── Load helpers ───────────────────────────────────────────
  loadTodayLog(): void {
    this.svc.getTodayLog(this.employeeId()).subscribe((log) => this.todayLog.set(log));
  }

  loadMonthlyLogs(): void {
    const now = new Date();
    this.loading.set(true);
    this.svc.getMonthlyLogs(this.employeeId(), now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMonthlySummary(): void {
    const now = new Date();
    this.svc
      .getEmployeeSummary(this.employeeId(), now.getFullYear(), now.getMonth() + 1)
      .subscribe((s: AttendanceSummaryResponse) => this.summary.set(s));
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadMonthlyLogs();
  }

  // ── Utilities ──────────────────────────────────────────────
  formatTime(iso: string | null): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('en-OM', { hour: '2-digit', minute: '2-digit' });
  }

  formatMinutes(mins: number): string {
    if (!mins || mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  getStatusStyle(status: string) {
    return (
      this.statusConfig[status as keyof typeof this.statusConfig] ?? {
        label: status,
        color: '#374151',
        bg: '#f3f4f6',
      }
    );
  }

  private firstDayOfMonth(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}
