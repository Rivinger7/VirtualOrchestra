import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
  LucideAngularModule,
  Volume2,
  VolumeX,
  Metronome,
  Music4,
  Play,
  CirclePause,
  Square,
} from 'lucide-angular';

export type RecordingState = 'stopped' | 'recording' | 'paused';

export interface ControlPanelOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-instrument-control-panel',
  imports: [
    SelectModule,
    SliderModule,
    FormsModule,
    ToggleSwitchModule,
    LucideAngularModule,
    NgClass,
  ],
  templateUrl: './instrument-control-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentControlPanel {
  readonly typeOptions = input.required<ControlPanelOption[]>();
  readonly selectedType = input.required<string>();
  readonly volume = input.required<number>();
  readonly sustainEnabled = input.required<boolean>();
  readonly metronomeEnabled = input.required<boolean>();
  readonly metronomeBpm = input.required<number>();
  readonly recordTime = input.required<number>();
  readonly recordingState = input.required<RecordingState>();

  readonly selectedTypeChange = output<string>();
  readonly volumeChange = output<number>();
  readonly toggleMuteRequested = output<void>();
  readonly sustainEnabledChange = output<boolean>();
  readonly metronomeEnabledChange = output<boolean>();
  readonly metronomeBpmChange = output<number>();
  readonly togglePlaybackRequested = output<void>();
  readonly stopRecordingRequested = output<void>();

  // Emit the selected keyboard layout to the parent container.
  onSelectedTypeChange(value: string) {
    this.selectedTypeChange.emit(value);
  }

  isMuted = computed(() => this.volume() === 0);
  volumeIcon = computed(() => (this.isMuted() ? VolumeX : Volume2));

  // Emit volume slider changes to the parent controller.
  onVolumeChange(value: number) {
    this.volumeChange.emit(value);
  }

  // Request a mute toggle without owning the actual volume state.
  toggleMute() {
    this.toggleMuteRequested.emit();
  }

  readonly sustainIcon = Music4;

  // Toggle the latched sustain state in the parent controller.
  toggleSustain() {
    this.sustainEnabledChange.emit(!this.sustainEnabled());
  }

  readonly metronomeIcon = Metronome;

  // Toggle metronome playback in the parent controller.
  toggleMetronome() {
    this.metronomeEnabledChange.emit(!this.metronomeEnabled());
  }

  // Emit metronome tempo changes to the parent controller.
  onBpmChange(value: number) {
    this.metronomeBpmChange.emit(value);
  }

  readonly playRecorderIcon = Play;
  readonly pauseRecorderIcon = CirclePause;
  readonly stopRecorderIcon = Square;

  playbackIcon = computed(() =>
    this.recordingState() === 'recording' ? this.pauseRecorderIcon : this.playRecorderIcon,
  );

  // Return disabled classes for the stop action when nothing is recording.
  isStopRecordingClass() {
    if (this.recordingState() === 'stopped') {
      return 'disabled opacity-50 cursor-not-allowed';
    } else {
      return '';
    }
  }

  // Format the elapsed record time into mm:ss for the status display.
  formattedRecordTime = computed(() => {
    const totalSeconds = this.recordTime();

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // Emit play or pause requests for the recorder.
  togglePlayback() {
    this.togglePlaybackRequested.emit();
  }

  // Emit a hard stop request for the recorder.
  stopRecording() {
    this.stopRecordingRequested.emit();
  }
}
