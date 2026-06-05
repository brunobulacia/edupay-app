import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { interval, Subscription } from 'rxjs';
import { ErpService } from '../../../core/services/erp.service';
import { AuthService } from '../../../core/auth/auth.service';

interface PendingDocument {
  id: string;
  familyName: string;
  type: string;
  fileName: string;
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Component({
  selector: 'app-document-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Cola de documentos</h1>
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            [class]="polling() ? 'bg-green-400 animate-pulse' : 'bg-gray-300'"
          ></span>
          <span class="text-xs text-gray-500">{{
            polling() ? 'Actualizando automáticamente' : 'En pausa'
          }}</span>
          <button
            mat-icon-button
            (click)="togglePolling()"
            [attr.aria-label]="polling() ? 'Pausar' : 'Reanudar'"
          >
            <mat-icon>{{ polling() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Review form inline -->
      @if (reviewing()) {
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-indigo-800">Revisando: {{ reviewing()!.fileName }}</h2>
            <button mat-icon-button (click)="reviewing.set(null)" aria-label="Cerrar">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Familia:</span>
              <span class="font-medium">{{ reviewing()!.familyName }}</span>
            </div>
            <div>
              <span class="text-gray-500">Tipo:</span>
              <span class="font-medium">{{ reviewing()!.type }}</span>
            </div>
          </div>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Motivo (requerido para rechazo)</mat-label>
            <input matInput [formControl]="reasonControl" />
          </mat-form-field>

          <div class="flex gap-3">
            <button
              mat-flat-button
              color="primary"
              (click)="approve()"
              [disabled]="submitting()"
              aria-label="Aprobar documento"
              class="flex-1"
            >
              <mat-icon>check_circle</mat-icon>
              Aprobar
            </button>
            <button
              mat-stroked-button
              color="warn"
              (click)="reject()"
              [disabled]="submitting() || !reasonControl.value"
              aria-label="Rechazar documento"
              class="flex-1"
            >
              <mat-icon>cancel</mat-icon>
              Rechazar
            </button>
          </div>
        </div>
      }

      <!-- Document table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Cola de documentos pendientes">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-6 py-3 text-left font-medium" scope="col">Familia</th>
                <th class="px-6 py-3 text-left font-medium" scope="col">Tipo</th>
                <th class="px-6 py-3 text-left font-medium" scope="col">Archivo</th>
                <th class="px-6 py-3 text-left font-medium" scope="col">Subido</th>
                <th class="px-6 py-3 text-center font-medium" scope="col">Estado</th>
                <th class="px-6 py-3 text-center font-medium" scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (doc of docs(); track doc.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 font-medium text-gray-800">{{ doc.familyName }}</td>
                  <td class="px-6 py-4 text-gray-600">{{ doc.type }}</td>
                  <td class="px-6 py-4 text-gray-500 text-xs font-mono">{{ doc.fileName }}</td>
                  <td class="px-6 py-4 text-gray-400 text-xs">{{ doc.uploadedAt }}</td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [class]="statusClass(doc.status)"
                    >
                      {{ statusLabel(doc.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    @if (doc.status === 'PENDING') {
                      <button
                        mat-stroked-button
                        color="primary"
                        class="text-xs"
                        (click)="startReview(doc)"
                        [attr.aria-label]="'Revisar documento de ' + doc.familyName"
                      >
                        Revisar
                      </button>
                    } @else {
                      <span class="text-gray-400 text-xs">Revisado</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-16 text-center">
                    <mat-icon
                      class="text-gray-200 mb-2"
                      style="font-size: 48px; width: 48px; height: 48px;"
                      >inbox</mat-icon
                    >
                    <p class="text-gray-400">No hay documentos pendientes de revisión</p>
                    <p class="text-xs text-gray-300 mt-1">
                      Los documentos aparecerán aquí cuando los padres los suban
                    </p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class DocumentQueueComponent implements OnInit, OnDestroy {
  private readonly erp = inject(ErpService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly docs = signal<PendingDocument[]>([]);
  readonly reviewing = signal<PendingDocument | null>(null);
  readonly submitting = signal(false);
  readonly polling = signal(true);

  readonly reasonControl = this.fb.control('');

  private pollSub?: Subscription;

  ngOnInit() {
    this.startPolling();
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  togglePolling() {
    if (this.polling()) {
      this.polling.set(false);
      this.pollSub?.unsubscribe();
    } else {
      this.polling.set(true);
      this.startPolling();
    }
  }

  startReview(doc: PendingDocument) {
    this.reviewing.set(doc);
    this.reasonControl.reset();
  }

  approve() {
    const doc = this.reviewing();
    if (!doc) return;
    this.submitReview(doc, 'APPROVED', undefined);
  }

  reject() {
    const doc = this.reviewing();
    const reason = this.reasonControl.value;
    if (!doc || !reason) return;
    this.submitReview(doc, 'REJECTED', reason);
  }

  private submitReview(
    doc: PendingDocument,
    status: 'APPROVED' | 'REJECTED',
    reason?: string | null,
  ) {
    this.submitting.set(true);
    this.erp
      .reviewDocument({
        documentId: doc.id,
        reviewerUser: this.auth.userName() ?? 'admin',
        status,
        reason: reason ?? undefined,
      })
      .subscribe({
        next: () => {
          this.docs.update((list) => list.map((d) => (d.id === doc.id ? { ...d, status } : d)));
          this.reviewing.set(null);
          this.submitting.set(false);
          this.snack.open(
            status === 'APPROVED' ? 'Documento aprobado' : 'Documento rechazado',
            'OK',
            { duration: 3000 },
          );
        },
        error: (err) => {
          this.submitting.set(false);
          this.snack.open(err?.message ?? 'Error al procesar el documento', 'OK', {
            duration: 4000,
          });
        },
      });
  }

  private startPolling() {
    // Poll every 30s — replace with GraphQL subscription when WS is enabled in ms-erp
    this.pollSub = interval(30_000).subscribe(() => this.loadDocs());
    this.loadDocs();
  }

  private loadDocs() {
    this.erp.listDocuments().subscribe({
      next: (docs) =>
        this.docs.set(
          docs.map((d) => ({
            id: d.id,
            familyName: d.familyName,
            type: d.documentType,
            fileName: d.storageKey,
            uploadedAt: d.uploadedAt,
            status: d.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          })),
        ),
      error: () => {},
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  }
}
