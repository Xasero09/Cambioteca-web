import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';
import { forkJoin, of } from 'rxjs'; // Importamos forkJoin y of

@Component({
  selector: 'app-add-book',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-book.html',
  styleUrls: ['./add-book.css']
})
export class AddBookComponent implements OnInit, OnDestroy {
  
  bookForm: FormGroup;
  generos: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentYear = new Date().getFullYear();

  // --- NUEVAS PROPIEDADES PARA LAS IMÁGENES ---
  selectedFiles: File[] = [];
  previews: string[] = [];
  coverIndex = 0;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.bookForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      autor: ['', [Validators.required, Validators.minLength(2)]],
      isbn: ['', Validators.required],
      anio_publicacion: [this.currentYear, [Validators.required, Validators.min(1800), Validators.max(this.currentYear)]],
      editorial: ['', Validators.required],
      id_genero: [null, Validators.required],
      estado: ['Bueno', Validators.required],
      tipo_tapa: ['Blanda', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.apiService.getGeneros().subscribe(data => {
      this.generos = data;
    });
  }

  // --- NUEVOS MÉTODOS PARA MANEJAR IMÁGENES ---

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    this.cleanupPreviews(); // Limpiamos las previsualizaciones anteriores
    this.selectedFiles = Array.from(input.files);
    
    // Creamos las URLs para las previsualizaciones
    this.previews = this.selectedFiles.map(file => URL.createObjectURL(file));
    this.coverIndex = 0; // La primera imagen es la portada por defecto
  }

  setAsCover(index: number): void {
    this.coverIndex = index;
  }

  private cleanupPreviews(): void {
    this.previews.forEach(url => URL.revokeObjectURL(url));
    this.previews = [];
  }

  // --- MÉTODO onSubmit ACTUALIZADO ---

  onSubmit(): void {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();
      this.errorMessage = "Por favor, completa todos los campos requeridos.";
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const currentUser = this.authService.getUser();
    if (!currentUser) {
      this.errorMessage = "Error de autenticación.";
      this.isLoading = false;
      return;
    }

    const bookData = { ...this.bookForm.value, id_usuario: currentUser.id };

    // PASO 1: Crear el libro
    this.apiService.createBook(bookData).subscribe({
      next: (response) => {
        const bookId = response.id;
        
        // PASO 2: Subir las imágenes
        this.uploadImages(bookId);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error.detail || 'Ocurrió un error al crear el libro.';
      }
    });
  }

  private uploadImages(bookId: number): void {
    if (this.selectedFiles.length === 0) {
      // Si no hay imágenes, el proceso termina aquí
      this.finalizeCreation();
      return;
    }

    // Creamos un array de observables, uno por cada imagen a subir
    const uploadObservables = this.selectedFiles.map((file, index) => {
      const isCover = index === this.coverIndex;
      return this.apiService.uploadBookImage(bookId, file, { is_portada: isCover, orden: index + 1 });
    });

    // Usamos forkJoin para ejecutar todas las subidas en paralelo
    forkJoin(uploadObservables).subscribe({
      next: () => {
        this.finalizeCreation();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = "El libro se creó, pero hubo un error al subir las imágenes.";
      }
    });
  }

  private finalizeCreation(): void {
    this.isLoading = false;
    this.successMessage = `¡El libro "${this.bookForm.value.titulo}" ha sido añadido con éxito!`;
    setTimeout(() => this.router.navigate(['/mis-libros']), 2000);
  }

  ngOnDestroy(): void {
    // Limpiamos las URLs de previsualización al salir del componente para liberar memoria
    this.cleanupPreviews();
  }
}