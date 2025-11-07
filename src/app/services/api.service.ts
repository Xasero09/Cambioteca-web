import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs'; // Importamos 'of' para manejar errores
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getRegiones(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + 'catalog/regiones/');
  }

  getComunas(regionId: number | null): Observable<any[]> {
    let url = this.apiUrl + 'catalog/comunas/';
    if (regionId) {
      url += `?region=${regionId}`;
    }
    return this.http.get<any[]>(url);
  }

  registerUser(userData: FormData): Observable<any> {
    return this.http.post(this.apiUrl + 'auth/register/', userData);
  }

  getBooks(filters?: { [key: string]: string | number | null }): Observable<any> { // Permite null para género
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        // Solo añade si el filtro tiene un valor (no nulo ni vacío)
        if (value !== null && value !== undefined && value !== '') { 
          params = params.set(key, String(value)); // Convertir a string para HttpParams
        }
      });
    }
    return this.http.get(`${this.apiUrl}/libros/`, { params }); 
  }

  /**
   * Busca libros por un término general y permite filtros adicionales.
   * @param query Término general de búsqueda.
   * @param filters Objeto opcional con filtros adicionales.
   */
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
  // Llama al endpoint para los libros más recientes
  return this.http.get(`${this.apiUrl}/libros/latest/`);
  }

  getPopularBooks(): Observable<any> {
  // Llama al endpoint para los libros más populares
  return this.http.get(`${this.apiUrl}/libros/populares/`);
  }

  getBookById(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/libros/${id}/`);
  }

  getMyBooks(userId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/books/mine/?user_id=${userId}`);
  } 

  getGeneros(): Observable<any> {
    return this.http.get(`${this.apiUrl}/catalog/generos/`);
  }

  createBook(bookData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/libros/create/`, bookData);
  }


  uploadBookImage(bookId: number, file: File, options: { is_portada: boolean, orden: number }): Observable<any> {
    const formData = new FormData();
    formData.append('image', file, file.name); // El backend espera el campo 'image'
    formData.append('is_portada', options.is_portada ? '1' : '0');
    formData.append('orden', options.orden.toString());

    return this.http.post(`${this.apiUrl}/libros/${bookId}/images/upload/`, formData);
  }

  getUserSummary(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/summary/`);
  }
  
  getUserProfile(userId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/users/${userId}/profile/`);
  }

  /**
   * Actualiza los datos de un libro existente.
   */
  updateBook(bookId: number, bookData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/libros/${bookId}/update/`, bookData);
  }

  /**
   * Elimina un libro por su ID.
   */
  deleteBook(bookId: number): Observable<any> {
    // El método DELETE no suele llevar body, pero revisa tu backend si espera user_id
    return this.http.delete(`${this.apiUrl}/libros/${bookId}/delete/`); 
  }



  getConversations(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat/${userId}/conversaciones/`);
  }


  getMessages(conversationId: number, afterMessageId?: number): Observable<any> {
    let url = `${this.apiUrl}/chat/conversacion/${conversationId}/mensajes/`;
    if (afterMessageId) {
      url += `?after_id=${afterMessageId}`; // Usamos after_id como en el backend
    }
    return this.http.get(url);
  }


  sendMessage(conversationId: number, messageData: { id_usuario_emisor: number, cuerpo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/conversacion/${conversationId}/enviar/`, messageData);
  }


  markConversationAsSeen(conversationId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/conversacion/${conversationId}/visto/`, { id_usuario: userId });
  }

  updateUserProfile(userId: number, profileData: any): Observable<any> {
    // Tu backend espera un PATCH en /api/users/<id>/
    return this.http.patch(`${this.apiUrl}/users/${userId}/`, profileData); 
  }

  crearSolicitudIntercambio(data: {
    id_usuario_solicitante: number;
    id_libro_deseado: number;
    id_libros_ofrecidos: number[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/solicitudes/crear/`, data);
  }

  getReceivedProposals(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/solicitudes/recibidas/?user_id=${userId}`);
  }

  /**
   * Acepta una solicitud de intercambio eligiendo uno de los libros ofrecidos.
   */
  acceptProposal(solicitudId: number, acceptedBookId: number, userId: number): Observable<any> {
    const body = {
      user_id: userId,
      id_libro_aceptado: acceptedBookId 
    };
    // Asegúrate que tu endpoint sea POST y la URL correcta
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/aceptar/`, body); 
  }

  /**
   * Rechaza una solicitud de intercambio.
   */
  rejectProposal(solicitudId: number, userId: number): Observable<any> {
    const body = { user_id: userId }; 
    // Asegúrate que tu endpoint sea POST y la URL correcta
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/rechazar/`, body); 
  }

  getExchangeHistory(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/intercambios/`);
  }

  /**
   * Verifica si el usuario actual ya calificó un intercambio específico.
   * Llama a: /api/intercambios/{intercambioId}/mi-calificacion/?user_id={userId}
   */
  getMyRatingForExchange(intercambioId: number, userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/intercambios/${intercambioId}/mi-calificacion/?user_id=${userId}`);
  }



  /**
   * 3. Para AÑADIR un favorito
   */
  addFavorite(userId: number, bookId: number): Observable<any> {
    // ANTES: /api/favorites/add/
    // AHORA:
    return this.http.post(`${this.apiUrl}/favorites/add/`, { user_id: userId, book_id: bookId });
  }

  /**
   * 4. Para QUITAR un favorito
   */
  removeFavorite(userId: number, bookId: number): Observable<any> {
    // ANTES: /api/favorites/remove/
    // AHORA:
    return this.http.post(`${this.apiUrl}/favorites/remove/`, { user_id: userId, book_id: bookId });
  }

  getMyFavoriteBooks(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/favoritos/mine/books/?user_id=${userId}`);
  }
  

  requestPasswordReset(email: string): Observable<any> {
    // Esta ruta la tienes en api/urls.py -> core.views
    return this.http.post(`${this.apiUrl}/auth/forgot/`, { email });
  }

  /**
   * 2. Para "Restablecer Contraseña" (reset-password)
   */
  resetPassword(token: string, newPassword1: string, newPassword2: string): Observable<any> {
    // Esta ruta la tienes en api/urls.py -> core.views
    return this.http.post(`${this.apiUrl}/auth/reset/`, {
      token: token,
      password: newPassword1,
      password2: newPassword2
    });
  }

  /**
   * 3. Para "Cambiar Contraseña" (usuario logueado)
   * (Esta es la NUEVA versión compatible con tu core/views.py)
   */
  changePassword(currentPass: string, newPass: string): Observable<any> {
    // Asegúrate de que la ruta sea "/auth/change-password/"
    return this.http.post(`${this.apiUrl}/auth/change-password/`, {
      current: currentPass,
      new: newPass
    });
  }

  getSentProposals(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes/enviadas/`, {
      params: { user_id: userId.toString() }
    });
  }

  /**
   * Cancela una solicitud PENDIENTE que el usuario envió.
   */
  cancelProposal(solicitudId: number, userId: number): Observable<any> {
    // El backend espera el user_id en el body para validar
    return this.http.post(`${this.apiUrl}/solicitudes/${solicitudId}/cancelar/`, { user_id: userId });
  }

  generateExchangeCode(intercambioId: number, userId: number): Observable<any> {
    // Tu backend espera el user_id en el body
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/codigo/`, { user_id: userId });
  }

  /**
   * Completa un intercambio usando el código.
   * (Llamado por el SOLICITANTE)
   */
  completeExchangeWithCode(intercambioId: number, userId: number, codigo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/completar/`, {
      user_id: userId,
      codigo: codigo
    });
  }

  rateExchange(intercambioId: number, userId: number, puntuacion: number, comentario: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/intercambios/${intercambioId}/calificar/`, {
      user_id: userId,
      puntuacion: puntuacion,
      comentario: comentario
    });
  }

  getPublicConfig(): Observable<any> {
    // Esta ruta la tienes en api/urls.py -> core.views_public
    return this.http.get(`${this.apiUrl}/public/config/`);
  }

  getMyFavoriteIds(userId: number): Observable<{ favorite_ids: number[] }> {
    // Llama a la ruta 'favoritos_list' del backend
    return this.http.get<any[]>(`${this.apiUrl}/favoritos/`, {
      params: { user_id: userId.toString() }
    }).pipe(
      map((books: any[]) => {
        // Transforma la respuesta de [{id: 1, ...}, {id: 2, ...}] a [1, 2]
        return { favorite_ids: books.map(book => book.id) };
      })
    );
  }

  /**
   * Añade o Quita un libro de favoritos.
   * Llama a: POST /api/favoritos/<id>/toggle/
   */
  toggleFavorite(userId: number, bookId: number): Observable<any> {
    // Esta es la ruta que tu backend espera
    return this.http.post(`${this.apiUrl}/favoritos/${bookId}/toggle/`, { 
      user_id: userId 
    });
  }

  getMyFavoritesList(userId: number): Observable<any[]> {
    // Esta ruta ya la tienes en tu backend (market/views.py -> favoritos_list)
    return this.http.get<any[]>(`${this.apiUrl}/favoritos/`, {
      params: { user_id: userId.toString() }
    });
  }

}

