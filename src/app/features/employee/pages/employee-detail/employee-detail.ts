// src/app/features/employee/pages/employee-detail/employee-detail.ts
import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../../services/employee';
import { JobDetailsComponent } from '../job-details/job-details';
import { EmployeeAddressesComponent } from '../employee-addresses/employee-addresses';
import { EmployeeIdentityComponent } from '../employee-identity/employee-identity';
import { EmployeeDocumentsComponent } from '../employee-documents/employee-documents';

export interface EmployeeDetail {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  firstNameAr: string;
  middleName?: string;
  middleNameAr?: string;
  lastName: string;
  lastNameAr: string;
  fullNameEn: string;
  fullNameAr: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  religion?: string;
  profilePhotoUrl?: string;
  personalEmail: string;
  workEmail: string;
  personalPhone?: string;
  workPhone?: string;
  hireDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  employmentStatus: string;
  employmentType: string;
  isActive: boolean;
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  departmentNameAr?: string;
  designationId?: number;
  designationTitle?: string;
  designationTitleAr?: string;
  designationCode?: string;
  gradeLevel?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule,
    JobDetailsComponent,
    EmployeeAddressesComponent,
    EmployeeIdentityComponent,
    EmployeeDocumentsComponent,
  ],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.css',
})
export class EmployeeDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  employee = signal<EmployeeDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeDetailTab = signal<'profile' | 'job' | 'addresses' | 'identity' | 'documents'>('profile');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/app/employee/list');
      return;
    }
    this.loadEmployee(+id);
  }

  loadEmployee(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.empService
      .getEmployee(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.employee.set(res.data as unknown as EmployeeDetail);
          } else {
            this.error.set(res.message || 'Failed to load employee.');
          }
        },
        error: (err) => {
          this.error.set(
            err.status === 404
              ? 'Employee not found.'
              : err.status === 403
                ? 'Access denied.'
                : err.status === 0
                  ? 'Cannot reach server.'
                  : err?.error?.message || 'Unexpected error.',
          );
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────
  goBack(): void {
    this.router.navigateByUrl('/app/employee/list');
  }

  editEmployee(): void {
    this.router.navigate(['/app/employee/edit', this.employee()?.employeeId]);
  }

  // ── Helpers ───────────────────────────────────────────────
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'status-active',
      PROBATION: 'status-probation',
      NOTICE_PERIOD: 'status-notice',
      TERMINATED: 'status-terminated',
      RESIGNED: 'status-terminated',
      RETIRED: 'status-inactive',
      ON_HOLD: 'status-inactive',
    };
    return map[status] ?? 'status-inactive';
  }

  getStatusLabel(status: string): string {
    return status?.replace(/_/g, ' ') ?? '—';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  getValue(val?: string | null): string {
    return val && val.trim() ? val.trim() : '—';
  }
}
