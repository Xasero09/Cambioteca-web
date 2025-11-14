import { Component, OnInit, OnDestroy } from '@angular/core'; // 1. AÑADE OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { forkJoin, map, Observable, Subscription } from 'rxjs'; // 2. AÑADE Subscription
import { NotificationComponent } from '../../components/notification/notification'; 

@Component({
  selector: 'app-exchange-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NotificationComponent], 
  templateUrl: './exchange-history.html',
  styleUrls: ['./exchange-history.css']
})
export class ExchangeHistoryComponent implements OnInit, OnDestroy { // 3. AÑADE OnDestroy

  exchanges: any[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;
  private authSubscription!: Subscription; // 4. AÑADE ESTO (con '!')

  // Estados Modales
  showRatingModal = false; exchangeToRate: any = null; ratingData = { puntuacion: 5, comentario: '' }; isSubmittingRating = false; ratingError: string | null = null;
  showGeneratedCodeModal = false; generatedCodeData: { codigo: string, expira_en: string } | null = null; isGeneratingCode = false;
  showCompleteModal = false; exchangeToComplete: any = null; completionCode: string = ''; isCompleting = false; completionError: string | null = null;

  // Notificación
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user; 

      // Ajusta 'user.id' si tu ID se llama 'id_usuario'
      if (user && user.id) {
        this.loadHistory(user.id);
      } else {
        this.error = "No se pudo identificar al usuario. Por favor, inicia sesión.";
        this.isLoading = false;
        this.exchanges = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  loadHistory(userId: number): void {
    this.isLoading = true; this.error = null;
    this.apiService.getExchangeHistory(userId).subscribe({
      next: (data: any) => {
        console.log("Datos del Historial (API):", data); 
        this.enrichExchangesWithRatingStatus(data || []); 
      },
      error: (err: any) => {
        console.error("Error al cargar historial:", err);
        this.error = "Error al cargar el historial."; this.isLoading = false; 
      }
    });
  }

  enrichExchangesWithRatingStatus(exchanges: any[]): void {
    const completedExchanges = exchanges.filter(ex => ex.estado === 'Completado');
    if (completedExchanges.length === 0 || !this.currentUser) {
      this.exchanges = exchanges.map(ex => ({ ...ex, yaCalificado: false })); this.isLoading = false; return;
    }
    
    // ⚠️ IMPORTANTE: Ajusta 'this.currentUser.id' si tu ID se llama 'id_usuario'
    const currentUserId = this.currentUser.id;
    
    const ratingChecks$: Observable<{ exchangeId: number, hasRated: boolean }>[] = completedExchanges.map(ex =>
      this.apiService.getMyRatingForExchange(ex.id, currentUserId).pipe(
        map((ratingResult: any) => ({ exchangeId: ex.id, hasRated: !!(ratingResult && ratingResult.puntuacion) }))
      )
    );
    
    forkJoin(ratingChecks$).subscribe({
      next: (results: any) => {
        const ratingStatusMap = new Map(results.map((r: any) => [r.exchangeId, r.hasRated]));
        this.exchanges = exchanges.map(ex => ({
          ...ex, yaCalificado: ex.estado === 'Completado' ? ratingStatusMap.get(ex.id) || false : false
        }));
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error("Error al verificar calificaciones:", err);
        this.exchanges = exchanges.map(ex => ({ ...ex, yaCalificado: false })); this.isLoading = false;
      }
    });
  }

  // --- Lógica Modales (sin cambios) ---
  openRatingModal(exchange: any): void {
    if (!this.currentUser || exchange.estado !== 'Completado' || exchange.yaCalificado) return;
    this.exchangeToRate = exchange; this.ratingData = { puntuacion: 5, comentario: '' };
    this.ratingError = null; this.isSubmittingRating = false; this.showRatingModal = true;
  }
  closeRatingModal(): void { this.showRatingModal = false; this.exchangeToRate = null; }

  openGenerateCodeModal(exchange: any): void {
    if (!this.canGenerateCode(exchange)) return; 
    this.isGeneratingCode = true; this.error = null; this.generatedCodeData = null; 
    
    // ⚠️ IMPORTANTE: Ajusta 'this.currentUser.id' si tu ID se llama 'id_usuario'
    this.apiService.generateExchangeCode(exchange.id, this.currentUser.id).subscribe({
      next: (data: any) => { this.generatedCodeData = data; this.showGeneratedCodeModal = true; this.isGeneratingCode = false; },
      error: (err: any) => { this.error = err.error?.detail || "Error al generar código."; this.isGeneratingCode = false; }
    });
  }
  closeGeneratedCodeModal(): void { this.showGeneratedCodeModal = false; this.generatedCodeData = null; }

  openCompleteModal(exchange: any): void {
     if (!this.canCompleteExchange(exchange)) return; 
     this.exchangeToComplete = exchange; this.completionCode = ''; this.completionError = null; this.isCompleting = false;
     this.showCompleteModal = true; 
  }
  closeCompleteModal(): void { this.showCompleteModal = false; this.exchangeToComplete = null; this.completionCode = ''; }

  // --- Lógica Enviar Datos ---
  
  // -----------------------------------------------------------------
  // --- 👇 INICIO: CORRECCIÓN DE submitRating (Error TS2554) 👇 ---
  // -----------------------------------------------------------------
  submitRating(): void {
    if (!this.exchangeToRate || !this.currentUser || this.ratingData.puntuacion < 1 || this.ratingData.puntuacion > 5) {
      this.ratingError = "Selecciona una puntuación."; return;
    }
    this.isSubmittingRating = true; this.ratingError = null;
    
    // ⚠️ IMPORTANTE: Ajusta 'this.currentUser.id' si tu ID se llama 'id_usuario'
    const currentUserId = this.currentUser.id;

    // 1. Llama a la API con 4 argumentos separados (id, userId, puntuacion, comentario)
    this.apiService.rateExchange(
      this.exchangeToRate.id, 
      currentUserId,
      this.ratingData.puntuacion,
      this.ratingData.comentario.trim()
    ).subscribe({
      next: () => {
        this.showNotification("¡Calificación enviada con éxito!", 'success'); 
        const index = this.exchanges.findIndex(ex => ex.id === this.exchangeToRate.id);
        if (index > -1) { this.exchanges[index].yaCalificado = true; }
        this.closeRatingModal();
        this.isSubmittingRating = false; 
      },
      error: (err: any) => { 
        this.ratingError = err.error?.detail || "Error al enviar."; 
        this.isSubmittingRating = false; 
      }
    });
  }
  // -----------------------------------------------------------------
  // --- 👆 FIN: CORRECCIÓN DE submitRating 👆 ---
  // -----------------------------------------------------------------

  // -----------------------------------------------------------------
  // --- 👇 INICIO: CORRECCIÓN DE submitCompletionCode (Error TS2554) 👇 ---
  // -----------------------------------------------------------------
  submitCompletionCode(): void {
    if (!this.exchangeToComplete || !this.currentUser || !this.completionCode.trim()) {
      this.completionError = "Ingresa el código."; return;
    }
    this.isCompleting = true; this.completionError = null;
    
    // ⚠️ IMPORTANTE: Ajusta 'this.currentUser.id' si tu ID se llama 'id_usuario'
    const currentUserId = this.currentUser.id;
    
    // 1. Llama a la API con 3 argumentos separados (id, userId, codigo)
    this.apiService.completeExchangeWithCode(
      this.exchangeToComplete.id, 
      currentUserId,
      this.completionCode.trim().toUpperCase()
    ).subscribe({
      next: () => {
        this.showNotification("¡Intercambio completado con éxito!", 'success');
        this.closeCompleteModal();
        this.loadHistory(currentUserId); // Recargar
        this.isCompleting = false; 
      },
      error: (err: any) => { 
        this.completionError = err.error?.detail || "Error al completar."; 
        this.isCompleting = false; 
      }
    });
  }
  // -----------------------------------------------------------------
  // --- 👆 FIN: CORRECCIÓN DE submitCompletionCode 👆 ---
  // -----------------------------------------------------------------

  // --- Helpers ---
  setRating(stars: number): void { this.ratingData.puntuacion = stars; }

  canGenerateCode(exchange: any): boolean {
    // ⚠️ IMPORTANTE: Asegúrate que 'exchange.ofreciente_id' sea correcto
    const can = exchange.estado === 'Aceptado' && this.currentUser?.id === exchange.ofreciente_id;
    return can;
  }

  canCompleteExchange(exchange: any): boolean {
    // ⚠️ IMPORTANTE: Asegúrate que 'exchange.solicitante_id' sea correcto
    const can = exchange.estado === 'Aceptado' && this.currentUser?.id === exchange.solicitante_id;
    return can;
  }
  
  // --- Métodos Notificación ---
  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message; this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000); 
  }
  clearNotification(): void { this.notificationMessage = null; }
}