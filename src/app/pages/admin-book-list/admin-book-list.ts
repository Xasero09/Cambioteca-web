import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NotificationComponent } from '../../components/notification/notification';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-book-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationComponent],
  templateUrl: './admin-book-list.html',
  styleUrls: ['./admin-book-list.css'] // Usaremos el CSS común
})
export class AdminBookListComponent implements OnInit {

  books: any[] = [];
  isLoading = true;
  error: string | null = null;

  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading = true;
    this.error = null;
    // Usamos la función normal 'getBooks' que trae todo
    this.apiService.getBooks().subscribe({
      next: (data) => {
        // La API de libros puede devolver { results: [...] } o [...]
        this.books = data.results || data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "Error al cargar los libros.";
        this.isLoading = false;
      }
    });
  }

  deleteBook(book: any): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar el libro "${book.titulo}" (ID: ${book.id})? Esta acción es permanente.`)) {
      return;
    }

    book.isDeleting = true;
    
    this.apiService.deleteBook(book.id).subscribe({
      next: () => {
        this.books = this.books.filter(b => b.id !== book.id);
        this.showNotification('Libro eliminado correctamente.', 'success');
      },
      error: (err) => {
        // El error 403 (Forbidden) ya lo controlamos en el backend
        this.showNotification(err.error?.detail || 'No se pudo eliminar el libro.', 'error');
        book.isDeleting = false;
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }

  clearNotification(): void {
    this.notificationMessage = null;
  }
}