import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Importaciones comunes
import { FormsModule } from '@angular/forms'; // Probablemente lo necesitemos
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // Imports iniciales
  templateUrl: './proposal-detail.html',
  styleUrls: ['./proposal-detail.css']
})
export class ProposalDetailComponent implements OnInit {

  proposalId: number | null = null;
  proposalData: any = null; // Para guardar los datos de la propuesta
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;

  // Variables para acciones (las necesitaremos después)
  isProcessingAction = false; 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam && this.currentUser) {
      this.proposalId = +idParam;
      this.loadProposalDetails(this.proposalId); // Función que crearemos para cargar datos
    } else {
      this.error = "No se pudo cargar la propuesta (ID o usuario no encontrado).";
      this.isLoading = false;
    }
  }

  loadProposalDetails(id: number): void {
    this.isLoading = true;
    this.error = null;
    console.log("Cargando detalles para propuesta ID:", id);
    
    // --- AQUÍ LLAMAREMOS A LA API ---
    // Necesitaremos encontrar la propuesta específica. 
    // Por ahora, simulamos que la carga termina.
    // Reemplazaremos esto con la llamada real a getReceivedProposals/getSentProposals
    // y filtraremos por ID, o idealmente, un nuevo endpoint GET /api/solicitudes/{id}/
    
    setTimeout(() => { // Simulación de carga
       console.log("Simulación: Datos cargados (reemplazar con API real)");
       // this.proposalData = ... datos de la API ...
       this.isLoading = false; 
       // this.error = "Error simulado al cargar"; // Descomenta para probar error
    }, 1000); 
  }

  // --- AQUÍ AÑADIREMOS LAS FUNCIONES PARA ACEPTAR, RECHAZAR, CANCELAR, ETC. ---

}