import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../../services/employee';

export interface EmployeeSearchOption {
  employeeId: number;
  fullNameEn: string;
  employeeCode: string;
}

/**
 * Type-ahead employee picker (Reactive Forms ControlValueAccessor).
 * Replaces loading every employee into a plain <select> — queries the
 * backend's keyword search instead, so it scales past a few hundred employees.
 */
@Component({
  selector: 'app-employee-search-select',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './employee-search-select.html',
  styleUrl: './employee-search-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EmployeeSearchSelect),
      multi: true,
    },
  ],
})
export class EmployeeSearchSelect implements ControlValueAccessor {
  @Input() placeholder = 'Search by name or code...';
  /** Excludes this employee id from results (e.g. someone can't be their own manager). */
  @Input() excludeEmployeeId: number | null = null;
  /** Set so an external <label for="..."> can associate with the inner input. */
  @Input() inputId = '';

  private empService = inject(EmployeeService);
  private elRef = inject(ElementRef);

  protected query = signal('');
  protected results = signal<EmployeeSearchOption[]>([]);
  protected loading = signal(false);
  protected isOpen = signal(false);
  protected disabled = false;

  private value: number | null = null;
  private onChange: (val: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  private search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((keyword) => {
          const trimmed = keyword.trim();
          if (trimmed.length < 2) {
            this.loading.set(false);
            return of<EmployeeSearchOption[]>([]);
          }
          this.loading.set(true);
          return this.empService
            .getEmployees({ search: trimmed, size: 10, sortBy: 'employeeCode', sortDir: 'ASC' })
            .pipe(
              map((res) => (res.success && res.data ? res.data.content : [])),
              catchError(() => of([])),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.loading.set(false);
        const filtered =
          this.excludeEmployeeId != null
            ? list.filter((e) => e.employeeId !== this.excludeEmployeeId)
            : list;
        this.results.set(
          filtered.map((e) => ({
            employeeId: e.employeeId,
            fullNameEn: e.fullNameEn,
            employeeCode: e.employeeCode,
          })),
        );
      });
  }

  // ── ControlValueAccessor ───────────────────────────────────
  writeValue(val: number | null): void {
    this.value = val;
    if (val == null) {
      this.query.set('');
    }
    // A bare id has no display name — the parent calls setInitialLabel()
    // right after patching the form to show one (see job-details.ts).
  }

  registerOnChange(fn: (val: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Called by the parent right after patchValue(), to show a name instead of a bare id. */
  setInitialLabel(label: string): void {
    this.query.set(label);
  }

  // ── User interaction ────────────────────────────────────────
  onInput(raw: string): void {
    this.query.set(raw);
    this.isOpen.set(true);
    if (this.value !== null) {
      this.value = null;
      this.onChange(null);
    }
    this.search$.next(raw);
  }

  select(option: EmployeeSearchOption): void {
    this.value = option.employeeId;
    this.query.set(`${option.fullNameEn} (${option.employeeCode})`);
    this.isOpen.set(false);
    this.results.set([]);
    this.onChange(option.employeeId);
    this.onTouched();
  }

  clear(): void {
    this.value = null;
    this.query.set('');
    this.results.set([]);
    this.isOpen.set(false);
    this.onChange(null);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
