// src/app/features/employee/pages/employee-form/employee-form.ts
import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EmployeeService } from '../../services/employee';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.css',
})
export class EmployeeForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);

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
  readonly roles = ['HR_ADMIN', 'HR_MANAGER', 'EMPLOYEE'];

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.empId.set(+idParam);
    }

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
      hireDate: ['', Validators.required],
      probationEndDate: [''],
      confirmationDate: [''],
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
    if (c.errors['required']) return 'This field is required';
    if (c.errors['email']) return 'Invalid email format';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters`;
    if (c.errors['maxlength']) return `Maximum ${c.errors['maxlength'].requiredLength} characters`;
    if (c.errors['pattern'])
      return 'Invalid format — letters, numbers, dots, hyphens, underscores only';
    return 'Invalid value';
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

  private submitCreate(v: any): void {
    const payload = {
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
      profilePhotoUrl: v.profilePhotoUrl || undefined,
      personalEmail: v.personalEmail,
      personalPhone: v.personalPhone || undefined,
      workPhone: v.workPhone || undefined,
      hireDate: v.hireDate,
      probationEndDate: v.probationEndDate || undefined,
      confirmationDate: v.confirmationDate || undefined,
      employmentType: v.employmentType,
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
    const msg =
      err.status === 409
        ? err?.error?.message || 'Duplicate email or username.'
        : err.status === 400
          ? err?.error?.message || 'Validation error. Check your inputs.'
          : err.status === 404
            ? 'Employee not found.'
            : err.status === 403
              ? 'Access denied.'
              : err.status === 0
                ? 'Cannot reach server.'
                : err?.error?.message || 'Unexpected error.';
    this.error.set(msg);
  }

  cancel(): void {
    if (this.isEdit() && this.empId()) {
      this.router.navigate(['/app/employee/detail', this.empId()]);
    } else {
      this.router.navigateByUrl('/app/employee/list');
    }
  }
}
