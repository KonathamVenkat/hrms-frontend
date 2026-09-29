import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { Auth } from '../../../core/auth/auth';
import { AuthService } from '../../../core/auth/auth.service';
import {
  NEW_PASSWORD_VALIDATORS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../core/validators/password.validators';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

function differsFromCurrent(group: AbstractControl): ValidationErrors | null {
  const current = group.get('currentPassword')?.value;
  const next = group.get('newPassword')?.value;
  return current && next && current === next ? { sameAsCurrent: true } : null;
}

@Component({
  selector: 'app-change-password',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePassword implements OnInit {
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly minLength = PASSWORD_MIN_LENGTH;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  /** True when the user holds a temporary password and can't use the app until it's replaced. */
  readonly forced = signal(false);

  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', { nonNullable: true, validators: NEW_PASSWORD_VALIDATORS }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [passwordsMatch, differsFromCurrent] },
  );

  ngOnInit(): void {
    this.forced.set(this.auth.getStoredUser()?.mustChangePassword === true);
  }

  newPasswordError(): string {
    const c = this.form.controls.newPassword;
    if (!c.touched || !c.errors) return '';
    if (c.hasError('required')) return this.translate.instant('auth.changePassword.errors.newRequired');
    if (c.hasError('minlength'))
      return this.translate.instant('common.validation.minLength', { count: PASSWORD_MIN_LENGTH });
    if (c.hasError('maxlength'))
      return this.translate.instant('common.validation.maxLength', { count: PASSWORD_MAX_LENGTH });
    return this.translate.instant('auth.changePassword.errors.policy');
  }

  confirmError(): string {
    const c = this.form.controls.confirmPassword;
    if (!c.touched) return '';
    if (c.hasError('required'))
      return this.translate.instant('auth.changePassword.errors.confirmRequired');
    if (this.form.hasError('mismatch'))
      return this.translate.instant('auth.changePassword.errors.mismatch');
    return '';
  }

  sameAsCurrentError(): boolean {
    return this.form.hasError('sameAsCurrent') && this.form.controls.newPassword.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.authService
      .changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          // The backend ended every session, so sign in again with the new password.
          this.auth.clearSession();
          this.snackBar.open(
            this.translate.instant('auth.changePassword.success'),
            this.translate.instant('auth.login.close'),
            { duration: 5000 },
          );
          this.router.navigateByUrl('/auth/login');
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            err.error?.message || this.translate.instant('auth.changePassword.errors.failed'),
          );
        },
      });
  }

  onCancel(): void {
    this.router.navigateByUrl('/app/dashboard');
  }

  onSignOut(): void {
    this.authService.signOut();
  }
}
