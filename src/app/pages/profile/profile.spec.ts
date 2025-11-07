import { ComponentFixture, TestBed } from '@angular/core/testing';
// LA CORRECCIÓN ESTÁ AQUÍ:
import { ProfileComponent } from './profile'; // Se cambió 'Profile' por 'ProfileComponent'

describe('ProfileComponent', () => { // Y aquí
  let component: ProfileComponent; // Y aquí
  let fixture: ComponentFixture<ProfileComponent>; // Y aquí

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent], // Y aquí
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent); // Y aquí
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});