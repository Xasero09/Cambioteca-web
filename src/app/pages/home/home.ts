import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // 👈 ¡Asegúrate de importar RouterLink!

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink], // 👈 ¡Añádelo a los imports!
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  constructor() {}
}