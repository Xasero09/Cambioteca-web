import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // 1. IMPORTA RouterLink
import { AuthService } from '../../services/auth';
import { NotificationComponent } from '../../components/notification/notification'; // 2. IMPORTA NotificationComponent

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, // 3. AÑADE RouterLink
    NotificationComponent // 4. AÑADE NotificationComponent
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  
  credentials = {
    email: '',
    contrasena: ''
  };

  isLoading = false;
  loginError: string | null = null; // Para el error DENTRO del formulario

  // Para la notificación global (la verde de éxito)
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.loginError = null; // Limpia errores previos
    this.clearNotification();

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Muestra la notificación de éxito
        this.showNotification('¡Bienvenido de vuelta!', 'success');
        
        // Redirige al inicio después de un breve momento
        setTimeout(() => {
          this.router.navigate(['/']); 
        }, 1500); // 1.5 segundos para que lea el mensaje
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error en el login:', err);
        // Muestra el error DENTRO del formulario
        this.loginError = err.error?.error || 'Credenciales incorrectas. Intenta de nuevo.';
      }
    });
  }

  // --- Lógica para la Notificación Global ---
  showNotification(message: string, type: 'success' | 'error') {
    this.notificationMessage = message;
    this.notificationType = type;
  }

  clearNotification() {
    this.notificationMessage = null;
  }
}