import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const roleGuard = (requiredRole: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  const role = auth.role();
  // Si no hay rol en el JWT (token viejo sin claims), por defecto es PARENT
  const effectiveRole: UserRole = role ?? 'PARENT';

  if (effectiveRole !== requiredRole) {
    return effectiveRole === 'ADMIN'
      ? router.createUrlTree(['/admin'])
      : router.createUrlTree(['/parent']);
  }
  return true;
};
