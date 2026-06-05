import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-bi-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Business Intelligence</h1>

      <nav class="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1" aria-label="Dashboards BI">
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-indigo-600 text-white shadow-sm"
            class="flex-1 text-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {{ tab.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </div>
  `,
})
export class BiLayoutComponent {
  readonly tabs = [
    { label: 'Recaudación', route: '/admin/bi/collection' },
    { label: 'Morosidad', route: '/admin/bi/delinquency' },
    { label: 'Proyección', route: '/admin/bi/projection' },
    { label: 'Segmentación IA', route: '/admin/bi/segmentation' },
  ];
}
