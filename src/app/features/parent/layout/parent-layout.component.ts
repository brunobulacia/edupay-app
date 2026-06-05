import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-parent-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatToolbarModule],
  template: `
    <div class="flex flex-col h-screen bg-gray-50">
      <!-- Top toolbar -->
      <mat-toolbar color="primary" class="shadow-md z-10">
        <mat-icon class="mr-2">school</mat-icon>
        <span class="font-bold text-lg">EduPay</span>
        <span class="flex-1"></span>
        <span class="text-sm mr-4 hidden sm:block">{{ auth.userName() }}</span>
        <button mat-icon-button (click)="auth.logout()" aria-label="Cerrar sesión" matTooltip="Cerrar sesión">
          <mat-icon>logout</mat-icon>
        </button>
      </mat-toolbar>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-56 bg-white shadow-md flex flex-col py-4" aria-label="Menú de navegación">
          <nav aria-label="Navegación principal">
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
                class="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors mx-2 rounded-lg mb-1"
                [attr.aria-label]="item.label"
              >
                <mat-icon class="text-indigo-600 shrink-0">{{ item.icon }}</mat-icon>
                <span class="text-sm">{{ item.label }}</span>
              </a>
            }
          </nav>
        </aside>

        <!-- Main content -->
        <main class="flex-1 overflow-y-auto p-6" id="main-content" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ParentLayoutComponent {
  readonly auth = inject(AuthService);

  readonly navItems: NavItem[] = [
    { label: 'Mi estado', icon: 'home', route: '/parent/dashboard' },
    { label: 'Mis pagos', icon: 'payments', route: '/parent/payments' },
    { label: 'Historial', icon: 'history', route: '/parent/history' },
    { label: 'Documentos', icon: 'upload_file', route: '/parent/documents' },
  ];
}
