// EN EL ARCHIVO: src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // <-- AQUÍ ESTÁ LA CORRECCIÓN

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));