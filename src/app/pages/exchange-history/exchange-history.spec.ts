import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExchangeHistory } from './exchange-history';

describe('ExchangeHistory', () => {
  let component: ExchangeHistory;
  let fixture: ComponentFixture<ExchangeHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExchangeHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
