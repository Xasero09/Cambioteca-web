import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 IMPORTADO
import { RouterLink, Router } from '@angular/router'; // 👈 IMPORTADO
import { AuthService } from '../../services/auth'; 
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true, // 👈 SOLUCIÓN AL ERROR NG2012
  imports: [
    CommonModule,  // 👈 NECESARIO PARA *ngIf, | async
    RouterLink     // 👈 NECESARIO PARA routerLink
  ],
  templateUrl: './header.html', // 👈 ASEGÚRATE QUE TU HTML SE LLAME ASÍ
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  
  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<any>;
  
  isUserDropdownOpen = false;
  isProposalsDropdownOpen = false; // Estado para el nuevo menú

  constructor(private authService: AuthService, private router: Router) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentUser$ = this.authService.currentUser$;
  }

  // Cierra AMBOS menús si se hace clic en cualquier parte del documento
  @HostListener('document:click')
  onDocumentClick(): void {
    this.isUserDropdownOpen = false;
    this.isProposalsDropdownOpen = false;
  }

  // Cierra ambos menús (usado al hacer clic en un enlace del menú)
  closeAllDropdowns(): void {
    this.isUserDropdownOpen = false;
    this.isProposalsDropdownOpen = false;
  }

  // Alterna el menú de USUARIO
  toggleUserDropdown(event: Event) {
    event.stopPropagation(); // Evita que el clic se propague al 'document:click'
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    this.isProposalsDropdownOpen = false; // Cierra el otro menú
  }

  // Alterna el menú de PROPUESTAS
  toggleProposalsDropdown(event: Event) {
    event.stopPropagation(); // Evita que el clic se propague al 'document:click'
    this.isProposalsDropdownOpen = !this.isProposalsDropdownOpen;
    this.isUserDropdownOpen = false; // Cierra el otro menú
  }

  onLogoutClick() {
    this.closeAllDropdowns(); // Cierra el menú
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}