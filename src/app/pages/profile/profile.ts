import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { RouterLink } from '@angular/router'; 

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
 
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const loggedInUser = this.authService.getUser();

    if (loggedInUser && loggedInUser.id) {
      
      // Carga 1: Resumen del perfil
      this.apiService.getUserSummary(loggedInUser.id).subscribe({
        next: (data: any) => { // :any
          this.user = data.user;
          this.metrics = data.metrics;
          this.isLoading = false; 
        },
        error: (err: any) => { // :any
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
      next: (data: any) => { // :any
        this.favoriteBooks = data;
        this.isLoadingFavorites = false;
      },
      error: (err: any) => { // :any
        console.error('Error al cargar favoritos:', err);
        this.isLoadingFavorites = false;
      }
    });
  }
}