import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RouterLink } from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    NgxChartsModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {

  summaryData: any = null;
  isLoading = true;
  error: string | null = null;

  // --- Propiedades solo para el gráfico Top Users ---
  chartDataTopUsers: any[] = [];
  view: [number, number] = [0, 350]; // Ancho dinámico, altura fija de 350px
  
  // Opciones de visualización
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false;
  showXAxisLabel = true;
  showYAxisLabel = true;
  yAxisLabelActivity = 'Participaciones';
  // (Variables del gráfico de región eliminadas)

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getAdminSummary().subscribe({
      next: (data) => {
        this.summaryData = data;
        this.isLoading = false;
        
        // Formato para el gráfico de barras "Top 5 Usuarios"
        if (data.top_active_users) {
          this.chartDataTopUsers = data.top_active_users.map((user: any) => ({
            name: user.nombre_usuario,
            value: user.total_completed_exchanges
          }));
        }
        
        // (Lógica del gráfico de región eliminada)

        // Llama al recalcular tamaño al cargar los datos
        this.updateChartSize(); 
      },
      error: (err) => {
        this.error = "No tienes permiso o ha ocurrido un error.";
        this.isLoading = false;
      }
    });
  }

  // --- Funciones para hacer el gráfico responsivo ---

  ngAfterViewInit(): void {
    // Llama a la función de tamaño después de que la vista se inicialice
    setTimeout(() => this.updateChartSize());
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.updateChartSize();
  }

  updateChartSize(): void {
    // Busca el ancho del CONTENEDOR PRINCIPAL
    const chartContainer = document.querySelector('.admin-dashboard-container');
    if (chartContainer) {
      // Usamos el ancho del contenedor (con un pequeño padding)
      const width = chartContainer.clientWidth - 40; 
      this.view = [width, 350]; // Ancho dinámico, altura fija
    }
  }
}