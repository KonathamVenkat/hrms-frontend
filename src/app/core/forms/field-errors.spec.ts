import { FormControl, ValidatorFn, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { fieldErrorMessage, isFieldInvalid } from './field-errors';

const translate = {
  instant: (key: string, params?: { count?: number }) => (params ? `${key}:${params.count}` : key),
} as unknown as TranslateService;

describe('isFieldInvalid', () => {
  it('needs the control to be invalid and touched', () => {
    const control = new FormControl('', Validators.required);
    expect(isFieldInvalid(control)).toBe(false);
    control.markAsTouched();
    expect(isFieldInvalid(control)).toBe(true);
    control.setValue('x');
    expect(isFieldInvalid(control)).toBe(false);
    expect(isFieldInvalid(null)).toBe(false);
  });
});

describe('fieldErrorMessage', () => {
  it('shows nothing until the control is touched', () => {
    expect(fieldErrorMessage(new FormControl('', Validators.required), translate)).toBe('');
  });

  it('maps the standard validators', () => {
    const touched = (value: string, validator: ValidatorFn) => {
      const control = new FormControl(value, validator);
      control.markAsTouched();
      return control;
    };
    expect(fieldErrorMessage(touched('', Validators.required), translate)).toBe('common.validation.required');
    expect(fieldErrorMessage(touched('x', Validators.email), translate)).toBe('common.validation.email');
    expect(fieldErrorMessage(touched('ab', Validators.minLength(5)), translate)).toBe('common.validation.minLength:5');
    expect(fieldErrorMessage(touched('abcdef', Validators.maxLength(3)), translate)).toBe('common.validation.maxLength:3');
    expect(fieldErrorMessage(touched('a', Validators.pattern(/^\d+$/)), translate)).toBe('common.validation.pattern');
  });

  it('uses a custom error code before falling back to the generic message', () => {
    const control = new FormControl('x', () => ({ hireBeforeBirth: true }));
    control.markAsTouched();
    expect(fieldErrorMessage(control, translate, { hireBeforeBirth: 'employee.form.errors.hireBeforeBirth' })).toBe(
      'employee.form.errors.hireBeforeBirth',
    );
    expect(fieldErrorMessage(control, translate)).toBe('common.validation.invalid');
  });
});
