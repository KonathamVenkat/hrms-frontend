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
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { OvertimeService } from '../../services/overtime.service';
import { OvertimeResponse, OT_TYPE_CONFIG, OT_STATUS_CONFIG } from '../../models/overtime.model';
import { RegularizationStatus } from '../../models/regularization.model';

@Component({
  selector: 'app-overtime-approval',
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
    MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './overtime-approval.html',
  styleUrls: ['./overtime-approval.css'],
})
export class OvertimeApproval implements OnInit {
  private readonly svc = inject(OvertimeService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State signals ──────────────────────────────────────
  readonly requests = signal<OvertimeResponse[]>([]);
  readonly loading = signal(false);
  readonly totalElements = signal(0);
  readonly pendingCount = signal(0);
  readonly processingId = signal<string | null>(null);

  private readonly pageTitle = viewChild<ElementRef<HTMLElement>>('pageTitle');

  /** A decided row disappears from the list, so park keyboard focus on the page title instead of losing it. */
  private focusTitle(): void {
    this.pageTitle()?.nativeElement.focus();
  }
  readonly otTypeConfig = OT_TYPE_CONFIG;
  readonly statusConfig = OT_STATUS_CONFIG;

  // ── Reject dialog ──────────────────────────────────────
  readonly showRejectDialog = signal(false);
  readonly rejectingRequest = signal<OvertimeResponse | null>(null);
  readonly rejectionReason = signal('');
  readonly rejectionError = signal('');

  // ── Computed ───────────────────────────────────────────
  readonly pendingInView = computed(
    () => this.requests().filter((r) => r.status === 'PENDING').length,
  );

  readonly totalApprovedMins = computed(() =>
    this.requests()
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.durationMinutes, 0),
  );

  readonly totalApprovedFormatted = computed(() => {
    const m = this.totalApprovedMins();
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  });

  // ── Filter form ────────────────────────────────────────
  readonly filterForm = new FormGroup({
    status: new FormControl<RegularizationStatus | ''>('PENDING'),
    employeeId: new FormControl<string>(''),
    from: new FormControl<Date | null>(null),
    to: new FormControl<Date | null>(null),
  });

  readonly statusOptions = [
    { value: '', label: 'attendance.overtimeApproval.statusOptions.all' },
    { value: 'PENDING', label: 'attendance.overtimeApproval.statusOptions.pending' },
    { value: 'APPROVED', label: 'attendance.overtimeApproval.statusOptions.approved' },
    { value: 'REJECTED', label: 'attendance.overtimeApproval.statusOptions.rejected' },
    { value: 'CANCELLED', label: 'attendance.overtimeApproval.statusOptions.cancelled' },
  ];

  readonly displayedColumns = [
    'otId',
    'employeeName',
    'otDate',
    'otType',
    'startTime',
    'endTime',
    'duration',
    'reason',
    'status',
    'submittedAt',
    'actions',
  ];

  page = 0;
  pageSize = 20;

  ngOnInit(): void {
    this.loadRequests();
    this.loadPendingCount();
  }

  loadRequests(): void {
    this.loading.set(true);
    const { status, employeeId, from, to } = this.filterForm.value;

    this.svc
      .getAllRequests(
        status || (undefined as any),
        employeeId ? Number(employeeId) : undefined,
        from ? this.fmt(from) : undefined,
        to ? this.fmt(to) : undefined,
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
          console.error('Failed to load OT requests', err);
          this.snack.open(
            this.translate.instant('attendance.overtimeApproval.errors.loadFailed'),
            this.translate.instant('attendance.overtimeApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.loading.set(false);
        },
      });
  }

  loadPendingCount(): void {
    this.svc.getPendingCount().subscribe({
      next: (c) => this.pendingCount.set(c),
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

  // ── Approve ────────────────────────────────────────────
  onApprove(req: OvertimeResponse): void {
    if (this.processingId() !== null) return;
    if (
      !confirm(
        this.translate.instant('attendance.overtimeApproval.confirmApprove', {
          duration: req.durationFormatted,
          name: req.employeeName,
          date: req.otDateFormatted,
        }),
      )
    )
      return;

    this.processingId.set(req.otId);
    this.svc
      .approve(req.otId, {
        action: 'APPROVED',
      })
      .subscribe({
        next: () => {
          this.snack.open(
            this.translate.instant('attendance.overtimeApproval.success.approved', {
              duration: req.durationFormatted,
              name: req.employeeName,
            }),
            this.translate.instant('attendance.overtimeApproval.close'),
            { duration: 5000, panelClass: 'snack-success' },
          );
          this.processingId.set(null);
          this.loadRequests();
          this.focusTitle();
          this.loadPendingCount();
        },
        error: (err) => {
          this.snack.open(
            err.error?.message || this.translate.instant('attendance.overtimeApproval.errors.approveFailed'),
            this.translate.instant('attendance.overtimeApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.processingId.set(null);
        },
      });
  }

  // ── Reject dialog ──────────────────────────────────────
  openRejectDialog(req: OvertimeResponse): void {
    this.rejectingRequest.set(req);
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
    if (value.trim().length >= 10) this.rejectionError.set('');
  }

  onConfirmReject(): void {
    if (this.processingId() !== null) return;
    const reason = this.rejectionReason().trim();
    const req = this.rejectingRequest();
    if (!req) return;

    if (reason.length < 10) {
      this.rejectionError.set(
        this.translate.instant('attendance.overtimeApproval.errors.rejectionReasonTooShort'),
      );
      return;
    }

    this.processingId.set(req.otId);
    this.svc
      .reject(req.otId, {
        action: 'REJECTED',
        rejectionReason: reason,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            this.translate.instant('attendance.overtimeApproval.success.rejected', {
              name: req.employeeName,
            }),
            this.translate.instant('attendance.overtimeApproval.close'),
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
            err.error?.message || this.translate.instant('attendance.overtimeApproval.errors.rejectFailed'),
            this.translate.instant('attendance.overtimeApproval.close'),
            { panelClass: 'snack-error' },
          );
          this.processingId.set(null);
        },
      });
  }

  getOtTypeStyle(type: any) {
    return (
      this.otTypeConfig[type as keyof typeof this.otTypeConfig] ?? {
        label: type,
        color: '#374151',
        bg: '#f3f4f6',
        icon: 'schedule',
      }
    );
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

  formatDateTime(iso: string | null): string {
    if (!iso) return '--';
    const d = new Date(iso);
    return (
      d.toLocaleDateString('en-OM', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('en-OM', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  }

  isProcessing(otId: string): boolean {
    return this.processingId() === otId;
  }

  private fmt(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
