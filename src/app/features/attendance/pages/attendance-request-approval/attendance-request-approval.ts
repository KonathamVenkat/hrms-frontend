// src/app/features/attendance/pages/attendance-request-approval/
//   attendance-request-approval.component.ts

import { CdkTrapFocus } from '@angular/cdk/a11y';
import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';
import { Component, ElementRef, OnInit, inject, signal, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { RegularizationService } from '../../services/regularization.service';
import {
  RegularizationResponse,
  RegularizationStatus,
  REG_STATUS_CONFIG,
} from '../../models/regularization.model';

@Component({
  selector: 'app-attendance-request-approval',
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
    CdkTrapFocus,
    AccessibleDialogDirective,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatBadgeModule,
    TranslatePipe,
  ],
  templateUrl: './attendance-request-approval.html',
  styleUrls: ['./attendance-request-approval.css'],
})
export class AttendanceRequestApproval implements OnInit {
  private readonly svc = inject(RegularizationService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State signals ──────────────────────────────────────────
  readonly requests = signal<RegularizationResponse[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly pendingCount = signal(0);
  readonly statusConfig = REG_STATUS_CONFIG;

  // ── Action state ───────────────────────────────────────────
  readonly processingId = signal<number | null>(null);

  private readonly pageTitle = viewChild<ElementRef<HTMLElement>>('pageTitle');

  /** A decided row disappears from the list, so park keyboard focus on the page title instead of losing it. */
  private focusTitle(): void {
    this.pageTitle()?.nativeElement.focus();
  }
  readonly showRejectDialog = signal(false);
  readonly rejectingRequest = signal<RegularizationResponse | null>(null);
  readonly rejectionReason = signal('');
  readonly rejectionError = signal('');

  // ── Computed ───────────────────────────────────────────────
  readonly pendingRequests = computed(() => this.requests().filter((r) => r.status === 'PENDING'));

  readonly approvedToday = computed(
    () =>
      this.requests().filter(
        (r) =>
          r.status === 'APPROVED' &&
          r.reviewedAt?.startsWith(new Date().toISOString().slice(0, 10)),
      ).length,
  );

  // ── Filter form — initialized at field level (avoids NG01052) ──
  readonly filterForm = new FormGroup({
    status: new FormControl<RegularizationStatus | ''>('PENDING'),
    employeeId: new FormControl<string>(''),
    from: new FormControl<Date | null>(null),
    to: new FormControl<Date | null>(null),
  });

  // ── Table columns ──────────────────────────────────────────
  readonly displayedColumns = [
    'regId',
    'employeeName',
    'attendanceDate',
    'requestedInTime',
    'requestedOutTime',
    'reason',
    'status',
    'submittedAt',
    'actions',
  ];

  readonly statusOptions: { value: RegularizationStatus | ''; label: string }[] = [
    { value: '', label: 'attendance.requestApproval.statusOptions.all' },
    { value: 'PENDING', label: 'attendance.requestApproval.statusOptions.pending' },
    { value: 'APPROVED', label: 'attendance.requestApproval.statusOptions.approved' },
    { value: 'REJECTED', label: 'attendance.requestApproval.statusOptions.rejected' },
    { value: 'CANCELLED', label: 'attendance.requestApproval.statusOptions.cancelled' },
  ];

  page = 0;
  pageSize = 20;

  ngOnInit(): void {
    this.loadRequests();
    this.loadPendingCount();
  }

  // ── Load ──────────────────────────────────────────────────
  loadRequests(): void {
    this.loading.set(true);

    const { status, employeeId, from, to } = this.filterForm.value;

    const statusVal = status || undefined;
    const empId = employeeId ? Number(employeeId) : undefined;
    const fromStr = from ? this.formatDate(from) : undefined;
    const toStr = to ? this.formatDate(to) : undefined;

    this.svc
      .getAllRequests(
        statusVal as RegularizationStatus | undefined,
        empId,
        fromStr,
        toStr,
        this.page,
        this.pageSize,
      )
      .subscribe({
        next: (paged) => {
          this.requests.set(paged.content);
          this.totalElements.set(paged.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load regularization requests', err);
          this.snack.open(
            this.translate.instant('attendance.requestApproval.errors.loadFailed'),
            this.translate.instant('attendance.requestApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.loading.set(false);
        },
      });
  }

  loadPendingCount(): void {
    this.svc.getPendingCount().subscribe({
      next: (count) => this.pendingCount.set(count),
      error: (err) => console.error('Failed to load pending count', err),
    });
  }

  onFilterChange(): void {
    this.page = 0;
    this.loadRequests();
  }

  onReset(): void {
    this.filterForm.reset({ status: 'PENDING' });
    this.page = 0;
    this.loadRequests();
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadRequests();
  }

  // ── Approve ───────────────────────────────────────────────
  onApprove(request: RegularizationResponse): void {
    if (this.processingId() !== null) return;
    if (
      !confirm(
        this.translate.instant('attendance.requestApproval.confirmApprove', {
          name: request.employeeName,
          date: request.attendanceDateFormatted,
        }),
      )
    )
      return;

    this.processingId.set(request.regId);

    this.svc
      .approve(request.regId, {
        action: 'APPROVED',
        rejectionReason: undefined,
      })
      .subscribe({
        next: (updated) => {
          this.snack.open(
            this.translate.instant('attendance.requestApproval.success.approved', {
              name: request.employeeName,
              date: request.attendanceDateFormatted,
            }),
            this.translate.instant('attendance.requestApproval.close'),
            { duration: 5000, panelClass: 'snack-success' },
          );
          this.processingId.set(null);
          this.loadRequests();
          this.focusTitle();
          this.loadPendingCount();
        },
        error: (err) => {
          this.snack.open(
            err.error?.message || this.translate.instant('attendance.requestApproval.errors.approveFailed'),
            this.translate.instant('attendance.requestApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.processingId.set(null);
        },
      });
  }

  // ── Reject dialog ─────────────────────────────────────────
  openRejectDialog(request: RegularizationResponse): void {
    this.rejectingRequest.set(request);
    this.rejectionReason.set('');
    this.rejectionError.set('');
    this.showRejectDialog.set(true);
  }

  closeRejectDialog(): void {
    this.showRejectDialog.set(false);
    this.rejectingRequest.set(null);
    this.rejectionReason.set('');
    this.rejectionError.set('');
  }

  onRejectReasonChange(value: string): void {
    this.rejectionReason.set(value);
    if (value.trim().length >= 10) {
      this.rejectionError.set('');
    }
  }

  onConfirmReject(): void {
    if (this.processingId() !== null) return;
    const reason = this.rejectionReason().trim();
    const request = this.rejectingRequest();

    if (!request) return;

    if (reason.length < 10) {
      this.rejectionError.set(
        this.translate.instant('attendance.requestApproval.errors.rejectionReasonTooShort'),
      );
      return;
    }

    this.processingId.set(request.regId);

    this.svc
      .reject(request.regId, {
        action: 'REJECTED',
        rejectionReason: reason,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            this.translate.instant('attendance.requestApproval.success.rejected', {
              name: request.employeeName,
            }),
            this.translate.instant('attendance.requestApproval.close'),
            { duration: 5000 },
          );
          this.closeRejectDialog();
          this.processingId.set(null);
          this.loadRequests();
          this.focusTitle();
          this.loadPendingCount();
        },
        error: (err) => {
          this.snack.open(
            err.error?.message || this.translate.instant('attendance.requestApproval.errors.rejectFailed'),
            this.translate.instant('attendance.requestApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.processingId.set(null);
        },
      });
  }

  // ── Utilities ─────────────────────────────────────────────
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

  formatDateTime(iso: string | null): string {
    if (!iso) return '--';
    const d = new Date(iso);
    return (
      d.toLocaleDateString('en-OM', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('en-OM', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  }

  isProcessing(regId: number): boolean {
    return this.processingId() === regId;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
