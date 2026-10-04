import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { EmployeeDocumentsComponent } from './employee-documents';
import { EmployeeDocumentService } from '../../services/document.service';
import { EmpDocTypeOption } from '../../models/document.model';

const passport: EmpDocTypeOption = {
  docTypeId: 3,
  docTypeCode: 'PASSPORT',
  docTypeName: 'Passport',
  category: 'IDENTITY',
  hasExpiry: true,
  isActive: true,
  allowedExtensions: 'PDF, jpg',
  maxFileSizeMb: 5,
};

function setup() {
  const docs = {
    getAll: vi.fn(() => of({ success: true, message: '', statusCode: 200, data: [] })),
    getDocumentTypes: vi.fn(() => of({ success: true, message: '', statusCode: 200, data: [passport] })),
  };
  TestBed.configureTestingModule({
    imports: [EmployeeDocumentsComponent],
    providers: [provideTranslateService(), { provide: EmployeeDocumentService, useValue: docs }],
  });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('en', {
    employee: {
      documents: {
        dropzone: {
          hint: '{{types}} — max {{size}} MB',
          hintNoType: 'Choose a document type to see the allowed files',
        },
      },
    },
  });
  translate.use('en');
  const fixture = TestBed.createComponent(EmployeeDocumentsComponent);
  fixture.componentRef.setInput('employeeId', 5);
  fixture.detectChanges();
  return { component: fixture.componentInstance };
}

describe('EmployeeDocumentsComponent upload hint', () => {
  it('asks for a document type until one is chosen, and accepts the app-wide file list meanwhile', () => {
    const { component } = setup();

    expect(component.dropHint()).toBe('Choose a document type to see the allowed files');
    expect(component.fileAccept()).toBe('.pdf,.jpg,.jpeg,.png,.doc,.docx');
  });

  it('shows the real limits of the chosen document type', () => {
    const { component } = setup();

    component.ctrl('docTypeId').setValue(3);

    expect(component.dropHint()).toBe('PDF, JPG — max 5 MB');
    expect(component.fileAccept()).toBe('.pdf,.jpg');
  });
});
