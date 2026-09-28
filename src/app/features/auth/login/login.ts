import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../core/components/language-switcher/language-switcher';

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function storageGet(key: string): string | null {
  return isBrowser ? localStorage.getItem(key) : null;
}
function storageSet(key: string, value: string): void {
  if (isBrowser) localStorage.setItem(key, value);
}
function storageRemove(key: string): void {
  if (isBrowser) localStorage.removeItem(key);
}

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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LanguageSwitcher,
    TranslatePipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  // ✅ Initialize at declaration — template always has a valid FormGroup
  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  loading = signal(false);
  hidePassword = signal(true);
  errorMsg = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    if (isBrowser) {
      const token = storageGet('hrms_access_token');
      const expiry = storageGet('hrms_token_expiry');
      const isValid = token && expiry && Date.now() < parseInt(expiry, 10);

      if (isValid) {
        // ✅ Redirect — loginForm already initialized above so no crash
        this.router.navigateByUrl('/app/dashboard');
        return;
      } else {
        localStorage.clear();
      }
    }
    // ✅ No form initialization needed here anymore
  }

  get usernameCtrl() {
    return this.loginForm.get('username')!;
  }
  get passwordCtrl() {
    return this.loginForm.get('password')!;
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
    if (this.passwordCtrl.hasError('minlength'))
      return this.translate.instant('common.validation.minLength', { count: 6 });
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

    const { username, password } = this.loginForm.value;

    this.http
      .post<any>('http://localhost:8082/api/v1/auth/login', { username, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (err) => {
          if (err.success && err.data) {
            storageSet('hrms_access_token', err.data.accessToken);
            storageSet('hrms_refresh_token', err.data.refreshToken);
            storageSet('hrms_user', JSON.stringify(err.data.user));
            storageSet('hrms_token_expiry', String(Date.now() + err.data.expiresIn * 1000));
            this.router.navigateByUrl('/app/dashboard');
            this.snackBar.open(
              this.translate.instant('auth.login.welcomeBack', {
                name: err.data.user.fullName,
              }),
              this.translate.instant('auth.login.close'),
              { duration: 3000 },
            );
          } else {
            this.errorMsg.set(err.message || this.translate.instant('auth.login.errors.loginFailed'));
          }
        },
        error: (err) => {
          this.errorMsg.set(
            err.status === 401
              ? this.translate.instant('auth.login.errors.invalidCredentials')
              : err.status === 0
                ? this.translate.instant('auth.login.errors.cannotReachServer')
                : err?.error?.message || this.translate.instant('auth.login.errors.unexpectedError'),
          );
        },
      });
  }
}
