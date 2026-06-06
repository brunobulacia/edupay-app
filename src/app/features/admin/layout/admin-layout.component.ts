import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  template: `
    <div class="relative flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside
        class="flex flex-col bg-indigo-900 text-white transition-all duration-300"
        [style.width]="collapsed() ? '64px' : '240px'"
        aria-label="Menú de navegación"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-5 border-b border-indigo-800">
          <mat-icon class="text-indigo-300">school</mat-icon>
          @if (!collapsed()) {
            <span class="text-xl font-bold tracking-wide">EduPay</span>
          }
        </div>

        <!-- Nav items -->
        <nav class="flex-1 py-4 overflow-y-auto" aria-label="Navegación principal">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-indigo-700"
              class="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 transition-colors rounded-lg mx-2 mb-1"
              [matTooltip]="collapsed() ? item.label : ''"
              matTooltipPosition="right"
              [attr.aria-label]="item.label"
            >
              <mat-icon class="shrink-0">{{ item.icon }}</mat-icon>
              @if (!collapsed()) {
                <span class="text-sm font-medium">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- User + logout -->
        <div class="border-t border-indigo-800 p-4">
          @if (!collapsed()) {
            <p class="text-xs text-indigo-300 truncate mb-3">{{ auth.userName() }}</p>
          }
          <button
            mat-icon-button
            (click)="auth.logout()"
            [matTooltip]="'Cerrar sesión'"
            matTooltipPosition="right"
            aria-label="Cerrar sesión"
            class="text-indigo-300 hover:text-white"
          >
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- Toggle button -->
      <button
        mat-mini-fab
        color="primary"
        (click)="collapsed.set(!collapsed())"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 shadow-lg"
        [style.left]="collapsed() ? '48px' : '224px'"
        [attr.aria-label]="collapsed() ? 'Expandir menú' : 'Colapsar menú'"
        [attr.aria-expanded]="!collapsed()"
      >
        <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
      </button>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto p-6" id="main-content" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly collapsed = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',     icon: 'dashboard',       route: '/admin/dashboard' },
    { label: 'Familias',      icon: 'family_restroom', route: '/admin/families' },
    { label: 'Usuarios',      icon: 'manage_accounts', route: '/admin/users' },
    { label: 'Pagos',         icon: 'payments',        route: '/admin/payments' },
    { label: 'Documentos',    icon: 'folder_open',     route: '/admin/documents' },
    { label: 'BI Dashboards', icon: 'bar_chart',       route: '/admin/bi' },
    { label: 'IA / Reportes', icon: 'psychology',      route: '/admin/reports' },
  ];
}
