import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { PhotoCache } from '../../services/photo-cache.service';

/**
 * A person's photo, or their initials when there is none (or it cannot be loaded).
 *
 * Decorative: the person's name is always shown next to it, so the image has an empty `alt`.
 * It fills the box its parent gives it; the parent supplies the size, shape and the colours of
 * the initials.
 */
@Component({
  selector: 'app-user-avatar',
  template: `
    @if (src(); as photo) {
      <img class="photo" [src]="photo" alt="" />
    } @else {
      {{ initials() }}
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatar {
  private cache = inject(PhotoCache);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly photoUrl = input<string | undefined>();
  readonly name = input.required<string>();

  protected readonly src = toSignal(
    toObservable(this.photoUrl).pipe(
      switchMap((url) => (url && this.browser ? this.cache.load(url) : of(null))),
    ),
    { initialValue: null },
  );

  protected readonly initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  );
}
