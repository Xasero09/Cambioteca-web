import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, forkJoin } from 'rxjs'; 
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

  // --- PUNTOS DE DUOC (PRE-GEOCALIZADOS) ---
  duocMarkers: any[] = [
    { position: { lat: -33.4439, lng: -70.6517 }, title: 'DUOC UC - Alameda', category: 'duoc' },
    { position: { lat: -33.4447, lng: -70.6507 }, title: 'DUOC UC - Padre Alonso de Ovalle', category: 'duoc' },
    { position: { lat: -33.4283, lng: -70.6139 }, title: 'DUOC UC - Antonio Varas', category: 'duoc' },
    { position: { lat: -33.3907, lng: -70.6872 }, title: 'DUOC UC - Plaza Norte', category: 'duoc' },
    { position: { lat: -33.5042, lng: -70.7303 }, title: 'DUOC UC - Plaza Oeste', category: 'duoc' },
    { position: { lat: -33.5350, lng: -70.6108 }, title: 'DUOC UC - Plaza Vespucio', category: 'duoc' },
    { position: { lat: -33.6120, lng: -70.5756 }, title: 'DUOC UC - Puente Alto', category: 'duoc' },
    { position: { lat: -33.5937, lng: -70.7025 }, title: 'DUOC UC - San Bernardo', category: 'duoc' },
    { position: { lat: -33.4026, lng: -70.5039 }, title: 'DUOC UC - San Carlos de Apoquindo', category: 'duoc' },
    { position: { lat: -33.4981, lng: -70.6139 }, title: 'DUOC UC - San Joaquín', category: 'duoc' },
    { position: { lat: -33.5135, lng: -70.7570 }, title: 'DUOC UC - Maipú', category: 'duoc' },
    { position: { lat: -33.6872, lng: -71.2133 }, title: 'DUOC UC - Melipilla', category: 'duoc' }
  ];

  // --- PUNTOS DE BIBLIOTECAS (PRE-GEOCALIZADOS) ---
  bibliotecaMarkers: any[] = [
    { position: { lat: -33.4402, lng: -70.6729 }, title: 'Biblioteca de Santiago', category: 'biblioteca' },
    { position: { lat: -33.4430, lng: -70.6483 }, title: 'Biblioteca Nacional de Chile', category: 'biblioteca' }
  ];


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
          this.loadMetroMarkersFromCSV(); 
        }
      },
      error: (err: any) => {
        this.error = "Error fatal al cargar el script de Google Maps.";
        this.isLoading = false;
      }
    });
  }

  // Esta función cargará TODOS tus metros desde el CSV
  loadMetroMarkersFromCSV(): void {
    this.isLoading = true;

    // Esta es la ruta correcta (asumiendo que los archivos están en src/assets/data/)
    this.http.get('assets/data/Estaciones_actuales_Metro_de_Santiago.csv', { responseType: 'text' }).subscribe({
      next: (csvMetros: any) => {
        
        // Parsea el CSV del metro
        const metros = this.parseCsvData(csvMetros, 'metro', 'NOMBRE', 'LATITUD', 'LONGITUD');
        
        // Une las 3 listas: las del CSV y las 2 que escribimos arriba
        this.allMarkers = [...metros, ...this.duocMarkers, ...this.bibliotecaMarkers];

        this.onFilterChange(); // Aplica filtro inicial
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error("Error al cargar archivo CSV del Metro:", err);
        // Si el metro falla, al menos carga Duoc y Bibliotecas
        this.allMarkers = [...this.duocMarkers, ...this.bibliotecaMarkers];
        this.onFilterChange();
        this.error = "No se pudieron cargar las estaciones de Metro. Mostrando otras ubicaciones.";
        this.isLoading = false;
      }
    });
  }

  /**
   * Helper para convertir CSV a marcadores (CON FILTRO DE SEGURIDAD)
   */
  parseCsvData(
    csvText: string, 
    category: string, 
    titleCol: string, 
    latCol: string, 
    lngCol: string,
    delimiter: string = ','
  ): any[] {
    
    const markers: any[] = [];
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true, // Intenta saltar líneas vacías
      delimiter: delimiter,
      complete: (results) => {
        console.log(`Datos CSV para [${category}]:`, results.data); // Para depurar

        for (const item of results.data as any[]) {
          
          // --- 👇 1. FILTRO DE SEGURIDAD (Arregla el TypeError) 👇 ---
          // Si la fila está vacía o no tiene latitud/longitud, la saltamos.
          if (!item || !item[latCol] || !item[lngCol]) {
            continue;
          }
          // --- -------------------------------------------------- ---

          const lat = parseFloat(item[latCol]);
          const lng = parseFloat(item[lngCol]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            markers.push({
              position: { lat: lat, lng: lng },
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
   * Filtra la lista de marcadores (CON FILTRO DE SEGURIDAD)
   */
  onFilterChange(): void {
    this.filteredMarkers = this.allMarkers.filter(marker => {
      
      // --- 👇 2. FILTRO DE SEGURIDAD (Arregla el TypeError) 👇 ---
      // Si el marcador (o su categoría) es indefinido, lo ignora.
      if (!marker || !marker.category) {
        return false;
      }
      // --- -------------------------------------------------- ---

      const categoryKey = marker.category as keyof typeof this.filters;
      // Comprueba si la categoría existe en nuestros filtros antes de leerla
      if (this.filters.hasOwnProperty(categoryKey)) {
        return this.filters[categoryKey];
      }
      return false; // Si la categoría es desconocida, no lo muestra
    });
  }
}