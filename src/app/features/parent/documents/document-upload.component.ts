import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

const DOC_TYPES = [
  { value: 'CI_TUTOR',        label: 'CI del Tutor' },
  { value: 'CI_ALUMNO',       label: 'CI del Alumno' },
  { value: 'CERT_NACIMIENTO', label: 'Certificado de Nacimiento' },
  { value: 'CONTRATO',        label: 'Contrato de Inscripción' },
  { value: 'COMPROBANTE',     label: 'Comprobante de Pago' },
];

interface UploadedDoc {
  name: string;
  size: string;
  status: 'uploading' | 'done' | 'error';
}

@Component({
  selector: 'app-document-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Subir documentos</h1>
      <p class="text-sm text-gray-500">Subí tus documentos para que el administrador los revise. Formatos aceptados: PDF, JPG, PNG.</p>

      <!-- Tipo de documento -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <mat-form-field appearance="outline" class="w-full max-w-sm">
          <mat-label>Tipo de documento</mat-label>
          <mat-select [formControl]="docTypeControl">
            @for (t of docTypes; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Drop zone -->
        <div
          class="mt-4 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer"
          [class]="dragging() ? 'border-indigo-500 bg-indigo-50' : ''"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
          role="button"
          aria-label="Área para subir documentos"
          tabindex="0"
          (keydown.enter)="fileInput.click()"
        >
          <mat-icon class="text-gray-300 mb-3" style="font-size: 48px; width: 48px; height: 48px;">cloud_upload</mat-icon>
          <p class="text-gray-500 font-medium">Arrastrá archivos aquí o hacé clic para seleccionar</p>
          <p class="text-xs text-gray-400 mt-1">Máx. 10 MB — PDF, JPG, PNG</p>
          <input #fileInput type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelect($event)" />
        </div>
      </div>

      <!-- Upload list -->
      @if (docs().length) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700 text-sm">
            Documentos subidos ({{ docs().length }})
          </div>
          <ul class="divide-y divide-gray-100" aria-label="Documentos subidos">
            @for (doc of docs(); track doc.name) {
              <li class="px-6 py-4 flex items-center gap-4">
                <mat-icon class="text-gray-400 shrink-0">insert_drive_file</mat-icon>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ doc.name }}</p>
                  <p class="text-xs text-gray-400">{{ doc.size }}</p>
                </div>
                @if (doc.status === 'uploading') {
                  <mat-spinner diameter="20" />
                } @else if (doc.status === 'done') {
                  <div class="flex items-center gap-1 text-green-600">
                    <mat-icon class="text-base!">check_circle</mat-icon>
                    <span class="text-xs font-medium">Enviado para revisión</span>
                  </div>
                } @else {
                  <div class="flex items-center gap-1 text-red-500">
                    <mat-icon class="text-base!">error</mat-icon>
                    <span class="text-xs">Error al subir</span>
                  </div>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class DocumentUploadComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly dragging = signal(false);
  readonly docs = signal<UploadedDoc[]>([]);
  readonly docTypes = DOC_TYPES;

  readonly docTypeControl = this.fb.control('CI_TUTOR', Validators.required);

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.uploadFiles(Array.from(files));
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  private uploadFiles(files: File[]) {
    if (!this.docTypeControl.value) {
      this.snack.open('Seleccioná el tipo de documento primero', 'OK', { duration: 3000 });
      return;
    }

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        this.snack.open(`${file.name} supera el límite de 10 MB`, 'OK', { duration: 4000 });
        return;
      }

      const doc: UploadedDoc = { name: file.name, size: this.formatSize(file.size), status: 'uploading' };
      this.docs.update(list => [...list, doc]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', this.docTypeControl.value!);
      formData.append('family_id', this.auth.familyId() ?? '');

      this.http.post<any>(`${environment.apiUrl}/documents/upload`, formData).subscribe({
        next: () => {
          this.docs.update(list => list.map(d => d.name === doc.name ? { ...d, status: 'done' } : d));
        },
        error: err => {
          this.docs.update(list => list.map(d => d.name === doc.name ? { ...d, status: 'error' } : d));
          this.snack.open(err?.error?.error ?? `Error al subir ${file.name}`, 'OK', { duration: 4000 });
        },
      });
    });
  }

  private formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
