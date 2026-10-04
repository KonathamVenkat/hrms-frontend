import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';

/**
 * Turns a stored `profilePhotoUrl` into something an `<img>` can show.
 *
 * An uploaded photo is an app-relative path that needs the signed-in session, so it is fetched
 * once through HttpClient and kept as an object URL; the list, the toolbar and the profile page
 * then share one request per photo. The path carries a version (`?v=`) that changes on every
 * upload, so a replaced photo is a new cache entry. Entries are keyed by the signed-in viewer
 * too, so a photo loaded for one user is never handed to the next user of the same tab.
 */
@Injectable({ providedIn: 'root' })
export class PhotoCache {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private cache = new Map<string, Observable<string | null>>();

  /** The image address to show, or `null` when the photo cannot be loaded. Never errors. */
  load(photoUrl: string): Observable<string | null> {
    if (/^https?:\/\//.test(photoUrl)) {
      return of(photoUrl);
    }
    const key = `${this.auth.getEmployeeId()}|${photoUrl}`;
    let photo$ = this.cache.get(key);
    if (!photo$) {
      photo$ = this.http.get(`${environment.serviceUrl}${photoUrl}`, { responseType: 'blob' }).pipe(
        map((blob) => URL.createObjectURL(blob)),
        catchError(() => of(null)),
        // A failed load is not remembered, so the next view tries again.
        tap((url) => url === null && this.cache.delete(key)),
        shareReplay(1),
      );
      this.cache.set(key, photo$);
    }
    return photo$;
  }
}
