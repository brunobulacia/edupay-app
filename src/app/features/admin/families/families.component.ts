import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ErpService, FamilyFinancialStatus } from '../../../core/services/erp.service';

interface FamilyRow {
  id: string;
  tutorName: string;
  tutorEmail: string;
  externalId: string;
  active: boolean;
  totalDebt: number;
  monthsInArrears: number;
}

@Component({
  selector: 'app-families',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Familias</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-400">{{ filtered().length }} registros</span>
          <a
            routerLink="/admin/families/new"
            class="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            aria-label="Registrar nueva familia"
          >
            <mat-icon class="text-base! w-4! h-4!">add</mat-icon>
            Nueva familia
          </a>
        </div>
      </div>

      <!-- Search -->
      <mat-form-field appearance="outline" class="w-full max-w-sm">
        <mat-label>Buscar por nombre o email</mat-label>
        <input matInput [formControl]="search" autocomplete="off" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      @if (loading()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="48" /></div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Lista de familias">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Tutor</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Email</th>
                  <th class="px-6 py-3 text-right font-medium" scope="col">Deuda</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Mora</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Estado</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (f of filtered(); track f.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-800">{{ f.tutorName }}</td>
                    <td class="px-6 py-4 text-gray-500">{{ f.tutorEmail }}</td>
                    <td class="px-6 py-4 text-right tabular-nums" [class]="f.totalDebt > 0 ? 'text-red-600 font-semibold' : 'text-green-600'">
                      Bs. {{ f.totalDebt.toLocaleString('es-BO', {minimumFractionDigits: 2}) }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (f.monthsInArrears > 0) {
                        <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          {{ f.monthsInArrears }} {{ f.monthsInArrears === 1 ? 'mes' : 'meses' }}
                        </span>
                      } @else {
                        <span class="text-green-600 text-xs">Al día</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 rounded-full text-xs font-medium"
                        [class]="f.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'">
                        {{ f.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <a
                        [routerLink]="['/admin/families', f.id]"
                        class="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                        [attr.aria-label]="'Ver detalle de ' + f.tutorName"
                      >
                        <mat-icon class="text-sm! w-4! h-4!">visibility</mat-icon>
                        Ver
                      </a>
                    </td>
                  </tr>
                }
                @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                      @if (search.value) { No hay resultados para "{{ search.value }}" }
                      @else { No hay familias registradas }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class FamiliesComponent implements OnInit {
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly families = signal<FamilyRow[]>([]);
  readonly search = new FormControl('');

  readonly filtered = computed(() => {
    const q = (this.search.value ?? '').toLowerCase();
    return q
      ? this.families().filter(f =>
          f.tutorName.toLowerCase().includes(q) || f.tutorEmail.toLowerCase().includes(q))
      : this.families();
  });

  ngOnInit() {
    // studentsInArrears gives us unique family IDs in "FAMILY-{id}" format
    this.erp.getStudentsInArrears(200).subscribe({
      next: (arrears) => {
        // Deduplicate family IDs
        const seenIds = new Set<string>();
        const uniqueFamilyIds: string[] = [];
        for (const a of arrears) {
          const id = a.studentExternalId.replace('FAMILY-', '');
          if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueFamilyIds.push(id);
          }
        }

        if (uniqueFamilyIds.length === 0) {
          this.loading.set(false);
          return;
        }

        // Placeholder rows while enriching
        const placeholders: FamilyRow[] = uniqueFamilyIds.map(id => ({
          id, tutorName: '…', tutorEmail: '', externalId: '', active: true,
          totalDebt: 0, monthsInArrears: 0,
        }));
        this.families.set(placeholders);
        this.loading.set(false);

        // Enrich each with familyFinancialStatus
        let resolved = 0;
        for (const familyId of uniqueFamilyIds) {
          this.erp.getFamilyStatus(familyId).subscribe({
            next: (status: FamilyFinancialStatus) => {
              this.families.update(list =>
                list.map(f => f.id === familyId
                  ? {
                      id: status.family.id,
                      tutorName: status.family.tutorName,
                      tutorEmail: status.family.tutorEmail,
                      externalId: status.family.externalId,
                      active: status.family.active,
                      totalDebt: status.totalDebt,
                      monthsInArrears: status.monthsInArrears,
                    }
                  : f)
              );
            },
            error: () => { resolved++; },
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
