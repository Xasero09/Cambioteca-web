// src/app/pages/register/register.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {

  // Listas para los menús desplegables
  regiones: any[] = [];
  comunas: any[] = [];

  // Variable para guardar el archivo de imagen seleccionado
  selectedFile: File | null = null;

  // Objeto para los datos del formulario (incluimos la región)
  userData = {
    rut: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombre_usuario: '',
    email: '',
    telefono: '',
    direccion: '',
    numeracion: '',
    region: null, // <-- Campo para la selección de región
    comuna: null,
    contrasena: '',
    password2: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    // Al iniciar, solo cargamos las regiones
    this.cargarRegiones();
  }

  cargarRegiones() {
    this.apiService.getRegiones().subscribe(data => {
      this.regiones = data;
    });
  }

  // Esta función se ejecuta cuando el usuario cambia la región seleccionada
  onRegionChange() {
    this.comunas = []; // Vaciamos la lista de comunas
    this.userData.comuna = null; // Reseteamos la comuna seleccionada
    if (this.userData.region) {
      // Si se seleccionó una región, pedimos sus comunas
      this.apiService.getComunas(this.userData.region).subscribe(data => {
        this.comunas = data;
      });
    }
  }

  // Esta función se ejecuta cuando el usuario selecciona un archivo de imagen
  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] ?? null;
  }

  onSubmit() {
    if (this.userData.contrasena !== this.userData.password2) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    // --- CONSTRUIMOS EL FORMDATA ---
    const formData = new FormData();

    // Añadimos todos los campos de texto del formulario
    Object.entries(this.userData).forEach(([key, value]) => {
      // No enviamos los campos auxiliares 'region' y 'password2'
      if (key !== 'region' && key !== 'password2' && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Si el usuario seleccionó un archivo, lo añadimos
    if (this.selectedFile) {
      formData.append('imagen_perfil', this.selectedFile, this.selectedFile.name);
    }
    // ---------------------------------

    console.log('Enviando FormData al backend...');
    
    this.apiService.registerUser(formData).subscribe({
      next: (response) => {
        console.log('Usuario registrado:', response);
        alert('¡Registro exitoso! ID de nuevo usuario: ' + response.id);
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        let errorMessage = 'Hubo un error en el registro.';
        if (err.error) {
          errorMessage += '\n' + Object.entries(err.error).map(([key, value]) => `${key}: ${value}`).join('\n');
        }
        alert(errorMessage);
      }
    });
  }
}