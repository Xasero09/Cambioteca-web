// src/app/services/auth.spec.ts

import { TestBed } from '@angular/core/testing';
// LA CORRECCIÓN ESTÁ AQUÍ:
import { AuthService } from './auth'; // Se cambió 'Auth' por 'AuthService'

describe('AuthService', () => { // Y aquí
  let service: AuthService; // Y aquí

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService); // Y aquí
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});