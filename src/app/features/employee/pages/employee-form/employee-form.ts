// src/app/features/employee/pages/employee-form/employee-form.ts
import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { EmployeeService } from '../../services/employee';
import {
  CreateEmployeePayload,
  EmployeeDetailData,
  UpdateEmployeePayload,
} from '../../models/employee';
import { Auth } from '../../../../core/auth/auth';
import { getHttpErrorMessage } from '../../../../core/utils/http-error-message';
import {
  NEW_PASSWORD_VALIDATORS,
  PASSWORD_MIN_LENGTH,
} from '../../../../core/validators/password.validators';

/** Personal/employment values shared by the create and update forms. */
type CommonFormValue = {
  firstName: string;
  firstNameAr: string;
  middleName: string;
  middleNameAr: string;
  lastName: string;
  lastNameAr: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  nationality: string;
  religion: string;
  personalEmail: string;
  personalPhone: string;
  workPhone: string;
  hireDate: string;
  probationEndDate: string;
  confirmationDate: string;
  employmentType: string;
};

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.css',
})
export class EmployeeForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);
  private auth = inject(Auth);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  loading = signal(false);
  loadingEmployee = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  isEdit = signal(false);
  empId = signal<number | null>(null);
  hidePassword = signal(true);

  // ── Read-only fields for edit mode display ─────────────────
  employeeCode = signal<string>('');
  workEmailReadOnly = signal<string>('');

  // ── Role: only an HR_ADMIN may assign or change a role (the backend enforces it on
  // both create and update; the form just avoids offering what would be rejected) ────
  isHrAdmin = signal(false);
  /** Edit mode: false when the employee has no linked login, so there is no role to send. */
  hasLogin = signal(true);
  /** Edit mode: the status the employee currently has, kept selectable even if it is an exit status. */
  private loadedStatus = signal<string | null>(null);

  readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  // ── Enum options ──────────────────────────────────────────
  readonly genders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'];
  readonly empTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'];
  // Statuses an employee can be moved between while still employed. Leaving employment
  // (TERMINATED / RESIGNED / RETIRED) is recorded with Deactivate on the detail page, which
  // also revokes the login — the backend rejects it through a plain edit.
  readonly employedStatuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'ON_HOLD'];
  // A brand-new employee can only start as PROBATION or ACTIVE.
  readonly creatableStatuses = ['PROBATION', 'ACTIVE'];
  readonly roles = ['HR_ADMIN', 'HR_MANAGER', 'EMPLOYEE'];

  get statusOptions(): string[] {
    if (!this.isEdit()) return this.creatableStatuses;
    const current = this.loadedStatus();
    return current && !this.employedStatuses.includes(current)
      ? [current, ...this.employedStatuses]
      : this.employedStatuses;
  }

  // ── Cross-field date validators (declared before the form that uses them) ───
  private hireDateValidator = (control: AbstractControl): ValidationErrors | null => {
    const dob = control.parent?.get('dateOfBirth')?.value;
    if (!control.value || !dob) return null;
    return new Date(control.value) < new Date(dob) ? { hireBeforeBirth: true } : null;
  };

  private probationEndValidator = (control: AbstractControl): ValidationErrors | null => {
    const hireDate = control.parent?.get('hireDate')?.value;
    if (!control.value || !hireDate) return null;
    return new Date(control.value) < new Date(hireDate) ? { probationBeforeHire: true } : null;
  };

  private confirmationDateValidator = (control: AbstractControl): ValidationErrors | null => {
    const probationEnd = control.parent?.get('probationEndDate')?.value;
    if (!control.value || !probationEnd) return null;
    return new Date(control.value) < new Date(probationEnd)
      ? { confirmationBeforeProbation: true }
      : null;
  };

  // ── Typed reactive form ────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    // Personal
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    firstNameAr: ['', [Validators.required, Validators.maxLength(200)]],
    middleName: ['', Validators.maxLength(100)],
    middleNameAr: ['', Validators.maxLength(200)],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastNameAr: ['', [Validators.required, Validators.maxLength(200)]],
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
    bloodGroup: [''],
    maritalStatus: [''],
    nationality: [''],
    religion: [''],
    profilePhotoUrl: ['', Validators.maxLength(500)],

    // Contact
    personalEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    personalPhone: ['', Validators.maxLength(30)],
    workPhone: ['', Validators.maxLength(30)],

    // Employment
    hireDate: ['', [Validators.required, this.hireDateValidator]],
    probationEndDate: ['', this.probationEndValidator],
    confirmationDate: ['', this.confirmationDateValidator],
    employmentType: ['FULL_TIME', Validators.required],
    employmentStatus: ['PROBATION', Validators.required],

    // Auth (username/password: create only)
    username: [''],
    password: [''],
    role: ['EMPLOYEE', Validators.required],
  });

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.empId.set(+idParam);
    }

    this.isHrAdmin.set(this.auth.getRole() === 'HR_ADMIN');
    this.configureForMode();

    if (this.isEdit()) {
      this.loadEmployeeForEdit(this.empId()!);
    }
  }

  /** Mode-specific validators/enablement, plus re-validation of the date chain. */
  private configureForMode(): void {
    if (!this.isEdit()) {
      this.ctrl('username').setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9._-]+$'),
      ]);
      // Same rules as change-password / HR reset (the backend's PasswordPolicy is authoritative).
      this.ctrl('password').setValidators(NEW_PASSWORD_VALIDATORS);
      this.ctrl('username').updateValueAndValidity();
      this.ctrl('password').updateValueAndValidity();
    }

    // Only HR_ADMIN may assign or change a role. Disabled controls are left out of
    // form.value but still readable through getRawValue(), so a non-admin creating an
    // employee still submits the fixed EMPLOYEE role.
    if (!this.isHrAdmin()) {
      this.ctrl('role').disable();
    }

    // Cross-field date validators only look at sibling values when they
    // themselves run — re-run the dependent control whenever the one it
    // depends on changes.
    this.ctrl('dateOfBirth')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ctrl('hireDate').updateValueAndValidity());
    this.ctrl('hireDate')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ctrl('probationEndDate').updateValueAndValidity());
    this.ctrl('probationEndDate')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ctrl('confirmationDate').updateValueAndValidity());
  }

  // ── Load employee data for edit mode ──────────────────────
  private loadEmployeeForEdit(id: number): void {
    this.loadingEmployee.set(true);

    this.empService
      .getEmployee(id)
      .pipe(
        finalize(() => this.loadingEmployee.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const e = res.data as unknown as EmployeeDetailData;

            if (!e.isActive) {
              // The backend refuses edits to a deactivated employee; say why up front.
              this.error.set(this.translate.instant('employee.form.errors.inactive'));
            }

            // Store read-only display values
            this.employeeCode.set(e.employeeCode ?? '');
            this.workEmailReadOnly.set(e.workEmail ?? '');
            this.loadedStatus.set(e.employmentStatus ?? null);

            // Patch all editable fields into form
            this.form.patchValue({
              firstName: e.firstName ?? '',
              firstNameAr: e.firstNameAr ?? '',
              middleName: e.middleName ?? '',
              middleNameAr: e.middleNameAr ?? '',
              lastName: e.lastName ?? '',
              lastNameAr: e.lastNameAr ?? '',
              dateOfBirth: e.dateOfBirth ?? '',
              gender: e.gender ?? '',
              bloodGroup: e.bloodGroup ?? '',
              maritalStatus: e.maritalStatus ?? '',
              nationality: e.nationality ?? '',
              religion: e.religion ?? '',
              profilePhotoUrl: e.profilePhotoUrl ?? '',
              personalEmail: e.personalEmail ?? '',
              personalPhone: e.personalPhone ?? '',
              workPhone: e.workPhone ?? '',
              hireDate: e.hireDate ?? '',
              probationEndDate: e.probationEndDate ?? '',
              confirmationDate: e.confirmationDate ?? '',
              employmentType: e.employmentType ?? 'FULL_TIME',
              employmentStatus: e.employmentStatus ?? 'PROBATION',
            });

            // Show the employee's REAL role. Defaulting it (as this form used to) made every
            // HR_ADMIN edit silently demote the employee to EMPLOYEE on save.
            if (e.role) {
              this.ctrl('role').setValue(e.role);
            } else {
              // No linked login → no role to display or send.
              this.hasLogin.set(false);
              this.ctrl('role').disable();
            }
          } else {
            this.error.set(res.message || this.translate.instant('employee.form.errors.loadFailed'));
          }
        },
        error: (err: unknown) =>
          this.error.set(
            getHttpErrorMessage(this.translate, err, {
              404: this.translate.instant('employee.form.errors.notFound'),
            }),
          ),
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
    if (c.errors['email']) return this.translate.instant('common.validation.email');
    if (c.errors['minlength']) {
      return this.translate.instant('common.validation.minLength', {
        count: c.errors['minlength'].requiredLength,
      });
    }
    if (c.errors['maxlength']) {
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    }
    if (c.errors['policy']) return this.translate.instant('auth.changePassword.errors.policy');
    if (c.errors['pattern']) return this.translate.instant('common.validation.pattern');
    if (c.errors['hireBeforeBirth']) {
      return this.translate.instant('employee.form.errors.hireBeforeBirth');
    }
    if (c.errors['probationBeforeHire']) {
      return this.translate.instant('employee.form.errors.probationBeforeHire');
    }
    if (c.errors['confirmationBeforeProbation']) {
      return this.translate.instant('employee.form.errors.confirmationBeforeProbation');
    }
    return this.translate.instant('common.validation.invalid');
  }

  togglePassword(): void {
    this.hidePassword.update((v) => !v);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.translate.instant('employee.form.errors.fixValidation'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.submitUpdate();
    } else {
      this.submitCreate();
    }
  }

  /** Fields shared by both create and update payloads. */
  private buildCommonPayload(v: CommonFormValue): Omit<CreateEmployeePayload, 'username' | 'password' | 'role'> {
    return {
      firstName: v.firstName,
      firstNameAr: v.firstNameAr,
      middleName: v.middleName || undefined,
      middleNameAr: v.middleNameAr || undefined,
      lastName: v.lastName,
      lastNameAr: v.lastNameAr,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      bloodGroup: v.bloodGroup || undefined,
      maritalStatus: v.maritalStatus || undefined,
      nationality: v.nationality || undefined,
      religion: v.religion || undefined,
      personalEmail: v.personalEmail,
      personalPhone: v.personalPhone || undefined,
      workPhone: v.workPhone || undefined,
      hireDate: v.hireDate,
      probationEndDate: v.probationEndDate || undefined,
      confirmationDate: v.confirmationDate || undefined,
      employmentType: v.employmentType,
    };
  }

  private submitCreate(): void {
    // getRawValue so the role of a non-admin (disabled control) is still included.
    const v = this.form.getRawValue();
    const payload: CreateEmployeePayload = {
      ...this.buildCommonPayload(v),
      employmentStatus: v.employmentStatus || 'PROBATION',
      username: v.username,
      password: v.password,
      role: this.isHrAdmin() ? v.role : 'EMPLOYEE',
    };

    this.empService
      .createEmployee(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.success.set(true);
            setTimeout(() => this.router.navigateByUrl('/app/employee/list'), 1500);
          } else {
            this.error.set(res.message || this.translate.instant('employee.form.errors.createFailed'));
          }
        },
        error: (err: unknown) => this.handleError(err),
      });
  }

  private submitUpdate(): void {
    const v = this.form.getRawValue();
    const payload: UpdateEmployeePayload = {
      ...this.buildCommonPayload(v),
      profilePhotoUrl: v.profilePhotoUrl || undefined,
      employmentStatus: v.employmentStatus,
      // Only an HR_ADMIN editing an employee who has a login sends a role at all.
      role: this.isHrAdmin() && this.hasLogin() ? v.role : undefined,
    };

    this.empService
      .updateEmployee(this.empId()!, payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.success.set(true);
            setTimeout(() => this.router.navigate(['/app/employee/detail', this.empId()]), 1500);
          } else {
            this.error.set(res.message || this.translate.instant('employee.form.errors.updateFailed'));
          }
        },
        error: (err: unknown) => this.handleError(err),
      });
  }

  private handleError(err: unknown): void {
    const message = (err as { error?: { message?: string } } | null)?.error?.message;
    this.error.set(
      getHttpErrorMessage(this.translate, err, {
        409: message || this.translate.instant('employee.form.errors.duplicateEmailOrUsername'),
        404: this.translate.instant('employee.form.errors.notFound'),
      }),
    );
  }

  cancel(): void {
    if (this.isEdit() && this.empId()) {
      this.router.navigate(['/app/employee/detail', this.empId()]);
    } else {
      this.router.navigateByUrl('/app/employee/list');
    }
  }
}
