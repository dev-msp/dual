export const Player = (props: {
  ref: (el: HTMLAudioElement) => void;
  onPlayPause: () => void;
}) => {
  return (
    <div
      id="player"
      // class="mx-auto mt-4 grid h-16 max-w-max min-w-2/4 overflow-hidden rounded-[20px] p-2"
      // style={{
      //   "grid-template-columns": "repeat(5, 1fr)",
      //   "grid-template-rows": "1fr min-content",
      // }}
      class="player"
    >
      <audio ref={props.ref} class="hidden" preload="metadata" />
      <div
        data-action-play-pause
        role="button"
        // TODO use attrs to select
        // class="col-3 row-1 size-12 place-self-center"
      >
        <svg
          // class="size-full"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Play/Pause"
          tabindex={1}
          onClick={props.onPlayPause}
        >
          <circle
            // class="primary stroke-alt!"
            cx="50"
            cy="50"
            r="48"
          />
          {/* triangle */}
          <path
            // class="fill-primary"
            d="M 40,30 L 40,70 L 70,50 Z"
          />
        </svg>
      </div>
    </div>
  );
};
