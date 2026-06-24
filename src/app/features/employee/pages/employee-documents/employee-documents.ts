// src/app/features/employee/pages/employee-documents/employee-documents.ts

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

import { EmployeeDocumentService } from '../../services/document.service';
import {
  EmployeeDocument,
  EmpDocTypeOption, // ← renamed to avoid clash with browser DocumentType
} from '../../models/document.model';

@Component({
  selector: 'app-employee-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-documents.html',
  styleUrl: './employee-documents.css',
})
export class EmployeeDocumentsComponent implements OnInit {
  @Input() employeeId!: number;

  private fb = inject(FormBuilder);
  private docSvc = inject(EmployeeDocumentService);
  private destroy = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────
  documents = signal<EmployeeDocument[]>([]);
  docTypes = signal<EmpDocTypeOption[]>([]); // ← renamed type
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Modal state ───────────────────────────────────────────
  showModal = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showConfirm = signal(false);
  confirmItem = signal<EmployeeDocument | null>(null);
  confirmType = signal<'delete' | 'verify'>('delete');

  // ── File upload state ─────────────────────────────────────
  selectedFile = signal<File | null>(null);
  dragOver = signal(false);

  // ── Filter ────────────────────────────────────────────────
  filterCategory = signal('');

  readonly categories = computed(() => {
    const cats = [...new Set(this.documents().map((d) => d.category))];
    return cats;
  });

  readonly filteredDocs = computed(() => {
    const cat = this.filterCategory();
    if (!cat) return this.documents();
    return this.documents().filter((d) => d.category === cat);
  });

  readonly expiredCount = computed(() => this.documents().filter((d) => d.isExpired).length);
  readonly expiringSoonCount = computed(
    () => this.documents().filter((d) => d.isExpiringSoon).length,
  );
  readonly verifiedCount = computed(() => this.documents().filter((d) => d.isVerified).length);

  // ── Form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();
    this.loadDocuments();
    this.loadDocTypes();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      docTypeId: [null, Validators.required],
      documentName: ['', [Validators.required, Validators.maxLength(300)]],
      documentNumber: ['', Validators.maxLength(100)],
      issueDate: [''],
      expiryDate: [''],
      issuedBy: ['', Validators.maxLength(200)],
      notes: ['', Validators.maxLength(500)],
    });
  }

  // ── Load ──────────────────────────────────────────────────
  loadDocuments(): void {
    this.loading.set(true);
    this.docSvc
      .getAll(this.employeeId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.documents.set(res.data);
        },
        error: (err: any) => this.error.set(err?.error?.message || 'Failed to load documents.'),
      });
  }

  loadDocTypes(): void {
    this.docSvc
      .getDocumentTypes()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (res) => {
          if (res.success) this.docTypes.set(res.data);
        },
      });
  }

  // ── Selected type helper ──────────────────────────────────
  getSelectedDocType(): EmpDocTypeOption | null {
    const id = this.ctrl('docTypeId').value;
    return this.docTypes().find((dt) => dt.docTypeId === +id) ?? null;
  }

  // ── File handling ─────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.setFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  private setFile(file: File): void {
    this.selectedFile.set(file);
    if (!this.ctrl('documentName').value) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      this.ctrl('documentName').setValue(nameWithoutExt);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  // ── Modal ─────────────────────────────────────────────────
  openUpload(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.selectedFile.set(null);
    this.form.reset({
      docTypeId: null,
      documentName: '',
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      issuedBy: '',
      notes: '',
    });
    this.error.set(null);
    this.showModal.set(true);
  }

  openEdit(doc: EmployeeDocument): void {
    this.isEditMode.set(true);
    this.editingId.set(doc.documentId);
    this.form.patchValue({
      docTypeId: doc.docTypeId,
      documentName: doc.documentName,
      documentNumber: doc.documentNumber ?? '',
      issueDate: doc.issueDate ?? '',
      expiryDate: doc.expiryDate ?? '',
      issuedBy: doc.issuedBy ?? '',
      notes: doc.notes ?? '',
    });
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.error.set(null);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.isEditMode() && !this.selectedFile()) {
      this.error.set('Please select a file to upload.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.value;

    if (this.isEditMode()) {
      const payload = {
        docTypeId: +v.docTypeId,
        documentName: v.documentName.trim(),
        documentNumber: v.documentNumber || undefined,
        issueDate: v.issueDate || undefined,
        expiryDate: v.expiryDate || undefined,
        issuedBy: v.issuedBy || undefined,
        notes: v.notes || undefined,
      };
      this.docSvc
        .updateInfo(this.employeeId, this.editingId()!, payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.showSuccess('Document updated successfully');
              this.closeModal();
              this.loadDocuments();
            } else this.error.set(res.message);
          },
          error: (err: any) => this.error.set(err?.error?.message || 'Update failed.'),
        });
    } else {
      const formData = new FormData();
      formData.append('file', this.selectedFile()!);
      const metadata = JSON.stringify({
        docTypeId: +v.docTypeId,
        documentName: v.documentName.trim(),
        documentNumber: v.documentNumber || undefined,
        issueDate: v.issueDate || undefined,
        expiryDate: v.expiryDate || undefined,
        issuedBy: v.issuedBy || undefined,
        notes: v.notes || undefined,
      });
      formData.append('metadata', new Blob([metadata], { type: 'application/json' }));

      this.docSvc
        .upload(this.employeeId, formData)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.showSuccess('Document uploaded successfully');
              this.closeModal();
              this.loadDocuments();
            } else this.error.set(res.message);
          },
          error: (err: any) => this.error.set(err?.error?.message || 'Upload failed.'),
        });
    }
  }

  // ── Confirm actions ───────────────────────────────────────
  openVerify(doc: EmployeeDocument): void {
    this.confirmItem.set(doc);
    this.confirmType.set('verify');
    this.showConfirm.set(true);
  }

  openDelete(doc: EmployeeDocument): void {
    this.confirmItem.set(doc);
    this.confirmType.set('delete');
    this.showConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
    this.confirmItem.set(null);
  }

  confirmAction(): void {
    const doc = this.confirmItem();
    if (!doc) return;

    // ── Split into separate subscriptions to avoid union type error ──
    if (this.confirmType() === 'verify') {
      this.docSvc.verify(this.employeeId, doc.documentId).subscribe({
        next: () => {
          this.showSuccess(`"${doc.documentName}" verified`);
          this.cancelConfirm();
          this.loadDocuments();
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || 'Verify failed.');
          this.cancelConfirm();
        },
      });
    } else {
      this.docSvc.delete(this.employeeId, doc.documentId).subscribe({
        next: () => {
          this.showSuccess(`"${doc.documentName}" deleted`);
          this.cancelConfirm();
          this.loadDocuments();
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || 'Delete failed.');
          this.cancelConfirm();
        },
      });
    }
  }

  // ── Download ──────────────────────────────────────────────
  downloadDocument(doc: EmployeeDocument): void {
    this.docSvc.downloadFile(this.employeeId, doc.documentId).subscribe({
      next: (blob: Blob) => {
        // Create temporary object URL and trigger browser download
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = doc.originalFileName || doc.documentName;
        anchor.click();
        // Cleanup
        URL.revokeObjectURL(url);
      },
      error: (err: any) => this.error.set(err?.error?.message || 'Download failed.'),
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

  getFileIcon(ext: string): string {
    const map: Record<string, string> = {
      PDF: 'picture_as_pdf',
      JPG: 'image',
      JPEG: 'image',
      PNG: 'image',
      DOC: 'description',
      DOCX: 'description',
    };
    return map[ext?.toUpperCase()] ?? 'insert_drive_file';
  }

  getFileIconColor(ext: string): string {
    const map: Record<string, string> = {
      PDF: '#e11d48',
      JPG: '#06b6d4',
      JPEG: '#06b6d4',
      PNG: '#06b6d4',
      DOC: '#1e40af',
      DOCX: '#1e40af',
    };
    return map[ext?.toUpperCase()] ?? '#64748b';
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

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
}
