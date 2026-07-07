export interface PianoKey {
  id: string;
  note: string;
  frequency: number;
  shortcut?: string;
  type: PianoKeyType;
  positionPercent?: number;
}
type PianoKeyType = 'white' | 'black';
