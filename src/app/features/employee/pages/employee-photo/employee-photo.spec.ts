import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { EmployeePhoto } from './employee-photo';
import { EmployeePhotoService } from '../../services/photo.service';

const PHOTO_PATH = '/api/v1/employees/5/photo';

function chosen(file: File): Event {
  return { target: { files: [file], value: 'x' } } as unknown as Event;
}

function setup(inputs: { photoUrl?: string; canEdit?: boolean } = {}) {
  const photos = {
    maxBytes: 2 * 1024 * 1024,
    download: vi.fn(() => of(new Blob(['img'], { type: 'image/png' }))),
    upload: vi.fn(() =>
      of({ success: true, message: '', statusCode: 200, data: { id: 5, profilePhotoUrl: PHOTO_PATH } }),
    ),
    remove: vi.fn(() => of({ success: true, message: '', statusCode: 200, data: { id: 5 } })),
  };

  TestBed.configureTestingModule({
    imports: [EmployeePhoto],
    providers: [provideTranslateService(), { provide: EmployeePhotoService, useValue: photos }],
  });

  const fixture = TestBed.createComponent(EmployeePhoto);
  fixture.componentRef.setInput('employeeId', 5);
  fixture.componentRef.setInput('name', 'Sara Khan');
  fixture.componentRef.setInput('photoUrl', inputs.photoUrl);
  fixture.componentRef.setInput('canEdit', inputs.canEdit ?? true);
  fixture.detectChanges();

  const component = fixture.componentInstance;
  const changed = vi.fn();
  component.photoChanged.subscribe(changed);
  return { fixture, component, photos, changed, el: fixture.nativeElement as HTMLElement };
}

describe('EmployeePhoto', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows the initials when there is no photo', () => {
    const { component, el } = setup();

    expect(component.initials()).toBe('SK');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.avatar-text')?.textContent).toContain('SK');
  });

  it('uses an http(s) photo URL directly, without a download', () => {
    const { photos, el } = setup({ photoUrl: 'https://cdn.example.com/a.png' });

    expect(photos.download).not.toHaveBeenCalled();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.com/a.png');
  });

  it('fetches an uploaded photo through the session and shows it from an object URL', () => {
    const { photos, el } = setup({ photoUrl: PHOTO_PATH });

    expect(photos.download).toHaveBeenCalledWith(PHOTO_PATH);
    expect(el.querySelector('img')?.getAttribute('src')).toBe('blob:photo');
  });

  it('falls back to the initials when the photo cannot be fetched', () => {
    const { photos, el, fixture } = setup();
    photos.download.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));

    fixture.componentRef.setInput('photoUrl', PHOTO_PATH);
    fixture.detectChanges();

    expect(el.querySelector('img')).toBeNull();
  });

  it('hides the controls from a viewer who cannot edit', () => {
    const { el } = setup({ canEdit: false });

    expect(el.querySelector('.controls')).toBeNull();
  });

  it('rejects a file that is not a JPG, PNG or WebP without calling the server', () => {
    const { component, photos } = setup();

    component.onFileChosen(chosen(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })));

    expect(photos.upload).not.toHaveBeenCalled();
    expect(component.error()).toBe('employee.detail.photo.errors.type');
  });

  it('rejects a photo over 2 MB without calling the server', () => {
    const { component, photos } = setup();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });

    component.onFileChosen(chosen(big));

    expect(photos.upload).not.toHaveBeenCalled();
    expect(component.error()).toBe('employee.detail.photo.errors.size');
  });

  it('uploads a valid photo, shows it and reports the new URL', () => {
    const { component, photos, changed, el, fixture } = setup();
    const file = new File(['img'], 'me.png', { type: 'image/png' });

    component.onFileChosen(chosen(file));
    fixture.detectChanges();

    expect(photos.upload).toHaveBeenCalledWith(5, file);
    expect(changed).toHaveBeenCalledWith(PHOTO_PATH);
    expect(el.querySelector('img')?.getAttribute('src')).toBe('blob:photo');
    expect(component.error()).toBeNull();
  });

  it('shows the server message when the upload is refused', () => {
    const { component, photos } = setup();
    photos.upload.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 422, error: { message: 'The photo must be 2 MB or smaller.' } }),
      ),
    );

    component.onFileChosen(chosen(new File(['img'], 'me.png', { type: 'image/png' })));

    expect(component.error()).toBe('The photo must be 2 MB or smaller.');
  });

  it('asks for confirmation before removing, and removes only after it is given', () => {
    const { component, photos, changed } = setup({ photoUrl: PHOTO_PATH });

    component.askRemove();
    expect(component.confirmingRemove()).toBe(true);
    expect(photos.remove).not.toHaveBeenCalled();

    component.cancelRemove();
    expect(component.confirmingRemove()).toBe(false);
    expect(photos.remove).not.toHaveBeenCalled();

    component.askRemove();
    component.confirmRemove();

    expect(photos.remove).toHaveBeenCalledWith(5);
    expect(changed).toHaveBeenCalledWith(undefined);
    expect(component.src()).toBeNull();
  });
});
