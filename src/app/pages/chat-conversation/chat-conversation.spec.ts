import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatConversation } from './chat-conversation';

describe('ChatConversation', () => {
  let component: ChatConversation;
  let fixture: ComponentFixture<ChatConversation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatConversation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatConversation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
