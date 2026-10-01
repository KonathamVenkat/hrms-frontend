import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldA11yDirective } from './field-a11y.directive';

@Component({
  imports: [ReactiveFormsModule, FieldA11yDirective],
  template: `
    <form [formGroup]="form">
      <input id="name" formControlName="name" />
      <input id="note" formControlName="note" aria-describedby="note-hint" />
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    note: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}

describe('FieldA11yDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = (id: string) => fixture.nativeElement.querySelector('#' + id) as HTMLInputElement;
    return { fixture, name: el('name'), note: el('note'), form: fixture.componentInstance.form };
  }

  it('marks required fields and leaves optional state out of the way', () => {
    const { name } = setup();
    expect(name.getAttribute('aria-required')).toBe('true');
    expect(name.getAttribute('aria-invalid')).toBeNull();
    expect(name.getAttribute('aria-describedby')).toBeNull();
  });

  it('flags an invalid field only after it was touched and points at its error', () => {
    const { fixture, name, form } = setup();
    form.controls.name.markAsTouched();
    fixture.detectChanges();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('fe-name');

    form.controls.name.setValue('Sara');
    fixture.detectChanges();
    expect(name.getAttribute('aria-invalid')).toBeNull();
    expect(name.getAttribute('aria-describedby')).toBeNull();
  });

  it('keeps a description that was already on the field', () => {
    const { fixture, note, form } = setup();
    expect(note.getAttribute('aria-describedby')).toBe('note-hint');
    form.controls.note.markAsTouched();
    fixture.detectChanges();
    expect(note.getAttribute('aria-describedby')).toBe('note-hint fe-note');
  });
});
