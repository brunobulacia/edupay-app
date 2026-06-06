import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, ParentUser } from '../../../core/services/admin.service';
import { ErpService, FamilyInfo } from '../../../core/services/erp.service';

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatProgressSpinnerModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Usuarios / Padres de familia</h1>

      <!-- Crear usuario -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-base font-semibold text-gray-700 mb-4">Crear cuenta de padre</h2>
        <form [formGroup]="form" (ngSubmit)="create()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Nombre completo</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Familia (opcional)</mat-label>
            <mat-select formControlName="family_id">
              <mat-option [value]="null">Sin asignar</mat-option>
              @for (f of families(); track f.id) {
                <mat-option [value]="f.externalId">{{ f.tutorName }} ({{ f.externalId }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end">
            <button mat-flat-button color="primary" type="submit"
              [disabled]="form.invalid || saving()" aria-label="Crear cuenta">
              @if (saving()) { <mat-spinner diameter="18" class="inline mr-2" /> }
              Crear cuenta
            </button>
          </div>
        </form>
      </div>

      <!-- Lista de usuarios -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 font-semibold text-gray-700 text-sm">
          Usuarios registrados ({{ users().length }})
        </div>
        @if (loading()) {
          <div class="flex justify-center py-12"><mat-spinner diameter="40" /></div>
        } @else {
          <table class="w-full text-sm" aria-label="Lista de usuarios">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-6 py-3 text-left font-medium" scope="col">Nombre</th>
                <th class="px-6 py-3 text-left font-medium" scope="col">Email</th>
                <th class="px-6 py-3 text-center font-medium" scope="col">Rol</th>
                <th class="px-6 py-3 text-center font-medium" scope="col">Familia asignada</th>
                <th class="px-6 py-3 text-center font-medium" scope="col">Asignar familia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (u of users(); track u.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 font-medium text-gray-800">{{ u.name }}</td>
                  <td class="px-6 py-4 text-gray-500">{{ u.email }}</td>
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-medium"
                      [class]="u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'">
                      {{ u.role }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center text-gray-600">
                    {{ u.family_id ?? '—' }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    @if (u.role === 'PARENT') {
                      <select
                        class="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        [value]="u.family_id ?? ''"
                        (change)="onAssign(u, $event)"
                        [attr.aria-label]="'Asignar familia a ' + u.name"
                      >
                        <option value="">Sin asignar</option>
                        @for (f of families(); track f.id) {
                          <option [value]="f.externalId">{{ f.tutorName }} ({{ f.externalId }})</option>
                        }
                      </select>
                    } @else {
                      <span class="text-gray-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly adminSvc = inject(AdminService);
  private readonly erpSvc = inject(ErpService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly users = signal<ParentUser[]>([]);
  readonly families = signal<FamilyInfo[]>([]);

  readonly form = this.fb.group({
    name:      ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(6)]],
    family_id: [null as string | null],
  });

  ngOnInit() {
    this.adminSvc.listUsers().subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.erpSvc.listFamilies().subscribe({
      next: f => this.families.set(f),
    });
  }

  create() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.adminSvc.createUser({ ...v, role: 'PARENT' } as any).subscribe({
      next: u => {
        this.users.update(list => [...list, u]);
        this.form.reset({ family_id: null });
        this.saving.set(false);
        this.snack.open('Cuenta creada correctamente', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Error al crear la cuenta', 'OK', { duration: 4000 });
      },
    });
  }

  onAssign(user: ParentUser, event: Event) {
    const familyId = (event.target as HTMLSelectElement).value || null;
    this.adminSvc.assignFamily(user.id, familyId).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.snack.open('Familia asignada', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Error al asignar familia', 'OK', { duration: 3000 }),
    });
  }
}
