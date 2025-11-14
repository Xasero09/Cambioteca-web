import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, forkJoin, map } from 'rxjs'; // Importa map y forkJoin
import { MapLoaderService } from '../../core/services/map-loader';
import { GoogleMapsModule } from '@angular/google-maps';
import { FormsModule } from '@angular/forms'; 
import { HttpClient } from '@angular/common/http'; 
import * as Papa from 'papaparse'; 

@Component({
  selector: 'app-meeting-points',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule, FormsModule],
  templateUrl: './meeting-points.html',
  styleUrls: ['./meeting-points.css']
})
export class MeetingPointsComponent implements OnInit {

  mapLoaded$: Observable<boolean>;
  isLoading = true; 
  error: string | null = null;
  
  mapOptions: google.maps.MapOptions = {
    center: { lat: -33.44889, lng: -70.669265 },
    zoom: 12,
  };

  allMarkers: any[] = []; 
  filteredMarkers: any[] = []; 

  filters = {
    metro: true,
    duoc: true,
    biblioteca: true,
  };

  // --- 👇 PASO 1: ELIMINAMOS LOS ARRAYS FIJOS ---
  // duocMarkers: any[] = [ ... ]; // ELIMINADO
  // bibliotecaMarkers: any[] = [ ... ]; // ELIMINADO
  // --- ------------------------------------ ---

  constructor(
    private mapLoader: MapLoaderService,
    private http: HttpClient 
  ) {
    this.mapLoaded$ = this.mapLoader.loadScript();
  }

  ngOnInit(): void {
    this.mapLoaded$.subscribe({
      next: (isLoaded: any) => {
        if (isLoaded) {
          // --- 👇 PASO 2: LLAMAMOS A LA NUEVA FUNCIÓN QUE CARGA TODO ---
          this.loadAllMarkersFromCSV(); 
        }
      },
      error: (err: any) => {
        this.error = "Error fatal al cargar el script de Google Maps.";
        this.isLoading = false;
      }
    });
  }

  /**
   * (NUEVA FUNCIÓN) Carga TODOS los marcadores desde los 3 archivos CSV
   * en paralelo.
   */
  loadAllMarkersFromCSV(): void {
    this.isLoading = true;

    // 1. Define los 3 observables para los 3 archivos
    const metro$ = this.http.get('assets/data/Estaciones_actuales_Metro_de_Santiago.csv', { responseType: 'text' });
    const duoc$ = this.http.get('assets/data/duoc_sedes_rm.csv', { responseType: 'text' });
    const biblio$ = this.http.get('assets/data/bibliotecas_santiago.csv', { responseType: 'text' });

    // 2. Ejecuta todos en paralelo con forkJoin
    forkJoin({
      metros: metro$,
      duoc: duoc$,
      bibliotecas: biblio$
    }).subscribe({
      next: (results) => {
        
        // 3. Parsea cada resultado con sus columnas correctas
        
        // Metro usa 'nombre', 'Y', 'X' y necesita conversión Mercator
        const metros = this.parseCsvData(results.metros, 'metro', 'nombre', 'Y', 'X');
        
        // Duoc usa 'name', 'Latitud', 'Longitud' y NO necesita conversión
        const duoc = this.parseCsvData(results.duoc, 'duoc', 'name', 'Latitud', 'Longitud');
        
        // Bibliotecas usa 'name', 'Latitud', 'Longitud' y NO necesita conversión
        const bibliotecas = this.parseCsvData(results.bibliotecas, 'biblioteca', 'name', 'Latitud', 'Longitud');

        // 4. Combina todos los marcadores
        this.allMarkers = [...metros, ...duoc, ...bibliotecas];
        this.onFilterChange(); 
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error al cargar uno o más archivos CSV:", err);
        this.error = "No se pudieron cargar todos los puntos de encuentro. Revisa que los archivos CSV existan en 'assets/data/'.";
        this.isLoading = false;
      }
    });
  }


  /**
   * (MODIFICADO) parseCsvData ahora maneja ambos tipos de coordenadas.
   */
  parseCsvData(
    csvText: string, 
    category: string, 
    titleCol: string, // Columna de título (ej: 'nombre' o 'name')
    latCol: string,   // Columna de Lat (ej: 'Y' o 'Latitud')
    lngCol: string,   // Columna de Lng (ej: 'X' o 'Longitud')
    delimiter: string = ','
  ): any[] {
    
    const markers: any[] = [];
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: delimiter,
      complete: (results) => {
        console.log(`Datos CSV para [${category}]:`, results.data);

        for (const item of results.data as any[]) {
          
          if (!item || !item[latCol] || !item[lngCol]) {
            console.warn(`Fila saltada en [${category}] por falta de coordenadas:`, item);
            continue; // Salta fila si no tiene coordenadas
          }

          const latRaw = parseFloat(item[latCol]);
          const lngRaw = parseFloat(item[lngCol]);

          if (!isNaN(latRaw) && !isNaN(lngRaw)) {
            
            let position: { lat: number, lng: number };

            // --- 👇 LÓGICA CONDICIONAL INTELIGENTE 👇 ---
            // Si la latitud es un número muy grande (coordenada Y de Mercator)
            if (Math.abs(latRaw) > 180) {
              // latRaw es 'Y' (mercatorY) y lngRaw es 'X' (mercatorX)
              position = this.convertMercatorToLatLng(lngRaw, latRaw);
            } else {
              // Es Lat/Lng estándar
              position = { lat: latRaw, lng: lngRaw };
            }
            // --- --------------------------------- ---

            markers.push({
              position: position,
              title: item[titleCol] || 'Punto de Interés',
              category: category
            });
          }
        }
      }
    });
    
    return markers;
  }

  
  /**
   * (Función de conversión, se mantiene igual)
   */
  private convertMercatorToLatLng(mercatorX: number, mercatorY: number): { lat: number, lng: number } {
    const rMajor = 6378137.0; 

    const x = mercatorX / rMajor;
    const y = mercatorY / rMajor;

    const lng = (x * 180.0) / Math.PI;
    const lat = (Math.atan(Math.exp(y)) * 360.0) / Math.PI - 90.0;

    return { lat: lat, lng: lng };
  }

  
  /**
   * (Función de filtro, se mantiene igual)
   */
  onFilterChange(): void {
    this.filteredMarkers = this.allMarkers.filter(marker => {
      
      if (!marker || !marker.category) {
        return false;
      }
      
      const categoryKey = marker.category as keyof typeof this.filters;
      if (this.filters.hasOwnProperty(categoryKey)) {
        return this.filters[categoryKey];
      }
      return false;
    });
  }

  // --- Función loadMetroMarkersFromCSV() ELIMINADA (reemplazada por loadAllMarkersFromCSV) ---
}