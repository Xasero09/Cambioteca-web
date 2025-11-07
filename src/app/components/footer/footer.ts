// src/app/components/footer/footer.ts (Corregido)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // 1. Importa CommonModule para *ngIf
import { RouterLink } from '@angular/router';   // 2. Importa RouterLink para routerLink
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth'; // 3. Importa el servicio de Auth

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink], // 4. Añade CommonModule y RouterLink aquí
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class FooterComponent {

  // 5. Define la variable local
  isAuthenticated$: Observable<boolean>; 
  
  constructor(private authService: AuthService) {
    // 6. Asigna el valor desde el servicio en el constructor
    this.isAuthenticated$ = this.authService.isAuthenticated$; 
  }
}