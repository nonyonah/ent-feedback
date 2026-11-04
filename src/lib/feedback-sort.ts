import type { FeedbackItemData } from "@/lib/feedback-data";

export const FEEDBACK_SORT_OPTIONS = [
  { label: "Top", value: "top" },
  { label: "Trending", value: "trending" },
  { label: "Newest", value: "newest" },
];

// Prototype heuristic: engagement decays with post age. Production should use
// timestamps and recent vote/comment events rather than relative display labels.
export function trendingScore(item: FeedbackItemData): number {
  const age = item.createdAt.match(/^(\d+)(h|d|w)/);
  const hours = age ? Number(age[1]) * ({ h: 1, d: 24, w: 168 }[age[2]] ?? 1) : 0;
  return (item.votes + item.comments.length * 2) / Math.pow(hours + 2, 1.3);
}

export function compareFeedback(sort: string, a: FeedbackItemData, b: FeedbackItemData): number {
  const tie = b.createdOrder - a.createdOrder || b.id.localeCompare(a.id);
  if (sort === "trending") return trendingScore(b) - trendingScore(a) || tie;
  if (sort === "newest") return tie;
  return b.votes - a.votes || tie;
}
