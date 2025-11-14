import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';
import { NotificationComponent } from '../../components/notification/notification';

// (La interfaz Proposal se mantiene igual)
interface BookLite { id_libro: number; titulo: string; autor: string; }
interface Offer { id_oferta: number; libro_ofrecido: BookLite; }
interface UserLite { id_usuario: number; nombre_usuario: string; }
interface Proposal {
  id_solicitud: number;
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Cancelada' | 'Completado';
  libro_deseado: BookLite;
  solicitante: UserLite;
  receptor: UserLite;
  ofertas: Offer[];
  libro_aceptado: BookLite | null;
  conversacion_id: number | null;
  intercambio_id: number | null;
  lugar_intercambio: string | null;
  fecha_intercambio_pactada: string | null;
}


@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NotificationComponent],
  providers: [DatePipe], 
  templateUrl: './proposal-detail.html',
  styleUrls: ['./proposal-detail.css']
})
export class ProposalDetailComponent implements OnInit {

  proposalId: number | null = null;
  proposalData: Proposal | null = null;
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;
  myRole: 'solicitante' | 'receptor' | null = null;
  selectedOfferId: number | null = null;
  isProcessingAction = false; 
  
  meetingLugar: string = '';
  meetingFecha: string = ''; 

  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private datePipe: DatePipe 
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam && this.currentUser) {
      this.proposalId = +idParam;
      this.loadProposalDetails(this.proposalId); 
    } else {
      this.error = "No se pudo cargar la propuesta (ID o usuario no encontrado).";
      this.isLoading = false;
    }
  }

  loadProposalDetails(id: number): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      recibidas: this.apiService.getReceivedProposals(this.currentUser.id),
      enviadas: this.apiService.getSentProposals(this.currentUser.id)
    }).subscribe({
      next: (results: any) => {
        const allProposals = [...(results.recibidas || []), ...(results.enviadas || [])];
        this.proposalData = allProposals.find((p: any) => p.id_solicitud === id) || null;

        if (this.proposalData) {
          this.myRole = this.proposalData.receptor.id_usuario === this.currentUser.id ? 'receptor' : 'solicitante';
          
          if (this.proposalData.estado === 'Aceptada') {
            if (this.proposalData.libro_aceptado) {
              this.selectedOfferId = this.proposalData.libro_aceptado.id_libro;
            }
            if (this.proposalData.lugar_intercambio) {
              this.meetingLugar = this.proposalData.lugar_intercambio;
            }
            if (this.proposalData.fecha_intercambio_pactada) {
              this.meetingFecha = this.datePipe.transform(this.proposalData.fecha_intercambio_pactada, 'yyyy-MM-ddTHH:mm') || '';
            }
          }

        } else {
          this.error = "No se encontraron detalles para esta propuesta.";
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error("Error al cargar detalles:", err);
        this.error = "Error al cargar la propuesta.";
        this.isLoading = false;
      }
    });
  }

  // --- ACCIONES DE PROPUESTA ---
  acceptProposal(): void {
    if (!this.proposalId || !this.selectedOfferId || !this.currentUser || this.isProcessingAction) return;

    this.isProcessingAction = true;
    this.apiService.acceptProposal(this.proposalId, this.selectedOfferId, this.currentUser.id).subscribe({
      next: () => {
        this.showNotification('¡Propuesta aceptada! El chat ha sido habilitado.', 'success');
        this.loadProposalDetails(this.proposalId!); 
        this.isProcessingAction = false;
      },
      error: (err: any) => {
        this.showNotification(err.error?.detail || "Error al aceptar la propuesta.", 'error');
        this.isProcessingAction = false;
      }
    });
  }

  rejectProposal(): void {
    if (!this.proposalId || !this.currentUser || this.isProcessingAction) return;
    if (!confirm('¿Seguro que quieres rechazar esta propuesta? Esta acción no se puede deshacer.')) return;
    this.isProcessingAction = true;
    this.apiService.rejectProposal(this.proposalId, this.currentUser.id).subscribe({
      next: () => {
        this.showNotification('Propuesta rechazada.', 'success');
        this.loadProposalDetails(this.proposalId!);
        this.isProcessingAction = false;
      },
      error: (err: any) => {
        this.showNotification(err.error?.detail || "Error al rechazar.", 'error');
        this.isProcessingAction = false;
      }
    });
  }

  cancelProposal(): void {
    if (!this.proposalId || !this.currentUser || this.isProcessingAction) return;
    if (!confirm('¿Seguro que quieres cancelar tu propuesta?')) return;
    this.isProcessingAction = true;
    this.apiService.cancelProposal(this.proposalId, this.currentUser.id).subscribe({
      next: () => {
        this.showNotification('Propuesta cancelada.', 'success');
        this.loadProposalDetails(this.proposalId!);
        this.isProcessingAction = false;
      },
      error: (err: any) => {
        this.showNotification(err.error?.detail || "Error al cancelar.", 'error');
        this.isProcessingAction = false;
      }
    });
  }

  // --- ACCIONES DE ENCUENTRO ---

  onProposeMeetingPoint(): void {
    if (!this.proposalData?.intercambio_id || !this.meetingLugar.trim() || !this.meetingFecha || this.isProcessingAction) {
      this.showNotification("Debes completar el lugar y la fecha/hora.", 'error');
      return;
    }

    this.isProcessingAction = true;
    const fechaISO = new Date(this.meetingFecha).toISOString();
    
    // --- 👇 ¡CORRECCIÓN DE NOMBRE Y ARGUMENTOS! ---
    // (Llama a 'proponerEncuentro' con 4 argumentos: id, userId, lugar, fecha)
    this.apiService.proponerEncuentro(
      this.proposalData.intercambio_id, 
      this.currentUser.id,
      this.meetingLugar, 
      fechaISO
    ).subscribe({
    // --- 👆 FIN DE LA CORRECCIÓN ---
      next: () => {
        const chatMessage = `¡Propuesta de encuentro!\nLugar: ${this.meetingLugar}\nFecha: ${this.datePipe.transform(this.meetingFecha, 'dd/MM/yy, h:mm a')}`;
        this.apiService.sendMessage(this.proposalData!.conversacion_id!, {
          id_usuario_emisor: this.currentUser.id,
          cuerpo: chatMessage
        }).subscribe({
          next: () => {
            this.showNotification('Propuesta de encuentro enviada.', 'success');
            this.loadProposalDetails(this.proposalId!);
            this.isProcessingAction = false;
          },
          error: (chatErr: any) => { // <-- CORREGIDO: TS7006
            console.error("Error al enviar mensaje de chat:", chatErr);
            this.showNotification('Propuesta guardada, pero falló el envío al chat. Por favor, avisa manualmente.', 'error');
            this.loadProposalDetails(this.proposalId!);
            this.isProcessingAction = false;
          }
        });
      },
      error: (err: any) => { // <-- CORREGIDO: TS7006
        this.showNotification(err.error?.detail || "Error al proponer el encuentro.", 'error');
        this.isProcessingAction = false;
      }
    });
  }

  onConfirmMeetingPoint(confirm: boolean): void {
    if (!this.proposalData?.intercambio_id || this.isProcessingAction) return;

    this.isProcessingAction = true;
    
    // --- 👇 ¡CORRECCIÓN DE NOMBRE! ---
    this.apiService.confirmarEncuentro(this.proposalData.intercambio_id, this.currentUser.id, confirm).subscribe({
    // --- 👆 FIN DE LA CORRECCIÓN ---
      next: () => {
        const messageText = confirm 
          ? `¡Encuentro confirmado!\nNos vemos en ${this.proposalData?.lugar_intercambio} el ${this.datePipe.transform(this.proposalData?.fecha_intercambio_pactada, 'dd/MM/yy, h:mm a')}.`
          : `El usuario ha solicitado cambiar el lugar/fecha propuesto. Por favor, sugiere una nueva alternativa.`;
        
        this.apiService.sendMessage(this.proposalData!.conversacion_id!, {
          id_usuario_emisor: this.currentUser.id,
          cuerpo: messageText
        }).subscribe({
          complete: () => {
            this.showNotification(confirm ? 'Encuentro confirmado.' : 'Propuesta rechazada.', 'success');
            this.loadProposalDetails(this.proposalId!);
            this.isProcessingAction = false;
          }
        });
      },
      error: (err: any) => { // <-- CORREGIDO: TS7006
        this.showNotification(err.error?.detail || "Error al responder.", 'error');
        this.isProcessingAction = false;
      }
    });
  }


  // --- Helpers de UI ---
  isPending(p: Proposal): boolean { return p.estado === 'Pendiente'; }
  isAccepted(p: Proposal): boolean { return p.estado === 'Aceptada'; }
  canAcceptOrReject(p: Proposal): boolean { return this.myRole === 'receptor' && this.isPending(p); }
  canCancel(p: Proposal): boolean { return this.myRole === 'solicitante' && this.isPending(p); }
  canProposeEncuentro(p: Proposal): boolean {
    // (Tu lógica original es incorrecta, debería ser si el lugar NO existe)
    return this.myRole === 'receptor' && this.isAccepted(p) && (!p.lugar_intercambio || p.lugar_intercambio === 'A coordinar');
  }
  canConfirmEncuentro(p: Proposal): boolean {
    return this.myRole === 'solicitante' && this.isAccepted(p) && !!p.lugar_intercambio && p.lugar_intercambio !== 'A coordinar';
  }
  showWaitingForConfirmation(p: Proposal): boolean {
    return this.myRole === 'receptor' && this.isAccepted(p) && !!p.lugar_intercambio && p.lugar_intercambio !== 'A coordinar';
  }

  // --- Notificaciones ---
  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }
  clearNotification(): void { this.notificationMessage = null; }
}