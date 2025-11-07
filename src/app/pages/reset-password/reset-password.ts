import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { ApiService } from '../../services/api.service';

// Validador (sin cambios)
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const password2 = control.get('password2');
  
  if (password && password2 && password.value !== password2.value) {
    password2.setErrors({ passwordsDoNotMatch: true });
    return { passwordsDoNotMatch: true };
  } else {
    if (password2?.hasError('passwordsDoNotMatch')) {
      password2.setErrors(null);
    }
    return null;
  }
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {

  resetForm: FormGroup; 
  token: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required]]
    }, { validators: passwordsMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.errorMessage = "Token inválido o faltante. Por favor, solicita un nuevo enlace.";
      this.isLoading = false;
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const pass1 = this.resetForm.get('password')?.value || '';
    const pass2 = this.resetForm.get('password2')?.value || '';

    this.apiService.resetPassword(this.token, pass1, pass2).subscribe({
      next: (response: any) => { // <-- ARREGLO AQUÍ
        this.isLoading = false;
        this.successMessage = "¡Contraseña actualizada con éxito! Serás redirigido a Iniciar Sesión.";
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: any) => { // <-- ARREGLO AQUÍ
        this.isLoading = false;
        console.error("Error en reset-password:", err);
        this.errorMessage = err.error?.token?.[0] || err.error?.password2?.[0] || 'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.';
      }
    });
  }
}