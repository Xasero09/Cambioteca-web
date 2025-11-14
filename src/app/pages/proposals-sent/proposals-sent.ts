import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { NotificationComponent } from '../../components/notification/notification';
import { forkJoin, map, Observable, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// Interfaz
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
  
  // Flags locales de UI
  lugar_confirmado_localmente: boolean; // true si la propuesta de lugar está ACEPTADA
  propuesta_estado?: string | null;      // PENDIENTE, ACEPTADA, RECHAZADA
}

@Component({
  selector: 'app-proposals-sent',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationComponent, FormsModule],
  templateUrl: './proposals-sent.html',
  styleUrls: ['./proposals-sent.css']
})
export class ProposalsSentComponent implements OnInit, OnDestroy {

  enviadas: SolicitudResumen[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;
  private authSubscription!: Subscription;
  
  isProcessingAction = false;
  selectedProposalForAction: SolicitudResumen | null = null;
  
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  // Modal de Completar (Solicitante ingresa código)
  showCompleteModal = false;
  exchangeToComplete: SolicitudResumen | null = null;
  completionCode: string = '';
  isCompleting = false;
  completionError: string | null = null;

  // Modal de Calificación
  showRatingModal = false;
  exchangeToRate: SolicitudResumen | null = null;
  ratingData = { puntuacion: 3, comentario: '' };
  isSubmittingRating = false;
  ratingError: string | null = null;
  ratedIntercambioIds = new Set<number>();
  
  // Estado para Confirmar Lugar
  isConfirmingPlace: { [key: number]: boolean } = {};

  // Modal de Confirmación
  showConfirmationModal = false;
  confirmationTitle = '';
  confirmationMessage = '';
  private actionToConfirm: () => void = () => {};

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
        this.enviadas = [];
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
    
    this.apiService.getSentProposals(userId).subscribe({
      next: (enviadas: SolicitudResumen[]) => {
        
        // 1. Carga la lista base (aún con datos de lugar "sucios")
        this.enviadas = (enviadas || []).map(p => ({
            ...p,
            lugar_confirmado_localmente: false, // Empezamos en false
            propuesta_estado: null
        }));
        this.isLoading = false; 

        // 2. Filtra TODAS las que están 'Aceptadas' para verificar su estado real
        const acceptedProposals = this.enviadas.filter(p => p.estado === 'Aceptada');
        
        if (acceptedProposals.length > 0) {
          // 3. Prepara una llamada a la API para cada una
          const statusChecks$: Observable<any>[] = acceptedProposals.map(proposal =>
            this.apiService.getMeetingProposal(proposal.intercambio_id!)
              .pipe(
                map(liveProposal => ({
                  solicitudId: proposal.id_solicitud,
                  liveData: liveProposal 
                })),
                catchError(() => of({ solicitudId: proposal.id_solicitud, liveData: null })) // Si falla, continúa
              )
          );
  
          // 4. Ejecuta todas las llamadas
          forkJoin(statusChecks$).subscribe({
            next: (results) => {
              
              // 5. Actualiza la lista 'enviadas' con los datos en vivo
              results.forEach(result => {
                const proposalToUpdate = this.enviadas.find(p => p.id_solicitud === result.solicitudId);
                
                if (proposalToUpdate && result.liveData && result.liveData.estado) {
                  const estadoPropuesta = result.liveData.estado.toUpperCase();
                  proposalToUpdate.propuesta_estado = estadoPropuesta;
                  
                  // Actualizamos el lugar/fecha (por si estaba "A coordinar")
                  proposalToUpdate.lugar_intercambio = result.liveData.direccion;
                  proposalToUpdate.fecha_intercambio_pactada = result.liveData.fecha;

                  // ¡ESTO ES LO MÁS IMPORTANTE!
                  // Si el estado real es ACEPTADA, marcamos el flag local como true
                  if (estadoPropuesta === 'ACEPTADA') {
                    proposalToUpdate.lugar_confirmado_localmente = true;
                  }
                }
              });
            }
          });
        }

        // 6. Cargar estados de calificación
        this.checkRatingStatus(this.enviadas);
      },
      error: (err: any) => {
        this.error = "Error al cargar propuestas enviadas.";
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

  // --- Confirmar/Rechazar Lugar (SOLICITANTE) ---
  
  confirmPlace(proposal: SolicitudResumen, decision: boolean): void {
    if (!proposal.intercambio_id || !this.currentUser) return;

    const actionText = decision ? "aceptar" : "rechazar";
    
    this.confirmationTitle = 'Confirmar Acción';
    this.confirmationMessage = `¿Seguro que quieres ${actionText} la propuesta de lugar?`;
    this.actionToConfirm = () => this.executeConfirmPlace(proposal, decision);
    this.showConfirmationModal = true;
  }

  private executeConfirmPlace(proposal: SolicitudResumen, decision: boolean): void {
    this.isConfirmingPlace[proposal.id_solicitud] = true;
    this.clearNotification();
    const userId = this.currentUser.id;
    
    this.apiService.confirmarEncuentro(proposal.intercambio_id!, userId, decision).subscribe({
      next: () => {
        this.isConfirmingPlace[proposal.id_solicitud] = false;
        
        if (decision) {
          this.showNotification('¡Lugar confirmado!', 'success');
          proposal.lugar_confirmado_localmente = true; // Muestra botón "Completar"
          proposal.propuesta_estado = 'ACEPTADA';     // Actualiza estado local
        } else {
          this.showNotification('Lugar rechazado. El receptor debe proponer uno nuevo.', 'success');
          this.loadProposals(this.currentUser.id); // Recarga para limpiar el lugar
        }
      },
      error: (err: any) => {
        this.isConfirmingPlace[proposal.id_solicitud] = false;
        this.showNotification(err.error?.detail || "Error al confirmar el lugar.", 'error');
      }
    });
  }

  // --- Modal Completar (Solicitante) ---
  openCompleteModal(proposal: SolicitudResumen): void {
    if (!proposal.intercambio_id) return;
    this.exchangeToComplete = proposal;
    this.completionCode = '';
    this.completionError = null;
    this.isCompleting = false;
    this.showCompleteModal = true;
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    this.exchangeToComplete = null;
  }
  
  submitCompletionCode(): void {
    if (!this.exchangeToComplete || !this.currentUser || !this.completionCode.trim()) {
      this.completionError = "Por favor, ingresa el código."; return;
    }
    this.isCompleting = true; 
    this.completionError = null;
    
    const codigo = this.completionCode.trim().toUpperCase();
    
    this.apiService.completeExchangeWithCode(
      this.exchangeToComplete.intercambio_id!, 
      this.currentUser.id,
      codigo
    ).subscribe({
      next: () => {
        this.isCompleting = false;
        this.closeCompleteModal();
        this.showNotification('¡Intercambio completado con éxito!', 'success');
        this.loadProposals(this.currentUser.id);
      },
      error: (err: any) => {
        this.isCompleting = false;
        this.completionError = err.error?.detail || "Error al completar. Verifica el código.";
      }
    });
  }

  // --- Modal de Calificación ---
  openRatingModal(proposal: SolicitudResumen): void {
    if (!this.canRate(proposal)) return;
    this.exchangeToRate = proposal;
    this.ratingData = { puntuacion: 3, comentario: '' };
    this.ratingError = null; 
    this.isSubmittingRating = false;
    this.showRatingModal = true;
  }

  closeRatingModal(): void {
    this.showRatingModal = false;
    this.exchangeToRate = null;
  }

  submitRating(): void {
    if (!this.exchangeToRate || !this.currentUser || !this.exchangeToRate.intercambio_id) {
      this.ratingError = "No se pudo identificar el intercambio."; return;
    }
    this.isSubmittingRating = true; 
    this.ratingError = null;
    
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

  // --- Acción Cancelar (Solicitante) ---
  cancelProposal(proposal: SolicitudResumen): void {
     if (!this.currentUser || !this.isPending(proposal)) return;
     if (!confirm(`¿Seguro que quieres cancelar tu propuesta?`)) { return; }
     
     this.selectedProposalForAction = proposal;
     this.isProcessingAction = true;
     this.clearNotification();
     
     this.apiService.cancelProposal(proposal.id_solicitud, this.currentUser.id).subscribe({
       next: () => {
         this.showNotification('Propuesta cancelada.', 'success');
         this.loadProposals(this.currentUser.id);
         this.isProcessingAction = false;
         this.selectedProposalForAction = null;
       },
       error: (err: any) => {
         this.showNotification(err.error?.detail || "Error al cancelar.", 'error');
         this.isProcessingAction = false;
         this.selectedProposalForAction = null;
       }
     });
  }

  // --- Funciones para el Modal de Confirmación ---

  handleModalConfirm(): void {
    this.actionToConfirm(); // Ejecuta 'executeConfirmPlace'
    this.showConfirmationModal = false;
  }

  handleModalCancel(): void {
    this.showConfirmationModal = false;
    this.actionToConfirm = () => {}; // Limpia
  }
  
  // --- Helpers ---
  goToDetail(solicitudId: number): void { this.router.navigate(['/propuestas', solicitudId]); }
  getOfferCount(proposal: SolicitudResumen): number { return proposal.ofertas?.length || 0; }
  getCounterpartyName(proposal: SolicitudResumen): string {
    return proposal.receptor?.nombre_usuario || 'Usuario';
  }
  isPending(proposal: SolicitudResumen): boolean {
    return proposal.estado === 'Pendiente';
  }
  isCompleted(proposal: SolicitudResumen): boolean { return proposal.estado === 'Completado'; }
  canRate(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') return false;
    return !this.ratedIntercambioIds.has(proposal.intercambio_id);
  }
  hasRated(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') return false;
    return this.ratedIntercambioIds.has(proposal.intercambio_id);
  }
  getStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pendiente') return 'warning'; if (s === 'aceptada') return 'primary';
    if (s === 'rechazada' || s === 'cancelada') return 'danger'; return 'medium';
  }
  
  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message; 
    this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }
  clearNotification(): void { this.notificationMessage = null; }
}