import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBookList } from './admin-book-list';

describe('AdminBookList', () => {
  let component: AdminBookList;
  let fixture: ComponentFixture<AdminBookList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBookList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBookList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
