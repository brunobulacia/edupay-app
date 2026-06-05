import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { RiskIndicatorComponent } from '../../../shared/components/risk-indicator/risk-indicator.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ErpService, FamilyFinancialStatus } from '../../../core/services/erp.service';

const MONTHS = [
  { n: 2, label: 'Feb' }, { n: 3, label: 'Mar' }, { n: 4, label: 'Abr' },
  { n: 5, label: 'May' }, { n: 6, label: 'Jun' }, { n: 7, label: 'Jul' },
  { n: 8, label: 'Ago' }, { n: 9, label: 'Sep' }, { n: 10, label: 'Oct' },
  { n: 11, label: 'Nov' },
];

@Component({
  selector: 'app-parent-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatProgressSpinnerModule, MatButtonModule, StatCardComponent, RiskIndicatorComponent],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">
        Hola, {{ auth.userName() ?? 'bienvenido' }}
      </h1>

      @if (!auth.familyId()) {
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p class="text-yellow-800 font-medium">Tu cuenta aún no está vinculada a una familia.</p>
          <p class="text-yellow-600 text-sm mt-1">Contactá al administrador del colegio para que te asigne.</p>
        </div>
      } @else if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else if (status()) {
        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <app-stat-card
            label="Meses pagados"
            [value]="status()!.monthsPaid"
            icon="check_circle"
            iconColor="#16a34a"
            iconBg="#f0fdf4"
          />
          <app-stat-card
            label="Meses pendientes"
            [value]="status()!.monthsPending"
            icon="schedule"
            iconColor="#d97706"
            iconBg="#fffbeb"
          />
          <app-stat-card
            label="Deuda acumulada"
            [value]="'Bs. ' + status()!.totalDebt.toLocaleString('es-BO', {minimumFractionDigits:2})"
            icon="account_balance"
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
        </div>

        <!-- Month grid -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-gray-700">Estado de pagos — Año escolar</h2>
            <a routerLink="/parent/payments" mat-flat-button color="primary" class="text-sm">
              Pagar ahora
            </a>
          </div>

          <div class="flex flex-wrap gap-2 mb-4">
            @for (m of months; track m.n) {
              <span
                class="px-3 py-2 rounded-lg text-xs font-semibold w-12 text-center cursor-default"
                [class]="monthClass(m.n)"
                [attr.aria-label]="m.label + ': ' + monthState(m.n)"
                [title]="monthState(m.n)"
              >
                {{ m.label }}
              </span>
            }
          </div>

          <div class="flex gap-4 text-xs text-gray-500">
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-green-200 inline-block"></span> Pagado
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-red-200 inline-block"></span> En mora
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-yellow-200 inline-block"></span> Pendiente
            </span>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a routerLink="/parent/payments"
             class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:border-indigo-300 transition-colors group">
            <span class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
              <span class="material-icons text-base!">receipt_long</span>
            </span>
            <div>
              <p class="font-medium text-gray-800">Mis pagos</p>
              <p class="text-xs text-gray-400">Ver y registrar pagos</p>
            </div>
          </a>
          <a routerLink="/parent/history"
             class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:border-indigo-300 transition-colors group">
            <span class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
              <span class="material-icons text-base!">history</span>
            </span>
            <div>
              <p class="font-medium text-gray-800">Historial</p>
              <p class="text-xs text-gray-400">Pagos anteriores y recibos</p>
            </div>
          </a>
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          No se pudo cargar tu información. Intentá más tarde.
        </div>
      }
    </div>
  `,
})
export class ParentDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly status = signal<FamilyFinancialStatus | null>(null);

  readonly months = MONTHS;

  monthState(n: number): string {
    const s = this.status();
    if (!s) return 'sin datos';
    if (n <= s.monthsPaid + 1) return 'pagado';
    if (n <= s.monthsPaid + 1 + s.monthsInArrears) return 'en mora';
    return 'pendiente';
  }

  monthClass(n: number): string {
    switch (this.monthState(n)) {
      case 'pagado':   return 'bg-green-100 text-green-800';
      case 'en mora':  return 'bg-red-100 text-red-800';
      default:         return 'bg-yellow-100 text-yellow-800';
    }
  }

  ngOnInit() {
    const familyId = this.auth.familyId();
    if (!familyId) { this.loading.set(false); return; }

    this.erp.getFamilyStatus(familyId).subscribe({
      next: s => { this.status.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
