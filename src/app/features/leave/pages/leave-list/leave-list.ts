// src/app/features/leave/pages/leave-list/leave-list.ts

import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LeaveRequestService } from '../../services/leave-request.service';
import { LeaveRequest } from '../../models/leave-request.model';
import { Auth } from '../../../../core/auth/auth'; // ✅ correct
import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CdkTrapFocus, AccessibleDialogDirective],
  templateUrl: './leave-list.html',
  styleUrl: './leave-list.css',
})
export class LeaveListPage implements OnInit {
  private leaveSvc = inject(LeaveRequestService);
  private auth = inject(Auth); // ✅ correct
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  leaves = signal<LeaveRequest[]>([]);
  loading = signal(false);
  cancelling = signal<number | null>(null);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Pagination ────────────────────────────────────────────
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = 10;

  // ── Filters ───────────────────────────────────────────────
  filterStatus = signal('');
  filterType = signal('');
  filterYear = signal(new Date().getFullYear());

  // ── Confirm cancel ────────────────────────────────────────
  showConfirm = signal(false);
  confirmItem = signal<LeaveRequest | null>(null);

  // ── Employee ──────────────────────────────────────────────
  employeeId = signal<number>(0);

  // ── Computed ──────────────────────────────────────────────
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
  readonly yearOptions = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  ngOnInit(): void {
    // ✅ Read employeeId from JWT via Auth service
    const user = this.auth.getCurrentUser();
    if (user?.employeeId) this.employeeId.set(user.employeeId);

    this.loadLeaves();
  }

  // ── Load ──────────────────────────────────────────────────
  loadLeaves(): void {
    if (!this.employeeId()) return;
    this.loading.set(true);
    this.error.set(null);

    this.leaveSvc
      .getMyLeaves(this.employeeId(), {
        status: this.filterStatus() || undefined,
        leaveTypeCode: this.filterType() || undefined,
        year: this.filterYear() || undefined,
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
            //this.currentPage.set(res.data.number); // ✅ 'number' not 'page'
            this.currentPage.set(res.data.number ?? res.data.pageNumber ?? 0);
          }
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.list.errors.loadFailed'),
          ),
      });
  }

  // ── Filters ───────────────────────────────────────────────
  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadLeaves();
  }

  clearFilters(): void {
    this.filterStatus.set('');
    this.filterType.set('');
    this.filterYear.set(new Date().getFullYear());
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

  // ── Cancel flow ───────────────────────────────────────────
  openCancel(leave: LeaveRequest): void {
    this.confirmItem.set(leave);
    this.showConfirm.set(true);
  }

  closeConfirm(): void {
    this.showConfirm.set(false);
    this.confirmItem.set(null);
  }

  confirmCancel(): void {
    const leave = this.confirmItem();
    if (!leave) return;

    this.cancelling.set(leave.leaveReqId);
    this.leaveSvc
      .cancelLeave(this.employeeId(), leave.leaveReqId)
      .pipe(finalize(() => this.cancelling.set(null)))
      .subscribe({
        next: () => {
          this.showSuccess(this.translate.instant('leave.list.success.cancelled'));
          this.closeConfirm();
          this.loadLeaves();
        },
        error: (err: any) => {
          this.error.set(
            err?.error?.message || this.translate.instant('leave.list.errors.cancellationFailed'),
          );
          this.closeConfirm();
        },
      });
  }

  applyNewLeave(): void {
    this.router.navigate(['/app/leave/apply']);
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

  canCancel(leave: LeaveRequest): boolean {
    return leave.status === 'PENDING';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
}
