// src/app/features/employee/pages/employee-detail/employee-detail.ts
import { ChangeDetectionStrategy, Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../../services/employee';
import { EmployeeDetailData } from '../../models/employee';
import { JobDetailsComponent } from '../job-details/job-details';
import { EmployeeAddressesComponent } from '../employee-addresses/employee-addresses';
import { EmployeeIdentityComponent } from '../employee-identity/employee-identity';
import { EmployeePhoto } from '../employee-photo/employee-photo';
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
import { formatDisplayDate } from '../../../../core/utils/display-date';
import { LanguageService } from '../../../../core/services/language.service';

type DetailTab = 'profile' | 'job' | 'addresses' | 'identity' | 'documents';

@Component({
  selector: 'app-employee-detail',
  imports: [
    JobDetailsComponent,
    EmployeeAddressesComponent,
    EmployeeIdentityComponent,
    EmployeeDocumentsComponent,
    EmployeePhoto,
    TranslatePipe,
    ReactiveFormsModule,
    MatSnackBarModule,
    CdkTrapFocus,
    AccessibleDialogDirective,
  ],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private language = inject(LanguageService);

  // ── State ─────────────────────────────────────────────────
  employee = signal<EmployeeDetailData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeDetailTab = signal<DetailTab>('profile');

  readonly tabs: readonly { id: DetailTab; icon: string; labelKey: string }[] = [
    { id: 'profile', icon: 'person', labelKey: 'employee.detail.tabs.profile' },
    { id: 'job', icon: 'work', labelKey: 'employee.detail.tabs.job' },
    { id: 'addresses', icon: 'location_on', labelKey: 'employee.detail.tabs.addresses' },
    { id: 'identity', icon: 'badge', labelKey: 'employee.detail.tabs.identity' },
    { id: 'documents', icon: 'folder', labelKey: 'employee.detail.tabs.documents' },
  ];

  // ── Deactivate / Reactivate (HR_ADMIN only) ────────────────
  isHrAdmin = signal(false);
  showConfirm = signal(false);
  confirmBusy = signal(false);
  confirmError = signal<string | null>(null);
  /** Optional exit status recorded with a deactivation ('' = leave the status as is). */
  exitStatus = signal('');
  readonly exitStatuses = ['TERMINATED', 'RESIGNED', 'RETIRED'];

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
            this.employee.set(res.data);
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

  onPhotoChanged(url: string | undefined): void {
    this.employee.update((e) => (e ? { ...e, profilePhotoUrl: url } : e));
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
    this.exitStatus.set('');
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
      ? this.empService.deactivateEmployee(emp.employeeId, this.exitStatus() || undefined)
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

  /** Arrow keys, Home and End move between tabs (the arrows follow the reading direction). */
  onTabKeydown(event: KeyboardEvent): void {
    const rtl = this.language.direction() === 'rtl';
    const step: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    };
    const current = this.tabs.findIndex((tab) => tab.id === this.activeDetailTab());
    let next: number;
    if (event.key in step) {
      next = (current + step[event.key] + this.tabs.length) % this.tabs.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = this.tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const tab = this.tabs[next];
    this.activeDetailTab.set(tab.id);
    (event.currentTarget as HTMLElement).querySelector<HTMLElement>('#detail-tab-' + tab.id)?.focus();
  }

  formatDate(dateStr?: string): string {
    return formatDisplayDate(dateStr, this.language.currentLang());
  }

  getValue(val?: string | null): string {
    return val && val.trim() ? val.trim() : '—';
  }
}
