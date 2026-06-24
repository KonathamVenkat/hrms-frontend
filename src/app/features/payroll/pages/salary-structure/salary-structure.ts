// src/app/features/payroll/pages/salary-structure/salary-structure.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';

import { PayrollService } from '../../services/payroll.service';
import {
  SalaryStructureResponse,
  SalaryComponentResponse,
  SalaryStructureItemResponse,
  ComponentType,
  CalculationType,
  COMPONENT_TYPE_CONFIG,
  CALC_TYPE_LABELS,
} from '../../models/payroll.model';

@Component({
  selector: 'app-salary-structure',
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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
  ],
  templateUrl: './salary-structure.html',
  styleUrls: ['./salary-structure.css'],
})
export class SalaryStructureComponent implements OnInit {
  private readonly svc = inject(PayrollService);
  private readonly snack = inject(MatSnackBar);

  // ── State ──────────────────────────────────────────────
  readonly structures = signal<SalaryStructureResponse[]>([]);
  readonly allComponents = signal<SalaryComponentResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly typeConfig = COMPONENT_TYPE_CONFIG;
  readonly calcLabels = CALC_TYPE_LABELS;

  readonly displayedColumns = [
    'structureCode',
    'structureName',
    'itemCount',
    'employeeCount',
    'isActive',
    'actions',
  ];

  readonly calcTypes: { value: CalculationType; label: string }[] = [
    { value: 'FIXED', label: 'Fixed Amount' },
    { value: 'PERCENTAGE_OF_BASIC', label: '% of Basic' },
    { value: 'PERCENTAGE_OF_GROSS', label: '% of Gross' },
    { value: 'FORMULA', label: 'Formula' },
  ];

  // ── Main form ──────────────────────────────────────────
  readonly form = new FormGroup({
    structureCode: new FormControl('', [Validators.required, Validators.maxLength(30)]),
    structureName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
    items: new FormArray([]),
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadStructures();
    this.loadComponents();
  }

  loadStructures(): void {
    this.loading.set(true);
    this.svc.getStructures(false).subscribe({
      next: (list) => {
        this.structures.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadComponents(): void {
    this.svc.getComponents(true).subscribe({
      next: (list) => this.allComponents.set(list),
    });
  }

  // ── Open create form ───────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.form.reset();
    this.itemsArray.clear();
    // Pre-populate with all active components
    this.allComponents().forEach((comp, i) => {
      this.itemsArray.push(this.buildItemGroup(comp.componentId, i + 1));
    });
    this.showForm.set(true);
  }

  // ── Open edit form ─────────────────────────────────────
  openEdit(structure: SalaryStructureResponse): void {
    this.editingId.set(structure.structureId);
    this.form.patchValue({
      structureCode: structure.structureCode,
      structureName: structure.structureName,
      description: structure.description ?? '',
    });
    this.itemsArray.clear();
    structure.items.forEach((item, i) => {
      const grp = this.buildItemGroup(item.componentId, item.sortOrder || i + 1);
      grp.patchValue({
        calcTypeOverride: item.effectiveCalcType,
        amount: item.amount,
        percentage: item.percentage,
      });
      this.itemsArray.push(grp);
    });
    this.showForm.set(true);
  }

  private buildItemGroup(componentId: number, sortOrder: number): FormGroup {
    const comp = this.allComponents().find((c) => c.componentId === componentId);
    return new FormGroup({
      componentId: new FormControl(componentId, Validators.required),
      componentName: new FormControl({ value: comp?.componentName ?? '', disabled: true }),
      componentType: new FormControl({ value: comp?.componentType ?? '', disabled: true }),
      calcTypeOverride: new FormControl<CalculationType | null>(null),
      amount: new FormControl<number>(0, [Validators.min(0)]),
      percentage: new FormControl<number>(0, [Validators.min(0), Validators.max(100)]),
      sortOrder: new FormControl<number>(sortOrder),
    });
  }

  addComponent(): void {
    this.itemsArray.push(this.buildItemGroup(0, this.itemsArray.length + 1));
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  getComponentName(componentId: number): string {
    return this.allComponents().find((c) => c.componentId === componentId)?.componentName ?? '';
  }

  getComponentType(componentId: number): string {
    return this.allComponents().find((c) => c.componentId === componentId)?.componentType ?? '';
  }

  onComponentSelect(index: number, componentId: number): void {
    const comp = this.allComponents().find((c) => c.componentId === componentId);
    if (comp) {
      this.itemsArray.at(index).patchValue({
        componentName: comp.componentName,
        componentType: comp.componentType,
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);

    const req = {
      structureCode: this.form.value.structureCode!.toUpperCase().trim(),
      structureName: this.form.value.structureName!.trim(),
      description: this.form.value.description ?? '',
      items: this.itemsArray.value.map((item: any) => ({
        componentId: item.componentId,
        calcTypeOverride: item.calcTypeOverride || undefined,
        amount: item.amount ?? 0,
        percentage: item.percentage ?? 0,
        sortOrder: item.sortOrder ?? 0,
      })),
    };

    const obs = this.editingId()
      ? this.svc.updateStructure(this.editingId()!, req)
      : this.svc.createStructure(req);

    obs.subscribe({
      next: () => {
        this.snack.open(
          `✅ Structure ${this.editingId() ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000, panelClass: 'snack-success' },
        );
        this.showForm.set(false);
        this.saving.set(false);
        this.loadStructures();
      },
      error: (err) => {
        this.snack.open('❌ ' + (err.error?.message || 'Save failed'), 'Close', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }

  toggleActive(s: SalaryStructureResponse): void {
    if (s.employeeCount > 0 && s.isActive) {
      this.snack.open(
        `⚠ Cannot deactivate — ${s.employeeCount} employee(s) are assigned to this structure`,
        'Close',
        { duration: 5000 },
      );
      return;
    }
    this.svc.toggleStructure(s.structureId, !s.isActive).subscribe({
      next: () => this.loadStructures(),
      error: (err) =>
        this.snack.open('❌ ' + (err.error?.message || 'Failed'), 'Close', { duration: 3000 }),
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.itemsArray.clear();
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

  // Replaces the filterByType pipe — avoids Angular static analysis error
  filterItems(
    items: SalaryStructureItemResponse[],
    type: ComponentType,
  ): SalaryStructureItemResponse[] {
    return items?.filter((i) => i.componentType === type) ?? [];
  }
}
