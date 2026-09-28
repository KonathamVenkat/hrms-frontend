// src/app/features/employee/pages/employee-form/employee-form.ts
import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
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
import { Auth } from '../../../../core/auth/auth';
import { getHttpErrorMessage } from '../../../../core/utils/http-error-message';

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
  form!: FormGroup;
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

  // ── Role field is admin-only when editing an existing employee ────
  // (backend rejects a role change on PUT unless the caller is HR_ADMIN)
  isHrAdmin = signal(false);

  // ── Enum options ──────────────────────────────────────────
  readonly genders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'];
  readonly empTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'];
  readonly empStatuses = [
    'ACTIVE',
    'PROBATION',
    'NOTICE_PERIOD',
    'TERMINATED',
    'RESIGNED',
    'RETIRED',
    'ON_HOLD',
  ];
  // A brand-new employee can only start as PROBATION or ACTIVE — the rest of
  // the lifecycle (NOTICE_PERIOD, TERMINATED, etc.) only makes sense once an
  // employee already exists, and is only reachable via editing an existing one.
  readonly creatableStatuses = ['PROBATION', 'ACTIVE'];
  readonly roles = ['HR_ADMIN', 'HR_MANAGER', 'EMPLOYEE'];

  get statusOptions(): string[] {
    return this.isEdit() ? this.empStatuses : this.creatableStatuses;
  }

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.empId.set(+idParam);
    }

    this.isHrAdmin.set(this.auth.getRole() === 'HR_ADMIN');

    this.buildForm();

    if (this.isEdit()) {
      this.loadEmployeeForEdit(this.empId()!);
    }
  }

  // ── Build reactive form ────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
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
      profilePhotoUrl: [''],

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

      // Auth (create only — hidden in edit)
      username: [''],
      password: [''],
      role: ['EMPLOYEE', Validators.required],
    });

    // Apply validators for create mode
    if (!this.isEdit()) {
      this.ctrl('username').setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9._-]+$'),
      ]);
      this.ctrl('password').setValidators([Validators.required, Validators.minLength(8)]);
      this.ctrl('username').updateValueAndValidity();
      this.ctrl('password').updateValueAndValidity();
    }

    // Only HR_ADMIN may change an existing employee's role — matches the
    // backend, which rejects a role change on PUT from any other role.
    if (this.isEdit() && !this.isHrAdmin()) {
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

  // ── Cross-field date validators ────────────────────────────
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
            const e = res.data as any;

            // Store read-only display values
            this.employeeCode.set(e.employeeCode ?? '');
            this.workEmailReadOnly.set(e.workEmail ?? '');

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
              role: e.role ?? 'EMPLOYEE',
            });
          } else {
            this.error.set(res.message || 'Failed to load employee data.');
          }
        },
        error: () => this.error.set('Failed to load employee. Please try again.'),
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
      this.error.set('Please fix validation errors before submitting.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const v = this.form.value;

    if (this.isEdit()) {
      this.submitUpdate(v);
    } else {
      this.submitCreate(v);
    }
  }

  /** Fields shared by both create and update payloads. */
  private buildCommonPayload(v: any) {
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

  private submitCreate(v: any): void {
    const payload = {
      ...this.buildCommonPayload(v),
      employmentStatus: v.employmentStatus || 'PROBATION',
      username: v.username,
      password: v.password,
      role: v.role,
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
            this.error.set(res.message || 'Failed to create employee.');
          }
        },
        error: (err) => this.handleError(err),
      });
  }

  private submitUpdate(v: any): void {
    const payload = {
      ...this.buildCommonPayload(v),
      profilePhotoUrl: v.profilePhotoUrl || undefined,
      employmentStatus: v.employmentStatus,
      role: v.role,
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
            this.error.set(res.message || 'Failed to update employee.');
          }
        },
        error: (err) => this.handleError(err),
      });
  }

  private handleError(err: any): void {
    this.error.set(
      getHttpErrorMessage(this.translate, err, {
        409: err?.error?.message || this.translate.instant('employee.form.errors.duplicateEmailOrUsername'),
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
