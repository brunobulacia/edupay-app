import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

interface UploadedDoc {
  name: string;
  size: string;
  status: 'uploading' | 'done' | 'error';
  result?: any;
}

@Component({
  selector: 'app-document-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Subir documentos</h1>
      <p class="text-sm text-gray-500">Subí tus documentos para que el administrador los revise. Formatos aceptados: PDF, JPG, PNG.</p>

      <!-- Drop zone -->
      <div
        class="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer"
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
        <p class="text-xs text-gray-400 mt-1">Máx. 10 MB por archivo</p>
        <input #fileInput type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelect($event)" />
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
                  @if (doc.result?.extractedText) {
                    <div class="text-right max-w-xs">
                      <span class="text-xs text-green-600 font-medium">OCR exitoso</span>
                      <p class="text-xs text-gray-400 truncate">{{ doc.result.extractedText }}</p>
                    </div>
                  } @else {
                    <mat-icon class="text-green-500">check_circle</mat-icon>
                  }
                } @else {
                  <mat-icon class="text-red-500">error</mat-icon>
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

  readonly dragging = signal(false);
  readonly docs = signal<UploadedDoc[]>([]);

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
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        this.snack.open(`${file.name} supera el límite de 10 MB`, 'OK', { duration: 4000 });
        return;
      }

      const doc: UploadedDoc = {
        name: file.name,
        size: this.formatSize(file.size),
        status: 'uploading',
      };
      this.docs.update(list => [...list, doc]);

      const formData = new FormData();
      formData.append('imagen', file);
      if (this.auth.familyId()) formData.append('familyId', this.auth.familyId()!);

      this.http.post<any>('http://localhost:80/api/ia/ocr', formData).subscribe({
        next: result => {
          this.docs.update(list =>
            list.map(d => d.name === doc.name ? { ...d, status: 'done', result } : d)
          );
        },
        error: () => {
          this.docs.update(list =>
            list.map(d => d.name === doc.name ? { ...d, status: 'error' } : d)
          );
          this.snack.open(`Error al subir ${file.name}`, 'OK', { duration: 3000 });
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
