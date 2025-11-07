import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceivedProposals } from './received-proposals';

describe('ReceivedProposals', () => {
  let component: ReceivedProposals;
  let fixture: ComponentFixture<ReceivedProposals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceivedProposals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceivedProposals);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
