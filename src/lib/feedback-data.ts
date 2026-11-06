export const FEEDBACK_CATEGORIES = {feedback: "Feedback", bug: "Bug report", feature_request: "Feature request"} as const;
export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES;
export type FeedbackTag = {id:string;name:string};

export type FeedbackStatus = "open" | "planned" | "in-progress" | "shipped";

export type FeedbackComment = {
  id: string;
  author: string;
  avatarUrl?: string;
  initials: string;
  time: string;
  body: string;
  images?: string[];
  kind: "user" | "owner";
  likes?: number;
  liked?: boolean;
};

export type FeedbackItemData = {
  id: string;
  boardId?: string;
  category?: FeedbackCategory;
  canEditCategory?: boolean;
  tags?: FeedbackTag[];
  title: string;
  description: string;
  images?: string[];
  votes: number;
  voted: boolean;
  status: FeedbackStatus;
  author: string;
  avatarUrl?: string;
  initials: string;
  createdAt: string;
  createdOrder: number;
  pinned?: boolean;
  following?: boolean;
  comments: FeedbackComment[];
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  planned: "Planned",
  "in-progress": "In Progress",
  shipped: "Shipped",
};

export const STATUS_ORDER: FeedbackStatus[] = [
  "open",
  "planned",
  "in-progress",
  "shipped",
];

export const seedFeedback: FeedbackItemData[] = [
  {
    id: "dark-mode-widget",
    title: "Dark mode for the feedback widget",
    description:
      "Our app is dark by default, so the bright widget stands out. A theme option that follows the host app would make it feel native.",
    votes: 128,
    voted: false,
    status: "planned",
    author: "Jordan Lee",
    initials: "JL",
    createdAt: "2h ago",
    createdOrder: 10,
    pinned: true,
    comments: [
      {
        id: "c-1",
        author: "Maya Chen",
        initials: "MC",
        time: "1h ago",
        body: "This is on the roadmap. We are adding a theme prop that mirrors the host app automatically.",
        kind: "owner",
      },
      {
        id: "c-3",
        author: "Jordan Lee",
        initials: "JL",
        time: "2h ago",
        body: "A simple light, dark, and system option would cover every case for us.",
        kind: "user",
      },
      {
        id: "c-4",
        author: "Sam Chen",
        initials: "SC",
        time: "3h ago",
        body: "Same here. We had to hide the launcher on our settings screens because of the contrast.",
        kind: "user",
      },
    ],
  },
  {
    id: "slack-status-notifications",
    title: "Send a Slack message when an idea ships",
    description:
      "We want to close the loop with customers automatically. A Slack notification with the idea title and a link would save us a manual step every release.",
    votes: 96,
    voted: false,
    status: "in-progress",
    author: "Priya Shah",
    initials: "PS",
    createdAt: "5h ago",
    createdOrder: 9,
    comments: [
      {
        id: "c-5",
        author: "Maya Chen",
        initials: "MC",
        time: "2h ago",
        body: "We are testing this with a few teams now. It will support Slack and Discord first.",
        kind: "owner",
      },
      {
        id: "c-6",
        author: "Priya Shah",
        initials: "PS",
        time: "4h ago",
        body: "Discord would be a bonus for our community server.",
        kind: "user",
      },
    ],
  },
  {
    id: "custom-statuses",
    title: "Custom statuses for each board",
    description:
      "Every team has its own workflow. Let us rename and add statuses, such as Exploring or Needs review, without losing the default four.",
    votes: 74,
    voted: false,
    status: "planned",
    author: "Marco Ruiz",
    initials: "MR",
    createdAt: "1d ago",
    createdOrder: 8,
    comments: [
      {
        id: "c-7",
        author: "Maya Chen",
        initials: "MC",
        time: "20h ago",
        body: "Custom statuses are planned for the next cycle. Colors will stay accessible by default.",
        kind: "owner",
      },
    ],
  },
  {
    id: "csv-export",
    title: "Export feedback and votes to CSV",
    description:
      "We report on product requests in a spreadsheet. An export with title, status, votes, author, and date would make that easy.",
    votes: 52,
    voted: false,
    status: "open",
    author: "Sam Chen",
    initials: "SC",
    createdAt: "2d ago",
    createdOrder: 7,
    comments: [
      {
        id: "c-8",
        author: "Sam Chen",
        initials: "SC",
        time: "1d ago",
        body: "A scheduled export would be even better than a manual download.",
        kind: "user",
      },
    ],
  },
  {
    id: "guest-voting",
    title: "Let people vote without creating an account",
    description:
      "Requiring a sign-in before voting adds friction. A verified email vote or a one-click guest vote would lift participation.",
    votes: 210,
    voted: false,
    status: "shipped",
    author: "Alex Kim",
    initials: "AK",
    createdAt: "4d ago",
    createdOrder: 6,
    comments: [
      {
        id: "c-9",
        author: "Maya Chen",
        initials: "MC",
        time: "3d ago",
        body: "Shipped. Guest votes are deduplicated per email and can be disabled per board.",
        kind: "owner",
      },
      {
        id: "c-10",
        author: "Alex Kim",
        initials: "AK",
        time: "3d ago",
        body: "This is great, thank you. Already seeing more responses.",
        kind: "user",
      },
    ],
  },
  {
    id: "merge-duplicates",
    title: "Merge duplicate ideas from the dashboard",
    description:
      "When two posts describe the same request, we want to merge them and keep the combined vote count instead of closing one.",
    votes: 88,
    voted: false,
    status: "planned",
    author: "Nina Patel",
    initials: "NP",
    createdAt: "3d ago",
    createdOrder: 5,
    comments: [
      {
        id: "c-11",
        author: "Maya Chen",
        initials: "MC",
        time: "2d ago",
        body: "Merge is coming with the new inbox. Votes and comments will move with the idea.",
        kind: "owner",
      },
    ],
  },
  {
    id: "weekly-digest",
    title: "Weekly digest email for board owners",
    description:
      "A Monday summary of new ideas, top votes, and status changes would help us stay on top of feedback without opening the dashboard.",
    votes: 41,
    voted: false,
    status: "open",
    author: "Theo Martin",
    initials: "TM",
    createdAt: "5d ago",
    createdOrder: 4,
    comments: [],
  },
  {
    id: "public-roadmap",
    title: "A public roadmap view",
    description:
      "Show planned and shipped ideas on a simple timeline so customers can see what is coming next without reading every post.",
    votes: 164,
    voted: false,
    status: "shipped",
    author: "Riley Johnson",
    initials: "RJ",
    createdAt: "1w ago",
    createdOrder: 3,
    comments: [
      {
        id: "c-12",
        author: "Maya Chen",
        initials: "MC",
        time: "6d ago",
        body: "Live for every board. Turn it on in Settings, then share the roadmap link.",
        kind: "owner",
      },
    ],
  },
  {
    id: "pin-important-posts",
    title: "Pin important posts to the top",
    description:
      "Pinned posts would let us keep a welcome note or a high-priority request above the rest of the list.",
    votes: 33,
    voted: false,
    status: "open",
    author: "Casey Wu",
    initials: "CW",
    createdAt: "1w ago",
    createdOrder: 2,
    comments: [],
  },
  {
    id: "intercom-import",
    title: "Import feedback from Intercom",
    description:
      "We already collect requests in Intercom conversations. Importing them would let us consolidate everything in one board.",
    votes: 61,
    voted: false,
    status: "planned",
    author: "Dana Brooks",
    initials: "DB",
    createdAt: "2w ago",
    createdOrder: 1,
    comments: [],
  },
];
