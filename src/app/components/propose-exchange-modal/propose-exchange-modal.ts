import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para los checkboxes
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-propose-exchange-modal',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importar FormsModule
  templateUrl: './propose-exchange-modal.html',
  styleUrls: ['./propose-exchange-modal.css']
})
export class ProposeExchangeModalComponent implements OnInit {

  // --- DATOS QUE RECIBE DE FUERA ---
  @Input() bookDesiredId: number | null = null; // ID del libro que queremos
  @Input() bookDesiredTitle: string = 'este libro'; // Título para mostrar

  // --- EVENTOS QUE ENVÍA HACIA FUERA ---
  @Output() closeModal = new EventEmitter<void>(); // Avisa para cerrar
  @Output() proposalSuccess = new EventEmitter<string>(); // Avisa si todo OK
  @Output() proposalError = new EventEmitter<string>(); // Avisa si hay error al enviar

  // --- ESTADO INTERNO DEL MODAL ---
  myAvailableBooks: any[] = []; // Lista de libros propios
  selectedBookIds: number[] = []; // IDs de los libros seleccionados
  isLoadingMyBooks = true; // Para mostrar "Cargando..."
  isSubmitting = false; // Para deshabilitar botón al enviar
  errorMessage: string | null = null; // Para mostrar errores
  currentUser: any = null; // Quién es el usuario actual

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtenemos el usuario y cargamos sus libros disponibles
    this.currentUser = this.authService.getUser();
    if (this.currentUser && this.currentUser.id) {
      this.loadMyAvailableBooks(this.currentUser.id);
    } else {
      this.errorMessage = "Error: No se pudo identificar al usuario.";
      this.isLoadingMyBooks = false;
    }
  }

  // Pide a la API los libros del usuario
  loadMyAvailableBooks(userId: number): void {
    this.isLoadingMyBooks = true;
    this.errorMessage = null;
    this.apiService.getMyBooks(userId).subscribe({ // Usa el método que ya tenías
      next: (data) => {
        // Filtra solo los disponibles y que no sean el libro deseado
        this.myAvailableBooks = data.filter((book: any) => book.disponible && book.id !== this.bookDesiredId);
        this.isLoadingMyBooks = false;
        if (this.myAvailableBooks.length === 0) {
          this.errorMessage = "No tienes libros disponibles para ofrecer en este intercambio.";
        }
      },
      error: (err) => {
        this.errorMessage = "Error al cargar tus libros disponibles.";
        this.isLoadingMyBooks = false;
      }
    });
  }

  // Se ejecuta cada vez que se marca/desmarca un checkbox
  onBookSelectionChange(bookId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      // Solo permite seleccionar hasta 3 libros (según tu backend)
      if (this.selectedBookIds.length < 3) {
        this.selectedBookIds.push(bookId);
      } else {
        (event.target as HTMLInputElement).checked = false; // Desmarca si ya hay 3
        alert("Puedes ofrecer un máximo de 3 libros."); // (Mejorar con un mensaje menos intrusivo)
      }
    } else {
      // Si se desmarca, lo quitamos de la lista
      this.selectedBookIds = this.selectedBookIds.filter(id => id !== bookId);
    }
    this.errorMessage = null; // Limpia errores si el usuario interactúa
  }

  // Se ejecuta al presionar "Enviar Propuesta"
  submitProposal(): void {
    // Validaciones básicas
    if (this.selectedBookIds.length === 0 || this.selectedBookIds.length > 3) {
      this.errorMessage = "Debes seleccionar entre 1 y 3 libros para ofrecer.";
      return;
    }
    if (!this.bookDesiredId || !this.currentUser) {
      this.errorMessage = "Faltan datos esenciales (libro deseado o usuario).";
      return;
    }

    this.isSubmitting = true; // Deshabilita botón
    this.errorMessage = null;

    // Prepara los datos para la API
    const proposalData = {
      id_usuario_solicitante: this.currentUser.id,
      id_libro_deseado: this.bookDesiredId,
      id_libros_ofrecidos: this.selectedBookIds
    };

    // Llama a la API para crear la solicitud
    this.apiService.crearSolicitudIntercambio(proposalData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        // Éxito: Emite el evento 'proposalSuccess' con un mensaje
        this.proposalSuccess.emit(`¡Propuesta enviada con éxito para "${this.bookDesiredTitle}"!`);
      },
      error: (err) => {
        this.isSubmitting = false;
        // Error: Muestra el mensaje de error en el modal
        this.errorMessage = err.error?.detail || "Ocurrió un error al enviar la propuesta.";
        // Opcional: También emitir el error si quieres manejarlo fuera
        // this.proposalError.emit(this.errorMessage);
      }
    });
  }

  // Se ejecuta al presionar "Cancelar" o hacer clic fuera del modal
  requestClose(): void {
    this.closeModal.emit(); // Emite el evento 'closeModal'
  }
}