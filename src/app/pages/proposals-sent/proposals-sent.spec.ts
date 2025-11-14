import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProposalsSent } from './proposals-sent';

describe('ProposalsSent', () => {
  let component: ProposalsSent;
  let fixture: ComponentFixture<ProposalsSent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalsSent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalsSent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
