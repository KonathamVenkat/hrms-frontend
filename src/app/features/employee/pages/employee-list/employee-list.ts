import { ChangeDetectionStrategy, Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EmployeeService } from '../../services/employee';
import { Employee, EmployeeFilter } from '../../models/employee';
import { DepartmentLookup } from '../../models/employee';
import { getHttpErrorMessage } from '../../../../core/utils/http-error-message';

/** A page number, or a gap marker rendered as an ellipsis. */
export type PageEntry = number | 'ellipsis';

@Component({
  selector: 'app-employee-list',
  imports: [DatePipe, FormsModule, TranslatePipe],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList implements OnInit {
  private router = inject(Router);
  private empService = inject(EmployeeService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  // ── State ─────────────────────────────────────────────────
  employees = signal<Employee[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  totalElements = signal(0);
  currentPage = signal(0);
  pageSize = signal(10);
  totalPages = signal(0);

  readonly pageSizeOptions = [10, 25, 50, 100];

  // ── Departments from API ──────────────────────────────────
  departments = signal<DepartmentLookup[]>([]); // ← dynamic

  // isActive defaults to true (active-only) to preserve existing behavior —
  // "All" / "Inactive" are opt-in via the filter bar.
  readonly defaultFilter: EmployeeFilter = {
    search: '',
    departmentId: null,
    employmentStatus: '',
    employmentType: '',
    gender: '',
    isActive: true,
  };

  filter = signal<EmployeeFilter>({ ...this.defaultFilter });

  readonly employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'];
  readonly statuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED'];
  readonly genders = ['MALE', 'FEMALE', 'OTHER'];

  readonly hasNonDefaultFilters = computed(() => {
    const f = this.filter();
    return (
      !!f.search ||
      !!f.departmentId ||
      !!f.employmentType ||
      !!f.employmentStatus ||
      f.isActive !== this.defaultFilter.isActive
    );
  });

  readonly showingFrom = computed(() =>
    this.totalElements() === 0 ? 0 : this.currentPage() * this.pageSize() + 1,
  );

  readonly showingTo = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements()),
  );

  // ── Truncated pagination (first/last + a window around current page) ────
  readonly pageEntries = computed<PageEntry[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const entries: PageEntry[] = [0];
    const windowStart = Math.max(1, current - 1);
    const windowEnd = Math.min(total - 2, current + 1);

    if (windowStart > 1) entries.push('ellipsis');
    for (let p = windowStart; p <= windowEnd; p++) entries.push(p);
    if (windowEnd < total - 2) entries.push('ellipsis');

    entries.push(total - 1);
    return entries;
  });

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
        isActive: f.isActive, // true | false | null ("All") — passed through as-is
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
            this.error.set(res.message || this.translate.instant('employee.list.errors.loadFailed'));
          }
        },
        error: (err) => {
          this.error.set(
            getHttpErrorMessage(this.translate, err, {
              403: this.translate.instant('employee.list.errors.forbidden'),
            }),
          );
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

  /** isActive select uses string values ('true' | 'false' | '') since native <select> only carries strings. */
  onActiveFilterChange(value: string): void {
    const isActive = value === '' ? null : value === 'true';
    this.filter.update((f) => ({ ...f, isActive }));
    this.onFilterChange();
  }

  clearFilters(): void {
    this.filter.set({ ...this.defaultFilter });
    this.currentPage.set(0);
    this.loadEmployees();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadEmployees();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
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

  /** Keyboard equivalent for the clickable table row (Enter / Space). */
  onRowKeydown(event: KeyboardEvent, id: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.viewEmployee(id);
    }
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
