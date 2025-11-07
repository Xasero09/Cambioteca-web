import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { debounceTime, distinctUntilChanged, Subject, Observable } from 'rxjs'; // 'map' ya no es necesario

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './book-list.html',
  styleUrls: ['./book-list.css']
})
export class BookListComponent implements OnInit {
  
  books: any[] = [];
  isLoading = true;
  searchTerm: string = '';
  // --- ELIMINADOS ---
  // selectedGenreId: number | null = null;
  // genres: any[] = [];
  
  // --- Para Favoritos (Se mantiene) ---
  currentUser: any = null;
  favoriteBookIds = new Set<number>();
  isTogglingFavorite: { [key: number]: boolean } = {}; 
  
  private searchSubject: Subject<string> = new Subject();
  // --- ELIMINADO ---
  // private filterSubject: Subject<number | null> = new Subject();
  
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    // this.loadGenres(); // ELIMINADO
    this.loadInitialFavorites(); 

    this.route.queryParamMap.subscribe((params: any) => {
      this.searchTerm = params.get('q') || '';
      // --- ELIMINADOS (lógica de género) ---
      this.loadBooks();
    });

    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadBooks());
    // --- ELIMINADO (filterSubject) ---
  }

  // --- ELIMINADA LA FUNCIÓN loadGenres() ---

  onSearchChange(): void { this.searchSubject.next(this.searchTerm); }
  
  // --- ELIMINADA LA FUNCIÓN onFilterChange() ---

  // Se mantiene
  loadInitialFavorites(): void {
    if (this.currentUser) {
      this.apiService.getMyFavoriteIds(this.currentUser.id).subscribe({
        next: (data: any) => { this.favoriteBookIds = new Set(data.favorite_ids || []); },
        error: (err: any) => { console.error("Error al cargar favoritos:", err); }
      });
    } else {
      this.favoriteBookIds = new Set<number>();
    }
  }

  // Carga o busca libros (Función simplificada)
  loadBooks(): void {
    this.isLoading = true;
    
    // Los filtros ahora están vacíos, pero los dejamos por si searchBooks los necesita
    const filters: { [key: string]: string | number | null } = {};
    
    this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: this.searchTerm || null }, // Solo 'q'
        queryParamsHandling: 'merge', replaceUrl: true
    });

    let apiCall: Observable<any>;
    if (this.searchTerm.trim()) {
      apiCall = this.apiService.searchBooks(this.searchTerm.trim(), filters);
    } else {
      apiCall = this.apiService.getBooks(filters);
    }

    apiCall.subscribe({
      next: (data: any) => {
        this.books = data.results || data || []; 
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error al cargar libros:', err);
        this.books = []; 
      }
    });
  }

  // Se mantiene
  toggleFavorite(event: Event, book: any): void {
    event.stopPropagation();
    event.preventDefault(); 
    
    if (!this.currentUser) {
      this.router.navigate(['/login']); 
      return;
    }
    
    if (!book || this.isTogglingFavorite[book.id]) {
      return; 
    }

    const bookId = book.id;
    const isCurrentlyFavorite = this.isFavorite(bookId);
    this.isTogglingFavorite[bookId] = true;

    this.apiService.toggleFavorite(this.currentUser.id, bookId).subscribe({
      next: (response: any) => { 
        if (response.favorited) {
          this.favoriteBookIds.add(bookId);
        } else {
          this.favoriteBookIds.delete(bookId);
        }
        this.isTogglingFavorite[bookId] = false;
      },
      error: (err: any) => {
        console.error("Error al actualizar favorito:", err);
        alert(err.error?.detail || "No se pudo actualizar el estado de favorito.");
        this.isTogglingFavorite[bookId] = false;
      }
    });
  }

  // Se mantiene
  isFavorite(bookId: number): boolean {
    return this.favoriteBookIds.has(bookId);
  }
}