import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth'; 
import { ProposeExchangeModalComponent } from '../../components/propose-exchange-modal/propose-exchange-modal'; 

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ProposeExchangeModalComponent], 
  templateUrl: './book-detail.html',
  styleUrls: ['./book-detail.css']
})
export class BookDetailComponent implements OnInit {
  
  book: any = null; 
  isLoading = true;
  error: string | null = null;
  currentUser: any = null; 
  showProposalModal = false;
  proposalSuccessMessage: string | null = null;
  proposalErrorMessage: string | null = null;

  // --- Para Favoritos ---
  favoriteBookIds = new Set<number>();
  isTogglingFavorite = false; 

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser(); 
    this.loadInitialFavorites(); 

    const bookId = this.route.snapshot.paramMap.get('id');
    if (bookId) {
      this.loadBookDetails(+bookId); 
    } else {
      this.error = 'No se especificó un libro.'; this.isLoading = false;
    }
  }

  loadBookDetails(bookId: number): void {
     this.isLoading = true;
     this.apiService.getBookById(bookId).subscribe({
        next: (data) => { this.book = data; this.isLoading = false; },
        error: (err) => { this.error = 'No se pudo cargar la información.'; this.isLoading = false; }
      });
  }

  loadInitialFavorites(): void {
    if (this.currentUser) {
      this.apiService.getMyFavoriteIds(this.currentUser.id).subscribe({
        next: (data) => { this.favoriteBookIds = new Set(data.favorite_ids || []); },
        error: (err) => { console.error("Error al cargar favoritos:", err); }
      });
    } else {
      this.favoriteBookIds = new Set<number>();
    }
  }

  toggleFavorite(): void {
    if (!this.currentUser || !this.book) { this.router.navigate(['/login']); return; }
    const bookId = this.book.id;
    const isCurrentlyFavorite = this.isFavorite(bookId);
    const request$ = isCurrentlyFavorite 
        ? this.apiService.removeFavorite(this.currentUser.id, bookId) 
        : this.apiService.addFavorite(this.currentUser.id, bookId);
    this.isTogglingFavorite = true; 
    request$.subscribe({
        next: () => {
            if (isCurrentlyFavorite) { this.favoriteBookIds.delete(bookId); } 
            else { this.favoriteBookIds.add(bookId); }
            this.isTogglingFavorite = false; 
        },
        error: (err) => {
            console.error("Error al actualizar favorito:", err);
            alert("No se pudo actualizar."); 
            this.isTogglingFavorite = false; 
        }
    });
  }

  isFavorite(bookId: number | null | undefined): boolean {
    return !!bookId && this.favoriteBookIds.has(bookId);
  }

  // Lógica Modal (sin cambios)
  openProposalModal(): void { this.proposalSuccessMessage=null; this.proposalErrorMessage=null; this.showProposalModal = true;}
  closeProposalModal(): void { this.showProposalModal = false; }
  handleProposalSuccess(message: string): void { this.proposalSuccessMessage = message; this.showProposalModal = false; }
  handleProposalError(message: string): void { this.proposalErrorMessage = message; }
  getFullOwnerAvatarUrl(relativePath: string | null): string {
     const apiBaseUrl = 'http://127.0.0.1:8000'; 
     if (relativePath) { return `${apiBaseUrl}/media/${relativePath}`; }
     return 'assets/icon/avatardefecto.png'; 
   }
}