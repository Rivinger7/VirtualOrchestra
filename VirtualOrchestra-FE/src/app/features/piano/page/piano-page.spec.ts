import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PianoPage } from './piano-page';

describe('PianoPage', () => {
  let component: PianoPage;
  let fixture: ComponentFixture<PianoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PianoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PianoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
