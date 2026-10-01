import { Directive, ElementRef, inject } from '@angular/core';
import { NgControl, Validators } from '@angular/forms';

/**
 * Gives every reactive-form field the ARIA state a screen reader needs, without repeating
 * attributes on each input:
 * - `aria-required` when the control has the required validator;
 * - `aria-invalid` once the control is invalid and has been touched (the same moment the visible
 *   error appears);
 * - `aria-describedby` pointing at the error message, whose element must have the id
 *   `fe-<controlName>` (any description already set on the field is kept).
 */
@Directive({
  selector: 'input[formControlName], select[formControlName], textarea[formControlName]',
  host: {
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'showsError() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class FieldA11yDirective {
  private readonly ngControl = inject(NgControl, { self: true });
  private readonly existingDescription: string | null;

  constructor() {
    this.existingDescription = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.getAttribute(
      'aria-describedby',
    );
  }

  protected required(): boolean {
    return this.ngControl.control?.hasValidator(Validators.required) ?? false;
  }

  protected showsError(): boolean {
    const control = this.ngControl.control;
    return !!control && control.invalid && control.touched;
  }

  protected describedBy(): string | null {
    const ids = [this.existingDescription, this.showsError() ? `fe-${this.ngControl.name}` : null];
    const joined = ids.filter((id): id is string => !!id).join(' ');
    return joined || null;
  }
}
