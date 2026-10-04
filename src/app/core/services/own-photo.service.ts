import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';

interface OwnRecord {
  data?: { profilePhotoUrl?: string };
}

/** The signed-in user's own profile photo address, shared by the toolbar and the profile page. */
@Injectable({ providedIn: 'root' })
export class OwnPhoto {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  readonly url = signal<string | undefined>(undefined);

  /** Reads the signed-in user's employee record for its photo; no photo (or an error) clears it. */
  refresh(): void {
    this.url.set(undefined);
    const id = this.auth.getEmployeeId();
    if (!id) return;
    this.http.get<OwnRecord>(`${environment.serviceUrl}/api/v1/employees/${id}`).subscribe({
      next: (res) => this.url.set(res.data?.profilePhotoUrl),
      error: () => this.url.set(undefined),
    });
  }

  /** Called after the user's own photo is uploaded or removed. */
  set(url: string | undefined): void {
    this.url.set(url);
  }
}
