import { useNavigate } from "@solidjs/router";
import { createEffect, Show, createSignal } from "solid-js";
import z from "zod";

import { BucketSelector } from "../components/BucketSelector";
import { CategorizeCard } from "../components/CategorizeCard";
import { CategorizeStats } from "../components/CategorizeStats";
import { useKeyboard } from "../hooks/useKeyboard";
import {
  categorizeStore,
  setAvailableBuckets,
  setActiveBuckets,
  setCurrentTrack,
  setBucketValues,
  setCurrentValue,
  setLoading,
  setError,
  recordCategorization,
  setAlbumMode,
  setAlbumTrackCount,
  trackSubset,
} from "../stores/categorizeStore";

const trackResponseSchema = z.object({
  success: z.boolean(),
  track: trackSubset.nullable().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

const bucketsResponseSchema = z.object({
  success: z.boolean(),
  buckets: z.array(z.string()),
  error: z.string().optional(),
});

const bucketValuesResponseSchema = z.object({
  success: z.boolean(),
  bucket: z.string(),
  values: z.array(z.string()),
  error: z.string().optional(),
});

export const Categorize = () => {
  const navigate = useNavigate();
  const [sessionStarted, setSessionStarted] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  // Fetch available buckets on mount
  createEffect(() => {
    const fetchBuckets = async () => {
      try {
        const response = await fetch("/api/buckets");
        const data: unknown = await response.json();
        const parsed = bucketsResponseSchema.parse(data);
        if (parsed.success) {
          setAvailableBuckets(parsed.buckets);
        }
      } catch (err) {
        console.error("Error fetching buckets:", err);
      }
    };
    fetchBuckets().catch((err) => {
      console.error("Error in fetchBuckets:", err);
    });
  });

  const startCategorizing = async () => {
    setSessionStarted(true);
    setErrorMessage(null);
    setLoading(true);

    try {
      // Fetch values for each active bucket
      for (const bucket of categorizeStore.activeBuckets) {
        const response = await fetch(
          `/api/buckets/values?bucket=${encodeURIComponent(bucket)}`,
        );
        const data: unknown = await response.json();
        const parsed = bucketValuesResponseSchema.parse(data);
        if (parsed.success) {
          setBucketValues(bucket, parsed.values);
        }
      }

      // Fetch first track
      await fetchNextTrack();
    } catch (err) {
      console.error("Error starting categorization:", err);
      setErrorMessage("Failed to start categorization");
      setSessionStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbumTrackCount = async (albumId: number, albumHash?: string) => {
    try {
      // Prefer albumHash if available for better consistency
      const queryParam = albumHash
        ? `albumHash=${encodeURIComponent(albumHash)}`
        : `albumId=${encodeURIComponent(albumId)}`;
      const response = await fetch(`/api/albums/track-count?${queryParam}`);
      const data: unknown = await response.json();
      if (
        data &&
        typeof data === "object" &&
        "count" in data &&
        typeof data.count === "number"
      ) {
        setAlbumTrackCount(data.count);
      }
    } catch (err) {
      console.error("Error fetching album track count:", err);
      setAlbumTrackCount(null);
    }
  };

  const fetchNextTrack = async () => {
    setLoading(true);
    try {
      const bucketsParam = categorizeStore.activeBuckets.join(",");
      const response = await fetch(
        `/api/categorize/next?buckets=${encodeURIComponent(bucketsParam)}`,
      );
      const data: unknown = await response.json();
      const parsed = trackResponseSchema.parse(data);

      if (parsed.success) {
        if (parsed.track) {
          setCurrentTrack(parsed.track);
          setError(null);
          // Fetch album track count if track has an album_id or albumHash
          if (parsed.track.album_id) {
            await fetchAlbumTrackCount(parsed.track.album_id, parsed.track.albumHash);
          } else {
            setAlbumTrackCount(null);
          }
        } else {
          // No more tracks
          setCurrentTrack(null);
          setErrorMessage("All tracks categorized!");
        }
      } else {
        setErrorMessage(parsed.error || "Failed to fetch next track");
      }
    } catch (err) {
      console.error("Error fetching next track:", err);
      setErrorMessage("Failed to fetch next track");
    } finally {
      setLoading(false);
    }
  };

  const subCategorizationResponseSchema = z.object({
    success: z.boolean(),
    tracksUpdated: z.number().optional(),
    error: z.string().optional(),
  });

  const submitCategorization = async () => {
    const track = categorizeStore.currentTrack;
    if (!track) return;

    setLoading(true);
    try {
      // Determine endpoint and payload based on album mode
      const isAlbumMode = categorizeStore.albumMode && track.album_id;
      const endpoint = isAlbumMode
        ? "/api/categorize/album"
        : "/api/categorize";
      const payload = isAlbumMode
        ? {
            albumId: track.album_id,
            albumHash: track.albumHash,
            categories: Object.fromEntries(
              categorizeStore.activeBuckets.map((bucket) => [
                bucket,
                categorizeStore.currentValues[bucket] || "",
              ]),
            ),
          }
        : {
            trackId: track.id,
            categories: Object.fromEntries(
              categorizeStore.activeBuckets.map((bucket) => [
                bucket,
                categorizeStore.currentValues[bucket] || "",
              ]),
            ),
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = subCategorizationResponseSchema.parse(await response.json());
      if (data.success) {
        // For album mode, record multiple categorizations
        if (isAlbumMode && data.tracksUpdated) {
          for (let i = 0; i < data.tracksUpdated; i++) {
            recordCategorization();
          }
        } else {
          recordCategorization();
        }
        await fetchNextTrack();
      } else {
        setErrorMessage(data.error || "Failed to save categorization");
      }
    } catch (err) {
      console.error("Error submitting categorization:", err);
      setErrorMessage("Failed to save categorization");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await fetchNextTrack();
  };

  const handleQuit = () => {
    navigate("/");
  };

  const handleValueChange = (bucket: string, value: string) => {
    setCurrentValue(bucket, value);
  };

  const handleAlbumModeToggle = (enabled: boolean) => {
    setAlbumMode(enabled);
  };

  const handleAlbumModeKeyboard = () => {
    setAlbumMode(!categorizeStore.albumMode);
  };

  // Keyboard shortcuts
  useKeyboard({
    onSubmit: () => void submitCategorization(),
    onSkip: () => void handleSkip(),
    onQuit: handleQuit,
    onAlbumMode: handleAlbumModeKeyboard,
  });

  return (
    <div class="categorize-container">
      <Show
        when={!sessionStarted()}
        fallback={
          <div class="categorize-view">
            <Show when={categorizeStore.currentTrack}>
              <CategorizeCard
                track={categorizeStore.currentTrack!}
                buckets={categorizeStore.activeBuckets}
                bucketValues={categorizeStore.bucketValues}
                currentValues={categorizeStore.currentValues}
                loading={categorizeStore.loading}
                albumMode={categorizeStore.albumMode}
                albumTrackCount={categorizeStore.albumTrackCount}
                onValueChange={(bucket, value) =>
                  handleValueChange(bucket, value)
                }
                onSubmit={() => void submitCategorization()}
                onSkip={() => void handleSkip()}
                onAlbumModeChange={handleAlbumModeToggle}
              />
              <CategorizeStats
                stats={categorizeStore.stats}
                activeBuckets={categorizeStore.activeBuckets}
              />
            </Show>

            <Show
              when={!categorizeStore.currentTrack && !categorizeStore.loading}
            >
              <div class="categorize-view__message">
                <Show
                  when={errorMessage()}
                  fallback={<p>No more tracks to categorize</p>}
                >
                  <p>{errorMessage()}</p>
                </Show>
                <button class="btn-primary" onClick={handleQuit}>
                  Return Home
                </button>
              </div>
            </Show>

            <Show
              when={categorizeStore.loading && !categorizeStore.currentTrack}
            >
              <div class="categorize-view__loading">Loading track...</div>
            </Show>
          </div>
        }
      >
        <BucketSelector
          availableBuckets={categorizeStore.availableBuckets}
          activeBuckets={categorizeStore.activeBuckets}
          loading={categorizeStore.loading}
          error={errorMessage()}
          onActiveBucketsChange={setActiveBuckets}
          onNewBucket={(bucket) => {
            // Add new bucket to active buckets and fetch its values
            const newBuckets = [...categorizeStore.activeBuckets, bucket];
            setActiveBuckets(newBuckets);
            setAvailableBuckets([...categorizeStore.availableBuckets, bucket]);
            setBucketValues(bucket, []);
          }}
          onStart={() => void startCategorizing()}
        />
      </Show>
    </div>
  );
};
