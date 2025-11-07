import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' = 'success'; // Tipo de notificación
  @Input() duration: number = 3000; // Duración en milisegundos (3 segundos)
  @Output() close = new EventEmitter<void>(); // Evento para avisar al padre que se cierre

  private timer: any;

  ngOnInit(): void {
    // Inicia un temporizador para cerrar automáticamente la notificación
    this.timer = setTimeout(() => {
      this.closeNotification();
    }, this.duration);
  }

  ngOnDestroy(): void {
    // Limpia el temporizador si el componente se destruye antes
    clearTimeout(this.timer);
  }

  // Emite el evento 'close' cuando se hace clic o pasa el tiempo
  closeNotification(): void {
    this.close.emit();
  }

  // Determina la clase CSS según el tipo de notificación
  get notificationClass(): string {
    return `notification notification-${this.type}`;
  }
}