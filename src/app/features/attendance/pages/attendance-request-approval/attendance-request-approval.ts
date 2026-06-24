// src/app/features/attendance/pages/attendance-request-approval/
//   attendance-request-approval.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

import { RegularizationService } from '../../services/regularization.service';
import {
  RegularizationResponse,
  RegularizationStatus,
  REG_STATUS_CONFIG,
} from '../../models/regularization.model';
import { Auth } from '../../../../core/auth/auth';

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
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatBadgeModule,
  ],
  templateUrl: './attendance-request-approval.html',
  styleUrls: ['./attendance-request-approval.css'],
})
export class AttendanceRequestApproval implements OnInit {
  private readonly svc = inject(RegularizationService);
  private readonly auth = inject(Auth);
  private readonly snack = inject(MatSnackBar);

  // ── State signals ──────────────────────────────────────────
  readonly requests = signal<RegularizationResponse[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly pendingCount = signal(0);
  readonly statusConfig = REG_STATUS_CONFIG;

  // ── Action state ───────────────────────────────────────────
  readonly processingId = signal<number | null>(null);
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
    { value: '', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
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
          this.snack.open('Failed to load requests', 'Close', { duration: 3000 });
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
    if (
      !confirm(
        `Approve regularization for ${request.employeeName} on ${request.attendanceDateFormatted}?`,
      )
    )
      return;

    this.processingId.set(request.regId);

    this.svc
      .approve(request.regId, {
        reviewedBy: this.auth.getEmployeeId(),
        action: 'APPROVED',
        rejectionReason: undefined,
      })
      .subscribe({
        next: (updated) => {
          this.snack.open(
            `✅ Approved — ${request.employeeName}'s attendance for ${request.attendanceDateFormatted} has been corrected`,
            'Close',
            { duration: 5000, panelClass: 'snack-success' },
          );
          this.processingId.set(null);
          this.loadRequests();
          this.loadPendingCount();
        },
        error: (err) => {
          this.snack.open('❌ ' + (err.error?.message || 'Approval failed'), 'Close', {
            duration: 4000,
            panelClass: 'snack-error',
          });
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
    const reason = this.rejectionReason().trim();
    const request = this.rejectingRequest();

    if (!request) return;

    if (reason.length < 10) {
      this.rejectionError.set('Rejection reason must be at least 10 characters.');
      return;
    }

    this.processingId.set(request.regId);

    this.svc
      .reject(request.regId, {
        reviewedBy: this.auth.getEmployeeId(),
        action: 'REJECTED',
        rejectionReason: reason,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            `❌ Rejected — ${request.employeeName}'s request has been rejected`,
            'Close',
            { duration: 4000 },
          );
          this.closeRejectDialog();
          this.processingId.set(null);
          this.loadRequests();
          this.loadPendingCount();
        },
        error: (err) => {
          this.snack.open('❌ ' + (err.error?.message || 'Rejection failed'), 'Close', {
            duration: 4000,
            panelClass: 'snack-error',
          });
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
