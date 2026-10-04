import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  input,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IdentityService } from '../../services/identity.service';
import { IdentityInfo } from '../../models/identity.model';
import { formatDisplayDate } from '../../../../core/utils/display-date';
import { serverMessage } from '../../../../core/utils/http-error-message';
import { timedMessage } from '../../../../core/utils/timed-message';
import { LanguageService } from '../../../../core/services/language.service';
import { FieldA11yDirective } from '../../../../core/directives/field-a11y.directive';

@Component({
  selector: 'app-employee-identity',
  imports: [ReactiveFormsModule, FieldA11yDirective, TranslatePipe],
  templateUrl: './employee-identity.html',
  styleUrl: './employee-identity.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeIdentityComponent implements OnInit {
  readonly employeeId = input.required<number>();
  /** True when the viewer may see the identity details but not change them (own record, not HR_ADMIN). */
  readonly readOnly = input(false);

  private fb = inject(FormBuilder);
  private identitySvc = inject(IdentityService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  // ── State ─────────────────────────────────────────────────
  identity = signal<IdentityInfo | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  private readonly showSuccess = timedMessage(this.successMsg, this.destroyRef);
  editMode = signal(false);
  hasData = signal(false);
  // The backend masks identity numbers for everyone except HR_ADMIN and the employee themself.
  isMasked = computed(() => this.identity()?.masked === true);
  /** Edit and add controls show only for a viewer who sees real values and may change them. */
  canEdit = computed(() => !this.isMasked() && !this.readOnly());

  // ── PII masking ─────────────────────────────────────────────
  // National ID / SSN / Biometric ID are masked by default in both view and
  // edit mode; each has its own reveal toggle (same pattern as a password field).
  private readonly maskedFields = ['nationalId', 'socialSecurityNumber', 'biometricId'] as const;
  private revealed = signal<ReadonlySet<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    // National Identity
    nationalId: [''],
    // Passport
    passportNumber: [''],
    // Tax & Social Security
    taxId: [''],
    socialSecurityNumber: [''],
    // Driving License
    drivingLicenseNumber: [''],
    // Visa
    visaNumber: [''],
    visaType: [''],
    visaIssueDate: [''],
    visaExpiryDate: [''],
    // Work Permit
    workPermitNumber: [''],
    workPermitExpiry: [''],
    // Biometric
    biometricId: [''],
  });

  ngOnInit(): void {
    this.loadIdentity();
  }

  // ── Load ──────────────────────────────────────────────────
  loadIdentity(): void {
    this.loading.set(true);
    this.error.set(null);

    this.identitySvc
      .get(this.employeeId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.identity.set(res.data);
            // Has data if at least one field is filled
            this.hasData.set(!!res.data?.employeeIdentityId);
          }
        },
        error: (err: unknown) =>
          this.error.set(
            serverMessage(err) || this.translate.instant('employee.identity.errors.loadFailed'),
          ),
      });
  }

  // ── Open edit ─────────────────────────────────────────────
  openEdit(): void {
    if (!this.canEdit()) return;
    const info = this.identity();
    this.form.patchValue({
      nationalId: info?.nationalId ?? '',
      passportNumber: info?.passportNumber ?? '',
      taxId: info?.taxId ?? '',
      socialSecurityNumber: info?.socialSecurityNumber ?? '',
      drivingLicenseNumber: info?.drivingLicenseNumber ?? '',
      visaNumber: info?.visaNumber ?? '',
      visaType: info?.visaType ?? '',
      visaIssueDate: info?.visaIssueDate ?? '',
      visaExpiryDate: info?.visaExpiryDate ?? '',
      workPermitNumber: info?.workPermitNumber ?? '',
      workPermitExpiry: info?.workPermitExpiry ?? '',
      biometricId: info?.biometricId ?? '',
    });
    this.error.set(null);
    this.revealed.set(new Set());
    this.editMode.set(true);
    this.focusAfterRender('#id-national-id');
  }

  cancelEdit(): void {
    this.editMode.set(false);
    this.focusAfterRender('.btn-edit-info');
    this.error.set(null);
    this.revealed.set(new Set());
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const payload = {
      nationalId: v.nationalId || undefined,
      passportNumber: v.passportNumber || undefined,
      taxId: v.taxId || undefined,
      socialSecurityNumber: v.socialSecurityNumber || undefined,
      drivingLicenseNumber: v.drivingLicenseNumber || undefined,
      visaNumber: v.visaNumber || undefined,
      visaType: v.visaType || undefined,
      visaIssueDate: v.visaIssueDate || undefined,
      visaExpiryDate: v.visaExpiryDate || undefined,
      workPermitNumber: v.workPermitNumber || undefined,
      workPermitExpiry: v.workPermitExpiry || undefined,
      biometricId: v.biometricId || undefined,
    };

    this.identitySvc
      .save(this.employeeId(), payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.identity.set(res.data);
            this.hasData.set(true);
            this.editMode.set(false);
            this.focusAfterRender('.btn-edit-info');
            this.revealed.set(new Set());
            this.showSuccess(this.translate.instant('employee.identity.success.saved'));
          } else {
            this.error.set(res.message);
          }
        },
        error: (err: unknown) =>
          this.error.set(
            serverMessage(err) || this.translate.instant('employee.identity.errors.saveFailed'),
          ),
      });
  }

  /** The control that had focus is removed when the mode switches; move focus to the new view. */
  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  isExpiringSoon(flag?: boolean): boolean {
    return flag === true;
  }

  formatDate(dateStr?: string): string {
    return formatDisplayDate(dateStr, this.language.currentLang());
  }

  getValue(val?: string): string {
    return val && val.trim() ? val.trim() : '—';
  }

  // ── PII masking ─────────────────────────────────────────────
  isRevealed(field: string): boolean {
    return this.revealed().has(field);
  }

  toggleReveal(field: string): void {
    const next = new Set(this.revealed());
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    this.revealed.set(next);
  }

  /** View-mode display: masked unless the viewer has revealed this field. */
  displayValue(val: string | undefined | null, field: string): string {
    if (!val || !val.trim()) return '—';
    if (this.isMasked()) return val.trim();
    return this.isRevealed(field) ? val.trim() : this.maskValue(val.trim());
  }

  /** Input type for edit-mode masked fields — 'password' until revealed. */
  inputType(field: string): 'text' | 'password' {
    return this.isRevealed(field) ? 'text' : 'password';
  }

  private maskValue(val: string): string {
    if (val.length <= 4) return '•'.repeat(val.length);
    const dotCount = Math.min(val.length - 4, 8);
    return '•'.repeat(dotCount) + val.slice(-4);
  }
}
