import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RiskIndicatorComponent } from '../../../shared/components/risk-indicator/risk-indicator.component';
import { ErpService, FamilyFinancialStatus } from '../../../core/services/erp.service';
import { RiskScore, ClusterResult } from '../../../core/models/family.model';
import { environment } from '../../../../environments/environment';

const MONTHS = [
  { n: 2, label: 'Feb' }, { n: 3, label: 'Mar' }, { n: 4, label: 'Abr' },
  { n: 5, label: 'May' }, { n: 6, label: 'Jun' }, { n: 7, label: 'Jul' },
  { n: 8, label: 'Ago' }, { n: 9, label: 'Sep' }, { n: 10, label: 'Oct' },
  { n: 11, label: 'Nov' },
];

@Component({
  selector: 'app-family-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatProgressSpinnerModule, MatTabsModule, MatIconModule, MatButtonModule, RiskIndicatorComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <a routerLink="/admin/families" class="text-indigo-600 hover:underline text-sm flex items-center gap-1">
          <mat-icon class="text-base! w-4! h-4!">arrow_back</mat-icon>
          Familias
        </a>
        <mat-icon class="text-gray-400">chevron_right</mat-icon>
        <span class="font-semibold text-gray-700">{{ status()?.family?.tutorName ?? 'Cargando...' }}</span>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else if (status()) {
        <!-- Family card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">{{ status()!.family.tutorName }}</h1>
              <p class="text-gray-500 text-sm mt-1">{{ status()!.family.tutorEmail }}</p>
              <p class="text-xs text-gray-400 mt-1">ID: {{ status()!.family.externalId ?? status()!.family.id }}</p>
            </div>
            <div class="flex gap-3 flex-wrap">
              <span
                class="px-3 py-1 rounded-full text-xs font-semibold"
                [class]="status()!.family.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'"
              >
                {{ status()!.family.active ? 'Activo' : 'Inactivo' }}
              </span>
              @if (risk()) {
                <app-risk-indicator [level]="risk()!.riskLevel" [score]="risk()!.riskScore" />
              }
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <mat-tab-group dynamicHeight>
          <!-- Estado de cuenta -->
          <mat-tab label="Estado de cuenta">
            <div class="pt-6 space-y-6">
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-indigo-50 rounded-xl p-4 text-center">
                  <p class="text-xs text-indigo-600 font-medium">Meses pagados</p>
                  <p class="text-3xl font-bold text-indigo-700">{{ status()!.monthsPaid }}</p>
                </div>
                <div class="bg-yellow-50 rounded-xl p-4 text-center">
                  <p class="text-xs text-yellow-700 font-medium">Meses pendientes</p>
                  <p class="text-3xl font-bold text-yellow-700">{{ status()!.monthsPending }}</p>
                </div>
                <div class="bg-red-50 rounded-xl p-4 text-center">
                  <p class="text-xs text-red-600 font-medium">En mora</p>
                  <p class="text-3xl font-bold text-red-700">{{ status()!.monthsInArrears }}</p>
                </div>
              </div>

              <div class="bg-white rounded-xl border border-gray-100 p-5">
                <p class="text-sm font-semibold text-gray-600 mb-3">Grilla de meses (Feb – Nov)</p>
                <div class="flex flex-wrap gap-2">
                  @for (m of months; track m.n) {
                    <span
                      class="px-3 py-2 rounded-lg text-xs font-medium w-14 text-center"
                      [class]="monthClass(m.n)"
                      [attr.aria-label]="m.label"
                    >
                      {{ m.label }}
                    </span>
                  }
                </div>
              </div>

              <div class="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <span class="text-sm text-gray-600">Deuda total acumulada</span>
                <span class="text-xl font-bold text-red-600">Bs. {{ status()!.totalDebt.toLocaleString('es-BO', {minimumFractionDigits: 2}) }}</span>
              </div>
            </div>
          </mat-tab>

          <!-- ML / IA -->
          <mat-tab label="Análisis IA">
            <div class="pt-6 space-y-4">
              @if (risk()) {
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                  <h3 class="font-semibold text-gray-700 mb-3">Score de riesgo</h3>
                  <div class="flex items-center gap-4 mb-3">
                    <app-risk-indicator [level]="risk()!.riskLevel" [score]="risk()!.riskScore" />
                  </div>
                  <p class="text-xs text-gray-400">Modelo: {{ risk()!.modelVersion }} · {{ risk()!.predictionDate }}</p>
                </div>
              }
              @if (cluster()) {
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                  <h3 class="font-semibold text-gray-700 mb-3">Segmentación (Cluster)</h3>
                  <span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium">
                    Cluster {{ cluster()!.cluster }}: {{ cluster()!.clusterLabel }}
                  </span>
                  <p class="text-sm text-gray-600 mt-3">
                    <span class="font-medium">Acción recomendada:</span> {{ cluster()!.recommendedAction }}
                  </p>
                  <p class="text-xs text-gray-400 mt-2">Modelo: {{ cluster()!.modelVersion }}</p>
                </div>
              }
              @if (!risk() && !cluster()) {
                <p class="text-gray-400 text-center py-8">No se pudieron cargar los datos de IA</p>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      } @else {
        <p class="text-center text-gray-400 py-12">No se encontró la familia</p>
      }
    </div>
  `,
})
export class FamilyDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly erp = inject(ErpService);
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly status = signal<FamilyFinancialStatus | null>(null);
  readonly risk = signal<RiskScore | null>(null);
  readonly cluster = signal<ClusterResult | null>(null);

  readonly months = MONTHS;

  monthClass(n: number): string {
    const s = this.status();
    if (!s) return 'bg-gray-100 text-gray-400';
    const paid = s.monthsPaid;
    const arrears = s.monthsInArrears;
    if (n <= paid + 1) return 'bg-green-100 text-green-800';
    if (n <= paid + 1 + arrears) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  }

  ngOnInit() {
    const id = this.id();
    this.erp.getFamilyStatus(id).subscribe({
      next: s => {
        this.status.set(s);
        this.loading.set(false);
        this.fetchIa(id, s);
      },
      error: () => this.loading.set(false),
    });
  }

  private fetchIa(id: string, s: FamilyFinancialStatus) {
    const total = Math.max(1, s.monthsPaid + s.monthsInArrears + s.monthsPending);
    const onTimeRatio = +(s.monthsPaid / total).toFixed(2);
    const moraIncidence = +(s.monthsInArrears / total).toFixed(2);
    const now = new Date();
    const month = now.getMonth() + 1;

    const riskFeatures = {
      avg_days_late_last_3_months:         s.monthsInArrears > 0 ? 18.0 : 0.0,
      max_days_late_ever:                  s.monthsInArrears > 0 ? 35.0 : 0.0,
      months_paid_on_time_ratio:           onTimeRatio,
      consecutive_late_payments:           s.monthsInArrears,
      has_paid_annual_ever:                s.monthsPaid >= 10,
      preferred_payment_method_qr:         true,
      preferred_payment_method_stripe:     false,
      preferred_payment_method_blockchain: false,
      avg_payment_day_of_month:            10.0,
      uses_mobile_app:                     true,
      num_students:                        1,
      years_enrolled:                      1,
      has_discount:                        false,
      month,
      is_after_carnaval:                   month > 2,
      months_remaining_year:               Math.max(0, 12 - month),
    };

    const clusterFeatures = {
      avg_payment_day:     10.0,
      std_dev_payment_day: s.monthsInArrears > 1 ? 8.0 : 2.0,
      mora_incidence:      moraIncidence,
      annual_payer_score:  s.monthsPaid >= 10 ? 1.0 : 0.0,
      method_consistency:  1.0,
      months_active:       total,
    };

    this.http.post<RiskScore>(`${environment.apiUrl}/ia/families/${id}/risk-score`, riskFeatures)
      .subscribe({ next: r => this.risk.set(r) });

    this.http.post<ClusterResult>(`${environment.apiUrl}/ia/families/${id}/cluster`, clusterFeatures)
      .subscribe({ next: c => this.cluster.set(c) });
  }
}
