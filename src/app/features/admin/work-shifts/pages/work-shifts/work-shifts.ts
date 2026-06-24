import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WorkShiftService } from '../../services/work-shift';
import { WorkShift } from '../../models/work-shift';

@Component({
  selector: 'app-work-shifts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './work-shifts.html',
  styleUrl: './work-shifts.css',
})
export class WorkShifts implements OnInit {
  private fb = inject(FormBuilder);
  private shiftService = inject(WorkShiftService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  shifts = signal<WorkShift[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Modal ─────────────────────────────────────────────────
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmTarget = signal<WorkShift | null>(null);

  // ── Filters ───────────────────────────────────────────────
  filterText = signal('');
  filterType = signal('');
  filterActive = signal<'all' | 'active' | 'inactive'>('all');

  // ── Options ───────────────────────────────────────────────
  readonly shiftTypes = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'FLEXIBLE', 'SPLIT'];
  readonly allDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  selectedDays = signal<string[]>([]);

  // ── Computed ──────────────────────────────────────────────
  readonly filteredShifts = computed(() => {
    const text = this.filterText().toLowerCase();
    const type = this.filterType();
    const status = this.filterActive();

    return this.shifts().filter((s) => {
      const matchText =
        !text ||
        s.shiftName.toLowerCase().includes(text) ||
        s.shiftCode.toLowerCase().includes(text);
      const matchType = !type || s.shiftType === type;
      const matchStatus = status === 'all' ? true : status === 'active' ? s.isActive : !s.isActive;
      return matchText && matchType && matchStatus;
    });
  });

  readonly activeCount = computed(() => this.shifts().filter((s) => s.isActive).length);

  // ── Form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadShifts();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      shiftCode: [
        '',
        [Validators.required, Validators.maxLength(20), Validators.pattern('^[A-Z0-9_]+$')],
      ],
      shiftName: ['', [Validators.required, Validators.maxLength(100)]],
      shiftNameAr: ['', [Validators.required, Validators.maxLength(200)]],
      shiftType: ['MORNING', Validators.required],
      startTime: ['', [Validators.required, Validators.pattern('^([01]\\d|2[0-3]):([0-5]\\d)$')]],
      endTime: ['', [Validators.required, Validators.pattern('^([01]\\d|2[0-3]):([0-5]\\d)$')]],
      workingHours: [8.0, [Validators.required, Validators.min(0.5), Validators.max(24)]],
      breakDuration: [30, [Validators.min(0), Validators.max(120)]],
      gracePeriod: [15, [Validators.min(0), Validators.max(60)]],
      isOvernight: [false],
      isFlexible: [false],
      description: ['', Validators.maxLength(500)],
      sortOrder: [0, Validators.min(0)],
      isActive: [true],
    });

    // Auto uppercase code
    this.form
      .get('shiftCode')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v && v !== v.toUpperCase()) {
          this.form.get('shiftCode')?.setValue(v.toUpperCase(), { emitEvent: false });
        }
      });
  }

  // ── Load ──────────────────────────────────────────────────
  loadShifts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shiftService
      .getAll()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.shifts.set(res.data);
          else this.error.set(res.message);
        },
        error: (err) => this.error.set(err?.error?.message || 'Failed to load shifts.'),
      });
  }

  // ── Day selection ─────────────────────────────────────────
  toggleDay(day: string): void {
    const days = [...this.selectedDays()];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    // keep original order SUN→SAT
    const ordered = this.allDays.filter((d) => days.includes(d));
    this.selectedDays.set(ordered);
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays().includes(day);
  }

  setPreset(preset: 'sun-thu' | 'mon-fri' | 'all'): void {
    const map: Record<string, string[]> = {
      'sun-thu': ['SUN', 'MON', 'TUE', 'WED', 'THU'],
      'mon-fri': ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      all: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    };
    this.selectedDays.set(map[preset]);
  }

  // ── Modal ─────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.selectedDays.set(['SUN', 'MON', 'TUE', 'WED', 'THU']);
    this.form.reset({
      shiftCode: '',
      shiftName: '',
      shiftNameAr: '',
      shiftType: 'MORNING',
      startTime: '',
      endTime: '',
      workingHours: 8.0,
      breakDuration: 30,
      gracePeriod: 15,
      isOvernight: false,
      isFlexible: false,
      description: '',
      sortOrder: 0,
      isActive: true,
    });
    this.form.get('shiftCode')?.enable();
    this.showModal.set(true);
  }

  openEdit(s: WorkShift): void {
    this.isEditMode.set(true);
    this.editingId.set(s.shiftId);
    this.selectedDays.set(s.workingDays.split(',').map((d) => d.trim()));
    this.form.patchValue({
      shiftCode: s.shiftCode,
      shiftName: s.shiftName,
      shiftNameAr: s.shiftNameAr,
      shiftType: s.shiftType,
      startTime: s.startTime,
      endTime: s.endTime,
      workingHours: s.workingHours,
      breakDuration: s.breakDuration,
      gracePeriod: s.gracePeriod,
      isOvernight: s.isOvernight,
      isFlexible: s.isFlexible,
      description: s.description ?? '',
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    });
    this.form.get('shiftCode')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.get('shiftCode')?.enable();
    this.error.set(null);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.selectedDays().length === 0) {
      this.error.set('Please select at least one working day.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const payload = {
      shiftCode: v.shiftCode,
      shiftName: v.shiftName,
      shiftNameAr: v.shiftNameAr,
      shiftType: v.shiftType,
      startTime: v.startTime,
      endTime: v.endTime,
      workingHours: +v.workingHours,
      breakDuration: +v.breakDuration,
      gracePeriod: +v.gracePeriod,
      workingDays: this.selectedDays().join(','),
      isOvernight: v.isOvernight,
      isFlexible: v.isFlexible,
      description: v.description || undefined,
      sortOrder: +v.sortOrder,
      isActive: v.isActive,
    };

    const call = this.isEditMode()
      ? this.shiftService.update(this.editingId()!, payload)
      : this.shiftService.create(payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.isEditMode()
              ? `"${res.data.shiftName}" updated`
              : `"${res.data.shiftName}" created`,
          );
          this.closeModal();
          this.loadShifts();
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) =>
        this.error.set(
          err.status === 409
            ? err?.error?.message || 'Shift code or name already exists.'
            : err?.error?.message || 'Operation failed.',
        ),
    });
  }

  // ── Confirm toggle ────────────────────────────────────────
  openConfirm(s: WorkShift): void {
    this.confirmTarget.set(s);
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmTarget.set(null);
  }

  confirmToggle(): void {
    const s = this.confirmTarget();
    if (!s) return;
    const call = s.isActive
      ? this.shiftService.deactivate(s.shiftId)
      : this.shiftService.activate(s.shiftId);

    call.subscribe({
      next: () => {
        this.showSuccess(
          s.isActive ? `"${s.shiftName}" deactivated` : `"${s.shiftName}" activated`,
        );
        this.cancelConfirm();
        this.loadShifts();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Toggle failed.');
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
    if (c.errors['required']) return 'Required';
    if (c.errors['min']) return `Min: ${c.errors['min'].min}`;
    if (c.errors['max']) return `Max: ${c.errors['max'].max}`;
    if (c.errors['maxlength']) return `Max ${c.errors['maxlength'].requiredLength} chars`;
    if (c.errors['pattern'])
      return name === 'shiftCode'
        ? 'Uppercase letters, numbers and underscores only'
        : 'Format must be HH:MM (24hr)';
    return 'Invalid';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      MORNING: 'type-morning',
      AFTERNOON: 'type-afternoon',
      EVENING: 'type-evening',
      NIGHT: 'type-night',
      FLEXIBLE: 'type-flexible',
      SPLIT: 'type-split',
    };
    return map[type] ?? 'type-morning';
  }

  formatDays(days: string): string[] {
    return days ? days.split(',') : [];
  }
}
