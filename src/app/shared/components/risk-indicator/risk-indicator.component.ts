import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

@Component({
  selector: 'app-risk-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <span
      class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
      [class]="badgeClass()"
      [attr.aria-label]="'Nivel de riesgo: ' + level()"
    >
      <mat-icon class="text-sm! w-4! h-4!">{{ icon() }}</mat-icon>
      {{ label() }}
    </span>
  `,
})
export class RiskIndicatorComponent {
  readonly level = input.required<RiskLevel>();
  readonly score = input<number | null>(null);

  readonly badgeClass = computed(() => {
    switch (this.level()) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
    }
  });

  readonly icon = computed(() => {
    switch (this.level()) {
      case 'LOW': return 'check_circle';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
    }
  });

  readonly label = computed(() => {
    const score = this.score();
    const base = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' }[this.level()];
    return score !== null ? `${base} (${(score * 100).toFixed(0)}%)` : base;
  });
}
