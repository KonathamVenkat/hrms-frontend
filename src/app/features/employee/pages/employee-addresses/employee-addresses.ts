import { Component, OnInit, Input, signal, inject, computed, DestroyRef } from '@angular/core';
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

import { AddressService } from '../../services/address.service';
import { EmployeeAddress } from '../../models/address.model';

@Component({
  selector: 'app-employee-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-addresses.html',
  styleUrl: './employee-addresses.css',
})
export class EmployeeAddressesComponent implements OnInit {
  @Input() employeeId!: number;

  private fb = inject(FormBuilder);
  private addressSvc = inject(AddressService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  addresses = signal<EmployeeAddress[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmItem = signal<EmployeeAddress | null>(null);
  confirmType = signal<'delete' | 'primary'>('delete');

  readonly addressTypes = ['PERMANENT', 'CURRENT', 'EMERGENCY', 'MAILING'];
  readonly usedTypes = computed(() =>
    this.addresses()
      .filter((a) => a.isActive)
      .map((a) => a.addressType),
  );

  readonly activeAddresses = computed(() => this.addresses().filter((a) => a.isActive));
  readonly inactiveAddresses = computed(() => this.addresses().filter((a) => !a.isActive));

  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadAddresses();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      addressType: ['', Validators.required],
      addressLine1: ['', [Validators.required, Validators.maxLength(300)]],
      addressLine2: ['', Validators.maxLength(300)],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      stateProvince: ['', Validators.maxLength(100)],
      country: ['Oman', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', Validators.maxLength(20)],
      isPrimary: [false],
    });
  }

  // ── Load ──────────────────────────────────────────────────
  loadAddresses(): void {
    this.loading.set(true);
    this.addressSvc
      .getAll(this.employeeId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.addresses.set(res.data);
        },
        error: (err: any) =>
          this.error.set(
            err?.error?.message || this.translate.instant('employee.addresses.errors.loadFailed'),
          ),
      });
  }

  // ── Modal ─────────────────────────────────────────────────
  openAdd(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.form.reset({
      addressType: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      country: 'Oman',
      postalCode: '',
      isPrimary: this.activeAddresses().length === 0,
    });
    // Disable already-used types in add mode
    this.form.get('addressType')?.enable();
    this.showModal.set(true);
  }

  openEdit(addr: EmployeeAddress): void {
    this.isEditMode.set(true);
    this.editingId.set(addr.employeeAddressesId);
    this.form.patchValue({
      addressType: addr.addressType,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? '',
      city: addr.city,
      stateProvince: addr.stateProvince ?? '',
      country: addr.country,
      postalCode: addr.postalCode ?? '',
      isPrimary: addr.isPrimary,
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
      addressType: v.addressType,
      addressLine1: v.addressLine1.trim(),
      addressLine2: v.addressLine2 || undefined,
      city: v.city.trim(),
      stateProvince: v.stateProvince || undefined,
      country: v.country.trim(),
      postalCode: v.postalCode || undefined,
      isPrimary: v.isPrimary,
    };

    const call = this.isEditMode()
      ? this.addressSvc.update(this.employeeId, this.editingId()!, payload)
      : this.addressSvc.add(this.employeeId, payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.translate.instant(
              this.isEditMode()
                ? 'employee.addresses.success.updated'
                : 'employee.addresses.success.added',
            ),
          );
          this.closeModal();
          this.loadAddresses();
        } else this.error.set(res.message);
      },

      error: (err: any) =>
        this.error.set(err?.error?.message || this.translate.instant('common.httpErrors.actionFailed')),
    });
  }

  // ── Set primary ───────────────────────────────────────────
  openSetPrimary(addr: EmployeeAddress): void {
    this.confirmItem.set(addr);
    this.confirmType.set('primary');
    this.showConfirm.set(true);
  }

  // ── Delete confirm ────────────────────────────────────────
  openDelete(addr: EmployeeAddress): void {
    this.confirmItem.set(addr);
    this.confirmType.set('delete');
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmItem.set(null);
  }

  confirmAction(): void {
    const addr = this.confirmItem();
    if (!addr) return;

    const call =
      this.confirmType() === 'primary'
        ? this.addressSvc.setPrimary(this.employeeId, addr.employeeAddressesId)
        : this.addressSvc.remove(this.employeeId, addr.employeeAddressesId);

    call.subscribe({
      next: () => {
        this.showSuccess(
          this.translate.instant(
            this.confirmType() === 'primary'
              ? 'employee.addresses.success.setPrimary'
              : 'employee.addresses.success.removed',
            { type: addr.addressType },
          ),
        );
        this.cancelConfirm();
        this.loadAddresses();
      },
      error: (err: any) => {
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
    if (c.errors['maxlength']) {
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    }
    if (c.errors['pattern']) return this.translate.instant('common.validation.pattern');
    return this.translate.instant('common.validation.invalid');
  }

  isTypeUsed(type: string): boolean {
    // In add mode: disable types already active
    if (this.isEditMode()) return false;
    return this.usedTypes().includes(type);
  }

  getTypeBadge(type: string): string {
    const map: Record<string, string> = {
      PERMANENT: 'type-permanent',
      CURRENT: 'type-current',
      EMERGENCY: 'type-emergency',
      MAILING: 'type-mailing',
    };
    return map[type] ?? 'type-current';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      PERMANENT: 'home',
      CURRENT: 'location_on',
      EMERGENCY: 'emergency',
      MAILING: 'mail',
    };
    return map[type] ?? 'location_on';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
}
