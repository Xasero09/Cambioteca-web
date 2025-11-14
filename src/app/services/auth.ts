// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://proyectocapstone-production.up.railway.app/api/auth';
  private tokenKey = 'cambioteca_token';
  private userKey = 'cambioteca_user';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any | null>(this.getUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  // 👇 --- ESTE ES EL CAMBIO --- 👇
  // Cambiamos 'private' por 'public' para que el AuthGuard pueda usarlo.
  public hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  login(credentials: { email: string, contrasena: string }): Observable<any> {
    return this.http.post(this.apiUrl + '/login/', credentials).pipe(
      tap((response: any) => {
        this.saveToken(response.access);
        this.saveUser(response.user);
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  

  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  saveUser(user: any): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): any | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
  updateLocalUserAvatar(newAvatarUrl: string): void {
    // 1. Obtiene el usuario actual del BehaviorSubject
    const currentUser = this.currentUserSubject.getValue();
    if (currentUser) {
      
      // 2. Crea un nuevo objeto de usuario con la foto actualizada
      const updatedUser = {
        ...currentUser,
        avatar_url: newAvatarUrl // Actualiza la URL
        // NOTA: Si tu objeto de usuario también guarda 'imagen_perfil' (ruta relativa),
        // también podrías actualizarla aquí si la necesitas, pero avatar_url es la crítica.
      };

      // 3. Guarda el usuario actualizado en localStorage
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // 4. Emite el usuario actualizado al BehaviorSubject
      this.currentUserSubject.next(updatedUser);
    }
  }
}