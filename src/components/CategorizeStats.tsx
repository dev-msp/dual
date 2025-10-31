import type { CategorizationStats } from "../stores/categorizeStore";

export interface CategorizeStatsProps {
  stats: CategorizationStats;
  activeBuckets: string[];
}

export const CategorizeStats = (props: CategorizeStatsProps) => {
  return (
    <div class="categorize-stats">
      <div class="categorize-stats__item">
        <span class="categorize-stats__label">Categorized</span>
        <span class="categorize-stats__value">{props.stats.categorized}</span>
      </div>
      <div class="categorize-stats__divider">|</div>
      <div class="categorize-stats__item">
        <span class="categorize-stats__label">Remaining</span>
        <span class="categorize-stats__value">{props.stats.remaining}</span>
      </div>
      <div class="categorize-stats__divider">|</div>
      <div class="categorize-stats__item">
        <span class="categorize-stats__label">Buckets</span>
        <span class="categorize-stats__value">{props.activeBuckets.join(", ")}</span>
      </div>
    </div>
  );
};
