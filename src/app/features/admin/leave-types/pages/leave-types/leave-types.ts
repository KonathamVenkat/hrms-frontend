import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LeaveTypeService } from '../../services/leave-types';
import { LeaveType } from '../../models/leave-type';
import { AccessibleDialogDirective } from '../../../../../core/directives/accessible-dialog.directive';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, CdkTrapFocus, AccessibleDialogDirective],
  templateUrl: './leave-types.html',
  styleUrl: './leave-types.css',
})
export class LeaveTypes implements OnInit {
  private fb = inject(FormBuilder);
  private ltService = inject(LeaveTypeService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  leaveTypes = signal<LeaveType[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Modal state ───────────────────────────────────────────
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmTarget = signal<LeaveType | null>(null);

  // ── Filter ────────────────────────────────────────────────
  filterText = signal('');
  filterActive = signal<'all' | 'active' | 'inactive'>('all');

  readonly genderOptions = ['ALL', 'MALE', 'FEMALE'];

  // ── Computed: filtered list ────────────────────────────────
  readonly filteredTypes = computed(() => {
    const text = this.filterText().toLowerCase();
    const status = this.filterActive();

    return this.leaveTypes().filter((lt) => {
      const matchText =
        !text ||
        lt.nameEn.toLowerCase().includes(text) ||
        lt.code.toLowerCase().includes(text) ||
        (lt.description ?? '').toLowerCase().includes(text);

      const matchStatus =
        status === 'all' ? true : status === 'active' ? lt.isActive : !lt.isActive;

      return matchText && matchStatus;
    });
  });

  readonly activeCount = computed(() => this.leaveTypes().filter((lt) => lt.isActive).length);
  readonly inactiveCount = computed(() => this.leaveTypes().filter((lt) => !lt.isActive).length);

  // ── Form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadLeaveTypes();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      code: [
        '',
        [Validators.required, Validators.maxLength(30), Validators.pattern('^[A-Z0-9_]+$')],
      ],
      nameEn: ['', [Validators.required, Validators.maxLength(100)]],
      nameAr: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(500)],
      defaultDays: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
      isPaid: [true, Validators.required],
      isCarryForward: [false],
      maxCarryDays: [0, [Validators.min(0)]],
      requiresDocument: [false],
      minNoticeDays: [0, [Validators.min(0)]],
      maxConsecutiveDays: [0, [Validators.min(0)]],
      applicableGender: ['ALL', Validators.required],
      sortOrder: [0, [Validators.min(0)]],
      isActive: [true],
    });

    // Auto uppercase code field
    this.form
      .get('code')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v && v !== v.toUpperCase()) {
          this.form.get('code')?.setValue(v.toUpperCase(), { emitEvent: false });
        }
      });
  }

  // ── Load ──────────────────────────────────────────────────
  loadLeaveTypes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ltService
      .getAll()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.leaveTypes.set(res.data);
          else this.error.set(res.message);
        },
        error: (err) =>
          this.error.set(
            err?.error?.message || this.translate.instant('admin.leaveTypes.errors.loadFailed'),
          ),
      });
  }

  // ── Modal open/close ──────────────────────────────────────
  openCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.form.reset({
      code: '',
      nameEn: '',
      nameAr: '',
      description: '',
      defaultDays: 0,
      isPaid: true,
      isCarryForward: false,
      maxCarryDays: 0,
      requiresDocument: false,
      minNoticeDays: 0,
      maxConsecutiveDays: 0,
      applicableGender: 'ALL',
      sortOrder: 0,
      isActive: true,
    });
    this.showModal.set(true);
  }

  openEdit(lt: LeaveType): void {
    this.isEditMode.set(true);
    this.editingId.set(lt.leaveTypeId);
    this.form.patchValue({
      code: lt.code,
      nameEn: lt.nameEn,
      nameAr: lt.nameAr,
      description: lt.description ?? '',
      defaultDays: lt.defaultDays,
      isPaid: lt.isPaid,
      isCarryForward: lt.isCarryForward,
      maxCarryDays: lt.maxCarryDays,
      requiresDocument: lt.requiresDocument,
      minNoticeDays: lt.minNoticeDays,
      maxConsecutiveDays: lt.maxConsecutiveDays,
      applicableGender: lt.applicableGender,
      sortOrder: lt.sortOrder,
      isActive: lt.isActive,
    });
    // Code cannot be changed after creation
    this.form.get('code')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.get('code')?.enable();
    this.error.set(null);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const payload = {
      code: v.code,
      nameEn: v.nameEn,
      nameAr: v.nameAr,
      description: v.description || undefined,
      defaultDays: +v.defaultDays,
      isPaid: v.isPaid,
      isCarryForward: v.isCarryForward,
      maxCarryDays: +v.maxCarryDays,
      requiresDocument: v.requiresDocument,
      minNoticeDays: +v.minNoticeDays,
      maxConsecutiveDays: +v.maxConsecutiveDays,
      applicableGender: v.applicableGender,
      sortOrder: +v.sortOrder,
      isActive: v.isActive,
    };

    const call = this.isEditMode()
      ? this.ltService.update(this.editingId()!, payload)
      : this.ltService.create(payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.translate.instant(
              this.isEditMode() ? 'admin.leaveTypes.success.updated' : 'admin.leaveTypes.success.created',
              { name: res.data.nameEn },
            ),
          );
          this.closeModal();
          this.loadLeaveTypes();
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) =>
        this.error.set(
          err.status === 409
            ? err?.error?.message || this.translate.instant('admin.leaveTypes.errors.duplicate')
            : err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'),
        ),
    });
  }

  // ── Toggle active/inactive ────────────────────────────────
  openConfirm(lt: LeaveType): void {
    this.confirmTarget.set(lt);
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmTarget.set(null);
  }

  confirmToggle(): void {
    const lt = this.confirmTarget();
    if (!lt) return;

    const call = lt.isActive
      ? this.ltService.deactivate(lt.leaveTypeId)
      : this.ltService.activate(lt.leaveTypeId);

    call.subscribe({
      next: () => {
        this.showSuccess(
          this.translate.instant(
            lt.isActive ? 'admin.leaveTypes.success.deactivated' : 'admin.leaveTypes.success.activated',
            { name: lt.nameEn },
          ),
        );
        this.cancelConfirm();
        this.loadLeaveTypes();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'));
        this.cancelConfirm();
      },
    });
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
    if (c.errors['min']) return this.translate.instant('common.validation.min', { count: c.errors['min'].min });
    if (c.errors['max']) return this.translate.instant('common.validation.max', { count: c.errors['max'].max });
    if (c.errors['maxlength']) {
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    }
    if (c.errors['pattern']) return this.translate.instant('admin.workShifts.errors.patternCode');
    return this.translate.instant('common.validation.invalid');
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  getGenderBadge(g: string): string {
    return g === 'ALL' ? 'badge-all' : g === 'MALE' ? 'badge-male' : 'badge-female';
  }
}
