import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { NotificationComponent } from '../../components/notification/notification';

// Validador (Tu código para esto es correcto)
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('new');
  const confirmPassword = control.get('confirm');
  
  if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordsDoNotMatch: true });
    return { passwordsDoNotMatch: true };
  } else {
    if (confirmPassword?.hasError('passwordsDoNotMatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NotificationComponent],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css']
})
export class ChangePasswordComponent implements OnInit {

  changeForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  notificationMessage: string | null = null;
  // currentUser: any = null; // Ya no es necesario para enviar

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router // 'router' sigue siendo privado
  ) {
    this.changeForm = this.fb.group({
      current: ['', [Validators.required]],
      new: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]]
    }, { validators: passwordsMatchValidator });
  }

  ngOnInit(): void {
    if (!this.authService.getUser()) {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.notificationMessage = null;

    const { current, new: newPass } = this.changeForm.value;

    // --- 👇 ¡CAMBIO IMPORTANTE! 👇 ---
    // Llamamos a la nueva función de la API que no necesita user_id
    // (el backend lo toma del token JWT)
    this.apiService.changePassword(current, newPass).subscribe({
      next: (response: any) => { // Añadido :any
        this.isLoading = false;
        this.showNotification("¡Contraseña actualizada! Por seguridad, deberás iniciar sesión de nuevo.");
        this.authService.logout(); // Cierra la sesión
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (err: any) => { // Añadido :any
        this.isLoading = false;
        console.error("Error al cambiar contraseña:", err);
        this.errorMessage = err.error?.detail || 'Ocurrió un error. Verifica tu contraseña actual.';
      }
    });
  }

  showNotification(message: string): void {
    this.notificationMessage = message;
  }

  // --- 👇 FUNCIÓN NUEVA PARA ARREGLAR EL ERROR DE HTML 👇 ---

  onNotificationClose(): void {
    this.router.navigate(['/login']);
  }
}