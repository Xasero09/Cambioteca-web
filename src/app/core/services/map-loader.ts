import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service'; // Ajusta la ruta si es necesario
import { Observable, ReplaySubject } from 'rxjs';
import { filter, first, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MapLoaderService {

  private apiLoaded$ = new ReplaySubject<boolean>(1);
  private isLoading = false;

  constructor(private apiService: ApiService) {}

  public loadScript(): Observable<boolean> {
    if (this.isLoading) {
      return this.apiLoaded$.pipe(filter(isLoaded => isLoaded), first());
    }

    // Comprueba si getValue existe antes de llamarlo
    if (this.apiLoaded$.observers.length > 0 && typeof (this.apiLoaded$ as any).getValue === 'function' && (this.apiLoaded$ as any).getValue()) {
      return this.apiLoaded$.asObservable();
    }

    this.isLoading = true;

    // 1. Pide la clave de API al backend
    this.apiService.getPublicConfig().subscribe({
      next: (config: any) => {
        if (!config.mapsApiKey) {
          console.error("¡Error! No se recibió la Google Maps API Key desde el backend.");
          this.isLoading = false;
          return;
        }
        
        // 2. Crea la etiqueta <script>
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.mapsApiKey}`;
        script.async = true;
        script.defer = true;
        
        // 3. Cuando el script termine de cargar, avisa
        script.onload = () => {
          this.apiLoaded$.next(true); // ¡API Lista!
          this.isLoading = false;
        };
        
        // 4. Si falla, avisa el error
        script.onerror = () => {
          console.error("Error al cargar el script de Google Maps.");
          this.apiLoaded$.next(false);
          this.isLoading = false;
        };
        
        // 5. Añade el script a la página
        document.head.appendChild(script);
      },
      error: (err: any) => {
        console.error("Error al pedir la config de la API:", err);
        this.isLoading = false;
      }
    });

    return this.apiLoaded$.pipe(filter(isLoaded => isLoaded), first());
  }
}