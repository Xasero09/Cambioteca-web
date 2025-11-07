import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProposalDetail } from './proposal-detail';

describe('ProposalDetail', () => {
  let component: ProposalDetail;
  let fixture: ComponentFixture<ProposalDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
