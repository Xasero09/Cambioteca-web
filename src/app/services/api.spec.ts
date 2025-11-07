// src/app/services/api.spec.ts

import { TestBed } from '@angular/core/testing';
// LA CORRECCIÓN ESTÁ AQUÍ:
import { ApiService } from './api.service'; // Se cambió 'Api' por 'ApiService'

describe('ApiService', () => { // Y aquí también
  let service: ApiService; // Y aquí

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiService); // Y finalmente aquí
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});