// src/app/pages/book-list/book-list.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { debounceTime, distinctUntilChanged, Subject, Observable } from 'rxjs';
import { NotificationComponent } from '../../components/notification/notification';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationComponent],
  templateUrl: './book-list.html',
  styleUrls: ['./book-list.css']
})
export class BookListComponent implements OnInit {

  books: any[] = [];
  isLoading = true;
  searchTerm = '';

  // Variable necesaria para que el HTML compile sin error (aunque no se use en el catálogo)
  isSubmitting = false; 

  currentUser: any = null;
  favoriteBookIds = new Set<number>();
  isTogglingFavorite: Record<number, boolean> = {};

  private searchSubject = new Subject<string>();

  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  // 👉 Base remota de imágenes en Railway (sin “/” al final)
  private readonly MEDIA_BASE = (environment.mediaBase || '').replace(/\/+$/, '');

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.loadInitialFavorites();

    this.route.queryParamMap.subscribe((params: any) => {
      this.searchTerm = params.get('q') || '';
      this.loadBooks();
    });

    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadBooks());
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  loadInitialFavorites(): void {
    if (this.currentUser) {
      this.apiService.getMyFavoriteIds(this.currentUser.id).subscribe({
        next: (data: any) => { this.favoriteBookIds = new Set(data.favorite_ids || []); },
        error: (err: any) => { console.error('Error al cargar favoritos:', err); }
      });
    } else {
      this.favoriteBookIds = new Set<number>();
    }
  }

  loadBooks(): void {
    this.isLoading = true;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchTerm || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    // Filtro de disponibilidad: debe ser 'true'
    const filters: Record<string, string | number | null> = {};
    // 👇 SOLUCIÓN FINAL: Filtramos por disponible = 'true' para el backend
    filters['disponible'] = 'true'; 
    
    let apiCall: Observable<any>;
    apiCall = this.searchTerm.trim()
      ? this.apiService.searchBooks(this.searchTerm.trim(), filters)
      : this.apiService.getBooks(filters);

    apiCall.subscribe({
      next: (data: any) => {
        const arr = data?.results ?? data ?? [];
        this.books = arr.map((b: any) => ({ ...b, _fallback: false }));
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar libros:', err);
        this.books = [];
        this.isLoading = false;
      }
    });
  }

  // =============== IMÁGENES DESDE RAILWAY =================
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

  private toRailwayAbsolute(raw: string): string {
    const s = raw.trim();

    // Caso 1: ya es absoluta → respétala (y pasa a https si hace falta)
    if (/^https?:\/\//i.test(s)) return this.upgradeSchemeIfNeeded(s);

    // Caso 2: viene con ruta física: .../media/loque sea → recorta desde /media/
    const m = s.match(/\/?media\/(.+)$/i);
    if (m && m[1]) return this.fromMediaBase(m[1]);

    // Caso 3: relativa tipo 'books/...' → cuélgala de /media/books/...
    if (s.startsWith('books/')) return this.fromMediaBase(s);

    // Caso 4: cualquier otra relativa → cuélgala de /media/...
    return this.fromMediaBase(s);
  }

  imgSrc(book: any): string {
    if (!book) return this.remoteFallback();
    if (book._fallback) return this.remoteFallback();

    const raw = String(book.first_image ?? '').trim();
    if (!raw) return this.remoteFallback();

    return this.toRailwayAbsolute(raw);
  }

  private remoteFallback(): string {
    // Debe existir en Railway: /media/books/librodefecto.png
    return this.fromMediaBase('books/librodefecto.png'); 
  }

  onImgError(ev: Event, book: any): void {
    const img = ev.target as HTMLImageElement;
    if (book._fallback) { img.onerror = null; return; } // evita loop si el fallback 404
    book._fallback = true;
    img.onerror = null;
    img.src = this.remoteFallback();
  }
  // ========================================================

  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.currentUser) {
      this.showNotification('Debes iniciar sesión para agregar favoritos.', 'error');
      return;
    }
    if (!book || this.isTogglingFavorite[book.id]) return;

    const bookId = book.id;
    this.isTogglingFavorite[bookId] = true;

    this.apiService.toggleFavorite(this.currentUser.id, bookId).subscribe({
      next: (response: any) => {
        if (response.favorited) {
          this.favoriteBookIds.add(bookId);
          this.showNotification('¡Añadido a favoritos!', 'success');
        } else {
          this.favoriteBookIds.delete(bookId);
        }
        this.isTogglingFavorite[bookId] = false;
      },
      error: (err: any) => {
        console.error('Error al actualizar favorito:', err);
        this.showNotification(err.error?.detail || 'No se pudo actualizar.', 'error');
        this.isTogglingFavorite[bookId] = false;
      }
    });
  }

  isFavorite(bookId: number): boolean {
    return this.favoriteBookIds.has(bookId);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => this.clearNotification(), 3000);
  }

  clearNotification(): void {
    this.notificationMessage = null;
  }

  adminDeleteBook(bookId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm('¿Seguro que quieres eliminar este libro? Esta acción es permanente.')) {
      return;
    }
    const book = this.books.find(b => b.id === bookId);
    if (book) book.isDeleting = true;

    this.apiService.deleteBook(bookId).subscribe({
      next: () => {
        this.books = this.books.filter(b => b.id !== bookId);
        this.showNotification('Libro eliminado por administrador.', 'success');
      },
      error: (err: any) => {
        this.showNotification(err.error?.detail || 'No se pudo eliminar el libro.', 'error');
        if (book) book.isDeleting = false;
      }
    });
  }

  trackById(_i: number, b: any): number {
    return b?.id ?? _i;
  }
}