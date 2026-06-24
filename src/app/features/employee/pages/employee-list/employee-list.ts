import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EmployeeService } from '../../services/employee';
import { Employee, EmployeeFilter } from '../../models/employee';
import { DepartmentLookup } from '../../models/employee';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList implements OnInit {
  private router = inject(Router);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  employees = signal<Employee[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalElements = signal(0);
  currentPage = signal(0);
  pageSize = signal(10);
  totalPages = signal(0);

  // ── Departments from API ──────────────────────────────────
  departments = signal<DepartmentLookup[]>([]); // ← dynamic

  filter = signal<EmployeeFilter>({
    search: '',
    departmentId: null,
    employmentStatus: '',
    employmentType: '',
    gender: '',
    isActive: null,
  });

  readonly employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'];
  readonly statuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED'];
  readonly genders = ['MALE', 'FEMALE', 'OTHER'];

  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly showingFrom = computed(() =>
    this.totalElements() === 0 ? 0 : this.currentPage() * this.pageSize() + 1,
  );

  readonly showingTo = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements()),
  );

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.loadDepartments(); // ← load from API first
    this.loadEmployees();
  }

  // ── Load departments from API ─────────────────────────────
  loadDepartments(): void {
    this.empService
      .getDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.departments.set(res.data);
          }
        },
        error: () => {
          // non-critical — filters still work without dept list
          console.warn('Failed to load departments for filter');
        },
      });
  }

  // ── Load employees ────────────────────────────────────────
  loadEmployees(): void {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();

    this.empService
      .getEmployees({
        search: f.search || undefined,
        departmentId: f.departmentId ? +f.departmentId : undefined, // ✅ ensure number
        employmentStatus: f.employmentStatus || undefined,
        employmentType: f.employmentType || undefined,
        gender: f.gender || undefined,
        isActive: f.isActive ?? undefined,
        page: this.currentPage(),
        size: this.pageSize(),
        sortBy: 'employeeCode',
        sortDir: 'ASC',
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.employees.set(res.data.content);
            this.totalElements.set(res.data.totalElements);
            this.totalPages.set(res.data.totalPages);
          } else {
            this.error.set(res.message || 'Failed to load employees.');
          }
        },
        error: (err) => {
          const msg =
            err.status === 403
              ? 'You do not have permission to view employees.'
              : err.status === 401
                ? 'Session expired. Please login again.'
                : err.status === 0
                  ? 'Cannot reach server. Check your connection.'
                  : err?.error?.message || 'Unexpected error occurred.';
          this.error.set(msg);
        },
      });
  }

  // ── Filter actions ────────────────────────────────────────
  onSearch(): void {
    this.currentPage.set(0);
    this.loadEmployees();
  }

  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadEmployees();
  }

  clearFilters(): void {
    this.filter.set({
      search: '',
      departmentId: null,
      employmentStatus: '',
      employmentType: '',
      gender: '',
      isActive: null,
    });
    this.currentPage.set(0);
    this.loadEmployees();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadEmployees();
  }

  // ── Navigation ────────────────────────────────────────────
  createEmployee(): void {
    this.router.navigateByUrl('/app/employee/create');
  }
  editEmployee(id: number): void {
    this.router.navigate(['/app/employee/edit', id]);
  }
  viewEmployee(id: number): void {
    this.router.navigate(['/app/employee/detail', id]);
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
      ACTIVE: 'badge-active',
      PROBATION: 'badge-probation',
      NOTICE_PERIOD: 'badge-notice',
      TERMINATED: 'badge-terminated',
      RESIGNED: 'badge-terminated',
    };
    return map[status] ?? 'badge-inactive';
  }

  getTypeClass(type: string): string {
    const map: Record<string, string> = {
      FULL_TIME: 'type-full',
      PART_TIME: 'type-part',
      CONTRACT: 'type-contract',
      INTERN: 'type-intern',
      CONSULTANT: 'type-contract',
    };
    return map[type] ?? 'type-full';
  }
}
