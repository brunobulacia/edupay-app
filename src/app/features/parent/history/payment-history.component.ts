import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED';

@Component({
  selector: 'app-payment-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Historial de pagos</h1>

      @if (loading()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="48" /></div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Historial de pagos">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Fecha</th>
                  <th class="px-6 py-3 text-right font-medium" scope="col">Monto</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Método</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Estado</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Vencimiento</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (p of payments(); track p.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 text-gray-500 text-xs">{{ p.paidAt ?? '—' }}</td>
                    <td class="px-6 py-4 text-right tabular-nums font-semibold">Bs. {{ p.amount }}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{{ p.method }}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(p.status)">
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-gray-500 text-xs">{{ p.dueDate }}</td>
                  </tr>
                }
                @empty {
                  <tr>
                    <td colspan="5" class="px-6 py-16 text-center text-gray-400">
                      No tenés pagos registrados aún
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
export class PaymentHistoryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly payments = signal<any[]>([]);

  ngOnInit() {
    const familyId = this.auth.familyId();
    if (!familyId) { this.loading.set(false); return; }

    this.http.get<any>(`${environment.apiUrl}/pagos/families/${familyId}/balance`).subscribe({
      next: res => {
        const data = res?.data ?? res;
        const list: any[] = data?.payments ?? [];
        this.payments.set(
          list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusClass(status: PaymentStatus): string {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PENDING':   return 'bg-yellow-100 text-yellow-800';
      case 'REVERSED':  return 'bg-red-100 text-red-800';
    }
  }
}
