import { Component, OnInit, signal, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../core/components/language-switcher/language-switcher';
import { Auth } from '../../../core/auth/auth';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LanguageSwitcher,
    TranslatePipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private auth = inject(Auth);
  private authService = inject(AuthService);

  // The password is only checked for presence here: the password policy applies when a
  // password is set, not at sign-in, so accounts with older passwords can still get in.
  loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  loading = signal(false);
  hidePassword = signal(true);
  errorMsg = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    if (this.auth.hasValidSession()) {
      this.router.navigateByUrl(this.landingUrl());
    } else {
      // Drops any stale/expired session data (but keeps unrelated keys such as the language)
      this.auth.clearSession();
    }
  }

  get usernameCtrl() {
    return this.loginForm.controls.username;
  }
  get passwordCtrl() {
    return this.loginForm.controls.password;
  }

  getUsernameError(): string {
    if (this.usernameCtrl.hasError('required'))
      return this.translate.instant('auth.login.errors.usernameRequired');
    if (this.usernameCtrl.hasError('minlength'))
      return this.translate.instant('common.validation.minLength', { count: 3 });
    return '';
  }

  getPasswordError(): string {
    if (this.passwordCtrl.hasError('required'))
      return this.translate.instant('auth.login.errors.passwordRequired');
    return '';
  }

  togglePassword(): void {
    this.hidePassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const { username, password } = this.loginForm.getRawValue();

    this.authService
      .login(username.trim(), password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (login) => {
          this.router.navigateByUrl(this.landingUrl());
          this.snackBar.open(
            this.translate.instant('auth.login.welcomeBack', { name: login.user.fullName }),
            this.translate.instant('auth.login.close'),
            { duration: 3000 },
          );
        },
        error: (err: HttpErrorResponse) => {
          this.errorMsg.set(
            err.status === 401
              ? this.translate.instant('auth.login.errors.invalidCredentials')
              : err.status === 0
                ? this.translate.instant('auth.login.errors.cannotReachServer')
                : err.error?.message || this.translate.instant('auth.login.errors.unexpectedError'),
          );
        },
      });
  }

  /** Users holding a temporary password go straight to the change-password page. */
  private landingUrl(): string {
    return this.auth.getStoredUser()?.mustChangePassword
      ? '/auth/change-password'
      : '/app/dashboard';
  }
}
