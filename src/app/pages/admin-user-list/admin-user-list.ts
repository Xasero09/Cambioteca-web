import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NotificationComponent } from '../../components/notification/notification'; // Importa tu notificador
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationComponent], // Asegúrate de importar NotificationComponent
  templateUrl: './admin-user-list.html',
  styleUrls: ['./admin-user-list.css']
})
export class AdminUserListComponent implements OnInit {

  users: any[] = [];
  isLoading = true;
  error: string | null = null;
  
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  // --- 👇 NUEVOS ESTADOS PARA EL MODAL DE CONFIRMACIÓN ---
  showConfirmationModal = false;
  confirmationTitle = '';
  confirmationMessage = '';
  // Esta variable guardará la acción (deshabilitar o eliminar) que se debe ejecutar si el usuario presiona "Aceptar"
  private actionToConfirm: () => void = () => {};
  // --- -------------------------------------------------- ---

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = null;
    this.apiService.adminGetAllUsers().subscribe({
      next: (data) => {
        // Inicializamos los estados de UI en cada usuario
        this.users = data.map(user => ({
          ...user,
          isToggling: false, // Estado para el botón Habilitar/Deshabilitar
          isDeleting: false  // Estado para el botón Eliminar
        }));
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "Error al cargar usuarios. No tienes permiso o el servidor falló.";
        this.isLoading = false;
      }
    });
  }

  // --- 👇 PASO 1: Los botones ahora llaman a esta función para ABRIR el modal ---
  promptToggleUserActive(user: any): void {
    const actionText = user.activo ? "deshabilitar" : "habilitar";
    
    // Configura el texto del modal
    this.confirmationTitle = `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Usuario`;
    this.confirmationMessage = `¿Estás seguro de que quieres ${actionText} al usuario "${user.nombre_usuario}"?`;
    
    // Guarda la función que se ejecutará si se confirma
    this.actionToConfirm = () => this.executeToggleUserActive(user);
    
    this.showConfirmationModal = true; // Muestra el modal
  }

  // --- PASO 2: La lógica real de la API se mueve a su propia función ---
  private executeToggleUserActive(user: any) {
    user.isToggling = true;
    
    this.apiService.adminToggleUserActive(user.id_usuario).subscribe({
      next: (response) => {
        // Actualiza el estado en la UI sin recargar la página
        user.activo = response.activo; 
        this.showNotification(`Usuario ${user.activo ? 'habilitado' : 'deshabilitado'} correctamente.`, 'success');
        user.isToggling = false; // 👈 Resetea el estado local
      },
      error: (err) => {
        this.showNotification(err.error?.detail || 'No se pudo actualizar el estado del usuario.', 'error');
        user.isToggling = false; // 👈 Resetea el estado local
      }
    });
  }

  // --- PASO 3: Repetimos el patrón para "Eliminar" ---
  promptDeleteUser(user: any): void {
    this.confirmationTitle = 'Eliminar Usuario';
    this.confirmationMessage = `¿Estás seguro de que quieres ELIMINAR al usuario "${user.nombre_usuario}"? Esta acción es permanente y no se puede deshacer.`;
    
    this.actionToConfirm = () => this.executeDeleteUser(user);
    
    this.showConfirmationModal = true;
  }

  private executeDeleteUser(user: any) {
    user.isDeleting = true;
    
    this.apiService.adminDeleteUser(user.id_usuario).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id_usuario !== user.id_usuario);
        this.showNotification('Usuario eliminado permanentemente.', 'success');
        // No es necesario resetear 'isDeleting' porque el usuario desaparece de la lista
      },
      error: (err) => {
        this.showNotification(err.error?.detail || 'No se pudo eliminar al usuario.', 'error');
        user.isDeleting = false; // 👈 Resetea el estado local
      }
    });
  }

  // --- 👇 NUEVAS FUNCIONES PARA MANEJAR EL MODAL ---
  
  /** Se llama cuando el usuario presiona "Aceptar" en el modal */
  onConfirmAction(): void {
    this.actionToConfirm(); // Ejecuta la acción guardada
    this.showConfirmationModal = false; // Cierra el modal
  }

  /** Se llama cuando el usuario presiona "Cancelar" */
  onCancelAction(): void {
    this.showConfirmationModal = false; // Solo cierra el modal
  }
  // --- -------------------------------------------- ---

  showNotification(message: string, type: 'success' | 'error'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => this.clearNotification(), 4000);
  }

  clearNotification(): void {
    this.notificationMessage = null;
  }
}