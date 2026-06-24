import { Component, OnInit, Input, signal, inject, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IdentityService } from '../../services/identity.service';
import { IdentityInfo } from '../../models/identity.model';

@Component({
  selector: 'app-employee-identity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-identity.html',
  styleUrl: './employee-identity.css',
})
export class EmployeeIdentityComponent implements OnInit {
  @Input() employeeId!: number;

  private fb = inject(FormBuilder);
  private identitySvc = inject(IdentityService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  identity = signal<IdentityInfo | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  editMode = signal(false);
  hasData = signal(false);

  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadIdentity();
  }

  private buildForm(): void {
    this.form = this.fb.group({
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
  }

  // ── Load ──────────────────────────────────────────────────
  loadIdentity(): void {
    this.loading.set(true);
    this.error.set(null);

    this.identitySvc
      .get(this.employeeId)
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
        error: (err: any) => this.error.set(err?.error?.message || 'Failed to load identity info.'),
      });
  }

  // ── Open edit ─────────────────────────────────────────────
  openEdit(): void {
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
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
    this.error.set(null);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.value;
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
      .save(this.employeeId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.identity.set(res.data);
            this.hasData.set(true);
            this.editMode.set(false);
            this.showSuccess('Identity information saved successfully');
          } else {
            this.error.set(res.message);
          }
        },
        error: (err: any) => this.error.set(err?.error?.message || 'Failed to save identity info.'),
      });
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  isExpiringSoon(flag?: boolean): boolean {
    return flag === true;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  getValue(val?: string): string {
    return val && val.trim() ? val.trim() : '—';
  }
}
