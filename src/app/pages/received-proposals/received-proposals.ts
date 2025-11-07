import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { NotificationComponent } from '../../components/notification/notification';
import { forkJoin, map, Observable } from 'rxjs'; // 1. Importa map y Observable
import { FormsModule } from '@angular/forms'; // 2. IMPORTANTE: Añadir FormsModule

// Interfaz (sin cambios)
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
}

@Component({
  selector: 'app-received-proposals',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationComponent, FormsModule], // 3. AÑADIR FormsModule
  templateUrl: './received-proposals.html',
  styleUrls: ['./received-proposals.css']
})
export class ReceivedProposalsComponent implements OnInit {

  // Listas y Pestañas
  recibidas: SolicitudResumen[] = [];
  enviadas: SolicitudResumen[] = [];
  currentTab: 'recibidas' | 'enviadas' = 'recibidas';
  
  // Estados Generales
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;
  isProcessingAction = false;
  selectedProposalForAction: SolicitudResumen | null = null;
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  // Estados para Modales de Código
  showGenerateCodeModal = false;
  generatedCodeData: { codigo: string, expira_en: string } | null = null;
  isGeneratingCode = false;
  showCompleteModal = false;
  exchangeToComplete: SolicitudResumen | null = null;
  completionCode: string = '';
  isCompleting = false;
  completionError: string | null = null;

  // --- 👇 NUEVO: Estados para Modal de Calificación 👇 ---
  showRatingModal = false;
  exchangeToRate: SolicitudResumen | null = null;
  ratingData = { puntuacion: 3, comentario: '' }; // Inicia en 3 estrellas
  isSubmittingRating = false;
  ratingError: string | null = null;
  // Set para guardar los IDs de intercambios que YA califiqué
  ratedIntercambioIds = new Set<number>();
  // --- -------------------------------------------- ---

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser && this.currentUser.id) {
      this.loadProposals(this.currentUser.id);
    } else {
      this.error = "No se pudo identificar al usuario.";
      this.isLoading = false;
    }
  }

  loadProposals(userId: number): void {
    this.isLoading = true; this.error = null;
    
    forkJoin({
      recibidas: this.apiService.getReceivedProposals(userId),
      enviadas: this.apiService.getSentProposals(userId)
    }).subscribe({
      next: ({ recibidas, enviadas }) => {
        this.recibidas = recibidas || [];
        this.enviadas = enviadas || [];
        
        // --- 👇 NUEVA LLAMADA: Verifica el estado de calificación ---
        this.checkRatingStatus([...this.recibidas, ...this.enviadas]);
        
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = "Error al cargar propuestas."; 
        this.isLoading = false;
      }
    });
  }

  /**
   * NUEVO: Revisa una lista de propuestas y consulta
   * cuáles ya han sido calificadas por el usuario actual.
   */
  checkRatingStatus(allProposals: SolicitudResumen[]): void {
    if (!this.currentUser) return;
    
    const completedProposals = allProposals.filter(p => p.estado === 'Completado' && p.intercambio_id);
    if (completedProposals.length === 0) {
      return; // No hay nada que chequear
    }

    const ratingChecks$: Observable<{ id: number, rated: boolean }>[] = completedProposals.map(p =>
      this.apiService.getMyRatingForExchange(p.intercambio_id!, this.currentUser.id).pipe(
        map((ratingResult: any) => ({
          id: p.intercambio_id!,
          rated: !!(ratingResult && ratingResult.puntuacion) // true si ya tiene puntuación
        }))
      )
    );

    forkJoin(ratingChecks$).subscribe({
      next: (results) => {
        // Limpia el Set y añade solo los que ya están calificados
        this.ratedIntercambioIds.clear();
        results.forEach(r => {
          if (r.rated) {
            this.ratedIntercambioIds.add(r.id);
          }
        });
      },
      error: (err) => console.error("Error al verificar calificaciones", err) // No bloquea la UI
    });
  }

  // --- 👇 NUEVAS FUNCIONES PARA EL MODAL DE CALIFICACIÓN 👇 ---
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
      this.ratingError = "No se pudo identificar el intercambio.";
      return;
    }
    
    this.isSubmittingRating = true;
    this.ratingError = null;
    
    const { puntuacion, comentario } = this.ratingData;
    
    // 👇 Esta llamada (con 4 argumentos) ahora coincidirá con la definición en tu servicio
    this.apiService.rateExchange(this.exchangeToRate.intercambio_id, this.currentUser.id, puntuacion, comentario).subscribe({
      next: () => {
        this.isSubmittingRating = false;
        this.closeRatingModal();
        this.showNotification('¡Calificación enviada con éxito!', 'success');
        // Marca este ID como "ya calificado" en el Set
        this.ratedIntercambioIds.add(this.exchangeToRate!.intercambio_id!);
      },
      error: (err: any) => {
        this.isSubmittingRating = false;
        this.ratingError = err.error?.detail || "Error al enviar la calificación.";
      }
    });
  }

  // --- 👇 NUEVOS HELPERS DE ESTADO 👇 ---
  isCompleted(proposal: SolicitudResumen): boolean {
    return proposal.estado === 'Completado';
  }

  // ¿Puede calificar? (Completado Y AÚN NO calificado)
  canRate(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') {
      return false;
    }
    return !this.ratedIntercambioIds.has(proposal.intercambio_id);
  }

  // ¿Ya calificó? (Para mostrar el mensaje "Ya calificado")
  hasRated(proposal: SolicitudResumen): boolean {
    if (!proposal.intercambio_id || proposal.estado !== 'Completado') {
      return false;
    }
    return this.ratedIntercambioIds.has(proposal.intercambio_id);
  }

  // --- (Funciones existentes: Modales de Código, Aceptar, Rechazar, etc.) ---
  openGenerateCodeModal(proposal: SolicitudResumen): void { /* ... (sin cambios) ... */
    if (!proposal.intercambio_id || !this.currentUser) return;
    this.isGeneratingCode = true;
    this.generatedCodeData = null;
    this.showGenerateCodeModal = true;
    this.error = null;
    this.apiService.generateExchangeCode(proposal.intercambio_id, this.currentUser.id).subscribe({
      next: (data) => {
        this.generatedCodeData = data;
        this.isGeneratingCode = false;
      },
      error: (err: any) => {
        this.closeGeneratedCodeModal();
        this.showNotification(err.error?.detail || "Error al generar el código.", 'error');
        this.isGeneratingCode = false;
      }
    });
  }
  closeGeneratedCodeModal(): void { this.showGenerateCodeModal = false; this.generatedCodeData = null; }
  openCompleteModal(proposal: SolicitudResumen): void { /* ... (sin cambios) ... */
    if (!proposal.intercambio_id) return;
    this.exchangeToComplete = proposal;
    this.completionCode = '';
    this.completionError = null;
    this.isCompleting = false;
    this.showCompleteModal = true;
  }
  closeCompleteModal(): void { this.showCompleteModal = false; this.exchangeToComplete = null; }
  submitCompletionCode(): void { /* ... (sin cambios) ... */
    if (!this.exchangeToComplete || !this.currentUser || !this.completionCode.trim()) {
      this.completionError = "Por favor, ingresa el código.";
      return;
    }
    this.isCompleting = true;
    this.completionError = null;
    const payload = {
      user_id: this.currentUser.id,
      codigo: this.completionCode.trim().toUpperCase()
    };
    this.apiService.completeExchangeWithCode(this.exchangeToComplete.intercambio_id!, payload.user_id, payload.codigo).subscribe({
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
  getCounterpartyName(proposal: SolicitudResumen, tab: 'recibidas' | 'enviadas'): string { /* ... (sin cambios) ... */
    return (tab === 'recibidas' ? proposal.solicitante?.nombre_usuario : proposal.receptor?.nombre_usuario) || 'Usuario';
  }
  cancelProposal(proposal: SolicitudResumen): void { /* ... (sin cambios) ... */
     if (!this.currentUser || !this.isPending(proposal)) return;
     if (!confirm(`¿Seguro que quieres cancelar tu propuesta por "${proposal.libro_deseado?.titulo || 'este libro'}"?`)) { return; }
     this.selectedProposalForAction = proposal; this.isProcessingAction = true;
     this.error = null; this.clearNotification();
     this.apiService.cancelProposal(proposal.id_solicitud, this.currentUser.id).subscribe({ 
       next: () => {
         this.showNotification('Propuesta cancelada.', 'success');
         this.loadProposals(this.currentUser.id);
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       },
       error: (err: any) => {
         this.showNotification(err.error?.detail || "Error al cancelar la propuesta.", 'error');
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       }
     });
  }
  canAcceptSingleOffer(proposal: SolicitudResumen): boolean { /* ... (sin cambios) ... */
    return proposal.estado === 'Pendiente' && !!proposal.ofertas && proposal.ofertas.length === 1;
  }
  isPending(proposal: SolicitudResumen): boolean { /* ... (sin cambios) ... */
    return proposal.estado === 'Pendiente';
  }
  acceptSingleOffer(proposal: SolicitudResumen): void { /* ... (sin cambios) ... */
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
        this.showNotification(err.error?.detail || "Error al aceptar la propuesta.", 'error');
        this.isProcessingAction = false; this.selectedProposalForAction = null;
      }
    });
  }
  reject(proposal: SolicitudResumen): void { /* ... (sin cambios) ... */
     if (!this.currentUser || !this.isPending(proposal)) return;
     if (!confirm(`¿Seguro que quieres rechazar la propuesta por "${proposal.libro_deseado?.titulo || 'este libro'}"?`)) { return; }
     this.selectedProposalForAction = proposal; this.isProcessingAction = true;
     this.error = null; this.clearNotification();
     this.apiService.rejectProposal(proposal.id_solicitud, this.currentUser.id).subscribe({ 
       next: () => {
         this.showNotification('Propuesta rechazada.', 'success');
         this.loadProposals(this.currentUser.id);
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       },
       error: (err: any) => {
         this.showNotification(err.error?.detail || "Error al rechazar la propuesta.", 'error');
         this.isProcessingAction = false; this.selectedProposalForAction = null;
       }
     });
  }
  goToDetail(solicitudId: number): void { this.router.navigate(['/propuestas', solicitudId]); }
  getOfferCount(proposal: SolicitudResumen): number { return proposal.ofertas?.length || 0; }
  getStatusColor(status: string): string { /* ... (sin cambios) ... */
    const s = (status || '').toLowerCase();
    if (s === 'pendiente') return 'warning'; if (s === 'aceptada') return 'primary';
    if (s === 'rechazada' || s === 'cancelada') return 'danger'; return 'medium';
  }
  showNotification(message: string, type: 'success' | 'error'): void { /* ... (sin cambios) ... */
    this.notificationMessage = message; this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }
  clearNotification(): void { this.notificationMessage = null; }
}