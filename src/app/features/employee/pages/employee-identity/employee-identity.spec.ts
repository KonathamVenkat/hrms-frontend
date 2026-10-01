import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { EmployeeIdentityComponent } from './employee-identity';
import { IdentityService } from '../../services/identity.service';
import { IdentityInfo } from '../../models/identity.model';

function setup(identity: IdentityInfo) {
  const identityService = {
    get: vi.fn(() => of({ success: true, message: '', statusCode: 200, data: identity })),
    save: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [EmployeeIdentityComponent],
    providers: [provideTranslateService(), { provide: IdentityService, useValue: identityService }],
  });

  const fixture = TestBed.createComponent(EmployeeIdentityComponent);
  fixture.componentRef.setInput('employeeId', identity.employeeId);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('EmployeeIdentityComponent masking', () => {
  const masked: IdentityInfo = {
    employeeIdentityId: 1,
    employeeId: 5,
    nationalId: '*****6789',
    biometricId: '*IO12',
    masked: true,
  };

  it('shows the server-masked values as they are and hides reveal and edit controls', () => {
    const { component, el } = setup(masked);

    expect(component.isMasked()).toBe(true);
    expect(component.displayValue(masked.nationalId, 'nationalId')).toBe('*****6789');
    expect(el.querySelector('.pii-toggle')).toBeNull();
    expect(el.querySelector('.btn-edit-info')).toBeNull();
    expect(el.querySelector('.alert-info')).not.toBeNull();
  });

  it('does not open the edit form for a masked view', () => {
    const { component } = setup(masked);

    component.openEdit();

    expect(component.editMode()).toBe(false);
  });

  it('keeps reveal and edit controls for a viewer who gets the real values', () => {
    const real: IdentityInfo = { ...masked, nationalId: '123456789', biometricId: 'BIO12', masked: false };
    const { component, el } = setup(real);

    expect(component.isMasked()).toBe(false);
    expect(el.querySelector('.pii-toggle')).not.toBeNull();
    expect(el.querySelector('.btn-edit-info')).not.toBeNull();
    expect(el.querySelector('.alert-info')).toBeNull();
    // Client-side dotted masking still applies until the viewer reveals the value.
    expect(component.displayValue('123456789', 'nationalId')).toBe('•••••6789');
  });
});
