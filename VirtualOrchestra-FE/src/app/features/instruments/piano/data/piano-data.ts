import { PianoKey } from '../models/piano-key';

export const PIANO_KEYS: PianoKey[] = [
  { id: 'c4', note: 'C4', frequency: 261.63, shortcut: 'A', type: 'white' },
  {
    id: 'cs4',
    note: 'C#4',
    frequency: 277.18,
    shortcut: 'W',
    type: 'black',
    positionPercent: 10.1,
  },
  { id: 'd4', note: 'D4', frequency: 293.66, shortcut: 'S', type: 'white' },
  {
    id: 'ds4',
    note: 'D#4',
    frequency: 311.13,
    shortcut: 'E',
    type: 'black',
    positionPercent: 24.35,
  },
  { id: 'e4', note: 'E4', frequency: 329.63, shortcut: 'D', type: 'white' },
  { id: 'f4', note: 'F4', frequency: 349.23, shortcut: 'F', type: 'white' },
  {
    id: 'fs4',
    note: 'F#4',
    frequency: 369.99,
    shortcut: 'T',
    type: 'black',
    positionPercent: 52.95,
  },
  { id: 'g4', note: 'G4', frequency: 392, shortcut: 'G', type: 'white' },
  { id: 'gs4', note: 'G#4', frequency: 415.3, shortcut: 'Y', type: 'black', positionPercent: 67.2 },
  { id: 'a4', note: 'A4', frequency: 440, shortcut: 'H', type: 'white' },
  {
    id: 'as4',
    note: 'A#4',
    frequency: 466.16,
    shortcut: 'U',
    type: 'black',
    positionPercent: 81.45,
  },
  { id: 'b4', note: 'B4', frequency: 493.88, shortcut: 'J', type: 'white' },
];
