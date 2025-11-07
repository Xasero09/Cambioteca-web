import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// 1. Importa 'provideHttpClient' Y 'withInterceptors'
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// 2. Importa la *función* (authInterceptor) que acabamos de crear
import { authInterceptor } from './core/interceptors/auth-interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    
    // 3. Modifica esta línea:
    // Antes era: provideHttpClient()
    // Ahora le decimos que use el interceptor:
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};