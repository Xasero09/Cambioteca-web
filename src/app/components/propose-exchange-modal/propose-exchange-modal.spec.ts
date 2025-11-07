import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProposeExchangeModal } from './propose-exchange-modal';

describe('ProposeExchangeModal', () => {
  let component: ProposeExchangeModal;
  let fixture: ComponentFixture<ProposeExchangeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposeExchangeModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposeExchangeModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
