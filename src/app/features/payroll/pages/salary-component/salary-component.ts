// src/app/features/payroll/pages/salary-component/salary-component.component.ts

import { Component, OnInit, inject, signal } from '@angular/core';
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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PayrollService } from '../../services/payroll.service';
import {
  SalaryComponentResponse,
  ComponentType,
  CalculationType,
  COMPONENT_TYPE_CONFIG,
  CALC_TYPE_LABELS,
} from '../../models/payroll.model';

@Component({
  selector: 'app-salary-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    TranslatePipe,
  ],
  templateUrl: './salary-component.html',
  styleUrls: ['./salary-component.css'],
})
export class SalaryComponentComponent implements OnInit {
  private readonly svc = inject(PayrollService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  // ── State ──────────────────────────────────────────────
  readonly components = signal<SalaryComponentResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly typeConfig = COMPONENT_TYPE_CONFIG;
  readonly calcLabels = CALC_TYPE_LABELS;

  readonly displayedColumns = [
    'sortOrder',
    'componentCode',
    'componentName',
    'componentType',
    'calcType',
    'defaultValue',
    'pasi',
    'isActive',
    'actions',
  ];

  readonly componentTypes: { value: ComponentType; label: string }[] = [
    { value: 'EARNING', label: 'payroll.salaryComponent.types.earning' },
    { value: 'DEDUCTION', label: 'payroll.salaryComponent.types.deduction' },
    { value: 'STATUTORY', label: 'payroll.salaryComponent.types.statutory' },
  ];

  readonly calcTypes: { value: CalculationType; label: string }[] = [
    { value: 'FIXED', label: 'payroll.salaryComponent.calcTypes.fixed' },
    { value: 'PERCENTAGE_OF_BASIC', label: 'payroll.salaryComponent.calcTypes.percentOfBasic' },
    { value: 'PERCENTAGE_OF_GROSS', label: 'payroll.salaryComponent.calcTypes.percentOfGross' },
    { value: 'FORMULA', label: 'payroll.salaryComponent.calcTypes.formula' },
  ];

  // ── Form ───────────────────────────────────────────────
  readonly form = new FormGroup({
    componentCode: new FormControl('', [Validators.required, Validators.maxLength(30)]),
    componentName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    componentNameAr: new FormControl('', [Validators.required]),
    componentType: new FormControl<ComponentType>('EARNING', [Validators.required]),
    calcType: new FormControl<CalculationType>('FIXED', [Validators.required]),
    defaultValue: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    isTaxable: new FormControl(false),
    isPasiApplicable: new FormControl(false),
    description: new FormControl(''),
    sortOrder: new FormControl<number>(0),
  });

  ngOnInit(): void {
    this.load();
    this.form.get('componentCode')!.valueChanges.subscribe((v) => {
      if (v && v !== v.toUpperCase()) {
        this.form.get('componentCode')!.setValue(v.toUpperCase(), { emitEvent: false });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.svc.getComponents(false).subscribe({
      next: (list) => {
        this.components.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ componentType: 'EARNING', calcType: 'FIXED', defaultValue: 0, sortOrder: 0 });
    this.showForm.set(true);
  }

  openEdit(comp: SalaryComponentResponse): void {
    this.editingId.set(comp.componentId);
    this.form.patchValue({
      componentCode: comp.componentCode,
      componentName: comp.componentName,
      componentNameAr: comp.componentNameAr,
      componentType: comp.componentType,
      calcType: comp.calcType,
      defaultValue: comp.defaultValue,
      isTaxable: comp.isTaxable,
      isPasiApplicable: comp.isPasiApplicable,
      description: comp.description ?? '',
      sortOrder: comp.sortOrder,
    });
    this.showForm.set(true);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const req = {
      componentCode: this.form.value.componentCode!.toUpperCase().trim(),
      componentName: this.form.value.componentName!,
      componentNameAr: this.form.value.componentNameAr!,
      componentType: this.form.value.componentType!,
      calcType: this.form.value.calcType!,
      defaultValue: this.form.value.defaultValue ?? 0,
      isTaxable: this.form.value.isTaxable ?? false,
      isPasiApplicable: this.form.value.isPasiApplicable ?? false,
      description: this.form.value.description ?? '',
      sortOrder: this.form.value.sortOrder ?? 0,
    };

    const obs = this.editingId()
      ? this.svc.updateComponent(this.editingId()!, req)
      : this.svc.createComponent(req);

    obs.subscribe({
      next: () => {
        this.snack.open(
          `✅ ${this.translate.instant(
            this.editingId() ? 'payroll.salaryComponent.success.updated' : 'payroll.salaryComponent.success.created',
          )}`,
          this.translate.instant('payroll.salaryComponent.close'),
          { duration: 3000, panelClass: 'snack-success' },
        );
        this.showForm.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.snack.open(
          '❌ ' + (err.error?.message || this.translate.instant('payroll.salaryComponent.errors.saveFailed')),
          this.translate.instant('payroll.salaryComponent.close'),
          { duration: 4000 },
        );
        this.saving.set(false);
      },
    });
  }

  toggleActive(comp: SalaryComponentResponse): void {
    this.svc.toggleComponent(comp.componentId, !comp.isActive).subscribe({
      next: () => this.load(),
      error: (err) =>
        this.snack.open(
          '❌ ' + (err.error?.message || this.translate.instant('payroll.salaryComponent.errors.toggleFailed')),
          this.translate.instant('payroll.salaryComponent.close'),
          { duration: 3000 },
        ),
    });
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  getTypeStyle(type: ComponentType) {
    return this.typeConfig[type] ?? { label: type, color: '#374151', bg: '#f3f4f6' };
  }
}
