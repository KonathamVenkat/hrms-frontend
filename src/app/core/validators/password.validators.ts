import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Mirrors the backend's PasswordPolicy (which stays authoritative): an uppercase letter,
 * a lowercase letter and a digit. Length is checked separately with minLength/maxLength.
 */
export function passwordPolicy(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) return null;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) ? null : { policy: true };
}

/** Validators for any control that holds a NEW password. */
export const NEW_PASSWORD_VALIDATORS: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(PASSWORD_MIN_LENGTH),
  Validators.maxLength(PASSWORD_MAX_LENGTH),
  passwordPolicy,
];
