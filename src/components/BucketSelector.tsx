import { createSignal, For, Show } from "solid-js";

export interface BucketSelectorProps {
  availableBuckets: string[];
  activeBuckets: string[];
  loading: boolean;
  error: string | null;
  onActiveBucketsChange: (buckets: string[]) => void;
  onNewBucket: (bucket: string) => void;
  onStart: () => void;
}

export const BucketSelector = (props: BucketSelectorProps) => {
  const [newBucketName, setNewBucketName] = createSignal("");

  const handleToggleBucket = (bucket: string) => {
    const isActive = props.activeBuckets.includes(bucket);
    if (isActive) {
      props.onActiveBucketsChange(
        props.activeBuckets.filter((b) => b !== bucket),
      );
    } else {
      props.onActiveBucketsChange([...props.activeBuckets, bucket]);
    }
  };

  const handleAddBucket = () => {
    const trimmed = newBucketName().trim();
    if (trimmed && !props.availableBuckets.includes(trimmed)) {
      props.onNewBucket(trimmed);
      setNewBucketName("");
    }
  };

  return (
    <div class="bucket-selector">
      <div class="bucket-selector__content">
        <h1 class="bucket-selector__title">Categorize Tracks</h1>

        <Show when={props.error}>
          <div class="bucket-selector__error" role="alert">
            {props.error}
          </div>
        </Show>

        {/* Bucket Selection */}
        <div class="bucket-selector__section">
          <h2 class="bucket-selector__section-title">Select Buckets</h2>

          <Show when={props.availableBuckets.length > 0}>
            <div class="bucket-selector__buckets">
              <For each={props.availableBuckets}>
                {(bucket) => (
                  <label class="bucket-selector__bucket-label">
                    <input
                      type="checkbox"
                      class="bucket-selector__bucket-checkbox"
                      checked={props.activeBuckets.includes(bucket)}
                      onChange={() => handleToggleBucket(bucket)}
                      disabled={props.loading}
                    />
                    <span class="bucket-selector__bucket-name">{bucket}</span>
                  </label>
                )}
              </For>
            </div>
          </Show>

          <Show when={props.availableBuckets.length === 0}>
            <p class="bucket-selector__empty">
              No buckets yet. Create one below.
            </p>
          </Show>
        </div>

        {/* New Bucket Input */}
        <div class="bucket-selector__section">
          <h2 class="bucket-selector__section-title">Create New Bucket</h2>
          <div class="bucket-selector__new-bucket">
            <input
              type="text"
              class="bucket-selector__input"
              placeholder="e.g., mood, era, genre"
              value={newBucketName()}
              onInput={(e) => setNewBucketName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddBucket();
                }
              }}
              disabled={props.loading}
            />
            <button
              class="btn-primary bucket-selector__add-btn"
              onClick={handleAddBucket}
              disabled={!newBucketName().trim() || props.loading}
            >
              Add Bucket
            </button>
          </div>
        </div>

        {/* Start Button */}
        <div class="bucket-selector__actions">
          <button
            class="btn-primary bucket-selector__start-btn"
            onClick={props.onStart}
            disabled={props.activeBuckets.length === 0 || props.loading}
          >
            {props.loading ? "Loading..." : "Start Categorizing"}
          </button>
        </div>
      </div>
    </div>
  );
};
