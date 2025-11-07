// src/app/app.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './services/auth';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink,HeaderComponent,FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  isAuthenticated$: Observable<boolean>;
  // Variable para escuchar los datos del usuario.
  currentUser$: Observable<any | null>;

  constructor(private authService: AuthService) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    // Conectamos nuestra variable a la nueva "señal de radio" del servicio.
    this.currentUser$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }
}