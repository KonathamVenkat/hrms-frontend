import { AbstractControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/** True once a control is invalid and has been touched, which is when its error is shown. */
export function isFieldInvalid(control: AbstractControl | null): boolean {
  return !!control && control.invalid && control.touched;
}

/**
 * The message for the first error on a touched control, or '' when there is nothing to show.
 * Standard validators map to `common.validation.*`; `custom` maps any other error code to a
 * translation key (for example a cross-field date rule).
 */
export function fieldErrorMessage(
  control: AbstractControl | null,
  translate: TranslateService,
  custom: Readonly<Record<string, string>> = {},
): string {
  const errors = control?.errors;
  if (!control || !errors || !control.touched) return '';

  if (errors['required']) return translate.instant('common.validation.required');
  if (errors['email']) return translate.instant('common.validation.email');
  if (errors['minlength']) {
    return translate.instant('common.validation.minLength', { count: errors['minlength'].requiredLength });
  }
  if (errors['maxlength']) {
    return translate.instant('common.validation.maxLength', { count: errors['maxlength'].requiredLength });
  }
  if (errors['pattern']) return translate.instant('common.validation.pattern');
  for (const [code, key] of Object.entries(custom)) {
    if (errors[code]) return translate.instant(key);
  }
  return translate.instant('common.validation.invalid');
}
