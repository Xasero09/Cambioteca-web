import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { RouterLink } from '@angular/router'; 
// --- PASO 1: IMPORTAR EL ENTORNO ---
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  user: any = null;
  metrics: any = null; 
  isLoading = true; // Para el perfil principal

  favoriteBooks: any[] = [];
  isLoadingFavorites = true;

  // --- PASO 2: AÑADIR LA BASE DE MEDIA ---
  private readonly MEDIA_BASE = (environment.mediaBase || '').replace(/\/+$/, '');
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const loggedInUser = this.authService.getUser();

    if (loggedInUser && loggedInUser.id) {
      
      // Carga 1: Resumen del perfil
      this.apiService.getUserSummary(loggedInUser.id).subscribe({
        next: (data: any) => { 
          this.user = data.user;
          this.metrics = data.metrics;
          this.isLoading = false; 
        },
        error: (err: any) => { 
          console.error('Error al cargar el perfil:', err);
          this.isLoading = false;
        }
      });

      // Carga 2: Libros Favoritos
      this.loadFavoriteBooks(loggedInUser.id);

    } else {
      this.isLoading = false;
      this.isLoadingFavorites = false; 
    }
  }

  loadFavoriteBooks(userId: number): void {
    this.isLoadingFavorites = true;
    this.apiService.getMyFavoritesList(userId).subscribe({
      next: (data: any) => { 
        // --- PASO 3: TRANSFORMAR LAS URLs DE LOS FAVORITOS ---
        this.favoriteBooks = (data || []).map((book: any) => ({
          ...book,
          // Convertimos la ruta relativa (ej: 'books/img.jpg') en absoluta
          first_image: this.toRailwayAbsolute(book.first_image) 
        }));
        this.isLoadingFavorites = false;
      },
      error: (err: any) => { 
        console.error('Error al cargar favoritos:', err);
        this.isLoadingFavorites = false;
      }
    });
  }

  // --- PASO 4: FUNCIONES PARA CONSTRUIR LA URL (COPIADAS DE BOOK-LIST) ---

  /**
   * Devuelve la URL del avatar, construida manualmente.
   */
  getAvatarSrc(): string {
    if (!this.user || !this.user.imagen_perfil) {
      // Devuelve el avatar por defecto si no hay imagen
      return this.fromMediaBase('avatars/avatardefecto.jpg');
    }
    // Usa la lógica de Railway para el campo 'imagen_perfil'
    return this.toRailwayAbsolute(this.user.imagen_perfil);
  }

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
   */
  private toRailwayAbsolute(raw: string | null | undefined): string {
    const s = (raw || '').trim();
    
    // Define un fallback (puedes cambiarlo si el avatar por defecto es otro)
    const fallbackImage = 'books/librodefecto.png';
    if (!s) return this.fromMediaBase(fallbackImage);

    // 1. Si ya es absoluta (http:// o https://), la respeta
    if (/^https?:\/\//i.test(s)) return this.upgradeSchemeIfNeeded(s);

    // 2. Si es una ruta física (ej: /opt/render/project/media/avatars/...)
    //    extrae solo la parte relativa (avatars/...)
    const m = s.match(/\/?media\/(.+)$/i);
    if (m && m[1]) return this.fromMediaBase(m[1]);

    // 3. Si es una ruta relativa (ej: 'avatars/pic.jpg' o 'books/pic.jpg')
    //    simplemente la une a la base de media.
    return this.fromMediaBase(s);
  }
}