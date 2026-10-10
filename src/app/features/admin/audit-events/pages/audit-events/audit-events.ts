import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, finalize, of, switchMap, tap } from 'rxjs';

import { AuditEventService } from '../../services/audit-event';
import { AuditEvent, AuditEventFilter } from '../../models/audit-event';

@Component({
  selector: 'app-audit-events',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: './audit-events.html',
  styleUrl: './audit-events.css',
})
export class AuditEvents implements OnInit {
  private svc = inject(AuditEventService);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  readonly displayedColumns = ['eventTime', 'actor', 'action', 'target', 'detail'];
  readonly pageSizeOptions = [10, 20, 50, 100];

  events = signal<AuditEvent[]>([]);
  totalElements = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(0);
  pageSize = signal(20);

  readonly filterForm = new FormGroup({
    actor: new FormControl('', { nonNullable: true }),
    action: new FormControl('', { nonNullable: true }),
    targetType: new FormControl('', { nonNullable: true }),
    targetId: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  // A newer query cancels an older one still in flight, so a slow answer never overwrites a fresh one.
  private query$ = new Subject<AuditEventFilter>();

  ngOnInit(): void {
    this.query$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((filter) =>
          this.svc.search(filter).pipe(
            catchError((err: { error?: { message?: string } }) => {
              this.error.set(
                err.error?.message || this.translate.instant('admin.auditEvents.errors.loadFailed'),
              );
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((res) => {
        if (res?.success) {
          this.events.set(res.data.content);
          this.totalElements.set(res.data.totalElements);
        } else if (res) {
          this.error.set(res.message);
        }
      });
    this.load();
  }

  onSearch(): void {
    const { from, to } = this.filterForm.getRawValue();
    if (from && to && to < from) {
      this.error.set(this.translate.instant('admin.auditEvents.errors.dateRange'));
      return;
    }
    this.page.set(0);
    this.load();
  }

  onClear(): void {
    this.filterForm.reset();
    this.page.set(0);
    this.load();
  }

  onPageChange(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  private load(): void {
    this.query$.next({
      ...this.filterForm.getRawValue(),
      page: this.page(),
      size: this.pageSize(),
    });
  }
}
