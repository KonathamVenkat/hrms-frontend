import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentTypeService } from '../../services/document-type';
import { DocumentType } from '../../models/document-type';
import { AccessibleDialogDirective } from '../../../../../core/directives/accessible-dialog.directive';

@Component({
  selector: 'app-document-types',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, CdkTrapFocus, AccessibleDialogDirective],
  templateUrl: './document-type.html',
  styleUrl: './document-type.css',
})
export class DocumentTypes implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(DocumentTypeService);
  private destroy = inject(DestroyRef);
  private translate = inject(TranslateService);

  docTypes = signal<DocumentType[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmItem = signal<DocumentType | null>(null);
  filterText = signal('');
  filterCat = signal('');
  filterActive = signal<'all' | 'active' | 'inactive'>('all');

  readonly categories = [
    'IDENTITY',
    'CONTRACT',
    'EDUCATION',
    'CERTIFICATE',
    'MEDICAL',
    'FINANCIAL',
    'OTHER',
  ];
  readonly activeCount = computed(() => this.docTypes().filter((d) => d.isActive).length);
  readonly mandatoryCount = computed(
    () => this.docTypes().filter((d) => d.isMandatory && d.isActive).length,
  );

  readonly filtered = computed(() => {
    const text = this.filterText().toLowerCase();
    const cat = this.filterCat();
    const status = this.filterActive();
    return this.docTypes().filter((d) => {
      const matchText =
        !text ||
        d.docTypeName.toLowerCase().includes(text) ||
        d.docTypeCode.toLowerCase().includes(text);
      const matchCat = !cat || d.category === cat;
      const matchStatus = status === 'all' ? true : status === 'active' ? d.isActive : !d.isActive;
      return matchText && matchCat && matchStatus;
    });
  });

  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadDocTypes();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      docTypeCode: [
        '',
        [Validators.required, Validators.maxLength(30), Validators.pattern('^[A-Z0-9_]+$')],
      ],
      docTypeName: ['', [Validators.required, Validators.maxLength(100)]],
      docTypeNameAr: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['OTHER', Validators.required],
      description: ['', Validators.maxLength(500)],
      isMandatory: [false],
      hasExpiry: [false],
      expiryNoticeDays: [30, [Validators.min(0), Validators.max(365)]],
      allowedExtensions: ['PDF,JPG,PNG', Validators.maxLength(200)],
      maxFileSizeMb: [5, [Validators.min(1)]],
      sortOrder: [0, Validators.min(0)],
      isActive: [true],
    });
    this.form
      .get('docTypeCode')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((v) => {
        if (v && v !== v.toUpperCase())
          this.form.get('docTypeCode')?.setValue(v.toUpperCase(), { emitEvent: false });
      });
  }

  loadDocTypes(): void {
    this.loading.set(true);
    this.svc
      .getAll()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.docTypes.set(res.data);
          else this.error.set(res.message);
        },
        error: (err) =>
          this.error.set(
            err?.error?.message || this.translate.instant('admin.documentTypes.errors.loadFailed'),
          ),
      });
  }

  openCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.form.reset({
      docTypeCode: '',
      docTypeName: '',
      docTypeNameAr: '',
      category: 'OTHER',
      description: '',
      isMandatory: false,
      hasExpiry: false,
      expiryNoticeDays: 30,
      allowedExtensions: 'PDF,JPG,PNG',
      maxFileSizeMb: 5,
      sortOrder: 0,
      isActive: true,
    });
    this.form.get('docTypeCode')?.enable();
    this.showModal.set(true);
  }

  openEdit(dt: DocumentType): void {
    this.isEditMode.set(true);
    this.editingId.set(dt.docTypeId);
    this.form.patchValue({ ...dt });
    this.form.get('docTypeCode')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
    this.form.get('docTypeCode')?.enable();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      sortOrder: +v.sortOrder,
      maxFileSizeMb: +v.maxFileSizeMb,
      expiryNoticeDays: +v.expiryNoticeDays,
      description: v.description || undefined,
    };

    const call = this.isEditMode()
      ? this.svc.update(this.editingId()!, payload)
      : this.svc.create(payload);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        if (res.success) {
          this.showSuccess(
            this.translate.instant(
              this.isEditMode() ? 'admin.documentTypes.success.updated' : 'admin.documentTypes.success.created',
              { name: res.data.docTypeName },
            ),
          );
          this.closeModal();
          this.loadDocTypes();
        } else this.error.set(res.message);
      },
      error: (err) =>
        this.error.set(
          err.status === 409
            ? err?.error?.message || this.translate.instant('admin.documentTypes.errors.duplicate')
            : err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'),
        ),
    });
  }

  openConfirm(dt: DocumentType): void {
    this.confirmItem.set(dt);
    this.showConfirm.set(true);
  }
  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmItem.set(null);
  }

  confirmToggle(): void {
    const dt = this.confirmItem();
    if (!dt) return;
    const call = dt.isActive ? this.svc.deactivate(dt.docTypeId) : this.svc.activate(dt.docTypeId);
    call.subscribe({
      next: () => {
        this.showSuccess(
          this.translate.instant(
            dt.isActive ? 'admin.documentTypes.success.deactivated' : 'admin.documentTypes.success.activated',
            { name: dt.docTypeName },
          ),
        );
        this.cancelConfirm();
        this.loadDocTypes();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.translate.instant('common.httpErrors.actionFailed'));
        this.cancelConfirm();
      },
    });
  }

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
    if (c.errors['min']) return this.translate.instant('common.validation.min', { count: c.errors['min'].min });
    if (c.errors['max']) return this.translate.instant('common.validation.max', { count: c.errors['max'].max });
    if (c.errors['maxlength']) {
      return this.translate.instant('common.validation.maxLength', {
        count: c.errors['maxlength'].requiredLength,
      });
    }
    if (c.errors['pattern']) return this.translate.instant('admin.workShifts.errors.patternCode');
    return this.translate.instant('common.validation.invalid');
  }
  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
  getCategoryBadge(cat: string): string {
    const map: Record<string, string> = {
      IDENTITY: 'cat-identity',
      CONTRACT: 'cat-contract',
      EDUCATION: 'cat-education',
      CERTIFICATE: 'cat-cert',
      MEDICAL: 'cat-medical',
      FINANCIAL: 'cat-financial',
      OTHER: 'cat-other',
    };
    return map[cat] ?? 'cat-other';
  }
  getExtensions(ext: string): string[] {
    return ext ? ext.split(',').map((e) => e.trim()) : [];
  }
}
