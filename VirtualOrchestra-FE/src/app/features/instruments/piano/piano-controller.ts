import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  ControlPanelOption,
  RecordingState,
} from '../instrument-control-panel/instrument-control-panel';
import { ActiveVoice, RecordedNoteEvent, WindowWithWebkitAudio } from '../models/instrument-sound';
import { PianoKey } from './models/piano-key';

type KeyboardLayoutId = '12-keys' | '32-keys' | '48-keys';

interface KeyboardLayoutConfig extends ControlPanelOption {
  value: KeyboardLayoutId;
  keyCount: number;
  startMidi: number;
  description: string;
  shortcuts: readonly string[];
}

const SHORTCUTS_12_KEYS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J'] as const;
const SHORTCUTS_32_KEYS = [
  'Z',
  'S',
  'X',
  'D',
  'C',
  'V',
  'G',
  'B',
  'H',
  'N',
  'J',
  'M',
  ',',
  'L',
  '.',
  ';',
  'Q',
  '2',
  'W',
  '3',
  'E',
  'R',
  '5',
  'T',
  '6',
  'Y',
  '7',
  'U',
  'I',
  '9',
  'O',
  '0',
] as const;
const SHORTCUTS_48_KEYS = [
  ...SHORTCUTS_32_KEYS,
  'P',
  '[',
  ']',
  '\\',
  'A',
  'F',
  'K',
  '/',
  '1',
  '4',
  '8',
  '-',
  '=',
  '`',
  "'",
  'Tab',
] as const;

const KEYBOARD_LAYOUTS: KeyboardLayoutConfig[] = [
  {
    label: '12 keys',
    value: '12-keys',
    keyCount: 12,
    startMidi: 60,
    description: 'Mot quang 12 semitones tu C4 den B4, phu hop de test nhanh layout va audio.',
    shortcuts: SHORTCUTS_12_KEYS,
  },
  {
    label: '32 keys',
    value: '32-keys',
    keyCount: 32,
    startMidi: 48,
    description: 'Range mo rong hon de test nhieu octave ma van giu layout gon tren desktop.',
    shortcuts: SHORTCUTS_32_KEYS,
  },
  {
    label: '48 keys',
    value: '48-keys',
    keyCount: 48,
    startMidi: 36,
    description: 'Layout trainning rong hon de mo phong keyboard nhieu octave trong mot view.',
    shortcuts: SHORTCUTS_48_KEYS,
  },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const BLACK_NOTE_INDICES = new Set([1, 3, 6, 8, 10]);

@Injectable()
export class PianoController {
  readonly typeOptions = KEYBOARD_LAYOUTS.map(({ label, value }) => ({ label, value }));
  readonly selectedType = signal<KeyboardLayoutId>('12-keys');
  readonly selectedLayout = computed(
    () =>
      KEYBOARD_LAYOUTS.find((layout) => layout.value === this.selectedType()) ??
      KEYBOARD_LAYOUTS[0],
  );
  readonly keys = computed(() => this.createKeys(this.selectedLayout()));
  readonly whiteKeys = computed(() => this.keys().filter((key) => key.type === 'white'));
  readonly blackKeys = computed(() => this.keys().filter((key) => key.type === 'black'));
  readonly shortcutKeys = computed(() => this.keys().filter((key) => !!key.shortcut));
  readonly shortcutLegend = computed(() =>
    this.shortcutKeys()
      .map((key) => key.shortcut)
      .join(' '),
  );
  readonly rangeTitle = computed(() => this.selectedLayout().label);
  readonly rangeDescription = computed(() => this.selectedLayout().description);
  readonly isDenseLayout = computed(() => this.keys().length > 24);
  readonly isUltraDenseLayout = computed(() => this.keys().length > 40);
  readonly blackKeyWidthPercent = computed(() =>
    Math.max(2.8, Math.min(8.5, (100 / this.whiteKeys().length) * 0.72)),
  );

  readonly activeKeyPressCounts = signal<Record<string, number>>({});
  readonly lastPlayedKeyId = signal<string | null>(null);
  readonly activeNotes = computed(() =>
    this.keys().filter((key) => (this.activeKeyPressCounts()[key.id] ?? 0) > 0),
  );
  readonly focusedKey = computed(
    () => this.activeNotes().at(-1) ?? this.findKeyById(this.lastPlayedKeyId()) ?? this.keys()[0],
  );
  readonly volume = signal(80);
  readonly sustainLatched = signal(false);
  readonly sustainPedalPressed = signal(false);
  readonly sustainEnabled = computed(() => this.sustainLatched() || this.sustainPedalPressed());
  readonly metronomeEnabled = signal(false);
  readonly metronomeBpm = signal(120);
  readonly recordTime = signal(0);
  readonly recordingState = signal<RecordingState>('stopped');
  readonly recordedEvents = signal<RecordedNoteEvent[]>([]);
  readonly sustainedKeyIds = signal<Record<string, true>>({});
  readonly sustainCancelledKeyIds = signal<Record<string, true>>({});

  private audioContext?: AudioContext;
  private previousVolume = 80;
  private readonly activeVoices = new Map<string, ActiveVoice>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeRecordingStarts = new Map<string, number>();
  private metronomeTickCount = 0;

  // Keep side effects for recording, metronome, and audio cleanup in one place.
  constructor() {
    effect((onCleanup) => {
      if (this.recordingState() !== 'recording') {
        return;
      }

      const intervalId = window.setInterval(() => {
        this.recordTime.update((time) => time + 1);
      }, 1000);

      onCleanup(() => {
        window.clearInterval(intervalId);
      });
    });

    effect((onCleanup) => {
      const isEnabled = this.metronomeEnabled();
      const bpm = this.metronomeBpm();

      if (!isEnabled) {
        this.metronomeTickCount = 0;
        return;
      }

      this.metronomeTickCount = 0;
      this.playMetronomeTick(true);

      const intervalId = window.setInterval(
        () => {
          this.metronomeTickCount += 1;
          this.playMetronomeTick(this.metronomeTickCount % 4 === 0);
        },
        Math.max(60000 / bpm, 120),
      );

      onCleanup(() => {
        window.clearInterval(intervalId);
      });
    });

    effect(() => {
      const normalizedVolume = this.getNormalizedVolume();
      if (!this.audioContext) {
        return;
      }

      const now = this.audioContext.currentTime;
      for (const activeVoice of this.activeVoices.values()) {
        activeVoice.gain.gain.cancelScheduledValues(now);
        activeVoice.gain.gain.setTargetAtTime(this.getSustainGain(normalizedVolume), now, 0.02);
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const activeVoice of this.activeVoices.values()) {
        activeVoice.oscillator.onended = null;
        activeVoice.oscillator.stop();
        activeVoice.oscillator.disconnect();
        activeVoice.gain.disconnect();
      }

      this.activeVoices.clear();
      this.activeRecordingStarts.clear();

      if (this.audioContext && this.audioContext.state !== 'closed') {
        void this.audioContext.close();
      }
    });
  }

  // Resolve a physical keyboard shortcut to its current piano key.
  findKeyByShortcut(shortcut: string) {
    return this.keys().find((key) => key.shortcut?.toLowerCase() === shortcut.toLowerCase());
  }

  // Mark a key as visually active when it is pressed or still sustained.
  isActiveKey(keyId: string) {
    return (this.activeKeyPressCounts()[keyId] ?? 0) > 0 || !!this.sustainedKeyIds()[keyId];
  }

  // Switch keyboard layout and reset note state to avoid cross-layout leaks.
  setSelectedType(value: string) {
    const nextLayout = KEYBOARD_LAYOUTS.find((layout) => layout.value === value);
    if (!nextLayout || nextLayout.value === this.selectedType()) {
      return;
    }

    this.stopAllActiveNotes();
    this.lastPlayedKeyId.set(null);
    this.selectedType.set(nextLayout.value);
  }

  // Update the output volume while preserving the last audible value for mute restore.
  setVolume(value: number) {
    if (value > 0) {
      this.previousVolume = value;
    }

    this.volume.set(value);
  }

  // Toggle the latched sustain state from the control panel.
  setSustainEnabled(enabled: boolean) {
    this.updateSustainSource(this.sustainLatched(), enabled, () => {
      this.sustainLatched.set(enabled);
    });
  }

  // Hold sustain temporarily from the keyboard pedal shortcut.
  setSustainPedalPressed(pressed: boolean) {
    this.updateSustainSource(this.sustainPedalPressed(), pressed, () => {
      this.sustainPedalPressed.set(pressed);
    });
  }

  // Mute immediately and remember the previous volume for unmute.
  toggleMute() {
    if (this.volume() === 0) {
      this.volume.set(this.previousVolume);
      return;
    }

    this.previousVolume = this.volume();
    this.volume.set(0);
  }

  // Enable or disable the metronome loop.
  setMetronomeEnabled(enabled: boolean) {
    this.metronomeEnabled.set(enabled);
  }

  // Adjust metronome tempo in beats per minute.
  setMetronomeBpm(value: number) {
    this.metronomeBpm.set(value);
  }

  // Cycle recording between stopped, recording, and paused.
  toggleRecording() {
    const currentState = this.recordingState();
    if (currentState === 'stopped') {
      this.recordedEvents.set([]);
      this.activeRecordingStarts.clear();
      this.recordTime.set(0);
      this.recordingState.set('recording');
      return;
    }

    if (currentState === 'recording') {
      this.recordingState.set('paused');
      return;
    }

    this.recordingState.set('recording');
  }

  // Flush any open note events and reset recording state.
  stopRecording() {
    const finishedAt = performance.now();

    for (const [keyId, startedAtMs] of this.activeRecordingStarts.entries()) {
      this.finishRecordedEvent(keyId, finishedAt, startedAtMs);
    }

    this.activeRecordingStarts.clear();
    this.recordTime.set(0);
    this.recordingState.set('stopped');
  }

  // Start or resume a note, including per-note sustain cancellation.
  pressKey(key: PianoKey) {
    const previousCount = this.activeKeyPressCounts()[key.id] ?? 0;
    const wasSustained = !!this.sustainedKeyIds()[key.id];

    this.activeKeyPressCounts.update((activeKeys) => ({
      ...activeKeys,
      [key.id]: previousCount + 1,
    }));

    if (wasSustained) {
      this.sustainedKeyIds.update((sustainedKeys) => this.removeKeyFlag(sustainedKeys, key.id));
      this.sustainCancelledKeyIds.update((cancelledKeys) => this.addKeyFlag(cancelledKeys, key.id));
    }

    this.lastPlayedKeyId.set(key.id);

    if (previousCount === 0 && !wasSustained) {
      this.recordNoteStart(key);
      this.playTone(key);
    }
  }

  // Release one press layer and decide whether the note should stop or stay sustained.
  releaseKey(keyId?: string) {
    if (!keyId) {
      return;
    }

    const currentCount = this.activeKeyPressCounts()[keyId] ?? 0;
    if (currentCount === 0) {
      return;
    }

    if (currentCount === 1) {
      this.activeKeyPressCounts.update((activeKeys) => this.removeCountEntry(activeKeys, keyId));

      if (this.sustainEnabled()) {
        if (this.sustainCancelledKeyIds()[keyId]) {
          this.sustainCancelledKeyIds.update((cancelledKeys) =>
            this.removeKeyFlag(cancelledKeys, keyId),
          );
          this.stopTrackedNote(keyId);
          return;
        }

        this.sustainedKeyIds.update((sustainedKeys) => this.addKeyFlag(sustainedKeys, keyId));
        return;
      }

      this.stopTrackedNote(keyId);
      return;
    }

    this.activeKeyPressCounts.update((activeKeys) => ({
      ...activeKeys,
      [keyId]: currentCount - 1,
    }));
  }

  // Lookup a rendered key by its stable note id.
  private findKeyById(keyId: string | null) {
    return this.keys().find((key) => key.id === keyId);
  }

  // Turn off every active or sustained note before a hard reset.
  private stopAllActiveNotes() {
    const activeKeyIds = Object.keys(this.activeKeyPressCounts());
    const sustainedKeyIds = Object.keys(this.sustainedKeyIds());

    for (const keyId of activeKeyIds) {
      this.stopTrackedNote(keyId);
    }

    for (const keyId of sustainedKeyIds) {
      if (!activeKeyIds.includes(keyId)) {
        this.stopTrackedNote(keyId);
      }
    }

    this.resetKeyState();
  }

  // Release only the notes that are hanging solely because sustain was active.
  private releaseSustainedNotes() {
    const sustainedKeyIds = Object.keys(this.sustainedKeyIds());

    for (const keyId of sustainedKeyIds) {
      if ((this.activeKeyPressCounts()[keyId] ?? 0) > 0) {
        continue;
      }

      this.stopTrackedNote(keyId);
    }

    this.clearSustainState();
  }

  // Generate piano keys and black-key positions from the selected layout preset.
  private createKeys(layout: KeyboardLayoutConfig) {
    const keys: PianoKey[] = [];

    for (let offset = 0; offset < layout.keyCount; offset += 1) {
      const midi = layout.startMidi + offset;
      const semitoneIndex = midi % 12;
      const noteName = NOTE_NAMES[semitoneIndex];
      const octave = Math.floor(midi / 12) - 1;
      const shortcut = layout.shortcuts[offset];

      keys.push({
        id: `${noteName.toLowerCase().replace('#', 's')}${octave}`,
        note: `${noteName}${octave}`,
        frequency: this.frequencyFromMidi(midi),
        shortcut,
        type: BLACK_NOTE_INDICES.has(semitoneIndex) ? 'black' : 'white',
      });
    }

    const whiteKeyCount = keys.filter((key) => key.type === 'white').length;
    let whiteIndex = 0;

    return keys.map((key) => {
      if (key.type === 'white') {
        whiteIndex += 1;
        return key;
      }

      return {
        ...key,
        positionPercent: (whiteIndex / whiteKeyCount) * 100,
      };
    });
  }

  // Convert a MIDI note number into its frequency in hertz.
  private frequencyFromMidi(midi: number) {
    return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
  }

  // Start timing a note only while active recording is running.
  private recordNoteStart(key: PianoKey) {
    if (this.recordingState() !== 'recording') {
      return;
    }

    this.activeRecordingStarts.set(key.id, performance.now());
  }

  // Close a timed note event and store it in the recording buffer.
  private recordNoteEnd(keyId: string) {
    const startedAtMs = this.activeRecordingStarts.get(keyId);
    if (startedAtMs === undefined) {
      return;
    }

    this.activeRecordingStarts.delete(keyId);
    this.finishRecordedEvent(keyId, performance.now(), startedAtMs);
  }

  // Finalize a recorded note with its duration and note metadata.
  private finishRecordedEvent(keyId: string, endedAtMs: number, startedAtMs: number) {
    const key = this.findKeyById(keyId);
    if (!key) {
      return;
    }

    this.recordedEvents.update((events) => [
      ...events,
      {
        keyId,
        note: key.note,
        frequency: key.frequency,
        startedAtMs,
        durationMs: Math.max(0, endedAtMs - startedAtMs),
      },
    ]);
  }

  // Start a note voice with a short attack and sustain envelope.
  private playTone(key: PianoKey) {
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const normalizedVolume = this.getNormalizedVolume();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(key.frequency, context.currentTime);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      this.getPeakGain(normalizedVolume),
      context.currentTime + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      this.getSustainGain(normalizedVolume),
      context.currentTime + 0.12,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();

      const activeVoice = this.activeVoices.get(key.id);
      if (activeVoice?.oscillator === oscillator) {
        this.activeVoices.delete(key.id);
      }
    };

    oscillator.start();

    this.activeVoices.set(key.id, { oscillator, gain });
  }

  // Play a short accented or unaccented metronome tick.
  private playMetronomeTick(isAccent: boolean) {
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const normalizedVolume = this.getNormalizedVolume();
    const now = context.currentTime;

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(isAccent ? 1320 : 880, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.1 * normalizedVolume, 0.0001), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.08);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  // Normalize the UI volume slider into a safe non-zero gain multiplier.
  private getNormalizedVolume() {
    return Math.max(this.volume() / 100, 0.0001);
  }

  // Compute the attack peak gain for a piano note envelope.
  private getPeakGain(normalizedVolume: number) {
    return Math.max(0.16 * normalizedVolume, 0.0001);
  }

  // Compute the steady sustain gain for a piano note envelope.
  private getSustainGain(normalizedVolume: number) {
    return Math.max(0.1 * normalizedVolume, 0.0001);
  }

  // Fade out and stop the active oscillator for a note.
  private stopTone(keyId: string) {
    if (!this.audioContext) {
      return;
    }

    const activeVoice = this.activeVoices.get(keyId);
    if (!activeVoice) {
      return;
    }

    const now = this.audioContext.currentTime;

    activeVoice.gain.gain.cancelScheduledValues(now);
    activeVoice.gain.gain.setValueAtTime(Math.max(activeVoice.gain.gain.value, 0.0001), now);
    activeVoice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    activeVoice.oscillator.stop(now + 0.14);
  }

  // Apply a boolean sustain source change and release notes only when sustain fully turns off.
  private updateSustainSource(currentValue: boolean, nextValue: boolean, apply: () => void) {
    if (currentValue === nextValue) {
      return;
    }

    const wasEnabled = this.sustainEnabled();
    apply();

    if (wasEnabled && !this.sustainEnabled()) {
      this.releaseSustainedNotes();
    }
  }

  // Stop audio and recording bookkeeping for a note together.
  private stopTrackedNote(keyId: string) {
    this.recordNoteEnd(keyId);
    this.stopTone(keyId);
  }

  // Create a new flag map with one key switched on.
  private addKeyFlag(source: Record<string, true>, keyId: string) {
    return {
      ...source,
      [keyId]: true as const,
    } satisfies Record<string, true>;
  }

  // Create a new flag map with one key removed.
  private removeKeyFlag(source: Record<string, true>, keyId: string) {
    if (!source[keyId]) {
      return source;
    }

    const nextSource = { ...source };
    delete nextSource[keyId];
    return nextSource;
  }

  // Remove a pressed-key counter entry once its stack reaches zero.
  private removeCountEntry(source: Record<string, number>, keyId: string) {
    const nextSource = { ...source };
    delete nextSource[keyId];
    return nextSource;
  }

  // Clear the two sustain-only maps together.
  private clearSustainState() {
    this.sustainedKeyIds.set({});
    this.sustainCancelledKeyIds.set({});
  }

  // Reset all transient key state maps after a hard stop.
  private resetKeyState() {
    this.activeKeyPressCounts.set({});
    this.clearSustainState();
  }

  // Lazily create and resume the shared audio context used by notes and metronome.
  private getAudioContext() {
    const AudioContextCtor =
      globalThis.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextCtor) {
      return undefined;
    }

    const context = this.audioContext ?? new AudioContextCtor();
    this.audioContext = context;

    if (context.state === 'suspended') {
      void context.resume();
    }

    return context;
  }
}
