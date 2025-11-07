import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-my-books',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-books.html',
  styleUrls: ['./my-books.css']
})
export class MyBooksComponent implements OnInit {

  myBooks: any[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: any = null;

  // --- Properties for the Modal ---
  showDeleteModal = false;
  bookToDelete: { id: number, titulo: string } | null = null;
  isDeleting = false; // For feedback on the confirm button

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser && this.currentUser.id) {
      this.loadMyBooks(this.currentUser.id);
    } else {
      this.error = "No se pudo identificar al usuario. Por favor, inicia sesión de nuevo.";
      this.isLoading = false;
    }
  }

  loadMyBooks(userId: number): void {
    this.isLoading = true;
    this.error = null;
    this.apiService.getMyBooks(userId).subscribe({
      next: (data) => {
        this.myBooks = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error al cargar mis libros:", err);
        this.error = "Hubo un problema al cargar tus libros.";
        this.isLoading = false;
      }
    });
  }

  editBook(bookId: number) {
    // Navigation handled by routerLink
  }

  // --- DELETE LOGIC WITH MODAL ---

  // 1. Opens the confirmation modal
  requestDeleteBook(bookId: number, bookTitle: string): void {
    this.bookToDelete = { id: bookId, titulo: bookTitle };
    this.showDeleteModal = true;
    this.error = null; // Clear previous errors
  }

  // 2. Closes the modal without deleting
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.bookToDelete = null;
    this.isDeleting = false;
  }

  // 3. Confirms and executes the deletion
  confirmDelete(): void {
    if (!this.bookToDelete) return;

    this.isDeleting = true;
    this.error = null;

    this.apiService.deleteBook(this.bookToDelete.id).subscribe({
      next: () => {
        this.myBooks = this.myBooks.filter(book => book.id !== this.bookToDelete!.id);
        console.log(`Libro "${this.bookToDelete!.titulo}" eliminado.`);
        this.cancelDelete(); // Close modal on success
        // Consider adding a success Toast/Snackbar here
      },
      error: (err) => {
        console.error("Error al eliminar el libro:", err);
        this.error = err.error?.detail || "No se pudo eliminar el libro.";
        // Keep modal open to show the error
        this.isDeleting = false;
      }
    });
  }
}