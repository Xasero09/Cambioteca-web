import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chat-list.html',
  styleUrls: ['./chat-list.css']
})
export class ChatListComponent implements OnInit {

  conversations: any[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser && this.currentUser.id) {
      this.loadConversations(this.currentUser.id);
    } else {
      this.error = "No se pudo identificar al usuario.";
      this.isLoading = false;
    }
  }

  loadConversations(userId: number): void {
    this.isLoading = true;
    this.apiService.getConversations(userId).subscribe({
      next: (data) => {
        this.conversations = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error al cargar las conversaciones:", err);
        this.error = "Hubo un problema al cargar tus mensajes.";
        this.isLoading = false;
      }
    });
  }

  // Helper para mostrar un título legible en la lista
  getDisplayTitle(conv: any): string {
    return conv.display_title || `Conversación ${conv.id_conversacion}`;
  }

  // Helper para mostrar la imagen del otro usuario
  getOtherUserAvatar(conv: any): string {
    return conv.otro_usuario?.imagen_perfil || 'assets/icon/avatardefecto.png'; // Fallback
  }
}
