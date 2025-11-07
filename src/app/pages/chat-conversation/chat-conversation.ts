import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
// 1. Importa Router
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { Subscription, interval, startWith, switchMap, takeWhile } from 'rxjs';

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-conversation.html',
  styleUrls: ['./chat-conversation.css']
})
export class ChatConversationComponent implements OnInit, OnDestroy {

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  conversationId: number | null = null;
  messages: any[] = [];
  isLoading = true;
  error: string | null = null;
  newMessage: string = '';
  currentUser: any = null;
  
  // 2. Nueva propiedad para guardar el título
  conversationTitle: string = 'Chat'; // Título por defecto

  private pollingSubscription: Subscription | null = null;
  private componentActive = true;
  private lastMessageId = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router // 3. Inyecta Router
  ) {
     // 4. Lee el título del estado de navegación
     const navigation = this.router.getCurrentNavigation();
     const state = navigation?.extras.state as { title: string };
     if (state?.title) {
       this.conversationTitle = state.title;
     }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam && this.currentUser) {
      this.conversationId = +idParam;
      this.loadInitialMessages();
      this.startPolling();
      this.markAsSeen(); 
    } else {
      // Intenta recuperar el título del historial si recargan la página
      if (!this.conversationTitle || this.conversationTitle === 'Chat') {
         const historyState = history.state as { title: string };
         if (historyState?.title) { this.conversationTitle = historyState.title; }
      }
      if (!idParam) this.error = "ID de conversación no encontrado.";
      if (!this.currentUser) this.error = "Usuario no identificado.";
      this.isLoading = false;
    }
  }
  
  ngOnDestroy(): void { 
    this.componentActive = false; 
    this.pollingSubscription?.unsubscribe();
  }

  loadInitialMessages(): void {
    if (!this.conversationId) return;
    this.isLoading = true;
    this.apiService.getMessages(this.conversationId).subscribe({
      next: (data) => {
        this.messages = data;
        this.updateLastMessageId();
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: (err) => { this.error = "Error al cargar mensajes."; this.isLoading = false; }
    });
  }

  startPolling(): void {
    if (!this.conversationId) return;
    this.pollingSubscription = interval(5000)
      .pipe(
        startWith(0), 
        takeWhile(() => this.componentActive),
        switchMap(() => this.apiService.getMessages(this.conversationId!, this.lastMessageId || undefined)) 
      )
      .subscribe({
        next: (newMessages) => {
          if (newMessages.length > 0) {
            this.messages = [...this.messages, ...newMessages];
            this.updateLastMessageId();
            this.markAsSeen(); 
            this.cdr.detectChanges(); 
            this.scrollToBottom();
          }
        },
        error: (err) => console.error("Error en polling:", err) 
      });
  }

  updateLastMessageId(): void {
    if (this.messages.length > 0) {
      this.lastMessageId = this.messages[this.messages.length - 1].id_mensaje;
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.conversationId || !this.currentUser) return;
    const messageData = { id_usuario_emisor: this.currentUser.id, cuerpo: this.newMessage.trim() };
    const tempMessage = this.newMessage;
    this.newMessage = ''; // Limpiar input

    this.apiService.sendMessage(this.conversationId, messageData).subscribe({
      next: (response) => {
        const sentMessage = { ...messageData, id_mensaje: response.id_mensaje, enviado_en: new Date().toISOString() };
        this.messages.push(sentMessage);
        this.updateLastMessageId();
        this.cdr.detectChanges(); 
        this.scrollToBottom();
      },
      error: (err) => {
        console.error("Error al enviar mensaje:", err);
        this.newMessage = tempMessage; // Restaurar mensaje si falla
      }
    });
  }

  markAsSeen(): void {
    if (this.conversationId && this.currentUser) {
      this.apiService.markConversationAsSeen(this.conversationId, this.currentUser.id).subscribe({
        error: (err) => console.error("Error al marcar como visto:", err)
      });
    }
  }

  scrollToBottom(): void {
    setTimeout(() => { 
      try {
        if (this.messageContainer) { this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight; }
      } catch (err) { }
    }, 50); 
  }

  isMyMessage(message: any): boolean {
    return message.emisor_id === this.currentUser?.id;
  }
}