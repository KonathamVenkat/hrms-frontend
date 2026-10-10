// src/app/features/leave/pages/leave-apply/leave-apply.ts

import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, filter, finalize, map, merge, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LeaveRequestService } from '../../services/leave-request.service';
import { LeaveBalanceService } from '../../services/leave-balance.service';
import { LeaveBalance } from '../../models/leave-balance.model';
import { Auth } from '../../../../core/auth/auth';

@Component({
  selector: 'app-leave-apply',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './leave-apply.html',
  styleUrl: './leave-apply.css',
})
export class LeaveApplyPage implements OnInit {
  private fb = inject(FormBuilder);
  private leaveSvc = inject(LeaveRequestService);
  private balanceSvc = inject(LeaveBalanceService);
  private auth = inject(Auth);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  balances = signal<LeaveBalance[]>([]);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Employee ──────────────────────────────────────────────
  employeeId = signal<number>(0);
  currentYear = new Date().getFullYear();

  // ── Date signals — updated via valueChanges ───────────────
  // computed() only reacts to signals — form.get().value is NOT a signal
  startDateVal = signal<string>('');
  endDateVal = signal<string>('');
  selectedTypeCode = signal<string>('');
  // Leave days the range costs, asked from the backend so the employee's shift and the public
  // holidays are applied by the one rule that also charges the balance.
  calculatedDays = signal(0);
  daysLoading = signal(false);

  // ── Computed — all depend on signals, so they react correctly
  readonly selectedBalance = computed(() => {
    const code = this.selectedTypeCode();
    return this.balances().find((b) => b.leaveType === code) ?? null;
  });

  // ── Supporting document ───────────────────────────────────
  // File inputs can't bind to a form control, so the chosen file lives in a signal.
  // Mirrors the backend's LeaveAttachmentStorage limits (which stay authoritative).
  attachment = signal<File | null>(null);
  attachmentError = signal<string | null>(null);

  readonly requiresDocument = computed(() => this.selectedBalance()?.requiresDocument === true);

  // Per-leave-type limits configured in admin > leave types (defaults match the backend's).
  readonly attachmentMaxMb = computed(() => this.selectedBalance()?.docMaxFileSizeMb ?? 5);
  readonly attachmentExts = computed(() => {
    const exts = (this.selectedBalance()?.docAllowedExtensions ?? 'pdf,jpg,jpeg,png')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    // jpg and jpeg are the same format (the backend treats them as one)
    if (exts.includes('jpg') || exts.includes('jpeg')) exts.push('jpg', 'jpeg');
    return [...new Set(exts)];
  });
  readonly attachmentTypesLabel = computed(() => this.attachmentExts().join(', ').toUpperCase());
  readonly attachmentAccept = computed(() =>
    this.attachmentExts()
      .map((e) => `.${e}`)
      .join(','),
  );

  readonly isBalanceSufficient = computed(() => {
    const bal = this.selectedBalance();
    const days = this.calculatedDays();
    if (!bal || days <= 0) return true;
    return bal.availableDays >= days;
  });

  readonly daysAfterRequest = computed(() => {
    const bal = this.selectedBalance();
    const days = this.calculatedDays();
    if (!bal) return 0;
    return bal.availableDays - days;
  });

  form!: FormGroup;

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (user?.employeeId) this.employeeId.set(user.employeeId);
    this.buildForm();
    this.loadBalances();
    this.watchDays();
  }

  // Re-asks the backend whenever both dates are set and in order; a newer range cancels an older call.
  private watchDays(): void {
    merge(this.form.get('startDate')!.valueChanges, this.form.get('endDate')!.valueChanges)
      .pipe(
        map(() => this.form.value as { startDate: string; endDate: string }),
        tap(() => this.calculatedDays.set(0)),
        filter(({ startDate, endDate }) => !!startDate && !!endDate && endDate >= startDate),
        tap(() => this.daysLoading.set(true)),
        switchMap(({ startDate, endDate }) =>
          this.leaveSvc
            .getWorkingDays(this.employeeId(), startDate, endDate)
            .pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((res) => {
        this.daysLoading.set(false);
        // On failure the preview stays empty; the backend still charges the right number on submit.
        this.calculatedDays.set(res?.success ? res.data.workingDays : 0);
      });
  }

  private buildForm(): void {
    this.form = this.fb.group(
      {
        leaveTypeCode: ['', Validators.required],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        reason: ['', [Validators.required, Validators.maxLength(500)]],
      },
      { validators: this.dateRangeValidator },
    );

    // ── Wire form valueChanges → signals ──────────────────
    // This is what makes computed() react to date changes
    this.form
      .get('startDate')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => this.startDateVal.set(v ?? ''));

    this.form
      .get('endDate')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => this.endDateVal.set(v ?? ''));

    this.form
      .get('leaveTypeCode')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => this.selectedTypeCode.set(v ?? ''));
  }

  private dateRangeValidator(group: AbstractControl) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && end < start) {
      return { dateRange: 'leave.apply.errors.dateRangeInvalid' };
    }
    return null;
  }

  // ── Load balances ──────────────────────────────────────────
  loadBalances(): void {
    if (!this.employeeId()) return;
    this.loading.set(true);

    this.balanceSvc
      .getEmployeeBalances(this.employeeId(), this.currentYear)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.balances.set(res.data.filter((b) => b.totalDays > 0));
          }
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.apply.errors.loadBalancesFailed'),
          ),
      });
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.daysLoading() && this.calculatedDays() <= 0) {
      this.error.set(this.translate.instant('leave.apply.errors.noWorkingDays'));
      return;
    }

    if (!this.isBalanceSufficient()) {
      this.error.set(this.translate.instant('leave.apply.errors.insufficientBalance'));
      return;
    }

    if (this.requiresDocument() && !this.attachment()) {
      this.attachmentError.set(this.translate.instant('leave.apply.errors.documentRequired'));
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const v = this.form.value;
    this.leaveSvc
      .applyLeave(
        this.employeeId(),
        {
          leaveTypeCode: v.leaveTypeCode,
          startDate: v.startDate,
          endDate: v.endDate,
          reason: v.reason.trim(),
        },
        this.attachment(),
      )
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.successMsg.set(this.translate.instant('leave.apply.success.submitted'));
            setTimeout(() => this.router.navigate(['/app/leave/requests']), 1500);
          } else {
            this.error.set(res.message);
          }
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('leave.apply.errors.submitFailed'),
          ),
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // allow re-selecting the same file after removing it
    this.attachmentError.set(null);
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!this.attachmentExts().includes(ext)) {
      this.attachmentError.set(
        this.translate.instant('leave.apply.errors.fileTypeInvalid', {
          types: this.attachmentTypesLabel(),
        }),
      );
      return;
    }
    if (file.size > this.attachmentMaxMb() * 1024 * 1024) {
      this.attachmentError.set(
        this.translate.instant('leave.apply.errors.fileTooLarge', { size: this.attachmentMaxMb() }),
      );
      return;
    }
    this.attachment.set(file);
  }

  removeAttachment(): void {
    this.attachment.set(null);
    this.attachmentError.set(null);
  }

  onCancel(): void {
    this.router.navigate(['/app/leave/requests']);
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  isInvalid(name: string): boolean {
    const c = this.ctrl(name);
    return c.invalid && c.touched;
  }

  getError(name: string): string {
    const c = this.ctrl(name);
    if (!c.errors || !c.touched) return '';
    if (c.errors['required']) return this.translate.instant('common.validation.required');
    if (c.errors['maxlength'])
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    return this.translate.instant('common.validation.invalid');
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getBalanceBarColor(avail: number, total: number): string {
    const pct = total > 0 ? (avail / total) * 100 : 0;
    if (pct <= 20) return '#be123c';
    if (pct <= 50) return '#92400e';
    return '#0a7466';
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
}
