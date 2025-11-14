import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { Subscription, interval, startWith, switchMap, takeWhile } from 'rxjs';

// 1. Actualizamos la interfaz del Estado
interface ChatState {
  title: string;
  myBookTitle: string;
  otherBookTitle: string;
  isCompleted: boolean; // <-- ¡NUEVA PROPIEDAD!
}

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
  
  conversationTitle: string = 'Chat';
  myBookTitle: string | null = null;
  otherBookTitle: string | null = null;
  
  // 2. Propiedad para bloquear el chat
  isCompleted: boolean = false; 

  private pollingSubscription: Subscription | null = null;
  private componentActive = true;
  private lastMessageId = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    // 3. Leemos el estado completo
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as ChatState;

    if (state?.title) {
      this.conversationTitle = state.title;
      this.myBookTitle = state.myBookTitle;
      this.otherBookTitle = state.otherBookTitle;
      this.isCompleted = state.isCompleted || false; // <-- Guardamos el estado
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    const idParam = this.route.snapshot.paramMap.get('id');

    // 4. Fallback por si recargan la página
    if (!this.conversationTitle || this.conversationTitle === 'Chat') {
       const historyState = history.state as ChatState;
       if (historyState?.title) {
         this.conversationTitle = historyState.title;
         this.myBookTitle = historyState.myBookTitle;
         this.otherBookTitle = historyState.otherBookTitle;
         this.isCompleted = historyState.isCompleted || false; // <-- Guardamos el estado
       }
    }

    if (idParam && this.currentUser) {
      this.conversationId = +idParam;
      this.loadInitialMessages();
      // Si el chat no está completado, busca nuevos mensajes
      if (!this.isCompleted) {
        this.startPolling();
      }
      this.markAsSeen(); 
    } else {
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
    // (Esta función no necesita cambios)
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
    // (Esta función no necesita cambios)
    if (!this.conversationId || this.isCompleted) return; // No busca si está completo
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
    // (Esta función no necesita cambios)
    if (this.messages.length > 0) {
      this.lastMessageId = this.messages[this.messages.length - 1].id_mensaje;
    }
  }

  sendMessageOnEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent; 
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    // 5. Verificación de estado completado
    if (this.isCompleted) return; // No envía si está completo

    const messageBody = this.newMessage.trim();
    if (!messageBody || !this.conversationId || !this.currentUser) return;
    
    const messageData = { 
      id_usuario_emisor: this.currentUser.id, 
      cuerpo: messageBody 
    };
    
    this.newMessage = ''; 
    this.resetTextareaHeight(); 

    this.apiService.sendMessage(this.conversationId, messageData).subscribe({
      next: (response) => {
        const sentMessage = { 
          ...messageData, 
          emisor_id: this.currentUser.id,
          id_mensaje: response.id_mensaje, 
          enviado_en: new Date().toISOString() 
        };
        this.messages.push(sentMessage);
        this.updateLastMessageId();
        this.cdr.detectChanges(); 
        this.scrollToBottom();
      },
      error: (err) => {
        // El backend (enviar_mensaje) ya nos avisa si está completado
        if (err.error?.detail) {
          this.error = err.error.detail;
          this.isCompleted = true; // Sincroniza el estado
        }
        console.error("Error al enviar mensaje:", err);
        this.newMessage = messageBody; 
      }
    });
  }

  markAsSeen(): void {
    // (Esta función no necesita cambios)
    if (this.conversationId && this.currentUser && !this.isCompleted) {
      this.apiService.markConversationAsSeen(this.conversationId, this.currentUser.id).subscribe({
        error: (err) => console.error("Error al marcar como visto:", err)
      });
    }
  }

  scrollToBottom(): void {
    setTimeout(() => { 
      try {
        if (this.messageContainer) { 
          this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight; 
        }
      } catch (err) { }
    }, 50); 
  }

  isMyMessage(message: any): boolean {
    const senderId = message.emisor_id || message.id_usuario_emisor;
    return senderId === this.currentUser?.id;
  }

  autoGrowTextarea(event: any): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; 
    textarea.style.height = (textarea.scrollHeight) + 'px'; 
  }

  resetTextareaHeight(): void {
    try {
      const textarea = document.querySelector('.message-input-area textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    } catch(e) {}
  }
}