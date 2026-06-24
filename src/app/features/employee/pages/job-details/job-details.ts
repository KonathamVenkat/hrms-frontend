import { Component, OnInit, Input, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { JobDetailsService } from '../../services/job-details.service';
import { EmployeeService } from '../../services/employee';
import { JobDetails } from '../../models/job-details.model';
import { DepartmentLookup, DesignationLookup } from '../../models/employee';

// Import Phase 1 admin lookups
import { WorkShiftService } from '../../../admin/work-shifts/services/work-shift';
import { OfficeLocationService } from '../../../admin/office-locations/services/office-location';
import { WorkShift } from '../../../admin/work-shifts/models/work-shift';
import { OfficeLocation } from '../../../admin/office-locations/models/office-location';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './job-details.html',
  styleUrl: './job-details.css',
})
export class JobDetailsComponent implements OnInit {
  @Input() employeeId!: number; // passed from employee-detail

  private fb = inject(FormBuilder);
  private jobSvc = inject(JobDetailsService);
  private empSvc = inject(EmployeeService);
  private shiftSvc = inject(WorkShiftService);
  private locationSvc = inject(OfficeLocationService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  currentJob = signal<JobDetails | null>(null);
  history = signal<JobDetails[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

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
  managers = signal<{ id: number; name: string; code: string }[]>([]);

  readonly workModes = ['ON_SITE', 'REMOTE', 'HYBRID'];

  // ── Computed history stats ────────────────────────────────
  readonly historyCount = computed(() => this.history().length);

  // ── Form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadCurrentJob();
    this.loadLookups();
  }

  // ── Build form ────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      departmentId: [null, Validators.required],
      designationId: [null, Validators.required],
      jobPositionId: ['', Validators.maxLength(20)],
      reportingManagerId: [null],
      functionalManagerId: [null],
      locationId: [null, Validators.required],
      shiftId: [null],
      workMode: ['ON_SITE', Validators.required],
      effectiveFrom: ['', Validators.required],
      remarks: ['', Validators.maxLength(500)],
    });

    // Cascade designations by department
    this.form
      .get('departmentId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deptId) => {
        this.form.get('designationId')?.setValue(null);
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
      .getCurrentJob(this.employeeId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.currentJob.set(res.data);
        },
        error: (err) => {
          // 404 = no job assigned yet — not an error to show
          if (err.status !== 404) {
            this.error.set(err?.error?.message || 'Failed to load job details.');
          }
        },
      });
  }

  // ── Load job history ──────────────────────────────────────
  loadHistory(): void {
    this.jobSvc
      .getJobHistory(this.employeeId)
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

    // Managers = all active employees as lookup
    this.empSvc
      .getEmployees({ size: 200, sortBy: 'EMPLOYEE_CODE', sortDir: 'ASC' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.managers.set(
              res.data.content.map((e) => ({
                id: e.employeeId,
                name: e.fullNameEn,
                code: e.employeeCode,
              })),
            );
          }
        },
      });
  }

  // ── Open modal ────────────────────────────────────────────
  openNewAssignment(): void {
    this.isNewAssignment.set(true);
    this.form.get('effectiveFrom')?.setValidators([Validators.required]);
    this.form.get('effectiveFrom')?.updateValueAndValidity();
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
    this.form.get('effectiveFrom')?.clearValidators();
    this.form.get('effectiveFrom')?.updateValueAndValidity();

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
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const v = this.form.value;
    const payload = {
      departmentId: +v.departmentId,
      designationId: +v.designationId,
      jobPositionId: v.jobPositionId || undefined,
      reportingManagerId: v.reportingManagerId ? +v.reportingManagerId : undefined,
      functionalManagerId: v.functionalManagerId ? +v.functionalManagerId : undefined,
      locationId: +v.locationId,
      shiftId: v.shiftId ? +v.shiftId : undefined,
      workMode: v.workMode,
      effectiveFrom: v.effectiveFrom || undefined,
      remarks: v.remarks || undefined,
    };

    const call = this.isNewAssignment()
      ? this.jobSvc.assignJob(this.employeeId, payload)
      : this.jobSvc.updateCurrentJob(this.employeeId, payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentJob.set(res.data);
          this.history.set([]); // reset history cache
          this.closeModal();
          this.showSuccess(
            this.isNewAssignment()
              ? 'New job assignment saved successfully'
              : 'Job details updated successfully',
          );
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) => this.error.set(err?.error?.message || 'Operation failed. Please try again.'),
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
    if (c.errors['required']) return 'Required';
    if (c.errors['maxlength']) return `Max ${c.errors['maxlength'].requiredLength} chars`;
    return 'Invalid';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
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
    return to ? `${from} → ${to}` : `${from} → Present`;
  }
}
