import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  // Estos @Input y @Output reciben los datos desde app.ts
  @Input() isAuthenticated$: Observable<boolean> = new Observable();
  @Input() currentUser$: Observable<any | null> = new Observable();
  @Output() logout = new EventEmitter<void>();

  // --- Lógica para el Dropdown ---
  isDropdownOpen = false;

  // Inyectamos ElementRef para detectar clics fuera del menú
  constructor(private elementRef: ElementRef) {}

  /**
   * Muestra u oculta el menú desplegable.
   */
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /**
   * Cierra el menú al hacer clic en un enlace
   * y emite el evento de logout.
   */
  onLogoutClick(): void {
    this.isDropdownOpen = false; // Cierra el menú
    this.logout.emit(); // Emite el evento al app.component
  }

  /**
   * Cierra el menú si el usuario hace clic
   * fuera del área del menú.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Si el menú está abierto y el clic NO fue dentro de este componente
    if (this.isDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}