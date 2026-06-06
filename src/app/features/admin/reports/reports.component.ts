import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RiskIndicatorComponent } from '../../../shared/components/risk-indicator/risk-indicator.component';
import { ErpService } from '../../../core/services/erp.service';
import { ClusterResult, RiskScore } from '../../../core/models/family.model';
import { environment } from '../../../../environments/environment';

const GW = environment.apiUrl;

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatButtonModule, MatIconModule, RiskIndicatorComponent],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">IA / Reportes</h1>

      @if (loadingFamilies()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="48" /></div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Risk scores panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-700">Predicción de riesgo</h2>
              <button
                mat-stroked-button
                color="primary"
                (click)="loadRisk()"
                [disabled]="loadingRisk()"
                aria-label="Actualizar predicciones"
              >
                <mat-icon>refresh</mat-icon> Actualizar
              </button>
            </div>
            @if (loadingRisk()) {
              <div class="flex justify-center py-8"><mat-spinner diameter="40" /></div>
            } @else if (riskScores().length) {
              <div class="space-y-2 max-h-96 overflow-y-auto">
                @for (r of riskScores(); track r.familyId) {
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="text-sm font-medium text-gray-700">{{ r.familyId }}</span>
                    <app-risk-indicator [level]="r.riskLevel" [score]="r.riskScore" />
                  </div>
                }
              </div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-8">
                Presioná "Actualizar" para cargar predicciones ({{ familyIds.length }} familias)
              </p>
            }
          </div>

          <!-- Clusters panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-700">Clustering de familias</h2>
              <button
                mat-stroked-button
                color="primary"
                (click)="loadClusters()"
                [disabled]="loadingClusters()"
                aria-label="Actualizar clustering"
              >
                <mat-icon>refresh</mat-icon> Actualizar
              </button>
            </div>
            @if (loadingClusters()) {
              <div class="flex justify-center py-8"><mat-spinner diameter="40" /></div>
            } @else if (clusters().length) {
              <div class="space-y-2 max-h-96 overflow-y-auto">
                @for (c of clusters(); track c.familyId) {
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-700">{{ c.familyId }}</span>
                      <span
                        class="px-2 py-1 rounded text-xs font-medium"
                        [class]="clusterClass(c.clusterLabel)"
                      >
                        {{ c.clusterLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500">{{ c.recommendedAction }}</p>
                  </div>
                }
              </div>
            } @else {
              <p class="text-gray-400 text-sm text-center py-8">
                Presioná "Actualizar" para cargar clusters ({{ familyIds.length }} familias)
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly erp = inject(ErpService);

  readonly loadingFamilies = signal(true);
  readonly loadingRisk = signal(false);
  readonly loadingClusters = signal(false);
  readonly riskScores = signal<RiskScore[]>([]);
  readonly clusters = signal<ClusterResult[]>([]);

  familyIds: string[] = [];

  ngOnInit() {
    // Usar GraphQL studentsInArrears para obtener IDs de familias
    this.erp.getStudentsInArrears(200).subscribe({
      next: (arrears) => {
        const seen = new Set<string>();
        for (const a of arrears) {
          const id = a.studentExternalId.replace('FAMILY-', '');
          seen.add(id);
        }
        this.familyIds = Array.from(seen);
        this.loadingFamilies.set(false);
        // Carga automática al entrar
        this.loadRisk();
        this.loadClusters();
      },
      error: () => this.loadingFamilies.set(false),
    });
  }

  loadRisk() {
    if (!this.familyIds.length) return;
    this.loadingRisk.set(true);
    this.riskScores.set([]);
    let done = 0;
    const total = this.familyIds.length;
    const finish = () => {
      done++;
      if (done === total) this.loadingRisk.set(false);
    };

    this.familyIds.forEach((id) => {
      this.http.get<any>(`${GW}/ia/families/${id}/risk-score/history`).subscribe({
        next: (res) => {
          const list: any[] = res?.predictions ?? res?.data ?? (Array.isArray(res) ? res : []);
          if (list.length) {
            const latest = list[0];
            this.riskScores.update((prev) => [
              ...prev,
              {
                familyId: id,
                riskScore: latest.riskScore ?? latest.risk_score ?? 0,
                riskLevel: latest.riskLevel ?? latest.risk_level ?? 'LOW',
                modelVersion: latest.modelVersion ?? '',
                predictionDate: latest.predictionDatePlain ?? latest.predictionDate ?? '',
                _service: 'ms-ia',
              },
            ]);
          }
          finish();
        },
        error: finish,
      });
    });
  }

  loadClusters() {
    if (!this.familyIds.length) return;
    this.loadingClusters.set(true);
    this.clusters.set([]);
    let done = 0;
    const total = this.familyIds.length;
    const finish = () => {
      done++;
      if (done === total) this.loadingClusters.set(false);
    };

    this.familyIds.forEach((id) => {
      this.http.get<any>(`${GW}/ia/families/${id}/cluster`).subscribe({
        next: (res) => {
          const c = res?.data ?? res;
          if (c?.familyId) {
            this.clusters.update((prev) => [...prev, c as ClusterResult]);
          }
          finish();
        },
        error: finish,
      });
    });
  }

  clusterClass(label: string): string {
    const map: Record<string, string> = {
      PUNTUAL_ESTRELLA: 'bg-green-100 text-green-800',
      REGULAR: 'bg-blue-100 text-blue-800',
      IRREGULAR: 'bg-yellow-100 text-yellow-800',
      MOROSO_CRONICO: 'bg-red-100 text-red-800',
    };
    return map[label] ?? 'bg-gray-100 text-gray-700';
  }
}
