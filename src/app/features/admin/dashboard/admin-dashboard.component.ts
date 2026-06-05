import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { RiskIndicatorComponent } from '../../../shared/components/risk-indicator/risk-indicator.component';
import { ErpService, CollectionDashboard, DelinquencyDashboard } from '../../../core/services/erp.service';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatProgressSpinnerModule, MatButtonModule, StatCardComponent, RiskIndicatorComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p class="text-sm text-gray-400 mt-1">{{ monthLabel }}</p>
        </div>
        <a routerLink="/admin/bi" mat-stroked-button color="primary" class="text-sm">
          Ver BI completo →
        </a>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else {
        <!-- KPI Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-stat-card
            label="Recaudado este mes"
            [value]="'Bs. ' + (collection()?.totalCollected ?? 0).toLocaleString('es-BO', {minimumFractionDigits:2})"
            icon="payments"
            iconColor="#4f46e5"
            iconBg="#eef2ff"
          />
          <app-stat-card
            label="Métodos activos"
            [value]="collection()?.byMethod?.length ?? 0"
            icon="account_balance_wallet"
            iconColor="#0891b2"
            iconBg="#ecfeff"
          />
          <app-stat-card
            label="Familias en mora"
            [value]="delinquency()?.familiesInArrears ?? 0"
            icon="warning"
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
          <app-stat-card
            label="Deuda acumulada"
            [value]="'Bs. ' + (delinquency()?.totalDebt ?? 0).toLocaleString('es-BO', {minimumFractionDigits:2})"
            icon="account_balance"
            iconColor="#d97706"
            iconBg="#fffbeb"
          />
        </div>

        <!-- Two panels -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recaudación por método -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-semibold text-gray-700">Recaudación por método</h2>
              <a routerLink="/admin/bi/collection" class="text-xs text-indigo-600 hover:underline">Ver detalle →</a>
            </div>
            @if (collection()?.byMethod?.length) {
              <div class="space-y-3">
                @for (m of collection()!.byMethod; track m.paymentMethod) {
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span class="text-sm font-medium text-gray-700">{{ m.paymentMethod }}</span>
                    </div>
                    <span class="text-sm font-semibold tabular-nums">
                      Bs. {{ m.amount.toLocaleString('es-BO', {minimumFractionDigits: 2}) }}
                    </span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-8">Sin pagos registrados este mes</p>
            }
          </div>

          <!-- Morosidad -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-semibold text-gray-700">Estado de morosidad</h2>
              <a routerLink="/admin/bi/delinquency" class="text-xs text-indigo-600 hover:underline">Ver detalle →</a>
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <p class="text-sm text-red-600 font-medium">Familias en mora</p>
                  <p class="text-3xl font-bold text-red-700">{{ delinquency()?.familiesInArrears ?? 0 }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-red-600 font-medium">Monto total</p>
                  <p class="text-lg font-bold text-red-700">
                    Bs. {{ (delinquency()?.totalDebt ?? 0).toLocaleString('es-BO', {minimumFractionDigits: 2}) }}
                  </p>
                </div>
              </div>
              <div class="flex gap-2 text-xs">
                <a routerLink="/admin/families" class="flex-1 text-center py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                  Ver todas las familias
                </a>
                <a routerLink="/admin/bi/segmentation" class="flex-1 text-center py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium">
                  Segmentación IA
                </a>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly collection = signal<CollectionDashboard | null>(null);
  readonly delinquency = signal<DelinquencyDashboard | null>(null);

  private readonly now = new Date();
  readonly monthLabel = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(this.now);

  ngOnInit() {
    const year = this.now.getFullYear();
    const month = this.now.getMonth() + 1;
    let done = 0;
    const finish = () => { done++; if (done === 2) this.loading.set(false); };

    this.erp.getCollectionDashboard(year, month).subscribe({
      next: d => this.collection.set(d),
      complete: finish, error: finish,
    });

    this.erp.getDelinquencyDashboard(year, month).subscribe({
      next: d => this.delinquency.set(d),
      complete: finish, error: finish,
    });
  }
}
