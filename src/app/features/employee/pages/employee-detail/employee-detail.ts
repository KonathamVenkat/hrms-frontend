// src/app/features/employee/pages/employee-detail/employee-detail.ts
import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../../services/employee';
import { JobDetailsComponent } from '../job-details/job-details';
import { EmployeeAddressesComponent } from '../employee-addresses/employee-addresses';
import { EmployeeIdentityComponent } from '../employee-identity/employee-identity';
import { EmployeeDocumentsComponent } from '../employee-documents/employee-documents';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Auth } from '../../../../core/auth/auth';
import { AuthService } from '../../../../core/auth/auth.service';
import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';
import {
  NEW_PASSWORD_VALIDATORS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../../core/validators/password.validators';
import { getHttpErrorMessage } from '../../../../core/utils/http-error-message';

export interface EmployeeDetail {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  firstNameAr: string;
  middleName?: string;
  middleNameAr?: string;
  lastName: string;
  lastNameAr: string;
  fullNameEn: string;
  fullNameAr: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  religion?: string;
  profilePhotoUrl?: string;
  personalEmail: string;
  workEmail: string;
  personalPhone?: string;
  workPhone?: string;
  hireDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  employmentStatus: string;
  employmentType: string;
  isActive: boolean;
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  departmentNameAr?: string;
  designationId?: number;
  designationTitle?: string;
  designationTitleAr?: string;
  designationCode?: string;
  gradeLevel?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule,
    JobDetailsComponent,
    EmployeeAddressesComponent,
    EmployeeIdentityComponent,
    EmployeeDocumentsComponent,
    TranslatePipe,
    ReactiveFormsModule,
    MatSnackBarModule,
    CdkTrapFocus,
    AccessibleDialogDirective,
  ],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.css',
})
export class EmployeeDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);
  private auth = inject(Auth);
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // ── State ─────────────────────────────────────────────────
  employee = signal<EmployeeDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeDetailTab = signal<'profile' | 'job' | 'addresses' | 'identity' | 'documents'>('profile');

  // ── Deactivate / Reactivate (HR_ADMIN only) ────────────────
  isHrAdmin = signal(false);
  showConfirm = signal(false);
  confirmBusy = signal(false);
  confirmError = signal<string | null>(null);

  // ── Reset password (HR_ADMIN only) ─────────────────────────
  showReset = signal(false);
  resetBusy = signal(false);
  resetError = signal<string | null>(null);
  resetShowPassword = signal(false);
  readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  readonly resetForm = new FormGroup({
    temporaryPassword: new FormControl('', {
      nonNullable: true,
      validators: NEW_PASSWORD_VALIDATORS,
    }),
  });

  ngOnInit(): void {
    this.isHrAdmin.set(this.auth.getRole() === 'HR_ADMIN');

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/app/employee/list');
      return;
    }
    this.loadEmployee(+id);
  }

  loadEmployee(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.empService
      .getEmployee(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.employee.set(res.data as unknown as EmployeeDetail);
          } else {
            this.error.set(res.message || 'Failed to load employee.');
          }
        },
        error: (err) => {
          this.error.set(
            getHttpErrorMessage(this.translate, err, {
              404: this.translate.instant('employee.detail.errors.notFound'),
            }),
          );
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────
  goBack(): void {
    this.router.navigateByUrl('/app/employee/list');
  }

  editEmployee(): void {
    this.router.navigate(['/app/employee/edit', this.employee()?.employeeId]);
  }

  // ── Deactivate / Reactivate ─────────────────────────────────
  openConfirm(): void {
    this.confirmError.set(null);
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
  }

  confirmToggle(): void {
    const emp = this.employee();
    if (!emp) return;

    this.confirmBusy.set(true);
    this.confirmError.set(null);

    const request$: Observable<{ success: boolean; message: string }> = emp.isActive
      ? this.empService.deactivateEmployee(emp.employeeId)
      : this.empService.reactivateEmployee(emp.employeeId);

    request$
      .pipe(
        finalize(() => this.confirmBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.showConfirm.set(false);
            this.loadEmployee(emp.employeeId);
          } else {
            this.confirmError.set(res.message || this.translate.instant('common.httpErrors.actionFailed'));
          }
        },
        error: (err) => this.confirmError.set(getHttpErrorMessage(this.translate, err)),
      });
  }

  // ── Reset password ──────────────────────────────────────────
  openReset(): void {
    this.resetForm.reset();
    this.resetError.set(null);
    this.resetShowPassword.set(false);
    this.showReset.set(true);
  }

  cancelReset(): void {
    this.showReset.set(false);
  }

  resetPasswordError(): string {
    const c = this.resetForm.controls.temporaryPassword;
    if (!c.touched || !c.errors) return '';
    if (c.hasError('required')) return this.translate.instant('common.validation.required');
    if (c.hasError('minlength'))
      return this.translate.instant('common.validation.minLength', { count: PASSWORD_MIN_LENGTH });
    if (c.hasError('maxlength'))
      return this.translate.instant('common.validation.maxLength', { count: PASSWORD_MAX_LENGTH });
    return this.translate.instant('auth.changePassword.errors.policy');
  }

  confirmReset(): void {
    const emp = this.employee();
    if (!emp) return;
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.resetBusy.set(true);
    this.resetError.set(null);

    this.authService
      .resetPassword(emp.employeeId, this.resetForm.getRawValue().temporaryPassword)
      .pipe(
        finalize(() => this.resetBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showReset.set(false);
          this.snackBar.open(
            this.translate.instant('employee.detail.resetPassword.success'),
            this.translate.instant('common.close'),
            { duration: 8000 },
          );
        },
        error: (err) => this.resetError.set(getHttpErrorMessage(this.translate, err)),
      });
  }

  // ── Helpers ───────────────────────────────────────────────
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'status-active',
      PROBATION: 'status-probation',
      NOTICE_PERIOD: 'status-notice',
      TERMINATED: 'status-terminated',
      RESIGNED: 'status-terminated',
      RETIRED: 'status-inactive',
      ON_HOLD: 'status-inactive',
    };
    return map[status] ?? 'status-inactive';
  }

  getStatusLabel(status: string): string {
    return status?.replace(/_/g, ' ') ?? '—';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  getValue(val?: string | null): string {
    return val && val.trim() ? val.trim() : '—';
  }
}
