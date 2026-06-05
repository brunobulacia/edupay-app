import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe, DatePipe } from '@angular/common';

type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED' | 'REVERSED';

@Component({
  selector: 'app-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatIconModule, DecimalPipe, DatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Pagos</h1>
        <span class="text-sm text-gray-400">{{ payments().length }} registros</span>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="48" aria-label="Cargando pagos" />
        </div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Lista de pagos">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-left font-medium" scope="col">ID</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Familia</th>
                  <th class="px-6 py-3 text-right font-medium" scope="col">Monto</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Método</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Estado</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Período</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (p of payments(); track p.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 text-gray-400 text-xs font-mono">#{{ p.id }}</td>
                    <td class="px-6 py-4 font-medium text-gray-800">{{ p.familyId }}</td>
                    <td class="px-6 py-4 text-right tabular-nums font-semibold text-gray-800">
                      Bs. {{ p.amount | number: '1.2-2' }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span
                        class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                        >{{ p.method }}</span
                      >
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        [class]="statusClass(p.status)"
                      >
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center text-gray-500 text-xs">{{ p.periodCode }}</td>
                    <td class="px-6 py-4 text-gray-500 text-xs">
                      {{ p.createdAt | date: 'dd/MM/yyyy' }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                      No hay pagos registrados
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
export class PaymentsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly payments = signal<any[]>([]);

  ngOnInit() {
    this.http.get<any>('http://localhost/api/pagos/payments').subscribe({
      next: (res) => {
        const list = res?.data ?? res;
        this.payments.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusClass(status: PaymentStatus): string {
    const map: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      REVERSED: 'bg-gray-100 text-gray-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}
