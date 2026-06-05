import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ErpService } from '../../../core/services/erp.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import type { EChartsOption } from 'echarts';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Component({
  selector: 'app-delinquency-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatSelectModule, NgxEchartsDirective, StatCardComponent],
  template: `
    <div class="space-y-6">
      <!-- Filters -->
      <div class="flex gap-4 items-center">
        <mat-form-field appearance="outline" class="w-32">
          <mat-label>Año</mat-label>
          <mat-select [value]="year()" (valueChange)="year.set($event); load()">
            @for (y of [2024, 2025, 2026]; track y) {
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-stat-card
            label="Familias en mora"
            [value]="data()?.familiesInArrears ?? 0"
            icon="warning"
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
          <app-stat-card
            label="Deuda total"
            [value]="'Bs. ' + (data()?.totalDebt ?? 0).toLocaleString('es-BO', {minimumFractionDigits: 2})"
            icon="account_balance"
            iconColor="#d97706"
            iconBg="#fffbeb"
          />
        </div>

        <!-- Trend chart -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-base font-semibold text-gray-700 mb-4">Tendencia de mora (últimos 6 meses)</h3>
          @if (trendOption()) {
            <div echarts [options]="trendOption()!" style="height: 280px;" aria-label="Tendencia de mora"></div>
          } @else {
            <p class="text-gray-400 text-sm text-center py-12">Cargando histórico...</p>
          }
        </div>

        <!-- Debt chart -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-base font-semibold text-gray-700 mb-4">Deuda acumulada (últimos 6 meses)</h3>
          @if (debtOption()) {
            <div echarts [options]="debtOption()!" style="height: 280px;" aria-label="Deuda acumulada"></div>
          } @else {
            <p class="text-gray-400 text-sm text-center py-12">Cargando histórico...</p>
          }
        </div>
      }
    </div>
  `,
})
export class DelinquencyDashboardComponent implements OnInit {
  private readonly erp = inject(ErpService);

  readonly loading = signal(true);
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly data = signal<any>(null);
  readonly history = signal<{ month: number; families: number; debt: number }[]>([]);

  readonly monthOptions = MONTHS.map((l, i) => ({ value: i + 1, label: l }));

  readonly trendOption = computed<EChartsOption | null>(() => {
    const h = this.history();
    if (!h.length) return null;
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: h.map(x => MONTHS[x.month - 1]) },
      yAxis: { type: 'value', name: 'Familias' },
      series: [{
        type: 'line', data: h.map(x => x.families),
        smooth: true, itemStyle: { color: '#dc2626' },
        areaStyle: { color: 'rgba(220,38,38,0.1)' },
      }],
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
    };
  });

  readonly debtOption = computed<EChartsOption | null>(() => {
    const h = this.history();
    if (!h.length) return null;
    return {
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}: Bs. ${p[0].value?.toLocaleString('es-BO')}` },
      xAxis: { type: 'category', data: h.map(x => MONTHS[x.month - 1]) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `Bs. ${(v/1000).toFixed(0)}k` } },
      series: [{
        type: 'bar', data: h.map(x => x.debt),
        itemStyle: { color: '#f97316', borderRadius: [4, 4, 0, 0] },
      }],
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
    };
  });

  ngOnInit() { this.load(); this.loadHistory(); }

  load() {
    this.loading.set(true);
    this.erp.getDelinquencyDashboard(this.year(), this.month()).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private loadHistory() {
    const cur = new Date().getMonth() + 1;
    const yr = new Date().getFullYear();
    const start = Math.max(1, cur - 5);
    const months = Array.from({ length: cur - start + 1 }, (_, i) => start + i);
    const results: { month: number; families: number; debt: number }[] = [];
    let done = 0;
    months.forEach(m => {
      this.erp.getDelinquencyDashboard(yr, m).subscribe({
        next: d => results.push({ month: m, families: d.familiesInArrears, debt: d.totalDebt }),
        complete: () => { done++; if (done === months.length) this.history.set(results.sort((a, b) => a.month - b.month)); },
        error: () => { done++; if (done === months.length) this.history.set(results.sort((a, b) => a.month - b.month)); },
      });
    });
  }
}
