import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.getUser();

  if (currentUser && currentUser.es_admin === true) {
    return true; // Acceso permitido
  }

  // No es admin, redirige al inicio
  router.navigate(['/']);
  return false;
};