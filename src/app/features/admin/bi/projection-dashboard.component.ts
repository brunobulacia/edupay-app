import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ErpService } from '../../../core/services/erp.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import type { EChartsOption } from 'echarts';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Component({
  selector: 'app-projection-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, NgxEchartsDirective, StatCardComponent],
  template: `
    <div class="space-y-6">
      @if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else {
        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <app-stat-card
            label="Recaudado en el año"
            [value]="'Bs. ' + totalYear().toLocaleString('es-BO', {minimumFractionDigits: 2})"
            icon="trending_up"
            iconColor="#4f46e5"
            iconBg="#eef2ff"
          />
          <app-stat-card
            label="Proyección cierre de año"
            [value]="'Bs. ' + projected().toLocaleString('es-BO', {minimumFractionDigits: 2})"
            icon="query_stats"
            iconColor="#0891b2"
            iconBg="#ecfeff"
          />
          <app-stat-card
            label="Avance anual"
            [value]="advancePct() + '%'"
            icon="donut_large"
            [iconColor]="advancePct() >= 70 ? '#16a34a' : '#d97706'"
            [iconBg]="advancePct() >= 70 ? '#f0fdf4' : '#fffbeb'"
          />
        </div>

        <!-- Area chart -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-base font-semibold text-gray-700 mb-4">Real vs Proyectado {{ currentYear }}</h3>
          @if (areaOption()) {
            <div echarts [options]="areaOption()!" style="height: 320px;" aria-label="Gráfico real vs proyectado"></div>
          }
        </div>
      }
    </div>
  `,
})
export class ProjectionDashboardComponent implements OnInit {
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly history = signal<{ month: number; total: number }[]>([]);
  readonly currentYear = new Date().getFullYear();
  private readonly currentMonth = new Date().getMonth() + 1;

  readonly totalYear = computed(() => this.history().reduce((s, h) => s + h.total, 0));

  readonly projected = computed(() => {
    const done = this.history().length;
    if (!done) return 0;
    const avg = this.totalYear() / done;
    return avg * 12;
  });

  readonly advancePct = computed(() => {
    const p = this.projected();
    if (!p) return 0;
    return Math.round((this.totalYear() / p) * 100);
  });

  readonly areaOption = computed<EChartsOption | null>(() => {
    const hist = this.history();
    if (!hist.length) return null;
    const allMonths = MONTHS.slice(0, 12);
    const real = allMonths.map((_, i) => hist.find(h => h.month === i + 1)?.total ?? null);
    const avg = hist.reduce((s, h) => s + h.total, 0) / hist.length;
    const proj = allMonths.map((_, i) => i >= this.currentMonth ? avg : null);

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Real', 'Proyectado'] },
      xAxis: { type: 'category', data: allMonths },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `Bs. ${(v/1000).toFixed(0)}k` } },
      series: [
        {
          name: 'Real', type: 'line', data: real, smooth: true,
          areaStyle: { color: 'rgba(99,102,241,0.15)' },
          itemStyle: { color: '#6366f1' },
          connectNulls: false,
        },
        {
          name: 'Proyectado', type: 'line', data: proj, smooth: true,
          lineStyle: { type: 'dashed', color: '#94a3b8' },
          itemStyle: { color: '#94a3b8' },
          connectNulls: false,
        },
      ],
      grid: { left: 70, right: 20, top: 40, bottom: 30 },
    };
  });

  ngOnInit() {
    const months = Array.from({ length: this.currentMonth }, (_, i) => i + 1);
    let done = 0;
    const results: { month: number; total: number }[] = [];
    months.forEach(m => {
      this.erp.getCollectionDashboard(this.currentYear, m).subscribe({
        next: d => results.push({ month: m, total: d.totalCollected }),
        complete: () => {
          done++;
          if (done === months.length) {
            this.history.set(results.sort((a, b) => a.month - b.month));
            this.loading.set(false);
          }
        },
        error: () => {
          done++;
          if (done === months.length) {
            this.history.set(results.sort((a, b) => a.month - b.month));
            this.loading.set(false);
          }
        },
      });
    });
  }
}
