import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LeaveBalanceService } from '../../services/leave-balance.service';
import { LeaveBalance, InitializationResult } from '../../models/leave-balance.model';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './leave-balance.html',
  styleUrl: './leave-balance.css',
})
export class LeaveBalancePage implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(LeaveBalanceService);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  balances = signal<LeaveBalance[]>([]);
  loading = signal(false);
  initializing = signal(false);
  adjusting = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  initResult = signal<InitializationResult | null>(null);

  // ── View mode ─────────────────────────────────────────────
  activeTab = signal<'overview' | 'initialize' | 'adjust'>('overview');
  selectedYear = signal(new Date().getFullYear());

  readonly yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  // ── Computed stats ────────────────────────────────────────
  readonly totalBalances = computed(() => this.balances().length);
  readonly groupedByLeaveType = computed(() => {
    const groups = new Map<string, LeaveBalance[]>();
    this.balances().forEach((b) => {
      const key = b.leaveType;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    return Array.from(groups.entries()).map(([type, items]) => ({
      leaveType: type,
      leaveTypeName: items[0].leaveTypeName,
      totalEmps: items.length,
      avgAvailable: items.reduce((s, b) => s + b.availableDays, 0) / items.length,
      items,
    }));
  });

  // ── Forms ─────────────────────────────────────────────────
  initForm!: FormGroup;
  adjustForm!: FormGroup;

  // ── Leave types for adjust dropdown ──────────────────────
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
  readonly adjustmentTypes = [
    { value: 'GRANT', labelKey: 'leave.balance.adjType.grant.label', descKey: 'leave.balance.adjType.grant.desc' },
    { value: 'DEDUCT', labelKey: 'leave.balance.adjType.deduct.label', descKey: 'leave.balance.adjType.deduct.desc' },
    { value: 'RESET', labelKey: 'leave.balance.adjType.reset.label', descKey: 'leave.balance.adjType.reset.desc' },
  ];

  ngOnInit(): void {
    this.buildForms();
    this.loadBalances();
  }

  private buildForms(): void {
    this.initForm = this.fb.group({
      year: [this.selectedYear(), [Validators.required, Validators.min(2020)]],
      skipExisting: [true],
      applyCarryForward: [true],
      allEmployees: [true],
    });

    this.adjustForm = this.fb.group({
      employeeId: ['', Validators.required],
      leaveTypeCode: ['', Validators.required],
      year: [this.selectedYear(), [Validators.required, Validators.min(2020)]],
      adjustmentType: ['GRANT', Validators.required],
      days: [1, [Validators.required, Validators.min(0.5), Validators.max(365)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  // ── Load ──────────────────────────────────────────────────
  loadBalances(): void {
    this.loading.set(true);
    this.svc
      .getAllBalancesForYear(this.selectedYear())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.balances.set(res.data);
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.balance.errors.loadFailed'),
          ),
      });
  }

  onYearChange(year: number): void {
    this.selectedYear.set(+year);
    this.loadBalances();
  }

  // ── Initialize ────────────────────────────────────────────
  onInitialize(): void {
    if (this.initForm.invalid) {
      this.initForm.markAllAsTouched();
      return;
    }
    this.initializing.set(true);
    this.error.set(null);
    this.initResult.set(null);

    const v = this.initForm.value;
    const payload = {
      year: +v.year,
      skipExisting: v.skipExisting,
      applyCarryForward: v.applyCarryForward,
      employeeIds: undefined as number[] | undefined,
    };

    this.svc
      .bulkInitialize(payload)
      .pipe(finalize(() => this.initializing.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.initResult.set(res.data);
            this.showSuccess(
              this.translate.instant('leave.balance.initSuccessMsg', {
                count: res.data.initializedCount,
                skipped: res.data.skippedCount,
              }),
            );
            this.loadBalances();
          } else this.error.set(res.message);
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.balance.errors.initFailed'),
          ),
      });
  }

  // ── Adjust ────────────────────────────────────────────────
  onAdjust(): void {
    if (this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      return;
    }
    this.adjusting.set(true);
    this.error.set(null);

    const v = this.adjustForm.value;
    const employeeId = +v.employeeId;

    this.svc
      .adjustBalance(employeeId, {
        leaveTypeCode: v.leaveTypeCode,
        year: +v.year,
        adjustmentType: v.adjustmentType,
        days: +v.days,
        reason: v.reason,
      })
      .pipe(finalize(() => this.adjusting.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const typeLabel = this.translate.instant(
              `leave.balance.adjType.${String(v.adjustmentType).toLowerCase()}.label`,
            );
            this.showSuccess(
              this.translate.instant('leave.balance.adjustSuccessMsg', {
                type: typeLabel,
                days: v.days,
                name: res.data.leaveTypeName,
              }),
            );
            this.adjustForm.reset({
              employeeId: '',
              leaveTypeCode: '',
              year: this.selectedYear(),
              adjustmentType: 'GRANT',
              days: 1,
              reason: '',
            });
            this.loadBalances();
          } else this.error.set(res.message);
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.balance.errors.adjustFailed'),
          ),
      });
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(form: FormGroup, name: string): AbstractControl {
    return form.get(name)!;
  }

  isInvalid(form: FormGroup, name: string): boolean {
    const c = form.get(name)!;
    return c.invalid && c.touched;
  }

  getError(form: FormGroup, name: string): string {
    const c = form.get(name)!;
    if (!c.errors || !c.touched) return '';
    if (c.errors['required']) return this.translate.instant('common.validation.required');
    if (c.errors['min'])
      return this.translate.instant('common.validation.min', { count: c.errors['min'].min });
    if (c.errors['max'])
      return this.translate.instant('common.validation.max', { count: c.errors['max'].max });
    if (c.errors['maxlength'])
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    return this.translate.instant('common.validation.invalid');
  }

  getUsedPercent(b: LeaveBalance): number {
    if (!b.totalDays) return 0;
    return Math.round(((b.usedDays + b.pendingDays) / b.totalDays) * 100);
  }

  getBarColor(percent: number): string {
    if (percent >= 90) return '#e11d48';
    if (percent >= 70) return '#f59e0b';
    return '#13c9b4';
  }

  getTypeColor(leaveType: string): string {
    const map: Record<string, string> = {
      ANNUAL: '#13c9b4',
      SICK: '#e11d48',
      CASUAL: '#f59e0b',
      MATERNITY: '#8b5cf6',
      PATERNITY: '#06b6d4',
      UNPAID: '#64748b',
      COMP_OFF: '#10b981',
      HAJJ: '#f97316',
      BEREAVEMENT: '#94a3b8',
      STUDY: '#3b82f6',
    };
    return map[leaveType] ?? '#64748b';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 4000);
  }
}
