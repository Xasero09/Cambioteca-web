import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Importa RouterLink

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterLink], // Añade RouterLink aquí
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css']
})
export class AboutUsComponent {
  constructor() {}
}