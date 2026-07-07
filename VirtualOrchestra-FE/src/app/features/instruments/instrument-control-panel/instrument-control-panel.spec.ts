import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentControlPanel } from './instrument-control-panel';

describe('InstrumentControlPanel', () => {
  let component: InstrumentControlPanel;
  let fixture: ComponentFixture<InstrumentControlPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstrumentControlPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(InstrumentControlPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
