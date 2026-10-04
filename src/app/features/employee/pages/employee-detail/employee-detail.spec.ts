import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { EmployeeDetail } from './employee-detail';
import { EmployeeService } from '../../services/employee';
import { EmployeeDetailData } from '../../models/employee';
import { Auth } from '../../../../core/auth/auth';
import { AuthService } from '../../../../core/auth/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import { OwnPhoto } from '../../../../core/services/own-photo.service';
import { PhotoCache } from '../../../../core/services/photo-cache.service';

const employee = {
  employeeId: 7,
  employeeCode: 'EMP-2026-0007',
  firstName: 'Sara',
  firstNameAr: 'سارة',
  lastName: 'Khan',
  lastNameAr: 'خان',
  fullNameEn: 'Sara Khan',
  fullNameAr: 'سارة خان',
  dateOfBirth: '1990-01-02',
  gender: 'FEMALE',
  personalEmail: 'sara@example.com',
  workEmail: 'sara@company.com',
  hireDate: '2024-03-01',
  employmentStatus: 'ACTIVE',
  employmentType: 'FULL_TIME',
  isActive: true,
} as EmployeeDetailData;

function setup(opts: { self: boolean; role: string; routeId?: string }) {
  const employees = { getEmployee: vi.fn(() => of({ success: true, message: '', statusCode: 200, data: employee })) };
  const ownPhoto = { set: vi.fn(), url: signal<string | undefined>(undefined) };
  const roles = [opts.role];

  TestBed.configureTestingModule({
    imports: [EmployeeDetail],
    providers: [
      provideTranslateService(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            data: opts.self ? { self: true } : {},
            paramMap: convertToParamMap(opts.routeId ? { id: opts.routeId } : {}),
          },
        },
      },
      { provide: EmployeeService, useValue: employees },
      {
        provide: Auth,
        useValue: {
          getRole: () => opts.role,
          getEmployeeId: () => 7,
          hasAnyRole: (...wanted: string[]) => wanted.some((r) => roles.includes(r)),
        },
      },
      { provide: AuthService, useValue: {} },
      { provide: LanguageService, useValue: { direction: signal('ltr'), currentLang: signal('en') } },
      { provide: OwnPhoto, useValue: ownPhoto },
      { provide: PhotoCache, useValue: { load: () => of(null) } },
    ],
  });

  const fixture = TestBed.createComponent(EmployeeDetail);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const tabIds = () => [...el.querySelectorAll('[role=tab]')].map((t) => t.id);
  return { fixture, component: fixture.componentInstance, employees, ownPhoto, el, tabIds };
}

describe('EmployeeDetail as "My profile"', () => {
  it('loads the signed-in user\'s own record, with no HR actions and only the tabs an employee may read', () => {
    const { employees, el, tabIds, component } = setup({ self: true, role: 'EMPLOYEE' });

    expect(employees.getEmployee).toHaveBeenCalledWith(7);
    expect(el.querySelector('.back-btn')).toBeNull();
    expect(el.querySelector('.btn-edit')).toBeNull();
    expect(el.querySelector('.btn-deactivate')).toBeNull();
    expect(tabIds()).toEqual(['detail-tab-profile', 'detail-tab-identity']);
    expect(component.identityReadOnly()).toBe(true);
  });

  it('shows every tab to an HR user viewing their own profile, but still no HR actions', () => {
    const { el, tabIds } = setup({ self: true, role: 'HR_MANAGER' });

    expect(tabIds()).toHaveLength(5);
    expect(el.querySelector('.btn-edit')).toBeNull();
  });

  it('lets an HR_ADMIN change their own identity details', () => {
    const { component } = setup({ self: true, role: 'HR_ADMIN' });

    expect(component.identityReadOnly()).toBe(false);
  });

  it('leaves through the dashboard, because the employee list is HR-only', () => {
    const { component } = setup({ self: true, role: 'EMPLOYEE' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    component.goBack();

    expect(navigate).toHaveBeenCalledWith('/app/dashboard');
  });

  it('updates the toolbar photo when the user changes their own photo', () => {
    const { component, ownPhoto } = setup({ self: true, role: 'EMPLOYEE' });

    component.onPhotoChanged('/api/v1/employees/7/photo?v=9');

    expect(ownPhoto.set).toHaveBeenCalledWith('/api/v1/employees/7/photo?v=9');
  });
});

describe('EmployeeDetail for an HR user opening someone else', () => {
  it('uses the id from the address, keeps the back button and does not touch the toolbar photo', () => {
    const { employees, el, component, ownPhoto } = setup({ self: false, role: 'HR_ADMIN', routeId: '9' });
    employees.getEmployee.mockClear();

    expect(el.querySelector('.back-btn')).not.toBeNull();
    expect(el.querySelector('.btn-edit')).not.toBeNull();

    component.employee.update((e) => (e ? { ...e, employeeId: 9 } : e));
    component.onPhotoChanged('/api/v1/employees/9/photo?v=1');
    expect(ownPhoto.set).not.toHaveBeenCalled();
  });
});
