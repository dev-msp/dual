export interface AudioProgressProps {
  currentTime: number;
  duration: number | null;
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const AudioProgress = (props: AudioProgressProps) => {
  return (
    <div class="audio-progress">
      <span class="audio-progress__time">
        {formatTime(props.currentTime)}
      </span>
      {props.duration !== null && (
        <>
          <span class="audio-progress__separator">/</span>
          <span class="audio-progress__duration">
            {formatTime(props.duration)}
          </span>
        </>
      )}
    </div>
  );
};
