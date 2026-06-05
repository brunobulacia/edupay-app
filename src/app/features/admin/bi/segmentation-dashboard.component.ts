import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';
import { RiskIndicatorComponent } from '../../../shared/components/risk-indicator/risk-indicator.component';
import { ErpService, FamilyInfo, FamilyFinancialStatus } from '../../../core/services/erp.service';
import { ClusterResult, RiskScore } from '../../../core/models/family.model';
import type { EChartsOption } from 'echarts';

interface FamilySegment {
  family: FamilyInfo;
  risk?: RiskScore;
  cluster?: ClusterResult;
}

const CLUSTER_COLORS: Record<string, string> = {
  'PUNTUAL_ESTRELLA': '#16a34a',
  'REGULAR':          '#4f46e5',
  'IRREGULAR':        '#d97706',
  'MOROSO_CRONICO':   '#dc2626',
};

@Component({
  selector: 'app-segmentation-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatButtonModule, MatIconModule, NgxEchartsDirective, RiskIndicatorComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">Datos de segmentación ML desde el servicio de IA</p>
        <button mat-stroked-button color="primary" (click)="load()" [disabled]="loading()" aria-label="Cargar segmentación">
          <mat-icon>refresh</mat-icon>
          {{ loading() ? 'Cargando...' : 'Cargar datos' }}
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else if (segments().length) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Cluster donut -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-base font-semibold text-gray-700 mb-4">Distribución de clusters</h3>
            @if (clusterOption()) {
              <div echarts [options]="clusterOption()!" style="height: 280px;" aria-label="Distribución de clusters"></div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-12">Sin datos de clustering</p>
            }
          </div>

          <!-- Risk distribution -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-base font-semibold text-gray-700 mb-4">Distribución de riesgo</h3>
            @if (riskOption()) {
              <div echarts [options]="riskOption()!" style="height: 280px;" aria-label="Distribución de riesgo"></div>
            }
          </div>
        </div>

        <!-- High risk table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-700">Familias con riesgo alto (&gt; 0.70)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Familias con riesgo alto">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Familia</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Email</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Riesgo</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Cluster</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Acción recomendada</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (s of highRisk(); track s.family.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-800">{{ s.family.tutorName }}</td>
                    <td class="px-6 py-4 text-gray-500">{{ s.family.tutorEmail }}</td>
                    <td class="px-6 py-4 text-center">
                      @if (s.risk) {
                        <app-risk-indicator [level]="s.risk.riskLevel" [score]="s.risk.riskScore" />
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (s.cluster) {
                        <span class="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">{{ s.cluster.clusterLabel }}</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-gray-500 text-xs">{{ s.cluster?.recommendedAction ?? '—' }}</td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No hay familias con riesgo alto</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Presioná "Cargar datos" para obtener la segmentación del servicio de IA</p>
        </div>
      }
    </div>
  `,
})
export class SegmentationDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly erp = inject(ErpService);

  readonly loading = signal(false);
  readonly segments = signal<FamilySegment[]>([]);
  private families: FamilyInfo[] = [];

  readonly highRisk = computed(() =>
    this.segments().filter(s => s.risk && s.risk.riskScore >= 0.7)
      .sort((a, b) => (b.risk?.riskScore ?? 0) - (a.risk?.riskScore ?? 0))
  );

  readonly clusterOption = computed<EChartsOption | null>(() => {
    const clusters = this.segments().filter(s => s.cluster).map(s => s.cluster!);
    if (!clusters.length) return null;
    const counts: Record<string, number> = {};
    clusters.forEach(c => { counts[c.clusterLabel] = (counts[c.clusterLabel] ?? 0) + 1; });
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10 },
      series: [{
        type: 'pie', radius: ['40%', '65%'],
        data: Object.entries(counts).map(([name, value]) => ({
          name, value, itemStyle: { color: CLUSTER_COLORS[name] ?? '#6b7280' },
        })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      }],
    };
  });

  readonly riskOption = computed<EChartsOption | null>(() => {
    const risks = this.segments().filter(s => s.risk).map(s => s.risk!);
    if (!risks.length) return null;
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    risks.forEach(r => counts[r.riskLevel]++);
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['40%', '65%'],
        data: [
          { name: 'Bajo', value: counts.LOW, itemStyle: { color: '#16a34a' } },
          { name: 'Medio', value: counts.MEDIUM, itemStyle: { color: '#d97706' } },
          { name: 'Alto', value: counts.HIGH, itemStyle: { color: '#dc2626' } },
        ],
        label: { formatter: '{b}: {c}' },
      }],
    };
  });

  private familyStatuses: FamilyFinancialStatus[] = [];

  ngOnInit() {
    this.erp.getStudentsInArrears(100).subscribe({
      next: (arrears) => {
        const seenIds = new Set<string>();
        const uniqueIds: string[] = [];
        for (const a of arrears) {
          const id = a.studentExternalId.replace('FAMILY-', '');
          if (!seenIds.has(id)) { seenIds.add(id); uniqueIds.push(id); }
        }
        uniqueIds.forEach(id => {
          this.erp.getFamilyStatus(id).subscribe({
            next: (s: FamilyFinancialStatus) => {
              this.families = [...this.families, s.family];
              this.familyStatuses = [...this.familyStatuses, s];
            },
          });
        });
      },
    });
  }

  load() {
    if (!this.families.length) return;
    this.loading.set(true);
    this.segments.set([]);
    let done = 0;
    const total = this.families.length;

    this.families.forEach(family => {
      const seg: FamilySegment = { family };
      const status = this.familyStatuses.find(s => s.family.id === family.id);
      const totalMonths = Math.max(1, (status?.monthsPaid ?? 0) + (status?.monthsInArrears ?? 0) + (status?.monthsPending ?? 0));
      const mora = +((status?.monthsInArrears ?? 0) / totalMonths).toFixed(2);

      const riskFeatures = {
        avg_days_late_last_3_months:         mora > 0 ? 18.0 : 0.0,
        max_days_late_ever:                  mora > 0 ? 35.0 : 0.0,
        months_paid_on_time_ratio:           +((status?.monthsPaid ?? 0) / totalMonths).toFixed(2),
        consecutive_late_payments:           status?.monthsInArrears ?? 0,
        has_paid_annual_ever:                (status?.monthsPaid ?? 0) >= 10,
        preferred_payment_method_qr:         true,
        preferred_payment_method_stripe:     false,
        preferred_payment_method_blockchain: false,
        avg_payment_day_of_month:            10.0,
        uses_mobile_app:                     true,
        num_students:                        1,
        years_enrolled:                      1,
        has_discount:                        false,
        month:                               new Date().getMonth() + 1,
        is_after_carnaval:                   new Date().getMonth() + 1 > 2,
        months_remaining_year:               Math.max(0, 12 - (new Date().getMonth() + 1)),
      };

      const clusterFeatures = {
        avg_payment_day:     10.0,
        std_dev_payment_day: mora > 0.2 ? 8.0 : 2.0,
        mora_incidence:      mora,
        annual_payer_score:  (status?.monthsPaid ?? 0) >= 10 ? 1.0 : 0.0,
        method_consistency:  1.0,
        months_active:       totalMonths,
      };

      this.http.post<RiskScore>(`http://localhost:80/api/ia/families/${family.id}/risk-score`, riskFeatures)
        .subscribe({ next: r => seg.risk = r });

      this.http.post<ClusterResult>(`http://localhost:80/api/ia/families/${family.id}/cluster`, clusterFeatures)
        .subscribe({
          next: c => seg.cluster = c,
          complete: () => {
            done++;
            this.segments.update(list => [...list, seg]);
            if (done === total) this.loading.set(false);
          },
          error: () => {
            done++;
            this.segments.update(list => [...list, seg]);
            if (done === total) this.loading.set(false);
          },
        });
    });
  }
}
