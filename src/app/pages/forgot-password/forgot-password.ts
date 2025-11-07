import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  
  emailForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    const email = this.emailForm.get('email')?.value || '';

    this.apiService.requestPasswordReset(email).subscribe({
      next: (response: any) => { // <-- ARREGLO AQUÍ
        this.isLoading = false;
        this.successMessage = "Si existe una cuenta con ese correo, se ha enviado un enlace de recuperación.";
        this.emailForm.reset();
      },
      error: (err: any) => { // <-- ARREGLO AQUÍ
        this.isLoading = false;
        this.successMessage = "Si existe una cuenta con ese correo, se ha enviado un enlace de recuperación.";
        console.error("Error en forgot-password:", err);
      }
    });
  }
}