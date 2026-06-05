import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN')],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'parent',
    canActivate: [roleGuard('PARENT')],
    loadChildren: () =>
      import('./features/parent/parent.routes').then(m => m.parentRoutes),
  },
  { path: '**', redirectTo: 'auth/login' },
];
