import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  viewChild,
  signal,
  inject,
  computed,
  DestroyRef,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AccessibleDialogDirective } from '../../../../core/directives/accessible-dialog.directive';
import { FieldA11yDirective } from '../../../../core/directives/field-a11y.directive';
import { JobDetailsService } from '../../services/job-details.service';
import { EmployeeService } from '../../services/employee';
import { JobDetails } from '../../models/job-details.model';
import { DepartmentLookup, DesignationLookup } from '../../models/employee';
import { timedMessage } from '../../../../core/utils/timed-message';

// Import Phase 1 admin lookups
import { WorkShiftService } from '../../../admin/work-shifts/services/work-shift';
import { OfficeLocationService } from '../../../admin/office-locations/services/office-location';
import { WorkShift } from '../../../admin/work-shifts/models/work-shift';
import { OfficeLocation } from '../../../admin/office-locations/models/office-location';
import { EmployeeSearchSelect } from '../../components/employee-search-select/employee-search-select';

@Component({
  selector: 'app-job-details',
  imports: [
    ReactiveFormsModule,
    FieldA11yDirective,
    EmployeeSearchSelect,
    TranslatePipe,
    CdkTrapFocus,
    AccessibleDialogDirective,
  ],
  templateUrl: './job-details.html',
  styleUrl: './job-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailsComponent implements OnInit {
  /** Passed from employee-detail. */
  readonly employeeId = input.required<number>();

  private readonly reportingManagerPicker = viewChild<EmployeeSearchSelect>('reportingManagerPicker');
  private readonly functionalManagerPicker = viewChild<EmployeeSearchSelect>('functionalManagerPicker');

  private fb = inject(FormBuilder);
  private jobSvc = inject(JobDetailsService);
  private empSvc = inject(EmployeeService);
  private shiftSvc = inject(WorkShiftService);
  private locationSvc = inject(OfficeLocationService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  currentJob = signal<JobDetails | null>(null);
  history = signal<JobDetails[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  private readonly showSuccess = timedMessage(this.successMsg, this.destroyRef);

  // ── View mode ─────────────────────────────────────────────
  activeTab = signal<'current' | 'history'>('current');
  showModal = signal(false);
  isNewAssignment = signal(true); // true = new SCD record, false = minor update

  // ── Lookup data (from Phase 1 admin config) ───────────────
  departments = signal<DepartmentLookup[]>([]);
  designations = signal<DesignationLookup[]>([]);
  filteredDesignations = signal<DesignationLookup[]>([]);
  locations = signal<OfficeLocation[]>([]);
  shifts = signal<WorkShift[]>([]);

  readonly workModes = ['ON_SITE', 'REMOTE', 'HYBRID'];

  // ── Computed history stats ────────────────────────────────
  readonly historyCount = computed(() => this.history().length);

  // ── Form ──────────────────────────────────────────────────
  readonly form = this.fb.group({
    departmentId: this.fb.control<number | null>(null, Validators.required),
    designationId: this.fb.control<number | null>(null, Validators.required),
    jobPositionId: this.fb.nonNullable.control('', Validators.maxLength(20)),
    reportingManagerId: this.fb.control<number | null>(null),
    functionalManagerId: this.fb.control<number | null>(null),
    locationId: this.fb.control<number | null>(null, Validators.required),
    shiftId: this.fb.control<number | null>(null),
    workMode: this.fb.nonNullable.control('ON_SITE', Validators.required),
    effectiveFrom: this.fb.nonNullable.control('', Validators.required),
    remarks: this.fb.nonNullable.control('', Validators.maxLength(500)),
  });

  ngOnInit(): void {
    this.watchDepartment();
    this.loadCurrentJob();
    this.loadLookups();
  }

  /** Cascades the designation list from the chosen department. */
  private watchDepartment(): void {
    this.form.controls.departmentId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deptId) => {
        this.form.controls.designationId.setValue(null);
        if (deptId) {
          this.filteredDesignations.set(
            this.designations().filter((d) => d.departmentId === +deptId),
          );
        } else {
          this.filteredDesignations.set(this.designations());
        }
      });
  }

  // ── Load current job ──────────────────────────────────────
  loadCurrentJob(): void {
    this.loading.set(true);
    this.error.set(null);

    this.jobSvc
      .getCurrentJob(this.employeeId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.currentJob.set(res.data);
        },
        error: (err: { status?: number; error?: { message?: string } }) => {
          // 404 = no job assigned yet — not an error to show
          if (err.status !== 404) {
            this.error.set(
              err?.error?.message || this.translate.instant('employee.jobDetails.errors.loadFailed'),
            );
          }
        },
      });
  }

  // ── Load job history ──────────────────────────────────────
  loadHistory(): void {
    this.jobSvc
      .getJobHistory(this.employeeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.history.set(res.data);
        },
      });
  }

  onTabChange(tab: 'current' | 'history'): void {
    this.activeTab.set(tab);
    if (tab === 'history' && this.history().length === 0) {
      this.loadHistory();
    }
  }

  // ── Load all admin config lookups ─────────────────────────
  private loadLookups(): void {
    // Departments
    this.empSvc
      .getDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.departments.set(res.data);
        },
      });

    // Designations
    this.empSvc
      .getDesignations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.designations.set(res.data);
            this.filteredDesignations.set(res.data);
          }
        },
      });

    // Office locations
    this.locationSvc
      .getActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.locations.set(res.data);
        },
      });

    // Work shifts
    this.shiftSvc
      .getActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.shifts.set(res.data);
        },
      });
  }

  // ── Open modal ────────────────────────────────────────────
  openNewAssignment(): void {
    this.isNewAssignment.set(true);
    this.form.controls.effectiveFrom.setValidators([Validators.required]);
    this.form.controls.effectiveFrom.updateValueAndValidity();
    this.setManagersEditable(true);
    this.form.reset({
      departmentId: null,
      designationId: null,
      jobPositionId: '',
      reportingManagerId: null,
      functionalManagerId: null,
      locationId: null,
      shiftId: null,
      workMode: 'ON_SITE',
      effectiveFrom: '',
      remarks: '',
    });
    this.showModal.set(true);
  }

  openEditCurrent(): void {
    const job = this.currentJob();
    if (!job) return;

    this.isNewAssignment.set(false);
    this.form.controls.effectiveFrom.clearValidators();
    this.form.controls.effectiveFrom.updateValueAndValidity();
    // Managers are history-bearing like department/designation/location: the backend only
    // lets this update change shift, work mode and remarks, so don't offer them here.
    this.setManagersEditable(false);

    this.form.patchValue({
      departmentId: job.departmentId,
      designationId: job.designationId,
      jobPositionId: job.jobPositionId ?? '',
      reportingManagerId: job.reportingManagerId ?? null,
      functionalManagerId: job.functionalManagerId ?? null,
      locationId: job.locationId,
      shiftId: job.shiftId ?? null,
      workMode: job.workMode,
      effectiveFrom: job.effectiveFrom,
      remarks: job.remarks ?? '',
    });

    // patchValue already cleared the pickers' display text via writeValue(null)
    // where there's no manager — only set a label where one exists.
    if (job.reportingManagerName) {
      this.reportingManagerPicker()?.setInitialLabel(
        `${job.reportingManagerName} (${job.reportingManagerCode})`,
      );
    }
    if (job.functionalManagerName) {
      this.functionalManagerPicker()?.setInitialLabel(
        `${job.functionalManagerName} (${job.functionalManagerCode})`,
      );
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
  }

  private setManagersEditable(editable: boolean): void {
    for (const control of [this.form.controls.reportingManagerId, this.form.controls.functionalManagerId]) {
      if (editable) {
        control.enable();
      } else {
        control.disable();
      }
    }
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // getRawValue: the manager pickers are disabled while editing the current record, and the
    // backend compares them against the stored values, so they must still be sent as they are.
    const v = this.form.getRawValue();
    const payload = {
      departmentId: Number(v.departmentId),
      designationId: Number(v.designationId),
      jobPositionId: v.jobPositionId || undefined,
      reportingManagerId: v.reportingManagerId ? +v.reportingManagerId : undefined,
      functionalManagerId: v.functionalManagerId ? +v.functionalManagerId : undefined,
      locationId: Number(v.locationId),
      shiftId: v.shiftId ? +v.shiftId : undefined,
      workMode: v.workMode,
      effectiveFrom: v.effectiveFrom,
      remarks: v.remarks || undefined,
    };

    const call = this.isNewAssignment()
      ? this.jobSvc.assignJob(this.employeeId(), payload)
      : this.jobSvc.updateCurrentJob(this.employeeId(), payload);

    call
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
      next: (res) => {
        if (res.success) {
          this.currentJob.set(res.data);
          this.history.set([]); // reset history cache
          this.closeModal();
          this.showSuccess(
            this.translate.instant(
              this.isNewAssignment()
                ? 'employee.jobDetails.success.assigned'
                : 'employee.jobDetails.success.updated',
            ),
          );
        } else {
          this.error.set(res.message);
        }
      },
      error: (err: { error?: { message?: string } }) =>
        this.error.set(
          err?.error?.message || this.translate.instant('employee.jobDetails.errors.saveFailed'),
        ),
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  isInvalid(name: string): boolean {
    const c = this.ctrl(name);
    return c.invalid && c.touched;
  }

  getError(name: string): string {
    const c = this.ctrl(name);
    if (!c.errors || !c.touched) return '';
    if (c.errors['required']) return this.translate.instant('common.validation.required');
    if (c.errors['maxlength']) {
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    }
    return this.translate.instant('common.validation.invalid');
  }

  getWorkModeBadge(mode: string): string {
    const map: Record<string, string> = {
      ON_SITE: 'wm-onsite',
      REMOTE: 'wm-remote',
      HYBRID: 'wm-hybrid',
    };
    return map[mode] ?? 'wm-onsite';
  }

  formatDateRange(from: string, to?: string): string {
    return to ? `${from} → ${to}` : `${from} → ${this.translate.instant('employee.jobDetails.present')}`;
  }
}
