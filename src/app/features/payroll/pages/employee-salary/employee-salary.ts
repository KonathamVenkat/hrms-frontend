// src/app/features/payroll/pages/employee-salary/employee-salary.component.ts

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
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PayrollService } from '../../services/payroll.service';
import {
  EmployeeSalaryResponse,
  SalaryStructureResponse,
  COMPONENT_TYPE_CONFIG,
} from '../../models/payroll.model';

@Component({
  selector: 'app-employee-salary',
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
    MatDividerModule,
    MatTabsModule,
    TranslatePipe,
  ],
  templateUrl: './employee-salary.html',
  styleUrls: ['./employee-salary.css'],
})
export class EmployeeSalary implements OnInit {
  private readonly svc = inject(PayrollService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State ──────────────────────────────────────────────
  readonly salaries = signal<EmployeeSalaryResponse[]>([]);
  readonly structures = signal<SalaryStructureResponse[]>([]);
  readonly history = signal<EmployeeSalaryResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly showHistory = signal(false);
  readonly totalElements = signal(0);
  readonly typeConfig = COMPONENT_TYPE_CONFIG;

  // Computed preview from form values
  readonly previewBasic = signal<number>(0);
  readonly selectedStructure = signal<SalaryStructureResponse | null>(null);

  readonly displayedColumns = [
    'employeeCode',
    'employeeName',
    'structureName',
    'basicSalary',
    'grossSalary',
    'netSalary',
    'currency',
    'effectiveFrom',
    'actions',
  ];

  readonly breakdownColumns = ['componentName', 'componentType', 'calcBasis', 'amount'];

  readonly maxDate = new Date();

  // ── Form ───────────────────────────────────────────────
  readonly form = new FormGroup({
    employeeId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    structureId: new FormControl<number | null>(null, [Validators.required]),
    basicSalary: new FormControl<number>(0, [Validators.required, Validators.min(0.001)]),
    effectiveFrom: new FormControl<Date | null>(new Date(), [Validators.required]),
    remarks: new FormControl(''),
  });

  page = 0;
  pageSize = 20;

  ngOnInit(): void {
    this.loadSalaries();
    this.loadStructures();

    // Watch basicSalary and structureId for preview
    this.form.get('basicSalary')!.valueChanges.subscribe((val) => {
      this.previewBasic.set(val ?? 0);
    });
    this.form.get('structureId')!.valueChanges.subscribe((id) => {
      const found = this.structures().find((s) => s.structureId === id);
      this.selectedStructure.set(found ?? null);
    });
  }

  loadSalaries(): void {
    this.loading.set(true);
    this.svc.getAllCurrentSalaries(undefined, this.page, this.pageSize).subscribe({
      next: (paged) => {
        this.salaries.set(paged.content);
        this.totalElements.set(paged.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStructures(): void {
    this.svc.getStructures(true).subscribe({
      next: (list) => this.structures.set(list),
    });
  }

  openAssign(): void {
    this.form.reset({ effectiveFrom: new Date() });
    this.selectedStructure.set(null);
    this.previewBasic.set(0);
    this.showForm.set(true);
    this.showHistory.set(false);
  }

  openRevise(salary: EmployeeSalaryResponse): void {
    this.form.patchValue({
      employeeId: salary.employeeId,
      structureId: salary.structureId,
      basicSalary: salary.basicSalary,
      effectiveFrom: new Date(),
      remarks: '',
    });
    const found = this.structures().find((s) => s.structureId === salary.structureId);
    this.selectedStructure.set(found ?? null);
    this.previewBasic.set(salary.basicSalary);
    this.showForm.set(true);
    this.showHistory.set(false);
  }

  openHistory(salary: EmployeeSalaryResponse): void {
    this.showHistory.set(true);
    this.showForm.set(false);
    this.svc.getSalaryHistory(salary.employeeId).subscribe({
      next: (list) => this.history.set(list),
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);

    const date = this.form.value.effectiveFrom!;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    this.svc
      .assignSalary({
        employeeId: this.form.value.employeeId!,
        structureId: this.form.value.structureId!,
        basicSalary: this.form.value.basicSalary!,
        effectiveFrom: dateStr,
        remarks: this.form.value.remarks ?? '',
      })
      .subscribe({
        next: () => {
          this.snack.open(
            `✅ ${this.translate.instant('payroll.employeeSalary.success.assigned')}`,
            this.translate.instant('payroll.employeeSalary.close'),
            { duration: 3000, panelClass: 'snack-success' },
          );
          this.showForm.set(false);
          this.saving.set(false);
          this.loadSalaries();
        },
        error: (err) => {
          this.snack.open(
            '❌ ' + (err.error?.message || this.translate.instant('payroll.employeeSalary.errors.saveFailed')),
            this.translate.instant('payroll.employeeSalary.close'),
            { duration: 4000 },
          );
          this.saving.set(false);
        },
      });
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadSalaries();
  }

  formatCurrency(val: number): string {
    return (
      val?.toLocaleString('en-OM', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }) + ' OMR'
    );
  }

  getTypeStyle(type: string) {
    return (
      this.typeConfig[type as keyof typeof this.typeConfig] ?? {
        label: type,
        color: '#374151',
        bg: '#f3f4f6',
      }
    );
  }

  closeForm(): void {
    this.showForm.set(false);
  }
  closeHistory(): void {
    this.showHistory.set(false);
  }
}
