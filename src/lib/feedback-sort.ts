import type { FeedbackItemData } from "@/lib/feedback-data";

export const FEEDBACK_SORT_OPTIONS = [
  { label: "Top", value: "top" },
  { label: "Trending", value: "trending" },
  { label: "Newest", value: "newest" },
];

/** Conversation counts twice, so discussion-heavy requests can rise alongside voted posts. */
export function trendingScore(item: FeedbackItemData): number {
  return item.votes + item.comments.length * 2;
}

/** Top fifth of each board, including ties, with enough activity to avoid empty-board noise. */
export function getTrendingIds(items: readonly FeedbackItemData[]): ReadonlySet<string> {
  const boards = new Map<string, FeedbackItemData[]>();
  for (const item of items) {
    const key = item.boardId ?? "default";
    const group = boards.get(key) ?? [];
    group.push(item);
    boards.set(key, group);
  }
  const ids = new Set<string>();
  for (const group of boards.values()) {
    const ranked = [...group].sort((a,b) => trendingScore(b)-trendingScore(a));
    const cutoff = trendingScore(ranked[Math.ceil(ranked.length / 5)-1]);
    for (const item of ranked) {
      if ((item.votes >= 5 || item.comments.length >= 3) && trendingScore(item) >= cutoff) ids.add(item.id);
    }
  }
  return ids;
}

export function compareFeedback(sort: string, a: FeedbackItemData, b: FeedbackItemData): number {
  const tie = b.createdOrder - a.createdOrder || b.id.localeCompare(a.id);
  if (sort === "trending") return trendingScore(b) - trendingScore(a) || b.votes-a.votes || tie;
  if (sort === "newest") return tie;
  return b.votes - a.votes || b.comments.length-a.comments.length || tie;
}
