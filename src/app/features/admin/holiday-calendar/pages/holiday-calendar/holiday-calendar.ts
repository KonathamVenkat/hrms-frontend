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

import { HolidayService } from '../../services/holiday-calendar';
import { Holiday } from '../../models/holiday-calendar';

@Component({
  selector: 'app-holiday-calendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './holiday-calendar.html',
  styleUrl: './holiday-calendar.css',
})
export class HolidayCalendar implements OnInit {
  private fb = inject(FormBuilder);
  private holidayService = inject(HolidayService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  holidays = signal<Holiday[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Year navigation ───────────────────────────────────────
  selectedYear = signal(new Date().getFullYear());
  readonly yearOptions = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - 1 + i, // prev year + 4 future years
  );

  // ── Modal state ───────────────────────────────────────────
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmTarget = signal<Holiday | null>(null);

  // ── Filters ───────────────────────────────────────────────
  filterText = signal('');
  filterType = signal('');
  filterActive = signal<'all' | 'active' | 'inactive'>('all');

  readonly holidayTypes = ['PUBLIC', 'RELIGIOUS', 'OPTIONAL', 'RESTRICTED'];

  // ── Computed lists ────────────────────────────────────────
  readonly filteredHolidays = computed(() => {
    const text = this.filterText().toLowerCase();
    const type = this.filterType();
    const status = this.filterActive();

    return this.holidays().filter((h) => {
      const matchText =
        !text ||
        h.holidayName.toLowerCase().includes(text) ||
        (h.description ?? '').toLowerCase().includes(text);

      const matchType = !type || h.holidayType === type;
      const matchStatus = status === 'all' ? true : status === 'active' ? h.isActive : !h.isActive;

      return matchText && matchType && matchStatus;
    });
  });

  readonly publicCount = computed(
    () => this.holidays().filter((h) => h.holidayType === 'PUBLIC' && h.isActive).length,
  );
  readonly religiousCount = computed(
    () => this.holidays().filter((h) => h.holidayType === 'RELIGIOUS' && h.isActive).length,
  );
  readonly totalActive = computed(() => this.holidays().filter((h) => h.isActive).length);

  // ── Month grouping for calendar-style display ─────────────
  readonly monthGroups = computed(() => {
    const groups: Record<string, Holiday[]> = {};
    this.filteredHolidays().forEach((h) => {
      const month = new Date(h.holidayDate + 'T00:00:00').toLocaleString('en-US', {
        month: 'long',
      });
      if (!groups[month]) groups[month] = [];
      groups[month].push(h);
    });
    return Object.entries(groups).map(([month, items]) => ({ month, items }));
  });

  // ── Form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadHolidays();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      holidayName: ['', [Validators.required, Validators.maxLength(200)]],
      holidayNameAr: ['', [Validators.required, Validators.maxLength(200)]],
      holidayDate: ['', Validators.required],
      holidayType: ['PUBLIC', Validators.required],
      description: ['', Validators.maxLength(500)],
      isRecurring: [false],
      isActive: [true],
    });
  }

  // ── Load ──────────────────────────────────────────────────
  loadHolidays(): void {
    this.loading.set(true);
    this.error.set(null);

    this.holidayService
      .getByYear(this.selectedYear())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.holidays.set(res.data);
          else this.error.set(res.message);
        },
        error: (err) => this.error.set(err?.error?.message || 'Failed to load holidays.'),
      });
  }

  onYearChange(year: number): void {
    this.selectedYear.set(+year);
    this.loadHolidays();
  }

  // ── Modal ─────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.form.reset({
      holidayName: '',
      holidayNameAr: '',
      holidayDate: '',
      holidayType: 'PUBLIC',
      description: '',
      isRecurring: false,
      isActive: true,
    });
    this.showModal.set(true);
  }

  openEdit(h: Holiday): void {
    this.isEditMode.set(true);
    this.editingId.set(h.holidayId);
    this.form.patchValue({
      holidayName: h.holidayName,
      holidayNameAr: h.holidayNameAr,
      holidayDate: h.holidayDate,
      holidayType: h.holidayType,
      description: h.description ?? '',
      isRecurring: h.isRecurring,
      isActive: h.isActive,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
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

    const v = this.form.value;
    const payload = {
      holidayName: v.holidayName.trim(),
      holidayNameAr: v.holidayNameAr.trim(),
      holidayDate: v.holidayDate,
      holidayType: v.holidayType,
      description: v.description || undefined,
      isRecurring: v.isRecurring,
      isActive: v.isActive,
    };

    const call = this.isEditMode()
      ? this.holidayService.update(this.editingId()!, payload)
      : this.holidayService.create(payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.isEditMode()
              ? `"${res.data.holidayName}" updated`
              : `"${res.data.holidayName}" added`,
          );
          this.closeModal();
          this.loadHolidays();
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) =>
        this.error.set(
          err.status === 409
            ? 'A holiday with this name on this date already exists.'
            : err?.error?.message || 'Operation failed.',
        ),
    });
  }

  // ── Toggle confirm ────────────────────────────────────────
  openConfirm(h: Holiday): void {
    this.confirmTarget.set(h);
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmTarget.set(null);
  }

  confirmToggle(): void {
    const h = this.confirmTarget();
    if (!h) return;

    const call = h.isActive
      ? this.holidayService.deactivate(h.holidayId)
      : this.holidayService.activate(h.holidayId);

    call.subscribe({
      next: () => {
        this.showSuccess(
          h.isActive ? `"${h.holidayName}" deactivated` : `"${h.holidayName}" activated`,
        );
        this.cancelConfirm();
        this.loadHolidays();
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
    if (c.errors['maxlength']) return `Max ${c.errors['maxlength'].requiredLength} characters`;
    if (c.errors['pattern']) return 'Invalid format';
    return 'Invalid';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      PUBLIC: 'type-public',
      RELIGIOUS: 'type-religious',
      OPTIONAL: 'type-optional',
      RESTRICTED: 'type-restricted',
    };
    return map[type] ?? 'type-public';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  getDayOfWeek(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return '';
    }
  }
}
