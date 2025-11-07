import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], 
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.css']
})
export class EditProfileComponent implements OnInit {

  profileForm: FormGroup;
  isLoading = true; 
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      nombres: ['', Validators.required],
      apellido_paterno: ['', Validators.required],
      apellido_materno: ['', Validators.required], 
      telefono: ['', Validators.required], 
      direccion: ['', Validators.required],
      numeracion: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getUser(); 
    if (this.currentUser && this.currentUser.id) {
      this.loadProfileData(this.currentUser.id); 
    } else {
      this.errorMessage = "No se pudo identificar al usuario para editar el perfil.";
      this.isLoading = false;
    }
  }

  loadProfileData(userId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getUserSummary(userId).subscribe({
      next: (data) => {
        const userData = data.user; 
        this.profileForm.patchValue({
          nombres: userData.nombres,
          apellido_paterno: userData.apellido_paterno,
          apellido_materno: userData.apellido_materno,
          telefono: userData.telefono,
          direccion: userData.direccion,
          numeracion: userData.numeracion
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error al cargar datos del perfil:", err);
        this.errorMessage = "No se pudo cargar tu información para editar.";
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid || !this.currentUser) {
      this.profileForm.markAllAsTouched(); 
      this.errorMessage = "Por favor, revisa los campos del formulario.";
      return;
    }

    this.isLoading = true; 
    this.errorMessage = null;
    this.successMessage = null;

    const updatedData = this.profileForm.value; 

    this.apiService.updateUserProfile(this.currentUser.id, updatedData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = "¡Perfil actualizado con éxito!";
        // Opcional: Actualizar datos en AuthService si la API devuelve el usuario actualizado
        // this.authService.saveUser(response); 
        setTimeout(() => this.router.navigate(['/perfil']), 2000); 
      },
      error: (err) => {
        this.isLoading = false;
        console.error("Error al actualizar:", err);
        this.errorMessage = err.error?.detail || 'Ocurrió un error al guardar los cambios.';
      }
    });
  }
}