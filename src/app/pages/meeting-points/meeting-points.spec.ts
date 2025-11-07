import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingPoints } from './meeting-points';

describe('MeetingPoints', () => {
  let component: MeetingPoints;
  let fixture: ComponentFixture<MeetingPoints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeetingPoints]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeetingPoints);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
