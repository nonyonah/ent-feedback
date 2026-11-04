"use client";

import * as React from "react";
import { useProject } from "@/components/feedback/project-provider";
import {
  type FeedbackComment,
  type FeedbackItemData,
  type FeedbackStatus,
  seedFeedback,
} from "@/lib/feedback-data";

type NewFeedbackInput = {
  title: string;
  description: string;
  email?: string;
};

type FeedbackContextValue = {
  items: FeedbackItemData[];
  vote: (id: string) => void;
  addFeedback: (input: NewFeedbackInput) => FeedbackItemData;
  addComment: (itemId: string, body: string) => void;
  toggleCommentLike: (itemId: string, commentId: string) => void;
  updateStatus: (id: string, status: FeedbackStatus) => void;
  deleteItem: (id: string) => void;
};

const FeedbackContext = React.createContext<FeedbackContextValue | null>(null);

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { activeBoard } = useProject();
  const boardId = activeBoard?.id ?? "";
  const [items, setItems] =
    React.useState<FeedbackItemData[]>(seedFeedback);

  const vote = React.useCallback((id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              voted: !item.voted,
              votes: item.votes + (item.voted ? -1 : 1),
            }
          : item,
      ),
    );
  }, []);

  const addFeedback = React.useCallback(
    (input: NewFeedbackInput): FeedbackItemData => {
      if (!boardId) throw new Error("Create a feedback board before adding an idea.");
      const item: FeedbackItemData = {
        id: `idea-${Date.now()}`,
        boardId,
        title: input.title.trim(),
        description: input.description.trim(),
        votes: 1,
        voted: true,
        status: "open",
        author: "You",
        initials: initialsFor("You"),
        createdAt: "Just now",
        createdOrder: Date.now(),
        comments: [],
      };

      setItems((current) => [item, ...current]);
      return item;
    },
    [boardId],
  );

  const addComment = React.useCallback((itemId: string, body: string) => {
    const comment: FeedbackComment = {
      id: `comment-${Date.now()}`,
      author: "You",
      initials: initialsFor("You"),
      time: "Just now",
      body: body.trim(),
      kind: "user",
    };

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, comments: [...item.comments, comment] }
          : item,
      ),
    );
  }, []);

  const toggleCommentLike = React.useCallback((itemId: string, commentId: string) => {
    setItems((current) => current.map((item) => item.id !== itemId ? item : {
      ...item,
      comments: item.comments.map((comment) => comment.id !== commentId ? comment : {
        ...comment,
        liked: !comment.liked,
        likes: Math.max(0, (comment.likes ?? 0) + (comment.liked ? -1 : 1)),
      }),
    }));
  }, []);

  const updateStatus = React.useCallback(
    (id: string, status: FeedbackStatus) => {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id || item.status === status) {
            return item;
          }

          return { ...item, status };
        }),
      );
    },
    [],
  );

  const deleteItem = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const boardItems = React.useMemo(() => items.filter(item => (item.boardId ?? "product") === boardId), [items, boardId]);
  const value = React.useMemo<FeedbackContextValue>(
    () => ({
      items: boardItems,
      vote,
      addFeedback,
      addComment,
      toggleCommentLike,
      updateStatus,
      deleteItem,
    }),
    [boardItems, vote, addFeedback, addComment, toggleCommentLike, updateStatus, deleteItem],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = React.useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider.");
  }
  return context;
}
