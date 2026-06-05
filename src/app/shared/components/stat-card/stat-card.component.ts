import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4 border border-gray-100">
      <div
        class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        [style.background-color]="iconBg()"
      >
        <mat-icon [style.color]="iconColor()">{{ icon() }}</mat-icon>
      </div>
      <div class="min-w-0">
        <p class="text-sm text-gray-500 truncate">{{ label() }}</p>
        <p class="text-2xl font-bold text-gray-800 tabular-nums">{{ value() }}</p>
        @if (subtitle()) {
          <p class="text-xs text-gray-400 truncate">{{ subtitle() }}</p>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('info');
  readonly iconColor = input<string>('#6366f1');
  readonly iconBg = input<string>('#eef2ff');
  readonly subtitle = input<string | null>(null);
}
