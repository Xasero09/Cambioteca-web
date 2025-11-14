import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Asegura que la URL no tenga '/' al final para evitar dobles barras (//)
  private apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient, private authService: AuthService) { }

  // ==========================================================
  // 🔐 HELPER: HEADERS DE AUTENTICACIÓN
  // ==========================================================
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==========================================================
  // 📚 CATÁLOGO Y LIBROS
  // ==========================================================

  getRegiones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/catalog/regiones/`);
  }

  getComunas(regionId: number | null): Observable<any[]> {
    let url = `${this.apiUrl}/catalog/comunas/`;
    if (regionId) {
      url += `?region=${regionId}`;
    }
    return this.http.get<any[]>(url);
  }

  getGeneros(): Observable<any> {
    return this.http.get(`${this.apiUrl}/catalog/generos/`);
  }

  getBooks(filters?: { [key: string]: string | number | null }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get(`${this.apiUrl}/libros/`, { params });
  }

  searchBooks(query: string, filters?: { [key: string]: string | number | null }): Observable<any> {
    let params = new HttpParams().set('query', query);
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get(`${this.apiUrl}/libros/`, { params });
  }

  getLatestBooks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/libros/latest/`);
  }

  getPopularBooks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/libros/populares/`);
  }

  getBookById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/libros/${id}/`);
  }

  getMyBooks(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/books/mine/?user_id=${userId}`, { headers: this.getAuthHeaders() });
  }

  createBook(bookData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/libros/create/`, bookData, { headers: this.getAuthHeaders() });
  }

  updateBook(bookId: number, bookData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/libros/${bookId}/update/`, bookData, { headers: this.getAuthHeaders() });
  }

  deleteBook(bookId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/libros/${bookId}/delete/`, { headers: this.getAuthHeaders() });
  }

  uploadBookImage(bookId: number, file: File, options: { is_portada: boolean, orden: number }): Observable<any> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    formData.append('is_portada', options.is_portada ? '1' : '0');
    formData.append('orden', options.orden.toString());
    return this.http.post(`${this.apiUrl}/libros/${bookId}/images/upload/`, formData, { headers: this.getAuthHeaders() });
  }

  // ==========================================================
  // 👤 USUARIOS Y PERFIL
  // ==========================================================

  registerUser(userData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, userData);
  }

  getUserSummary(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/summary/`, { headers: this.getAuthHeaders() });
  }

  getUserProfile(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/profile/`, { headers: this.getAuthHeaders() });
  }

  updateUserProfile(userId: number, profileData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/`, profileData, { headers: this.getAuthHeaders() });
  }

  updateUserAvatar(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('imagen_perfil', file, file.name);
    return this.http.patch(`${this.apiUrl}/users/${userId}/avatar/`, formData, { headers: this.getAuthHeaders() });
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot/`, { email });
  }

  resetPassword(token: string, newPassword1: string, newPassword2: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset/`, {
      token: token,
      password: newPassword1,
      password2: newPassword2
    });
  }

  changePassword(currentPass: string, newPass: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password/`, {
      current: currentPass,
      new: newPass
    }, { headers: this.getAuthHeaders() });
  }

  getPublicConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/config/`);
  }

  getUserBooks(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/books/`);
  }
  
  // ==========================================================
  // ❤️ FAVORITOS
  // ==========================================================

  getMyFavoriteIds(userId: number): Observable<{ favorite_ids: number[] }> {
    return this.http.get<any[]>(`${this.apiUrl}/favoritos/`, {
      params: { user_id: userId.toString() },
      headers: this.getAuthHeaders()
    }).pipe(
      map((books: any[]) => {
        return { favorite_ids: books.map(book => book.id) };
      })
    );
  }

  /**
   * (Función principal) Añade o Quita un libro de favoritos.
   * Llama a: POST /api/favoritos/<id>/toggle/
   */
  toggleFavorite(userId: number, bookId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/favoritos/${bookId}/toggle/`, {
      user_id: userId
    }, { headers: this.getAuthHeaders() });
  }

  getMyFavoritesList(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/favoritos/`, {
      params: { user_id: userId.toString() },
      headers: this.getAuthHeaders()
    });
  }
  
  // --- 👇 ALIAS AÑADIDOS DE VUELTA (para book-detail.ts) ---

  /**
   * ALIAS para toggleFavorite.
   */
  addFavorite(userId: number, bookId: number): Observable<any> {
    return this.toggleFavorite(userId, bookId);
  }

  /**
   * ALIAS para toggleFavorite.
   */
  removeFavorite(userId: number, bookId: number): Observable<any> {
    return this.toggleFavorite(userId, bookId);
  }

  // Alias antiguo que también tenías
  getMyFavoriteBooks(userId: number): Observable<any> {
    return this.getMyFavoritesList(userId);
  }
  // --- 👆 FIN DE ALIAS ---


  // ==========================================================
  // 💬 CHAT
  // ==========================================================

  getConversations(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat/${userId}/conversaciones/`, { headers: this.getAuthHeaders() });
  }

  getMessages(conversationId: number, afterMessageId?: number): Observable<any> {
    let url = `${this.apiUrl}/chat/conversacion/${conversationId}/mensajes/`;
    if (afterMessageId) {
      url += `?after_id=${afterMessageId}`;
    }
    return this.http.get(url, { headers: this.getAuthHeaders() });
  }

  sendMessage(conversationId: number, messageData: { id_usuario_emisor: number, cuerpo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/conversacion/${conversationId}/enviar/`, messageData, { headers: this.getAuthHeaders() });
  }

  markConversationAsSeen(conversationId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/conversacion/${conversationId}/visto/`, { id_usuario: userId }, { headers: this.getAuthHeaders() });
  }

  // ==========================================================
  // 🤝 INTERCAMBIOS (LÓGICA COMPLETA)
  // ==========================================================

  // 1. Crear Solicitud (Solicitante)
  crearSolicitudIntercambio(data: {
    id_usuario_solicitante: number;
    id_libro_deseado: number;
    id_libros_ofrecidos: number[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/solicitudes/crear/`, data, { headers: this.getAuthHeaders() });
  }

  getSentProposals(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes/enviadas/`, {
      params: { user_id: userId.toString() },
      headers: this.getAuthHeaders()
    });
  }

  getReceivedProposals(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/solicitudes/recibidas/?user_id=${userId}`, { headers: this.getAuthHeaders() });
  }

  getExchangeHistory(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/intercambios/`, { headers: this.getAuthHeaders() });
  }

  // 2. Responder Solicitud (Receptor)
  acceptProposal(solicitudId: number, acceptedBookId: number, userId: number): Observable<any> {
    const body = {
      user_id: userId,
      id_libro_aceptado: acceptedBookId
    };
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/aceptar/`, body, { headers: this.getAuthHeaders() });
  }

  rejectProposal(solicitudId: number, userId: number): Observable<any> {
    const body = { user_id: userId };
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/rechazar/`, body, { headers: this.getAuthHeaders() });
  }

  cancelProposal(solicitudId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/cancelar/`, { user_id: userId }, { headers: this.getAuthHeaders() });
  }

  // 3. Negociación: Proponer Lugar (Receptor)
  // 🔥 CORREGIDO: Acepta 4 argumentos y fuerza metodo="MANUAL" para el backend
  proponerEncuentro(intercambioId: number, userId: number, lugar: string, fecha: string): Observable<any> {
    const payload = {
      user_id: userId,
      metodo: 'MANUAL',      // Clave para que el backend acepte 'direccion'
      direccion: lugar,      // El input de texto se mapea a 'direccion'
      fecha: fecha           // ISO String
    };
    return this.http.patch(`${this.apiUrl}/intercambios/${intercambioId}/proponer/`, payload, { headers: this.getAuthHeaders() });
  }

  // Alias (para proposal-detail.ts)
  proposeMeetingPoint(intercambioId: number, userId: number, lugar: string, fecha: string): Observable<any> {
    return this.proponerEncuentro(intercambioId, userId, lugar, fecha);
  }

  // 4. Negociación: Confirmar Lugar (Solicitante)
  // 🔥 CORREGIDO: Acepta 3 argumentos
  confirmarEncuentro(intercambioId: number, userId: number, confirmar: boolean): Observable<any> {
    const payload = {
      user_id: userId,
      confirmar: confirmar
    };
    return this.http.patch(`${this.apiUrl}/intercambios/${intercambioId}/confirmar/`, payload, { headers: this.getAuthHeaders() });
  }

  // Alias (para proposal-detail.ts)
  confirmMeetingPoint(intercambioId: number, userId: number, confirmar: boolean): Observable<any> {
    return this.confirmarEncuentro(intercambioId, userId, confirmar);
  }

  // 5. Cierre: Generar Código (Receptor)
  generateExchangeCode(intercambioId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/codigo/`, { user_id: userId }, { headers: this.getAuthHeaders() });
  }

  // 6. Cierre: Completar con Código (Solicitante)
  // 🔥 CORREGIDO: Acepta 3 argumentos
  completeExchangeWithCode(intercambioId: number, userId: number, codigo: string): Observable<any> {
    const body = {
      user_id: userId,
      codigo: codigo
    };
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/completar/`, body, { headers: this.getAuthHeaders() });
  }

  // 7. Calificar (Ambos)
  // 🔥 CORREGIDO: Acepta 4 argumentos
  rateExchange(intercambioId: number, userId: number, puntuacion: number, comentario: string): Observable<any> {
    const body = {
      user_id: userId,
      puntuacion: puntuacion,
      comentario: comentario
    };
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/calificar/`, body, { headers: this.getAuthHeaders() });
  }

  getMyRatingForExchange(intercambioId: number, userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/intercambios/${intercambioId}/mi-calificacion/?user_id=${userId}`, { headers: this.getAuthHeaders() });
  }

  getMeetingProposal(intercambioId: number): Observable<any> {
    // Esta es la ruta que tu compañero (móvil) probablemente usa
    return this.http.get(`${this.apiUrl}/intercambios/${intercambioId}/propuesta/`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // ==========================================================
  // 🛡️ ADMINISTRADOR
  // ==========================================================

  getAdminSummary(): Observable<any> {
    // 👇 CORRECCIÓN: Se quita el /api/ duplicado
    return this.http.get(`${this.apiUrl}/admin/summary/`, { headers: this.getAuthHeaders() });
  }

  adminGetAllUsers(): Observable<any[]> {
    // 👇 CORRECCIÓN: Se quita el /api/ duplicado
    return this.http.get<any[]>(`${this.apiUrl}/admin/users/`, { headers: this.getAuthHeaders() });
  }

  adminDeleteUser(userId: number): Observable<any> {
    // 👇 CORRECCIÓN: Se quita el /api/ duplicado
    return this.http.delete(`${this.apiUrl}/admin/users/${userId}/delete/`, { headers: this.getAuthHeaders() });
  }

  adminToggleUserActive(userId: number): Observable<any> {
    // 👇 CORRECCIÓN: Se quita el /api/ duplicado
    return this.http.post(`${this.apiUrl}/admin/users/${userId}/toggle/`, {}, { headers: this.getAuthHeaders() });
  }
}