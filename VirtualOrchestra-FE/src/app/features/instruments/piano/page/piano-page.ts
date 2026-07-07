import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { InstrumentControlPanel } from '../../instrument-control-panel/instrument-control-panel';
import { PianoController } from '../piano-controller';
import { PianoKey } from '../models/piano-key';

@Component({
  selector: 'app-piano-page',
  imports: [InstrumentControlPanel],
  templateUrl: './piano-page.html',
  providers: [PianoController],
  host: {
    class: 'block min-h-screen',
    '(window:keydown)': 'handleKeydown($event)',
    '(window:keyup)': 'handleKeyup($event)',
    '(window:resize)': 'syncShortcutGridColumns()',
    '(window:pointerup)': 'handleGlobalPointerUp($event)',
    '(window:pointercancel)': 'handleGlobalPointerCancel($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PianoPage {
  readonly shortcutPage = signal(0);
  readonly shortcutGridColumns = signal(this.detectShortcutGridColumns());
  readonly piano = inject(PianoController);
  readonly typeOptions = this.piano.typeOptions;
  readonly selectedType = this.piano.selectedType;
  readonly keys = this.piano.keys;
  readonly whiteKeys = this.piano.whiteKeys;
  readonly blackKeys = this.piano.blackKeys;
  readonly shortcutKeys = this.piano.shortcutKeys;
  readonly shortcutLegend = this.piano.shortcutLegend;
  readonly activeNotes = this.piano.activeNotes;
  readonly focusedKey = this.piano.focusedKey;
  readonly rangeTitle = this.piano.rangeTitle;
  readonly rangeDescription = this.piano.rangeDescription;
  readonly isDenseLayout = this.piano.isDenseLayout;
  readonly isUltraDenseLayout = this.piano.isUltraDenseLayout;
  readonly blackKeyWidthPercent = this.piano.blackKeyWidthPercent;
  readonly volume = this.piano.volume;
  readonly sustainEnabled = this.piano.sustainEnabled;
  readonly metronomeEnabled = this.piano.metronomeEnabled;
  readonly metronomeBpm = this.piano.metronomeBpm;
  readonly recordTime = this.piano.recordTime;
  readonly recordingState = this.piano.recordingState;
  readonly shortcutPageSize = computed(() => this.shortcutGridColumns() * 5);
  readonly shortcutPageCount = computed(() =>
    Math.max(1, Math.ceil(this.shortcutKeys().length / this.shortcutPageSize())),
  );
  readonly pagedShortcutKeys = computed(() => {
    const pageSize = this.shortcutPageSize();
    const startIndex = this.shortcutPage() * pageSize;
    return this.shortcutKeys().slice(startIndex, startIndex + pageSize);
  });
  readonly shortcutRangeLabel = computed(() => {
    const total = this.shortcutKeys().length;
    if (total === 0) {
      return '0 / 0';
    }

    const pageSize = this.shortcutPageSize();
    const start = this.shortcutPage() * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `${start}-${end} / ${total}`;
  });

  private readonly activePointerKeys = new Map<number, string>();

  // Keep pagination in range when shortcut count changes with layout or viewport updates.
  constructor() {
    effect(() => {
      const pageCount = this.shortcutPageCount();
      if (this.shortcutPage() >= pageCount) {
        this.shortcutPage.set(pageCount - 1);
      }
    });
  }

  // Switch layout and reset local pointer and pagination state.
  setSelectedType(value: string) {
    this.activePointerKeys.clear();
    this.shortcutPage.set(0);
    this.piano.setSelectedType(value);
  }

  // Recompute shortcut grid capacity when the viewport changes.
  syncShortcutGridColumns() {
    this.shortcutGridColumns.set(this.detectShortcutGridColumns());
  }

  // Move shortcut pagination backward by one page.
  previousShortcutPage() {
    this.shortcutPage.update((page) => Math.max(0, page - 1));
  }

  // Move shortcut pagination forward by one page.
  nextShortcutPage() {
    this.shortcutPage.update((page) => Math.min(this.shortcutPageCount() - 1, page + 1));
  }

  // Proxy volume changes to the piano controller.
  setVolume(value: number) {
    this.piano.setVolume(value);
  }

  // Proxy sustain toggle changes to the piano controller.
  setSustainEnabled(enabled: boolean) {
    this.piano.setSustainEnabled(enabled);
  }

  // Toggle mute through the shared piano controller.
  toggleMute() {
    this.piano.toggleMute();
  }

  // Proxy metronome on/off state to the piano controller.
  setMetronomeEnabled(enabled: boolean) {
    this.piano.setMetronomeEnabled(enabled);
  }

  // Proxy metronome tempo changes to the piano controller.
  setMetronomeBpm(value: number) {
    this.piano.setMetronomeBpm(value);
  }

  // Start or pause note recording.
  toggleRecording() {
    this.piano.toggleRecording();
  }

  // Stop recording and flush any unfinished notes.
  stopRecording() {
    this.piano.stopRecording();
  }

  // Handle physical keyboard note presses and the sustain pedal shortcut.
  handleKeydown(event: KeyboardEvent) {
    if (this.shouldIgnoreKeyboardShortcut(event)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.piano.setSustainPedalPressed(true);
      return;
    }

    if (event.repeat) {
      return;
    }

    const key = this.piano.findKeyByShortcut(event.key);
    if (!key) {
      return;
    }

    event.preventDefault();
    this.piano.pressKey(key);
  }

  // Handle physical keyboard note releases and pedal release.
  handleKeyup(event: KeyboardEvent) {
    if (this.shouldIgnoreKeyboardShortcut(event)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.piano.setSustainPedalPressed(false);
      return;
    }

    const key = this.piano.findKeyByShortcut(event.key);
    if (!key) {
      return;
    }

    event.preventDefault();
    this.piano.releaseKey(key.id);
  }

  // Release a note when its originating pointer is lifted on the same key.
  handlePointerUp(event: PointerEvent, keyId: string) {
    const activeKeyId = this.activePointerKeys.get(event.pointerId);
    if (!activeKeyId || activeKeyId !== keyId) {
      return;
    }

    this.activePointerKeys.delete(event.pointerId);
    this.piano.releaseKey(activeKeyId);
  }

  // Start a note for a new pointer or switch an existing pointer to a different key.
  handlePointerDown(event: PointerEvent, key: PianoKey) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const previousKeyId = this.activePointerKeys.get(event.pointerId);
    if (previousKeyId && previousKeyId !== key.id) {
      this.piano.releaseKey(previousKeyId);
    }

    this.activePointerKeys.set(event.pointerId, key.id);
    this.piano.pressKey(key);
  }

  // Support drag playing by moving one active pointer between keys.
  handlePointerEnter(event: PointerEvent, key: PianoKey) {
    const previousKeyId = this.activePointerKeys.get(event.pointerId);
    if (!previousKeyId || (event.pointerType === 'mouse' && event.buttons === 0)) {
      return;
    }

    if (previousKeyId === key.id) {
      return;
    }

    this.piano.releaseKey(previousKeyId);
    this.activePointerKeys.set(event.pointerId, key.id);
    this.piano.pressKey(key);
  }

  // Recover note state if a pointer ends outside the original button.
  handleGlobalPointerUp(event: PointerEvent) {
    const activeKeyId = this.activePointerKeys.get(event.pointerId);
    if (!activeKeyId) {
      return;
    }

    this.activePointerKeys.delete(event.pointerId);
    this.piano.releaseKey(activeKeyId);
  }

  // Recover note state when the browser cancels an active pointer.
  handleGlobalPointerCancel(event: PointerEvent) {
    const activeKeyId = this.activePointerKeys.get(event.pointerId);
    if (!activeKeyId) {
      return;
    }

    this.activePointerKeys.delete(event.pointerId);
    this.piano.releaseKey(activeKeyId);
  }

  // Ask the controller whether a key should render as active.
  isActiveKey(keyId: string) {
    return this.piano.isActiveKey(keyId);
  }

  // Match the responsive grid classes used by the shortcut panel.
  private detectShortcutGridColumns() {
    const viewportWidth = globalThis.innerWidth;

    if (viewportWidth >= 1280) {
      return 2;
    }

    if (viewportWidth >= 640) {
      return 3;
    }

    return 2;
  }

  // Ignore global keyboard shortcuts while focus is inside interactive controls.
  private shouldIgnoreKeyboardShortcut(event: KeyboardEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return !!target.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="combobox"], [role="slider"], [role="switch"]',
    );
  }
}
