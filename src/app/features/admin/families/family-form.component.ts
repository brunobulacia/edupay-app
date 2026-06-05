import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ErpService } from '../../../core/services/erp.service';

@Component({
  selector: 'app-family-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="max-w-xl space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <a routerLink="/admin/families" class="text-indigo-600 hover:underline text-sm flex items-center gap-1">
          <mat-icon class="text-base! w-4! h-4!">arrow_back</mat-icon>
          Familias
        </a>
        <mat-icon class="text-gray-400">chevron_right</mat-icon>
        <span class="font-semibold text-gray-700">Nueva familia</span>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-xl font-bold text-gray-800 mb-6">Registrar nueva familia</h1>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>ID externo (cédula o código)</mat-label>
            <input matInput formControlName="externalId" placeholder="ej. 12345678" aria-required="true" />
            <mat-icon matPrefix>badge</mat-icon>
            @if (form.get('externalId')?.invalid && form.get('externalId')?.touched) {
              <mat-error>El ID externo es requerido</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre del tutor</mat-label>
            <input matInput formControlName="tutorName" placeholder="ej. Juan Pérez" aria-required="true" autocomplete="name" />
            <mat-icon matPrefix>person</mat-icon>
            @if (form.get('tutorName')?.invalid && form.get('tutorName')?.touched) {
              <mat-error>El nombre es requerido</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Email del tutor</mat-label>
            <input matInput type="email" formControlName="tutorEmail" placeholder="ej. juan@email.com" aria-required="true" autocomplete="email" />
            <mat-icon matPrefix>email</mat-icon>
            @if (form.get('tutorEmail')?.invalid && form.get('tutorEmail')?.touched) {
              <mat-error>Ingresá un email válido</mat-error>
            }
          </mat-form-field>

          @if (errorMsg()) {
            <p class="text-red-600 text-sm" role="alert">{{ errorMsg() }}</p>
          }

          <div class="flex gap-3 pt-2">
            <button
              mat-flat-button color="primary"
              type="submit"
              [disabled]="saving()"
              aria-label="Guardar familia"
              class="flex-1"
            >
              @if (saving()) { <mat-spinner diameter="18" class="inline-block mr-2" /> }
              Guardar familia
            </button>
            <a routerLink="/admin/families" mat-stroked-button aria-label="Cancelar">
              Cancelar
            </a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class FamilyFormComponent {
  private readonly erp = inject(ErpService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    externalId: ['', Validators.required],
    tutorName:  ['', Validators.required],
    tutorEmail: ['', [Validators.required, Validators.email]],
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);

    const { externalId, tutorName, tutorEmail } = this.form.getRawValue();
    this.erp.registerFamily({ externalId: externalId!, tutorName: tutorName!, tutorEmail: tutorEmail! }).subscribe({
      next: () => {
        this.snack.open('Familia registrada exitosamente', 'OK', { duration: 3000 });
        this.router.navigate(['/admin/families']);
      },
      error: (err) => {
        this.errorMsg.set(err?.message ?? 'Error al registrar la familia');
        this.saving.set(false);
      },
    });
  }
}
