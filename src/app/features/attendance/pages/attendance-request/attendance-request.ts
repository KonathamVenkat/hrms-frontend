// src/app/features/attendance/pages/attendance-request/attendance-request.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { RegularizationService } from '../../services/regularization.service';
import {
  RegularizationResponse,
  RegularizationStatus,
  REG_STATUS_CONFIG,
} from '../../models/regularization.model';
import { Auth } from '../../../../core/auth/auth';

@Component({
  selector: 'app-attendance-request',
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
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    TranslatePipe,
  ],
  templateUrl: './attendance-request.html',
  styleUrls: ['./attendance-request.css'],
})
export class AttendanceRequest implements OnInit {
  private readonly svc = inject(RegularizationService);
  private readonly auth = inject(Auth);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State signals ──────────────────────────────────────────
  readonly myRequests = signal<RegularizationResponse[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly totalElements = signal(0);
  readonly employeeId = signal(0);
  readonly statusConfig = REG_STATUS_CONFIG;
  readonly showForm = signal(false);

  // ── Computed ───────────────────────────────────────────────
  readonly pendingCount = computed(
    () => this.myRequests().filter((r) => r.status === 'PENDING').length,
  );

  readonly approvedCount = computed(
    () => this.myRequests().filter((r) => r.status === 'APPROVED').length,
  );

  readonly rejectedCount = computed(
    () => this.myRequests().filter((r) => r.status === 'REJECTED').length,
  );

  // ── Submit form — initialized at field level (avoids NG01052) ──
  readonly submitForm = new FormGroup({
    attendanceDate: new FormControl<Date | null>(null, [Validators.required]),
    requestedInTime: new FormControl<string>('', [Validators.required]),
    requestedOutTime: new FormControl<string>(''),
    reason: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(500),
    ]),
  });

  // ── Table ──────────────────────────────────────────────────
  readonly displayedColumns = [
    'attendanceDate',
    'requestedInTime',
    'requestedOutTime',
    'reason',
    'status',
    'reviewedBy',
    'actions',
  ];

  readonly maxDate = new Date();
  readonly minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  page = 0;
  pageSize = 10;

  ngOnInit(): void {
    this.employeeId.set(this.auth.getEmployeeId());
    this.loadMyRequests();
  }

  // ── Load ──────────────────────────────────────────────────
  loadMyRequests(): void {
    this.loading.set(true);
    this.svc.getMyRequests(this.employeeId(), this.page, this.pageSize).subscribe({
      next: (paged) => {
        this.myRequests.set(paged.content);
        this.totalElements.set(paged.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.submitting()) return; // the button stays focusable while busy, so ignore a second press
    if (this.submitForm.invalid) {
      this.submitForm.markAllAsTouched();
      return;
    }

    const { attendanceDate, requestedInTime, requestedOutTime, reason } = this.submitForm.value;

    // Format date as yyyy-MM-dd
    const dateStr = this.formatDate(attendanceDate!);
    // Build ISO datetime strings
    const inTime = `${dateStr}T${requestedInTime}:00`;
    const outTime = requestedOutTime ? `${dateStr}T${requestedOutTime}:00` : undefined;

    this.submitting.set(true);
    this.svc
      .submit({
        employeeId: this.employeeId(),
        attendanceDate: dateStr,
        requestedInTime: inTime,
        requestedOutTime: outTime,
        reason: reason!,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            this.translate.instant('attendance.request.success.submitted'),
            this.translate.instant('attendance.request.close'),
            { duration: 5000, panelClass: 'snack-success' },
          );
          this.submitForm.reset();
          this.showForm.set(false);
          this.submitting.set(false);
          this.page = 0;
          this.loadMyRequests();
        },
        error: (err) => {
          this.snack.open(
            err.error?.message || this.translate.instant('attendance.request.errors.submitFailed'),
            this.translate.instant('attendance.request.close'),
            { panelClass: 'snack-error' },
          );
          this.submitting.set(false);
        },
      });
  }

  // ── Cancel ────────────────────────────────────────────────
  onCancel(regId: number): void {
    if (!confirm(this.translate.instant('attendance.request.confirmCancel'))) return;
    this.svc.cancel(regId, this.employeeId()).subscribe({
      next: () => {
        this.snack.open(
          this.translate.instant('attendance.request.success.cancelled'),
          this.translate.instant('attendance.request.close'),
          { duration: 5000 },
        );
        this.loadMyRequests();
      },
      error: (err) =>
        this.snack.open(
          err.error?.message || this.translate.instant('attendance.request.errors.cancelFailed'),
          this.translate.instant('attendance.request.close'),
          { panelClass: 'snack-error' },
        ),
    });
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadMyRequests();
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.submitForm.reset();
  }

  getStatusStyle(status: RegularizationStatus) {
    return (
      this.statusConfig[status] ?? { label: status, color: '#374151', bg: '#f3f4f6', icon: 'info' }
    );
  }

  formatTime(iso: string | null): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('en-OM', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
