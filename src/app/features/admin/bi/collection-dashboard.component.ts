import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ErpService } from '../../../core/services/erp.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import type { EChartsOption } from 'echarts';

const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'
];

@Component({
  selector: 'app-collection-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatSelectModule, ReactiveFormsModule, NgxEchartsDirective, StatCardComponent],
  template: `
    <div class="space-y-6">
      <!-- Filters -->
      <div class="flex gap-4 items-center">
        <mat-form-field appearance="outline" class="w-32">
          <mat-label>Año</mat-label>
          <mat-select [value]="year()" (valueChange)="year.set($event); load()">
            @for (y of years; track y) {
              <mat-option [value]="y">{{ y }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-36">
          <mat-label>Mes</mat-label>
          <mat-select [value]="month()" (valueChange)="month.set($event); load()">
            @for (m of monthOptions; track m.value) {
              <mat-option [value]="m.value">{{ m.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
      } @else {
        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <app-stat-card
            label="Total recaudado"
            [value]="'Bs. ' + (data()?.totalCollected ?? 0).toLocaleString('es-BO', {minimumFractionDigits: 2})"
            icon="payments"
            iconColor="#4f46e5"
            iconBg="#eef2ff"
          />
          <app-stat-card
            label="Métodos de pago"
            [value]="data()?.byMethod?.length ?? 0"
            icon="account_balance_wallet"
            iconColor="#0891b2"
            iconBg="#ecfeff"
          />
          <app-stat-card
            label="Período"
            [value]="monthLabel()"
            icon="calendar_month"
            iconColor="#16a34a"
            iconBg="#f0fdf4"
          />
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-base font-semibold text-gray-700 mb-4">Recaudación por método</h3>
            @if (donutOption()) {
              <div echarts [options]="donutOption()!" style="height: 280px;" aria-label="Gráfico dona de recaudación por método"></div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-12">Sin datos para este período</p>
            }
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-base font-semibold text-gray-700 mb-4">Recaudación mensual acumulada</h3>
            @if (barOption()) {
              <div echarts [options]="barOption()!" style="height: 280px;" aria-label="Gráfico de barras mensual"></div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-12">Cargando histórico...</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CollectionDashboardComponent implements OnInit {
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly data = signal<any>(null);
  readonly history = signal<{ month: number; total: number }[]>([]);

  readonly years = [2024, 2025, 2026];
  readonly monthOptions = MONTHS.map((l, i) => ({ value: i + 1, label: l }));

  readonly monthLabel = computed(() => `${MONTHS[this.month() - 1]} ${this.year()}`);

  readonly donutOption = computed<EChartsOption | null>(() => {
    const d = this.data();
    if (!d?.byMethod?.length) return null;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: Bs. {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10 },
      series: [{
        type: 'pie', radius: ['45%', '70%'],
        data: d.byMethod.map((m: any) => ({ name: m.paymentMethod, value: m.amount })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      }],
    };
  });

  readonly barOption = computed<EChartsOption | null>(() => {
    const hist = this.history();
    if (!hist.length) return null;
    return {
      tooltip: { trigger: 'axis', formatter: (p: any) => `${MONTHS[p[0].dataIndex]}: Bs. ${p[0].value?.toLocaleString('es-BO')}` },
      xAxis: { type: 'category', data: hist.map(h => MONTHS[h.month - 1]) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `Bs. ${(v/1000).toFixed(0)}k` } },
      series: [{ type: 'bar', data: hist.map(h => h.total), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } }],
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
    };
  });

  ngOnInit() { this.load(); this.loadHistory(); }

  load() {
    this.loading.set(true);
    this.erp.getCollectionDashboard(this.year(), this.month()).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private loadHistory() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const results: { month: number; total: number }[] = [];
    let done = 0;
    for (let m = 1; m <= currentMonth; m++) {
      this.erp.getCollectionDashboard(currentYear, m).subscribe({
        next: d => { results.push({ month: m, total: d.totalCollected }); },
        complete: () => { done++; if (done === currentMonth) this.history.set(results.sort((a, b) => a.month - b.month)); },
        error: () => { done++; if (done === currentMonth) this.history.set(results.sort((a, b) => a.month - b.month)); },
      });
    }
  }
}
