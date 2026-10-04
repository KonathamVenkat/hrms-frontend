import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LeaveRequestService } from '../../services/leave-request.service';
import { LeaveRequest } from '../../models/leave-request.model';
import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, CdkTrapFocus, AccessibleDialogDirective],
  templateUrl: './leave-approval.html',
  styleUrl: './leave-approval.css',
})
export class LeaveApprovalPage implements OnInit {
  private leaveSvc = inject(LeaveRequestService);
  private fb = inject(FormBuilder);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  leaves = signal<LeaveRequest[]>([]);
  loading = signal(false);
  processing = signal<number | null>(null);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Pagination ────────────────────────────────────────────
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = 10;

  // ── Filters ───────────────────────────────────────────────
  filterStatus = signal('PENDING'); // default to pending
  filterLeaveType = signal('');

  // ── Action modal ──────────────────────────────────────────
  showModal = signal(false);
  actionType = signal<'APPROVED' | 'REJECTED'>('APPROVED');
  selectedLeave = signal<LeaveRequest | null>(null);

  // ── Computed stats ────────────────────────────────────────
  readonly pendingCount = computed(
    () => this.leaves().filter((l) => l.status === 'PENDING').length,
  );

  readonly leaveTypes = [
    'ANNUAL',
    'SICK',
    'CASUAL',
    'MATERNITY',
    'PATERNITY',
    'COMP_OFF',
    'UNPAID',
    'HAJJ',
    'BEREAVEMENT',
    'STUDY',
  ];

  remarksForm: FormGroup = this.fb.group({
    remarks: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    this.loadLeaves();
  }

  downloadAttachment(leave: LeaveRequest): void {
    this.leaveSvc
      .downloadAttachment(leave)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        error: (err: any) =>
          this.error.set(err?.error?.message || this.translate.instant('leave.list.attachmentDownloadFailed')),
      });
  }

  // ── Load ──────────────────────────────────────────────────
  loadLeaves(): void {
    this.loading.set(true);
    this.error.set(null);

    this.leaveSvc
      .getAllLeaves({
        status: this.filterStatus() || undefined,
        leaveTypeCode: this.filterLeaveType() || undefined,
        page: this.currentPage(),
        size: this.pageSize,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.leaves.set(res.data.content);
            this.totalPages.set(res.data.totalPages);
            this.totalElements.set(res.data.totalElements);
            // this.currentPage.set(res.data.number);
            this.currentPage.set(res.data.number ?? res.data.pageNumber ?? 0);
          }
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.approval.errors.loadFailed'),
          ),
      });
  }

  // ── Filters ───────────────────────────────────────────────
  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadLeaves();
  }

  // ── Pagination ────────────────────────────────────────────
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadLeaves();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  get showingFrom(): number {
    return this.currentPage() * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min((this.currentPage() + 1) * this.pageSize, this.totalElements());
  }

  // ── Open approve/reject modal ─────────────────────────────
  openApprove(leave: LeaveRequest): void {
    this.selectedLeave.set(leave);
    this.actionType.set('APPROVED');
    this.remarksForm.reset({ remarks: '' });
    this.showModal.set(true);
  }

  openReject(leave: LeaveRequest): void {
    this.selectedLeave.set(leave);
    this.actionType.set('REJECTED');
    this.remarksForm.reset({ remarks: '' });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedLeave.set(null);
    this.remarksForm.reset({ remarks: '' });
  }

  // ── Confirm action ────────────────────────────────────────
  confirmAction(): void {
    const remarks = this.remarksForm.get('remarks')?.value?.trim();

    // Remarks required for rejection
    if (this.actionType() === 'REJECTED' && !remarks) {
      this.remarksForm.get('remarks')!.markAsTouched();
      this.remarksForm.get('remarks')!.setErrors({ required: true });
      return;
    }

    const leave = this.selectedLeave();
    if (!leave) return;

    this.processing.set(leave.leaveReqId);

    this.leaveSvc
      .processLeave(leave.leaveReqId, this.actionType(), remarks || undefined)
      .pipe(finalize(() => this.processing.set(null)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const actionKey =
              this.actionType() === 'APPROVED'
                ? 'leave.approval.actionApprovedPast'
                : 'leave.approval.actionRejectedPast';
            this.showSuccess(
              this.translate.instant('leave.approval.actionSuccessMsg', {
                action: this.translate.instant(actionKey),
                name: leave.employeeName ?? leave.employeeCode,
              }),
            );
            this.closeModal();
            this.loadLeaves();
          } else {
            this.error.set(res.message);
          }
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'));
          this.closeModal();
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────
  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      CANCELLED: 'status-cancelled',
    };
    return map[status] ?? 'status-pending';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'hourglass_empty',
      APPROVED: 'check_circle',
      REJECTED: 'cancel',
      CANCELLED: 'remove_circle_outline',
    };
    return map[status] ?? 'help_outline';
  }

  getTypeColor(code: string): string {
    const map: Record<string, string> = {
      ANNUAL: '#0a7466',
      SICK: '#be123c',
      CASUAL: '#92400e',
      MATERNITY: '#6d28d9',
      PATERNITY: '#06b6d4',
      COMP_OFF: '#047857',
      HAJJ: '#c2410c',
      BEREAVEMENT: '#5b6270',
      STUDY: '#1d4ed8',
      UNPAID: '#64748b',
    };
    return map[code] ?? '#64748b';
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 4000);
  }
}
