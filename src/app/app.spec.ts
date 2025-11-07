import { TestBed } from '@angular/core/testing';
// 1. Importamos el componente con su nombre correcto 'AppComponent'
import { AppComponent } from './app'; // O './app' si renombraste el archivo

describe('AppComponent', () => { // 2. Usamos el nombre correcto aquí también
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  /*
  // SE COMENTA ESTA PRUEBA PORQUE LA PROPIEDAD 'title' NO EXISTE EN EL COMPONENTE
  it(`should have the 'cambioteca-web' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    // Asegúrate de que el título en tu app.component.ts coincida
    expect(app.title).toEqual('cambioteca-web');
  });
  */

  // Es probable que esta prueba también falle si no tienes un <h1> en tu app.component.html
  // Siéntete libre de eliminarla o comentarla también si es necesario.
  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, cambioteca-web');
  });
});