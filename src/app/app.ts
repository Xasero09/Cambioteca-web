import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
// Quitamos 'Observable' y 'AuthService' de aquí
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink,
    HeaderComponent, 
    FooterComponent 
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // --- ¡HEMOS QUITADO LAS VARIABLES DE AUTH DE AQUÍ! ---
  // El AppComponent ya no necesita 'isAuthenticated$' ni 'currentUser$'.
  // Tampoco necesita el 'constructor' ni 'logout()'.
}