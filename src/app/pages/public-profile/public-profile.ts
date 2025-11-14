import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-profile.html',
  styleUrls: ['./public-profile.css']
})
export class PublicProfileComponent implements OnInit {

  user: any = null;
  metrics: any = null; 
  userBooks: any[] = []; 

  isLoading = true;
  isLoadingBooks = true;
  error: string | null = null;
  
  private readonly MEDIA_BASE = (environment.mediaBase || '').replace(/\/+$/, '');
  
  constructor(
    private route: ActivatedRoute, 
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');

    if (!userId) {
      this.error = "No se especificó un ID de usuario.";
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.isLoadingBooks = true;

    forkJoin({
      summary: this.apiService.getUserSummary(+userId),
      books: this.apiService.getUserBooks(+userId) 
    }).subscribe({
      next: (results) => {
        this.user = results.summary.user;
        this.metrics = results.summary.metrics;
        this.isLoading = false;

        // --- 👇 ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        // (Copiado de la lógica de tu book-list.ts)
        // 1. Mapeamos 'portada' (del API) a 'first_image' (que usa el HTML)
        // 2. Añadimos la bandera _fallback
        this.userBooks = (results.books || []).map((book: any) => ({
          ...book,
          first_image: book.portada, // Mapeamos el campo
          _fallback: false
        }));
        this.isLoadingBooks = false;
        // --- 👆 FIN DE LA CORRECCIÓN ---
      },
      error: (err) => {
        console.error('Error al cargar el perfil público:', err);
        this.error = "No se pudo cargar el perfil. El usuario quizás no existe.";
        this.isLoading = false;
        this.isLoadingBooks = false;
      }
    });
  }

  // --- 👇 COPIADO EXACTO DE TU 'book-list.ts' ---

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

  private toRailwayAbsolute(raw: string | null | undefined): string {
    const s = (raw || '').trim();
    
    // Fallback para libros
    const fallbackImage = 'books/librodefecto.png';
    if (!s) return this.fromMediaBase(fallbackImage);

    // 1. Si ya es absoluta (http:// o https://), la respeta
    if (/^https?:\/\//i.test(s)) return this.upgradeSchemeIfNeeded(s);

    // 2. Si es una ruta física (ej: /opt/render/project/media/avatars/...)
    const m = s.match(/\/?media\/(.+)$/i);
    if (m && m[1]) return this.fromMediaBase(m[1]);

    // 3. Si es una ruta relativa (ej: 'avatars/pic.jpg' o 'books/pic.jpg')
    return this.fromMediaBase(s);
  }

  /**
   * (Función de book-list.ts, adaptada para leer 'first_image')
   */
  imgSrc(book: any): string {
    if (!book) return this.remoteFallback();
    if (book._fallback) return this.remoteFallback();

    // Leemos 'first_image' (que mapeamos desde 'portada' en ngOnInit)
    const raw = String(book.first_image ?? '').trim(); 
    if (!raw) return this.remoteFallback();

    return this.toRailwayAbsolute(raw);
  }

  remoteFallback(): string {
    return this.fromMediaBase('books/librodefecto.png');
  }

  onImgError(ev: Event, book: any): void {
    const img = ev.target as HTMLImageElement;
    if (book._fallback) { img.onerror = null; return; }
    book._fallback = true;
    img.onerror = null;
    img.src = this.remoteFallback();
  }
  
  // --- (Lógica de Avatar y GetInitials) ---

  getAvatarSrc(): string | null { 
    if (!this.user || !this.user.imagen_perfil) {
      return null; 
    }
    // El avatar usa la misma lógica
    return this.toRailwayAbsolute(this.user.imagen_perfil);
  }

  getInitials(): string {
    if (!this.user) return '?';
    try {
      const names = (this.user.nombres || '').split(' ');
      const first = names[0] ? names[0][0] : '';
      const last = (this.user.apellido_paterno || '')[0] || '';
      const initials = (first + last).toUpperCase();
      if (initials.length === 2) return initials;
      if (this.user.nombre_usuario && this.user.nombre_usuario.length > 1) {
        return this.user.nombre_usuario.substring(0, 2).toUpperCase();
      }
      return (this.user.nombre_usuario || 'U')[0].toUpperCase();
    } catch (e) {
      return '?';
    }
  }
}