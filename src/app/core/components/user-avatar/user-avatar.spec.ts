import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserAvatar } from './user-avatar';
import { PhotoCache } from '../../services/photo-cache.service';

function setup(photoUrl: string | undefined, load: () => ReturnType<PhotoCache['load']> = () => of('blob:x')) {
  const cache = { load: vi.fn(load) };
  TestBed.configureTestingModule({ providers: [{ provide: PhotoCache, useValue: cache }] });
  const fixture = TestBed.createComponent(UserAvatar);
  fixture.componentRef.setInput('name', 'Sara Khan');
  fixture.componentRef.setInput('photoUrl', photoUrl);
  fixture.detectChanges();
  return { fixture, cache, el: fixture.nativeElement as HTMLElement };
}

describe('UserAvatar', () => {
  it('shows the initials when there is no photo, without asking the cache', () => {
    const { el, cache } = setup(undefined);

    expect(el.textContent?.trim()).toBe('SK');
    expect(el.querySelector('img')).toBeNull();
    expect(cache.load).not.toHaveBeenCalled();
  });

  it('shows the photo as a decorative image when there is one', () => {
    const { el, cache } = setup('/api/v1/employees/5/photo?v=1');

    expect(cache.load).toHaveBeenCalledWith('/api/v1/employees/5/photo?v=1');
    const img = el.querySelector('img');
    expect(img?.getAttribute('src')).toBe('blob:x');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('falls back to the initials when the photo cannot be loaded', () => {
    const { el } = setup('/api/v1/employees/5/photo?v=1', () => of(null));

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent?.trim()).toBe('SK');
  });

  it('follows a change of photo', () => {
    const { fixture, el } = setup(undefined);

    fixture.componentRef.setInput('photoUrl', '/api/v1/employees/5/photo?v=2');
    fixture.detectChanges();

    expect(el.querySelector('img')).not.toBeNull();
  });
});
