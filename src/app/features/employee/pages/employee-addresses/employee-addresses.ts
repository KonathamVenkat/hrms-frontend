import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  signal,
  inject,
  computed,
  DestroyRef,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';
import { AddressService } from '../../services/address.service';
import { EmployeeAddress } from '../../models/address.model';
import { serverMessage } from '../../../../core/utils/http-error-message';
import { timedMessage } from '../../../../core/utils/timed-message';
import { FieldA11yDirective } from '../../../../core/directives/field-a11y.directive';
import { fieldErrorMessage, isFieldInvalid } from '../../../../core/forms/field-errors';

@Component({
  selector: 'app-employee-addresses',
  imports: [ReactiveFormsModule, FieldA11yDirective, TranslatePipe, CdkTrapFocus, AccessibleDialogDirective],
  templateUrl: './employee-addresses.html',
  styleUrl: './employee-addresses.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeAddressesComponent implements OnInit {
  readonly employeeId = input.required<number>();

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
  private readonly showSuccess = timedMessage(this.successMsg, this.destroyRef);
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  private editingVersion = signal<number | undefined>(undefined);
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

  readonly form = this.fb.nonNullable.group({
    addressType: ['', Validators.required],
    addressLine1: ['', [Validators.required, Validators.maxLength(300)]],
    addressLine2: ['', Validators.maxLength(300)],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    stateProvince: ['', Validators.maxLength(100)],
    country: ['South Sudan', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', Validators.maxLength(20)],
    isPrimary: [false],
  });

  ngOnInit(): void {
    this.loadAddresses();
  }

  // ── Load ──────────────────────────────────────────────────
  loadAddresses(): void {
    this.loading.set(true);
    this.addressSvc
      .getAll(this.employeeId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.addresses.set(res.data);
        },
        error: (err: unknown) =>
          this.error.set(
            serverMessage(err) || this.translate.instant('employee.addresses.errors.loadFailed'),
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
      country: 'South Sudan',
      postalCode: '',
      isPrimary: this.activeAddresses().length === 0,
    });
    // Disable already-used types in add mode
    this.form.controls.addressType.enable();
    this.showModal.set(true);
  }

  openEdit(addr: EmployeeAddress): void {
    this.isEditMode.set(true);
    this.editingId.set(addr.employeeAddressesId);
    this.editingVersion.set(addr.version);
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

    const v = this.form.getRawValue();
    const payload = {
      addressType: v.addressType,
      addressLine1: v.addressLine1.trim(),
      addressLine2: v.addressLine2 || undefined,
      city: v.city.trim(),
      stateProvince: v.stateProvince || undefined,
      country: v.country.trim(),
      postalCode: v.postalCode || undefined,
      isPrimary: v.isPrimary,
      version: this.isEditMode() ? this.editingVersion() : undefined,
    };

    const call = this.isEditMode()
      ? this.addressSvc.update(this.employeeId(), this.editingId()!, payload)
      : this.addressSvc.add(this.employeeId(), payload);

    call
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
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

      error: (err: unknown) =>
        this.error.set(serverMessage(err) || this.translate.instant('common.httpErrors.actionFailed')),
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
        ? this.addressSvc.setPrimary(this.employeeId(), addr.employeeAddressesId)
        : this.addressSvc.remove(this.employeeId(), addr.employeeAddressesId);

    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      error: (err: unknown) => {
        this.error.set(serverMessage(err) || this.translate.instant('common.httpErrors.actionFailed'));
        this.cancelConfirm();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  isInvalid(name: string): boolean {
    return isFieldInvalid(this.form.get(name));
  }

  getError(name: string): string {
    return fieldErrorMessage(this.form.get(name), this.translate);
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

}
