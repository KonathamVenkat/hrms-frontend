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
import { OfficeLocationService } from '../../services/office-location';
import { OfficeLocation } from '../../models/office-location';

@Component({
  selector: 'app-office-locations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './office-location.html',
  styleUrl: './office-location.css',
})
export class OfficeLocations implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(OfficeLocationService);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  locations = signal<OfficeLocation[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmItem = signal<OfficeLocation | null>(null);
  filterText = signal('');
  filterType = signal('');
  filterActive = signal<'all' | 'active' | 'inactive'>('all');

  readonly locationTypes = ['HEAD_OFFICE', 'BRANCH', 'REMOTE', 'WAREHOUSE', 'SITE'];
  readonly activeCount = computed(() => this.locations().filter((l) => l.isActive).length);

  readonly filtered = computed(() => {
    const text = this.filterText().toLowerCase();
    const type = this.filterType();
    const status = this.filterActive();
    return this.locations().filter((l) => {
      const matchText =
        !text ||
        l.locationName.toLowerCase().includes(text) ||
        l.locationCode.toLowerCase().includes(text) ||
        l.city.toLowerCase().includes(text);
      const matchType = !type || l.locationType === type;
      const matchStatus = status === 'all' ? true : status === 'active' ? l.isActive : !l.isActive;
      return matchText && matchType && matchStatus;
    });
  });

  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadLocations();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      locationCode: [
        '',
        [Validators.required, Validators.maxLength(20), Validators.pattern('^[A-Z0-9_]+$')],
      ],
      locationName: ['', [Validators.required, Validators.maxLength(200)]],
      locationNameAr: ['', [Validators.required, Validators.maxLength(200)]],
      locationType: ['BRANCH', Validators.required],
      addressLine1: ['', [Validators.required, Validators.maxLength(300)]],
      addressLine2: ['', Validators.maxLength(300)],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      stateProvince: ['', Validators.maxLength(100)],
      country: ['Oman', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', Validators.maxLength(20)],
      phone: ['', Validators.maxLength(30)],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      timezone: ['Asia/Muscat', Validators.maxLength(50)],
      latitude: [null],
      longitude: [null],
      sortOrder: [0, Validators.min(0)],
      isActive: [true],
    });
    this.form
      .get('locationCode')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => {
        if (v && v !== v.toUpperCase())
          this.form.get('locationCode')?.setValue(v.toUpperCase(), { emitEvent: false });
      });
  }

  loadLocations(): void {
    this.loading.set(true);
    this.svc
      .getAll()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.locations.set(res.data);
          else this.error.set(res.message);
        },
        error: (err) =>
          this.error.set(
            err?.error?.message || this.translate.instant('admin.officeLocations.errors.loadFailed'),
          ),
      });
  }

  openCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.form.reset({
      locationCode: '',
      locationName: '',
      locationNameAr: '',
      locationType: 'BRANCH',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      country: 'Oman',
      postalCode: '',
      phone: '',
      email: '',
      timezone: 'Asia/Muscat',
      latitude: null,
      longitude: null,
      sortOrder: 0,
      isActive: true,
    });
    this.form.get('locationCode')?.enable();
    this.showModal.set(true);
  }

  openEdit(loc: OfficeLocation): void {
    this.isEditMode.set(true);
    this.editingId.set(loc.locationId);
    this.form.patchValue({ ...loc });
    this.form.get('locationCode')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
    this.form.get('locationCode')?.enable();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      sortOrder: +v.sortOrder,
      latitude: v.latitude ? +v.latitude : undefined,
      longitude: v.longitude ? +v.longitude : undefined,
      addressLine2: v.addressLine2 || undefined,
      stateProvince: v.stateProvince || undefined,
      postalCode: v.postalCode || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
    };

    const call = this.isEditMode()
      ? this.svc.update(this.editingId()!, payload)
      : this.svc.create(payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.translate.instant(
              this.isEditMode() ? 'admin.officeLocations.success.updated' : 'admin.officeLocations.success.created',
              { name: res.data.locationName },
            ),
          );
          this.closeModal();
          this.loadLocations();
        } else this.error.set(res.message);
      },
      error: (err) =>
        this.error.set(
          err.status === 409
            ? err?.error?.message || this.translate.instant('admin.officeLocations.errors.duplicate')
            : err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'),
        ),
    });
  }

  openConfirm(loc: OfficeLocation): void {
    this.confirmItem.set(loc);
    this.showConfirm.set(true);
  }
  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmItem.set(null);
  }

  confirmToggle(): void {
    const loc = this.confirmItem();
    if (!loc) return;
    const call = loc.isActive
      ? this.svc.deactivate(loc.locationId)
      : this.svc.activate(loc.locationId);
    call.subscribe({
      next: () => {
        this.showSuccess(
          this.translate.instant(
            loc.isActive ? 'admin.officeLocations.success.deactivated' : 'admin.officeLocations.success.activated',
            { name: loc.locationName },
          ),
        );
        this.cancelConfirm();
        this.loadLocations();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'));
        this.cancelConfirm();
      },
    });
  }

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
    if (c.errors['email']) return this.translate.instant('common.validation.email');
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
  getTypeBadgeClass(t: string): string {
    const map: Record<string, string> = {
      HEAD_OFFICE: 'type-hq',
      BRANCH: 'type-branch',
      REMOTE: 'type-remote',
      WAREHOUSE: 'type-warehouse',
      SITE: 'type-site',
    };
    return map[t] ?? 'type-branch';
  }
}
