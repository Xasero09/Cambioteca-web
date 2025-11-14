import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { NotificationComponent } from '../../components/notification/notification';
import { forkJoin, map, Observable, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// --- 👇 INTERFAZ ACTUALIZADA ---
interface SolicitudResumen {
  id_solicitud: number;
  estado: string;
  libro_deseado?: { id_libro: number; titulo: string };
  solicitante?: { id_usuario: number; nombre_usuario: string };
  receptor?: { id_usuario: number; nombre_usuario: string };
  creada_en?: string;
  actualizada_en?: string;
  ofertas?: { libro_ofrecido: { id_libro: number; titulo: string } }[];
  intercambio_id?: number | null;
  conversacion_id?: number | null;
  lugar_intercambio?: string | null;
  fecha_intercambio_pactada?: string | null;

  propuesta_estado?: string | null; // <-- Propiedad clave para la lógica de botones
}
// --- 👆 FIN DE INTERFAZ ---


@Component({
  selector: 'app-received-proposals',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationComponent, FormsModule],
  templateUrl: './received-proposals.html',
  styleUrls: ['./received-proposals.css']
})
export class ReceivedProposalsComponent implements OnInit, OnDestroy {

  recibidas: SolicitudResumen[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;
  private authSubscription!: Subscription; 
  isProcessingAction = false;
  selectedProposalForAction: SolicitudResumen | null = null;
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  // Modales
  showGenerateCodeModal = false;
  generatedCodeData: { codigo: string, expira_en: string } | null = null;
  isGeneratingCode = false;
  
  showRatingModal = false;
  exchangeToRate: SolicitudResumen | null = null;
  ratingData = { puntuacion: 3, comentario: '' };
  isSubmittingRating = false;
  ratingError: string | null = null;
  ratedIntercambioIds = new Set<number>();
  
  showProposePlaceModal = false;
  exchangeToProposePlace: SolicitudResumen | null = null;
  placeData = { lugar: '', fecha: '' };
  isProposingPlace = false;
  proposePlaceError: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      if (user && user.id) {
        this.loadProposals(user.id);
      } else {
        this.error = "No se pudo identificar al usuario. Por favor, inicia sesión.";
        this.isLoading = false;
        this.recibidas = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // --- 👇 FUNCIÓN loadProposals (VERSIÓN ROBUSTA) ---
  loadProposals(userId: number): void {
    this.isLoading = true; 
    this.error = null;
    
    this.apiService.getReceivedProposals(userId).subscribe({
      next: (recibidas: SolicitudResumen[]) => {
        
        // 1. Carga la lista base
        this.recibidas = (recibidas || []).map(p => ({
            ...p,
            propuesta_estado: null // Empezamos en null
        }));
        this.isLoading = false; 

        // 2. Filtra TODAS las que están 'Aceptadas' para verificar su estado real
        const acceptedProposals = this.recibidas.filter(p => p.estado === 'Aceptada');
        
        if (acceptedProposals.length > 0) {
          // 3. Prepara una llamada a la API para cada una
          const statusChecks$: Observable<any>[] = acceptedProposals.map(proposal =>
            this.apiService.getMeetingProposal(proposal.intercambio_id!)
              .pipe(
                map(liveProposal => ({
                  solicitudId: proposal.id_solicitud,
                  liveData: liveProposal 
                })),
                catchError(() => of({ solicitudId: proposal.id_solicitud, liveData: null }))
              )
          );
  
          // 4. Ejecuta todas las llamadas
          forkJoin(statusChecks$).subscribe({
            next: (results) => {
              // 5. Actualiza la lista 'recibidas' con los datos en vivo
              results.forEach(result => {
                const proposalToUpdate = this.recibidas.find(p => p.id_solicitud === result.solicitudId);
                
                if (proposalToUpdate && result.liveData && result.liveData.estado) {
                  // Guardamos el estado real (PENDIENTE, ACEPTADA, RECHAZADA)
                  proposalToUpdate.propuesta_estado = result.liveData.estado.toUpperCase(); 
                  
                  // Actualizamos el lugar/fecha (por si estaba "A coordinar")
                  proposalToUpdate.lugar_intercambio = result.liveData.direccion;
                  proposalToUpdate.fecha_intercambio_pactada = result.liveData.fecha;
                }
              });
            }
          });
        }
        
        // 6. Cargar estados de calificación
        this.checkRatingStatus(this.recibidas);
      },
      error: (err: any) => {
        this.error = "Error al cargar propuestas recibidas.";
        this.isLoading = false;
      }
    });
  }

  checkRatingStatus(proposals: SolicitudResumen[]): void {
    if (!this.currentUser) return;
    const completedProposals = proposals.filter(p => p.estado === 'Completado' && p.intercambio_id);
    if (completedProposals.length === 0) return;

    const ratingChecks$: Observable<{ id: number, rated: boolean }>[] = completedProposals.map(p =>
      this.apiService.getMyRatingForExchange(p.intercambio_id!, this.currentUser.id).pipe(
        map((ratingResult: any) => ({
          id: p.intercambio_id!,
          rated: !!(ratingResult && ratingResult.puntuacion)
        }))
      )
    );

    forkJoin(ratingChecks$).subscribe({
      next: (results: any) => {
        this.ratedIntercambioIds.clear();
        results.forEach((r: any) => {
          if (r.rated) this.ratedIntercambioIds.add(r.id);
        });
      },
      error: (err: any) => console.error("Error al verificar calificaciones", err)
    });
  }

  // --- Modal Proponer Lugar (RECEPTOR) ---
  openProposePlaceModal(proposal: SolicitudResumen): void {
    if (!proposal.intercambio_id || !this.currentUser) return;
    this.exchangeToProposePlace = proposal;
    
    const localDate = proposal.fecha_intercambio_pactada
      ? new Date(proposal.fecha_intercambio_pactada).toISOString().slice(0, 16)
      : '';
      
    this.placeData = {
      lugar: proposal.lugar_intercambio && proposal.lugar_intercambio !== 'A coordinar' ? proposal.lugar_intercambio : '',
      fecha: localDate
    };
    
    this.proposePlaceError = null;
    this.isProposingPlace = false;
    this.showProposePlaceModal = true;
  }

  closeProposePlaceModal(): void {
    this.showProposePlaceModal = false;
    this.exchangeToProposePlace = null;
  }

  submitProposePlace(): void {
    if (!this.exchangeToProposePlace || !this.currentUser || !this.placeData.lugar || !this.placeData.fecha) {
      this.proposePlaceError = "Debes completar el lugar y la fecha.";
      return;
    }
    this.isProposingPlace = true; this.proposePlaceError = null;
    
    this.apiService.proponerEncuentro(
      this.exchangeToProposePlace.intercambio_id!, 
      this.currentUser.id, // ID del Receptor (yo)
      this.placeData.lugar,
      new Date(this.placeData.fecha).toISOString()
    ).subscribe({
      next: () => {
        this.isProposingPlace = false;
        this.closeProposePlaceModal();
        this.showNotification('¡Lugar y fecha propuestos!', 'success');
        this.loadProposals(this.currentUser.id); // Recarga
      },
      error: (err: any) => {
        this.isProposingPlace = false;
        this.proposePlaceError = err.error?.detail || "Error al proponer el encuentro.";
      }
    });
  }

  // --- Modal de Calificación ---
  openRatingModal(proposal: SolicitudResumen): void {
    if (!this.canRate(proposal)) return;
    this.exchangeToRate = proposal;
    this.ratingData = { puntuacion: 3, comentario: '' };
    this.ratingError = null; this.isSubmittingRating = false;
    this.showRatingModal = true;
  }
  closeRatingModal(): void {
    this.showRatingModal = false; this.exchangeToRate = null;
  }
  submitRating(): void {
    if (!this.exchangeToRate || !this.currentUser || !this.exchangeToRate.intercambio_id) {
      this.ratingError = "No se pudo identificar el intercambio."; return;
    }
    this.isSubmittingRating = true; this.ratingError = null;
    
    this.apiService.rateExchange(
      this.exchangeToRate.intercambio_id,
      this.currentUser.id,
      this.ratingData.puntuacion,
      this.ratingData.comentario
    ).subscribe({
      next: () => {
        this.isSubmittingRating = false;
        this.closeRatingModal();
        this.showNotification('¡Calificación enviada con éxito!', 'success');
        this.ratedIntercambioIds.add(this.exchangeToRate!.intercambio_id!);
      },
      error: (err: any) => {
        this.isSubmittingRating = false;
        this.ratingError = err.error?.detail || "Error al enviar la calificación.";
      }
    });
  }

  // --- Helpers de Estado (Calificación) ---
  isCompleted(proposal: SolicitudResumen): boolean { return proposal.estado === 'Completado'; }
  canRate(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') return false;
    return !this.ratedIntercambioIds.has(proposal.intercambio_id);
  }
  hasRated(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') return false;
    return this.ratedIntercambioIds.has(proposal.intercambio_id);
  }

  // --- Modal Generar Código (Receptor) ---
  openGenerateCodeModal(proposal: SolicitudResumen): void {
    if (!proposal.intercambio_id || !this.currentUser) return;
    this.isGeneratingCode = true; this.generatedCodeData = null;
    this.showGenerateCodeModal = true; this.error = null;
    
    this.apiService.generateExchangeCode(proposal.intercambio_id, this.currentUser.id).subscribe({
      next: (data: any) => {
        this.generatedCodeData = data; this.isGeneratingCode = false;
      },
      error: (err: any) => {
        this.closeGeneratedCodeModal();
        this.showNotification(err.error?.detail || "Error al generar el código.", 'error');
        this.isGeneratingCode = false;
      }
    });
  }
  closeGeneratedCodeModal(): void { this.showGenerateCodeModal = false; this.generatedCodeData = null; }

  // --- Acciones (Aceptar, Rechazar) ---
  acceptSingleOffer(proposal: SolicitudResumen): void {
    if (!this.currentUser || !this.canAcceptSingleOffer(proposal)) return;
    this.selectedProposalForAction = proposal; this.isProcessingAction = true;
    this.error = null; this.clearNotification();
    const acceptedBookId = proposal.ofertas![0].libro_ofrecido.id_libro;
    
    this.apiService.acceptProposal(proposal.id_solicitud, acceptedBookId, this.currentUser.id).subscribe({
      next: (response: any) => {
        this.showNotification('¡Propuesta aceptada! El chat ha sido habilitado.', 'success');
        this.loadProposals(this.currentUser.id);
        this.isProcessingAction = false; this.selectedProposalForAction = null;
      },
      error: (err: any) => {
        this.showNotification(err.error?.detail || "Error al aceptar.", 'error');
        this.isProcessingAction = false; this.selectedProposalForAction = null;
      }
    });
  }

  reject(proposal: SolicitudResumen): void {
     if (!this.currentUser || !this.isPending(proposal)) return;
     if (!confirm(`¿Seguro que quieres rechazar esta propuesta?`)) { return; }
     this.selectedProposalForAction = proposal; this.isProcessingAction = true;
     this.error = null; this.clearNotification();
     
     this.apiService.rejectProposal(proposal.id_solicitud, this.currentUser.id).subscribe({
       next: () => {
         this.showNotification('Propuesta rechazada.', 'success');
         this.loadProposals(this.currentUser.id);
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       },
       error: (err: any) => {
         this.showNotification(err.error?.detail || "Error al rechazar.", 'error');
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       }
     });
  }

  // --- Helpers ---
  goToDetail(solicitudId: number): void { this.router.navigate(['/propuestas', solicitudId]); }
  getOfferCount(proposal: SolicitudResumen): number { return proposal.ofertas?.length || 0; }
  getCounterpartyName(proposal: SolicitudResumen): string {
    return proposal.solicitante?.nombre_usuario || 'Usuario';
  }
  canAcceptSingleOffer(proposal: SolicitudResumen): boolean {
    return proposal.estado === 'Pendiente' && !!proposal.ofertas && proposal.ofertas.length === 1;
  }
  isPending(proposal: SolicitudResumen): boolean {
    return proposal.estado === 'Pendiente';
  }
  getStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pendiente') return 'warning'; if (s === 'aceptada') return 'primary';
    if (s === 'rechazada' || s === 'cancelada') return 'danger'; return 'medium';
  }
  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message; this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }
  clearNotification(): void { this.notificationMessage = null; }
}