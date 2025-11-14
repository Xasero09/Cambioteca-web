import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
// --- 👇 PASO 1: IMPORTAR EL ENTORNO ---
import { environment } from '../../../environments/environment';

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

  // --- 👇 PASO 2: AÑADIR LA BASE DE MEDIA ---
  private readonly MEDIA_BASE = (environment.mediaBase || '').replace(/\/+$/, '');

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

  getChatState(conv: any): any {
    return {
      title: conv.otro_usuario?.nombre_usuario || 'Usuario',
      myBookTitle: conv.my_book_title || 'Tu Libro',
      otherBookTitle: conv.counterpart_book_title || 'Su Libro',
      isCompleted: conv.estado_intercambio === 'Completado' 
    };
  }

  // --- 👇 PASO 3: REEMPLAZAR ESTA FUNCIÓN ---
  getOtherUserAvatar(conv: any): string {
    const rawPath = conv.otro_usuario?.imagen_perfil;
    
    // Usamos nuestra lógica de Railway, con 'avatars/avatardefecto.jpg' como fallback
    return this.toRailwayAbsolute(rawPath, 'avatars/avatardefecto.jpg');
  }

  // --- 👇 PASO 4: AÑADIR LAS FUNCIONES HELPER (COMO EN PERFIL) ---

  private join(base: string, path: string): string {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private upgradeSchemeIfNeeded(url: string): string {
    try {
      if (location.protocol === 'https:' && url.startsWith('http://')) {
        const u = new URL(url);
        return `https://${u.host}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {}
    return url;
  }

  private fromMediaBase(rel: string): string {
    return this.join(this.MEDIA_BASE, rel);
  }

  /**
   * Lógica principal para convertir rutas relativas a absolutas de Railway
   * Acepta un 'fallbackPath' personalizado.
   */
  private toRailwayAbsolute(raw: string | null | undefined, fallbackPath: string): string {
    const s = (raw || '').trim();
    
    if (!s) return this.fromMediaBase(fallbackPath);

    // 1. Si ya es absoluta (http:// o https://), la respeta
    if (/^https?:\/\//i.test(s)) return this.upgradeSchemeIfNeeded(s);

    // 2. Si es una ruta física (ej: /opt/render/project/media/avatars/...)
    const m = s.match(/\/?media\/(.+)$/i);
    if (m && m[1]) return this.fromMediaBase(m[1]);

    // 3. Si es una ruta relativa (ej: 'avatars/pic.jpg')
    return this.fromMediaBase(s);
  }
}