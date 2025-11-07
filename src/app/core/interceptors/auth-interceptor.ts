import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth'; // Asegúrate que la ruta a tu auth.ts sea correcta

/**
 * Interceptor funcional (la forma moderna)
 * Inyecta el AuthService, obtiene el token y lo añade a las cabeceras.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  
  // 1. Inyecta el servicio de autenticación
  const authService = inject(AuthService);
  
  // 2. Obtiene el token
  const token = authService.getToken(); // Asumiendo que tienes un método .getToken() en auth.ts

  // 3. Si hay token, clona la petición y añade el header
  if (token) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    // 4. Envía la petición clonada
    return next(clonedReq);
  }

  // 5. Si no hay token (ej. en login/registro), envía la petición original
  return next(req);
};