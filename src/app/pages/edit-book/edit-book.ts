import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth'; // Needed for user ID validation (optional)

@Component({
  selector: 'app-edit-book',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-book.html',
  styleUrls: ['./edit-book.css']
})
export class EditBookComponent implements OnInit {
  
  bookForm: FormGroup;
  generos: any[] = [];
  isLoading = true; // Start loading initially
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentYear = new Date().getFullYear();
  bookId: number | null = null;
  currentBookData: any = null; // To store original data if needed

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute // To get the book ID from URL
  ) {
    // Initialize form structure immediately
    this.bookForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      autor: ['', [Validators.required, Validators.minLength(2)]],
      isbn: ['', Validators.required],
      anio_publicacion: [this.currentYear, [Validators.required, Validators.min(1800), Validators.max(this.currentYear)]],
      editorial: ['', Validators.required],
      id_genero: [null, Validators.required],
      estado: ['Bueno', Validators.required],
      tipo_tapa: ['Blanda', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      disponible: [true] // Added 'disponible' field
    });
  }

  ngOnInit(): void {
    // Get book ID from the route
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.bookId = +idParam;
      this.loadBookData(); // Load data after getting ID
    } else {
      this.errorMessage = "ID de libro no encontrado en la URL.";
      this.isLoading = false;
    }

    // Load genres for the dropdown
    this.apiService.getGeneros().subscribe(data => {
      this.generos = data;
    });
  }

  loadBookData(): void {
    if (!this.bookId) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getBookById(this.bookId).subscribe({
      next: (data) => {
        // --- Optional: Check if the current user owns this book ---
        // const currentUser = this.authService.getUser();
        // if (currentUser && data.owner_id !== currentUser.id) {
        //   this.errorMessage = "No tienes permiso para editar este libro.";
        //   this.isLoading = false;
        //   this.bookForm.disable(); // Disable form if not owner
        //   return;
        // }
        // ---------------------------------------------------------
        
        this.currentBookData = data;
        // Populate the form with fetched data
        this.bookForm.patchValue({
          titulo: data.titulo,
          autor: data.autor,
          isbn: data.isbn,
          anio_publicacion: data.anio_publicacion,
          editorial: data.editorial,
          id_genero: data.id_genero, // Make sure backend provides 'id_genero' not just 'genero_nombre'
          estado: data.estado,
          tipo_tapa: data.tipo_tapa,
          descripcion: data.descripcion,
          disponible: data.disponible // Populate 'disponible'
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error al cargar datos del libro:", err);
        this.errorMessage = "No se pudo cargar la información del libro para editar.";
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.bookForm.invalid || !this.bookId) {
      this.bookForm.markAllAsTouched();
      this.errorMessage = "Por favor, revisa los campos del formulario.";
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Get only the changed values (optional optimization)
    // const updatedData = {};
    // Object.keys(this.bookForm.controls).forEach(key => {
    //   if (this.bookForm.get(key)?.dirty) {
    //     updatedData[key] = this.bookForm.get(key)?.value;
    //   }
    // });
    
    // Or send all values
    const bookData = this.bookForm.value; 

    this.apiService.updateBook(this.bookId, bookData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = `¡Libro "${bookData.titulo}" actualizado con éxito!`;
        setTimeout(() => this.router.navigate(['/mis-libros']), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error("Error al actualizar:", err);
        this.errorMessage = err.error?.detail || 'Ocurrió un error inesperado al actualizar el libro.';
      }
    });
  }
}