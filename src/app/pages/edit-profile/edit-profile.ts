// edit-profile.ts (COMPLETO)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule], // <-- Añadir ReactiveFormsModule
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.css']
})
export class EditProfileComponent implements OnInit {

  profileForm!: FormGroup; // '!' para indicar que se inicializará en ngOnInit
  currentUser: any = null;
  isLoading = true;
  isSavingData = false; // Loading para el formulario de texto
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // --- Propiedades para el Avatar ---
  currentAvatarUrl: string = 'assets/icon/avatardefecto.jpg'; // Avatar por defecto
  selectedFile: File | null = null;
  newAvatarPreview: string | ArrayBuffer | null = null;
  isUploadingAvatar = false; // Loading para la subida de foto
  avatarUploadError: string | null = null;
  avatarUploadSuccess: string | null = null;
  // --- Fin Propiedades Avatar ---

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Inicializar el formulario de texto
    this.profileForm = this.fb.group({
      nombres: ['', Validators.required],
      apellido_paterno: ['', Validators.required],
      apellido_materno: [''],
      telefono: [''],
      direccion: [''],
      numeracion: ['']
    });

    // Cargar los datos del perfil
    this.loadProfileData();
  }

  loadProfileData(): void {
    this.isLoading = true;
    this.apiService.getUserSummary(this.currentUser.id).subscribe({
      next: (data) => {
        const user = data.user;
        // Rellenar el formulario con los datos
        this.profileForm.patchValue({
          nombres: user.nombres,
          apellido_paterno: user.apellido_paterno,
          apellido_materno: user.apellido_materno,
          telefono: user.telefono,
          direccion: user.direccion,
          numeracion: user.numeracion
        });
        
        // Guardar la URL del avatar actual para la vista previa
        this.currentAvatarUrl = user.avatar_url || 'assets/icon/avatardefecto.jpg';
        
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = "Error al cargar tu perfil.";
        this.isLoading = false;
      }
    });
  }

  // --- INICIO: Lógica para subir Avatar ---

  /**
   * Se activa cuando el usuario selecciona un archivo en el <input type="file">
   */
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      const file = element.files[0];

      // Validación simple de tipo y tamaño (opcional)
      if (!file.type.startsWith('image/')) {
        this.avatarUploadError = "Por favor, selecciona un archivo de imagen.";
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // Límite de 5MB
        this.avatarUploadError = "La imagen es muy pesada (máx. 5MB).";
        return;
      }

      this.selectedFile = file;
      this.avatarUploadError = null;
      this.avatarUploadSuccess = null;
      this.previewFile(file); // Muestra la vista previa
    }
  }

  /**
   * Lee el archivo local y genera una URL de vista previa
   */
  previewFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.newAvatarPreview = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Se activa al presionar "Guardar Foto"
   */
  onUploadAvatar(): void {
    if (!this.selectedFile || !this.currentUser) {
      this.avatarUploadError = "No hay archivo seleccionado.";
      return;
    }

    this.isUploadingAvatar = true;
    this.avatarUploadError = null;
    this.avatarUploadSuccess = null;

    this.apiService.updateUserAvatar(this.currentUser.id, this.selectedFile).subscribe({
      next: (response) => {
        // El backend (si lo corregiste) devuelve la nueva URL absoluta
        const newAvatarUrl = response.avatar_url; 
        
        // Actualiza el Auth Service para que toda la app vea la foto nueva
        this.authService.updateLocalUserAvatar(newAvatarUrl); 
        
        // Actualiza la vista previa actual
        this.currentAvatarUrl = newAvatarUrl; 
        
        // Resetea los controles de subida
        this.selectedFile = null;
        this.newAvatarPreview = null;
        this.isUploadingAvatar = false;
        this.avatarUploadSuccess = "¡Foto de perfil actualizada!";
      },
      error: (err) => {
        this.isUploadingAvatar = false;
        this.avatarUploadError = err.error?.detail || "Error al subir la imagen.";
      }
    });
  }

  // --- FIN: Lógica para subir Avatar ---


  /**
   * Se activa al presionar "Guardar Cambios" (para los datos de texto)
   */
  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = "Por favor, completa los campos requeridos.";
      return;
    }

    this.isSavingData = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formData = this.profileForm.value;

    this.apiService.updateUserProfile(this.currentUser.id, formData).subscribe({
      next: (response) => {
        // CORRECCIÓN:
        this.isSavingData = false;
        this.successMessage = "¡Perfil actualizado con éxito!";
        
        // Opcional: Actualiza los datos del usuario local si es necesario
        // (Aunque 'updateLocalUserAvatar' es más crítico)
        const updatedUser = { ...this.currentUser, ...response };
        this.authService.saveUser(updatedUser); // Asumiendo que saveUser actualiza el B.Subject

        setTimeout(() => this.router.navigate(['/perfil']), 2000); // Vuelve al perfil
      },
      error: (err) => {
        this.isSavingData = false;
        this.errorMessage = err.error?.detail || "Error al guardar los cambios.";
      }
    });
  }
}