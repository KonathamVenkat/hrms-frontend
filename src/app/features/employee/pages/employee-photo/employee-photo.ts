import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';
import { EmployeePhotoService } from '../../services/photo.service';
import { getHttpErrorMessage, serverMessage } from '../../../../core/utils/http-error-message';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * An employee's avatar with (optionally) upload and remove controls.
 *
 * An uploaded photo is stored by the backend and referenced by an app-relative path
 * (`/api/v1/employees/{id}/photo`) that only works with the signed-in session, so it is fetched
 * through HttpClient and shown from an object URL. An `http(s)` URL is used as is.
 */
@Component({
  selector: 'app-employee-photo',
  imports: [TranslatePipe],
  templateUrl: './employee-photo.html',
  styleUrl: './employee-photo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePhoto {
  private photos = inject(EmployeePhotoService);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  readonly employeeId = input.required<number>();
  readonly photoUrl = input<string | undefined>();
  readonly name = input.required<string>();
  readonly canEdit = input(false);

  /** The employee's new `profilePhotoUrl` after an upload (or `undefined` after a removal). */
  readonly photoChanged = output<string | undefined>();

  readonly src = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirmingRemove = signal(false);

  readonly initials = computed(() =>
    this.name()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  );

  private objectUrl: string | null = null;
  private loadSub: Subscription | null = null;

  constructor() {
    effect(() => this.show(this.photoUrl()));
    inject(DestroyRef).onDestroy(() => this.release());
  }

  private show(url: string | undefined): void {
    this.release();
    if (!url || !isPlatformBrowser(this.platformId)) {
      this.src.set(null);
      return;
    }
    if (/^https?:\/\//.test(url)) {
      this.src.set(url);
      return;
    }
    this.loadSub = this.photos.download(url).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.src.set(this.objectUrl);
      },
      error: () => this.src.set(null), // fall back to the initials
    });
  }

  private release(): void {
    this.loadSub?.unsubscribe();
    this.loadSub = null;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // lets the same file be chosen again
    if (!file) return;

    this.error.set(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.error.set(this.translate.instant('employee.detail.photo.errors.type'));
      return;
    }
    if (file.size > this.photos.maxBytes) {
      this.error.set(this.translate.instant('employee.detail.photo.errors.size'));
      return;
    }

    this.busy.set(true);
    this.photos
      .upload(this.employeeId(), file)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (res) => {
          // The path is the same after a replacement, so show the new image directly.
          this.release();
          this.objectUrl = URL.createObjectURL(file);
          this.src.set(this.objectUrl);
          this.photoChanged.emit(res.data.profilePhotoUrl);
        },
        error: (err: unknown) =>
          this.error.set(
            serverMessage(err) || this.translate.instant('employee.detail.photo.errors.uploadFailed'),
          ),
      });
  }

  askRemove(): void {
    this.error.set(null);
    this.confirmingRemove.set(true);
  }

  cancelRemove(): void {
    this.confirmingRemove.set(false);
  }

  confirmRemove(): void {
    this.busy.set(true);
    this.photos
      .remove(this.employeeId())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.confirmingRemove.set(false);
          this.release();
          this.src.set(null);
          this.photoChanged.emit(undefined);
        },
        error: (err: unknown) => {
          this.confirmingRemove.set(false);
          this.error.set(
            getHttpErrorMessage(this.translate, err, {
              404: this.translate.instant('employee.detail.photo.errors.removeFailed'),
            }),
          );
        },
      });
  }
}
