import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { OvertimeService } from '../../services/overtime.service';
import {
  OvertimeResponse,
  OvertimeType,
  OT_TYPE_CONFIG,
  OT_STATUS_CONFIG,
} from '../../models/overtime.model';
import { RegularizationStatus } from '../../models/regularization.model';
import { Auth } from '../../../../core/auth/auth';

@Component({
  selector: 'app-overtime-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './overtime-request.html',
  styleUrls: ['./overtime-request.css'],
})
export class OvertimeRequest implements OnInit {
  private readonly svc = inject(OvertimeService);
  private readonly auth = inject(Auth);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State signals ──────────────────────────────────────
  readonly myRequests = signal<OvertimeResponse[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly totalElements = signal(0);
  readonly employeeId = signal(0);
  readonly showForm = signal(false);
  readonly otTypeConfig = OT_TYPE_CONFIG;
  readonly statusConfig = OT_STATUS_CONFIG;

  // ── Computed status counts ─────────────────────────────
  readonly pendingCount = computed(
    () => this.myRequests().filter((r) => r.status === 'PENDING').length,
  );
  readonly approvedCount = computed(
    () => this.myRequests().filter((r) => r.status === 'APPROVED').length,
  );
  readonly rejectedCount = computed(
    () => this.myRequests().filter((r) => r.status === 'REJECTED').length,
  );

  readonly totalOtApproved = computed(() =>
    this.myRequests()
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.durationMinutes, 0),
  );

  readonly totalOtFormatted = computed(() => {
    const mins = this.totalOtApproved();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  });

  // ── OT Type options ────────────────────────────────────
  readonly otTypeOptions: { value: OvertimeType; label: string }[] = [
    { value: 'PRE_APPROVED', label: 'attendance.overtimeRequest.otTypeOptions.preApproved' },
    { value: 'POST_FACTO', label: 'attendance.overtimeRequest.otTypeOptions.postFacto' },
    { value: 'WEEKEND', label: 'attendance.overtimeRequest.otTypeOptions.weekend' },
    { value: 'HOLIDAY', label: 'attendance.overtimeRequest.otTypeOptions.holiday' },
  ];

  // ── Submit form ────────────────────────────────────────
  readonly submitForm = new FormGroup({
    otDate: new FormControl<Date | null>(null, [Validators.required]),
    otType: new FormControl<OvertimeType>('POST_FACTO', [Validators.required]),
    startTime: new FormControl<string>('', [Validators.required]),
    endTime: new FormControl<string>('', [Validators.required]),
    reason: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(500),
    ]),
    projectCode: new FormControl<string>(''),
  });

  readonly displayedColumns = [
    'otId',
    'otDate',
    'otType',
    'startTime',
    'endTime',
    'duration',
    'reason',
    'status',
    'actions',
  ];

  readonly maxDate = new Date();
  readonly minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  page = 0;
  pageSize = 10;

  ngOnInit(): void {
    this.employeeId.set(this.auth.getEmployeeId());
    this.loadMyRequests();
  }

  loadMyRequests(): void {
    this.loading.set(true);
    this.svc.getMyRequests(this.employeeId(), this.page, this.pageSize).subscribe({
      next: (paged) => {
        this.myRequests.set(paged.content);
        this.totalElements.set(paged.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    if (this.submitForm.invalid) {
      this.submitForm.markAllAsTouched();
      return;
    }

    const { otDate, otType, startTime, endTime, reason, projectCode } = this.submitForm.value;

    const dateStr = this.formatDate(otDate!);

    this.submitting.set(true);
    this.svc
      .submit({
        employeeId: this.employeeId(),
        otDate: dateStr,
        otType: otType!,
        startTime: `${dateStr}T${startTime}:00`,
        endTime: `${dateStr}T${endTime}:00`,
        reason: reason!,
        projectCode: projectCode || undefined,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            '✅ ' + this.translate.instant('attendance.overtimeRequest.success.submitted'),
            this.translate.instant('attendance.overtimeRequest.close'),
            { duration: 4000, panelClass: 'snack-success' },
          );
          this.submitForm.reset({ otType: 'POST_FACTO' });
          this.showForm.set(false);
          this.submitting.set(false);
          this.page = 0;
          this.loadMyRequests();
        },
        error: (err) => {
          this.snack.open(
            '❌ ' + (err.error?.message || this.translate.instant('attendance.overtimeRequest.errors.submitFailed')),
            this.translate.instant('attendance.overtimeRequest.close'),
            { duration: 5000, panelClass: 'snack-error' },
          );
          this.submitting.set(false);
        },
      });
  }

  onCancel(otId: string): void {
    if (!confirm(this.translate.instant('attendance.overtimeRequest.confirmCancel'))) return;
    this.svc.cancel(otId, this.employeeId()).subscribe({
      next: () => {
        this.snack.open(
          this.translate.instant('attendance.overtimeRequest.success.cancelled'),
          this.translate.instant('attendance.overtimeRequest.close'),
          { duration: 3000 },
        );
        this.loadMyRequests();
      },
      error: (err) =>
        this.snack.open(
          '❌ ' + (err.error?.message || this.translate.instant('attendance.overtimeRequest.errors.cancelFailed')),
          this.translate.instant('attendance.overtimeRequest.close'),
          { duration: 4000 },
        ),
    });
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadMyRequests();
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.submitForm.reset({ otType: 'POST_FACTO' });
  }

  getOtTypeStyle(type: OvertimeType) {
    return (
      this.otTypeConfig[type] ?? { label: type, color: '#374151', bg: '#f3f4f6', icon: 'schedule' }
    );
  }

  getStatusStyle(status: RegularizationStatus) {
    return (
      this.statusConfig[status] ?? { label: status, color: '#374151', bg: '#f3f4f6', icon: 'info' }
    );
  }

  formatTime(iso: string | null): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('en-OM', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
