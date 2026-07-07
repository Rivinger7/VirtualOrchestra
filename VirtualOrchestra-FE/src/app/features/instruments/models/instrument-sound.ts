export interface ActiveVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

export interface RecordedNoteEvent {
  keyId: string;
  note: string;
  frequency: number;
  startedAtMs: number;
  durationMs?: number;
}

export type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};
