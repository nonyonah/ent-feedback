import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceRole = pgEnum("workspace_role", ["owner", "admin", "member"]);
export const membershipStatus = pgEnum("membership_status", ["active", "suspended"]);
export const invitationState = pgEnum("invitation_state", ["pending", "accepted", "cancelled", "expired"]);
export const feedbackStatus = pgEnum("feedback_status", ["open", "planned", "in-progress", "shipped"]);
export const attachmentStatus = pgEnum("attachment_status", ["pending", "attached", "expired"]);
export const widgetDetailsMode = pgEnum("widget_details_mode", ["none", "optional", "required"]);
export const widgetReplyTime = pgEnum("widget_reply_time", ["automatic", "day", "days", "week"]);
export const notificationEventType = pgEnum("notification_event_type", [
  "new_feedback",
  "feedback_comment",
  "comment_reply",
  "comment_reaction",
  "feedback_reaction",
  "status_changed",
]);
export const integrationProvider = pgEnum("integration_provider", ["slack", "discord", "email"]);
export const integrationScope = pgEnum("integration_scope", ["personal", "workspace"]);
export const integrationAuthorizationState = pgEnum("integration_authorization_state", [
  "disconnected",
  "pending",
  "connected",
  "error",
]);
export const workspaceTheme = pgEnum("workspace_theme", ["dynamic", "light", "dark"]);
export const jobStatus = pgEnum("job_status", ["pending", "running", "succeeded", "failed"]);

const handleCheck = (constraintName: string, columnName: string) =>
  check(
    constraintName,
    sql`length(${sql.identifier(columnName)}) between 2 and 64 and ${sql.identifier(columnName)} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
  );

const normalizedEmailCheck = (columnName: string) =>
  check(
    `${columnName}_normalized_check`,
    sql`${sql.identifier(columnName)} = lower(${sql.identifier(columnName)})`,
  );

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    ...timestamps(),
  },
  (table) => [
    unique("users_clerk_user_id_unique").on(table.clerkUserId),
    uniqueIndex("users_email_unique").on(table.email).where(sql`${table.email} is not null`),
    check("users_clerk_user_id_not_empty_check", sql`length(trim(${table.clerkUserId})) > 0`),
    check(
      "users_email_normalized_check",
      sql`${table.email} is null or ${table.email} = lower(${table.email})`,
    ),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    website: text("website"),
    accentColor: text("accent_color").notNull().default("#212529"),
    logoUrl: text("logo_url"),
    theme: workspaceTheme("theme").notNull().default("dynamic"),
    hideAttribution: boolean("hide_attribution").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    unique("workspaces_handle_unique").on(table.handle),
    uniqueIndex("workspaces_name_normalized_unique").on(sql`lower(regexp_replace(btrim(${table.name}), '[[:space:]]+', ' ', 'g'))`),
    handleCheck("workspaces_handle_format_check", "handle"),
    check("workspaces_accent_color_check", sql`${table.accentColor} ~ '^#[0-9a-fA-F]{6}$'`),
  ],
);

export const guestActors = pgTable(
  "guest_actors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("guest_actors_token_hash_unique").on(table.tokenHash),
    unique("guest_actors_id_workspace_id_unique").on(table.id, table.workspaceId),
    index("guest_actors_workspace_id_idx").on(table.workspaceId),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull().default("member"),
    status: membershipStatus("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    unique("workspace_members_workspace_user_unique").on(table.workspaceId, table.userId),
    index("workspace_members_user_id_idx").on(table.userId),
    index("workspace_members_workspace_role_idx").on(table.workspaceId, table.role),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRole("role").notNull().default("member"),
    inviterUserId: uuid("inviter_user_id").references(() => users.id, { onDelete: "set null" }),
    state: invitationState("state").notNull().default("pending"),
    tokenHash: text("token_hash").notNull(),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    unique("invitations_token_hash_unique").on(table.tokenHash),
    uniqueIndex("invitations_pending_workspace_email_unique")
      .on(table.workspaceId, table.email)
      .where(sql`${table.state} = 'pending'`),
    index("invitations_workspace_state_idx").on(table.workspaceId, table.state),
    normalizedEmailCheck("email"),
    check("invitations_role_not_owner_check", sql`${table.role} <> 'owner'`),
  ],
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#737373"),
    emoji: text("emoji"),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    unique("boards_workspace_handle_unique").on(table.workspaceId, table.handle),
    unique("boards_id_workspace_id_unique").on(table.id, table.workspaceId),
    index("boards_workspace_position_idx").on(table.workspaceId, table.position),
    handleCheck("boards_handle_format_check", "handle"),
    check("boards_color_check", sql`${table.color} ~ '^#[0-9a-fA-F]{6}$'`),
    check("boards_position_check", sql`${table.position} >= 0`),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    boardId: uuid("board_id").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    category: text("category").$type<"feedback" | "bug" | "feature_request">().notNull().default("feedback"),
    status: feedbackStatus("status").notNull().default("open"),
    mergedIntoId: uuid("merged_into_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "feedback_board_workspace_fk",
      columns: [table.boardId, table.workspaceId],
      foreignColumns: [boards.id, boards.workspaceId],
    }).onDelete("cascade"),
    unique("feedback_id_workspace_id_unique").on(table.id, table.workspaceId),
    foreignKey({name:'feedback_merged_target_fk',columns:[table.mergedIntoId,table.workspaceId],foreignColumns:[table.id,table.workspaceId]}),
    check('feedback_merge_not_self_check',sql`${table.mergedIntoId} is null or ${table.mergedIntoId} <> ${table.id}`),
    index("feedback_board_created_at_idx").on(table.boardId, table.createdAt),
    index("feedback_board_status_created_at_idx").on(table.boardId, table.status, table.createdAt),
    index("feedback_workspace_created_at_idx").on(table.workspaceId, table.createdAt),
    index("feedback_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.title} || ' ' || ${table.body})`,
    ),
    check("feedback_category_check", sql`${table.category} in ('feedback', 'bug', 'feature_request')`),
    check("feedback_title_not_empty_check", sql`length(trim(${table.title})) between 1 and 200`),
    check("feedback_guest_email_normalized_check", sql`${table.guestEmail} is null or ${table.guestEmail} = lower(${table.guestEmail})`),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    feedbackId: uuid("feedback_id").notNull(),
    parentCommentId: uuid("parent_comment_id"),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "comments_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "comments_parent_comment_fk",
      columns: [table.parentCommentId, table.feedbackId],
      foreignColumns: [table.id, table.feedbackId],
    }).onDelete("cascade"),
    unique("comments_id_workspace_id_unique").on(table.id, table.workspaceId),
    unique("comments_id_feedback_id_unique").on(table.id, table.feedbackId),
    index("comments_feedback_created_at_idx").on(table.feedbackId, table.createdAt),
    check("comments_body_not_empty_check", sql`length(trim(${table.body})) between 1 and 10000`),
    check(
      "comments_guest_email_normalized_check",
      sql`${table.guestEmail} is null or ${table.guestEmail} = lower(${table.guestEmail})`,
    ),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    feedbackId: uuid("feedback_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestActorId: uuid("guest_actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "votes_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "votes_guest_actor_workspace_fk",
      columns: [table.guestActorId, table.workspaceId],
      foreignColumns: [guestActors.id, guestActors.workspaceId],
    }).onDelete("cascade"),
    uniqueIndex("votes_feedback_user_unique")
      .on(table.feedbackId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("votes_feedback_guest_actor_unique")
      .on(table.feedbackId, table.guestActorId)
      .where(sql`${table.guestActorId} is not null`),
    index("votes_feedback_id_idx").on(table.feedbackId),
    index("votes_user_id_idx").on(table.userId),
    check("votes_single_actor_check", sql`num_nonnulls(${table.userId}, ${table.guestActorId}) = 1`),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    feedbackId: uuid("feedback_id"),
    commentId: uuid("comment_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestActorId: uuid("guest_actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "reactions_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "reactions_comment_workspace_fk",
      columns: [table.commentId, table.workspaceId],
      foreignColumns: [comments.id, comments.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "reactions_guest_actor_workspace_fk",
      columns: [table.guestActorId, table.workspaceId],
      foreignColumns: [guestActors.id, guestActors.workspaceId],
    }).onDelete("cascade"),
    uniqueIndex("reactions_feedback_user_unique")
      .on(table.feedbackId, table.userId)
      .where(sql`${table.feedbackId} is not null and ${table.userId} is not null`),
    uniqueIndex("reactions_feedback_guest_actor_unique")
      .on(table.feedbackId, table.guestActorId)
      .where(sql`${table.feedbackId} is not null and ${table.guestActorId} is not null`),
    uniqueIndex("reactions_comment_user_unique")
      .on(table.commentId, table.userId)
      .where(sql`${table.commentId} is not null and ${table.userId} is not null`),
    uniqueIndex("reactions_comment_guest_actor_unique")
      .on(table.commentId, table.guestActorId)
      .where(sql`${table.commentId} is not null and ${table.guestActorId} is not null`),
    index("reactions_feedback_id_idx").on(table.feedbackId),
    index("reactions_comment_id_idx").on(table.commentId),
    check("reactions_single_target_check", sql`num_nonnulls(${table.feedbackId}, ${table.commentId}) = 1`),
    check("reactions_single_actor_check", sql`num_nonnulls(${table.userId}, ${table.guestActorId}) = 1`),
  ],
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    feedbackId: uuid("feedback_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "follows_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    unique("follows_feedback_user_unique").on(table.feedbackId, table.userId),
    index("follows_user_id_idx").on(table.userId),
  ],
);

const attachmentMimeTypes = sql`('image/png', 'image/jpeg', 'image/webp', 'image/gif')`;

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    feedbackId: uuid("feedback_id"),
    commentId: uuid("comment_id"),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    guestActorId: uuid("guest_actor_id"),
    status: attachmentStatus("status").notNull().default("pending"),
    attachedAt: timestamp("attached_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "attachments_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "attachments_comment_workspace_fk",
      columns: [table.commentId, table.workspaceId],
      foreignColumns: [comments.id, comments.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "attachments_guest_actor_workspace_fk",
      columns: [table.guestActorId, table.workspaceId],
      foreignColumns: [guestActors.id, guestActors.workspaceId],
    }).onDelete("cascade"),
    unique("attachments_storage_key_unique").on(table.storageKey),
    index("attachments_feedback_id_idx").on(table.feedbackId),
    index("attachments_comment_id_idx").on(table.commentId),
    index("attachments_status_expires_at_idx").on(table.status, table.expiresAt),
    check("attachments_mime_type_check", sql`${table.mimeType} in ${attachmentMimeTypes}`),
    check("attachments_byte_size_check", sql`${table.byteSize} > 0 and ${table.byteSize} <= 2097152`),
    check("attachments_single_uploader_check", sql`num_nonnulls(${table.uploadedByUserId}, ${table.guestActorId}) = 1`),
    check(
      "attachments_parent_state_check",
      sql`(${table.status} = 'attached' and num_nonnulls(${table.feedbackId}, ${table.commentId}) = 1 and ${table.attachedAt} is not null) or (${table.status} <> 'attached' and ${table.feedbackId} is null and ${table.commentId} is null and ${table.attachedAt} is null)`,
    ),
  ],
);

export const statusHistory = pgTable(
  "status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    feedbackId: uuid("feedback_id").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    previousStatus: feedbackStatus("previous_status"),
    newStatus: feedbackStatus("new_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "status_history_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    index("status_history_feedback_created_at_idx").on(table.feedbackId, table.createdAt),
    check(
      "status_history_changed_check",
      sql`${table.previousStatus} is null or ${table.previousStatus} <> ${table.newStatus}`,
    ),
  ],
);

export const widgetSettings = pgTable(
  "widget_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    boardId: uuid("board_id"),
    enabled: boolean("enabled").notNull().default(true),
    details: widgetDetailsMode("details").notNull().default("optional"),
    collectEmail: boolean("collect_email").notNull().default(true),
    collectName: boolean("collect_name").notNull().default(false),
    greeting: text("greeting").notNull().default(""),
    replyTime: widgetReplyTime("reply_time").notNull().default("automatic"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "widget_settings_workspace_fk",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "widget_settings_board_workspace_fk",
      columns: [table.boardId, table.workspaceId],
      foreignColumns: [boards.id, boards.workspaceId],
    }).onDelete("cascade"),
    uniqueIndex("widget_settings_workspace_scope_unique")
      .on(table.workspaceId)
      .where(sql`${table.boardId} is null`),
    uniqueIndex("widget_settings_board_scope_unique")
      .on(table.workspaceId, table.boardId)
      .where(sql`${table.boardId} is not null`),
    check("widget_settings_greeting_length_check", sql`length(${table.greeting}) <= 500`),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationEmail: text("notification_email"),
    newFeedback: boolean("new_feedback").notNull().default(true),
    feedbackComments: boolean("feedback_comments").notNull().default(true),
    commentReplies: boolean("comment_replies").notNull().default(true),
    commentReactions: boolean("comment_reactions").notNull().default(true),
    feedbackReactions: boolean("feedback_reactions").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    unique("notification_preferences_user_unique").on(table.userId),
    check(
      "notification_preferences_email_normalized_check",
      sql`${table.notificationEmail} is null or ${table.notificationEmail} = lower(${table.notificationEmail})`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    feedbackId: uuid("feedback_id"),
    commentId: uuid("comment_id"),
    eventType: notificationEventType("event_type").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "notifications_feedback_workspace_fk",
      columns: [table.feedbackId, table.workspaceId],
      foreignColumns: [feedback.id, feedback.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "notifications_comment_workspace_fk",
      columns: [table.commentId, table.workspaceId],
      foreignColumns: [comments.id, comments.workspaceId],
    }).onDelete("cascade"),
    unique("notifications_dedupe_key_unique").on(table.dedupeKey),
    index("notifications_recipient_created_at_idx").on(table.recipientUserId, table.createdAt),
    index("notifications_recipient_read_at_idx").on(table.recipientUserId, table.readAt),
  ],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: integrationProvider("provider").notNull(),
    scope: integrationScope("scope").notNull().default("workspace"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    authorizationState: integrationAuthorizationState("authorization_state")
      .notNull()
      .default("disconnected"),
    encryptedSecretRef: text("encrypted_secret_ref"),
    allowedChannels: jsonb("allowed_channels").$type<string[]>().notNull().default([]),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("integration_connections_workspace_provider_unique")
      .on(table.workspaceId, table.provider)
      .where(sql`${table.scope} = 'workspace'`),
    uniqueIndex("integration_connections_personal_provider_unique")
      .on(table.workspaceId, table.provider, table.ownerUserId)
      .where(sql`${table.scope} = 'personal'`),
    index("integration_connections_workspace_idx").on(table.workspaceId),
    check(
      "integration_connections_owner_scope_check",
      sql`(${table.scope} = 'personal' and ${table.ownerUserId} is not null) or (${table.scope} = 'workspace' and ${table.ownerUserId} is null)`,
    ),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    dedupeKey: text("dedupe_key"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("jobs_dedupe_key_unique")
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
    index("jobs_status_run_at_idx").on(table.status, table.runAt),
    check("jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.attempts} <= ${table.maxAttempts}`),
    check("jobs_max_attempts_check", sql`${table.maxAttempts} > 0`),
  ],
);

export const clerkWebhookEvents = pgTable("clerk_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/** Fixed windows are atomically incremented across application instances. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  expiresAt: timestamp('expires_at', {withTimezone:true}).notNull(),
}, table=>[index('rate_limits_expiry_idx').on(table.expiresAt)]);

export const tags = pgTable("tags", {
 id: uuid("id").primaryKey().defaultRandom(),
 workspaceId: uuid("workspace_id").notNull().references(()=>workspaces.id,{onDelete:"cascade"}),
 name: text("name").notNull(),
 ...timestamps(),
},table=>[
 unique("tags_id_workspace_unique").on(table.id,table.workspaceId),
 uniqueIndex("tags_workspace_name_unique").on(table.workspaceId,sql`lower(${table.name})`),
 check("tags_name_check",sql`length(trim(${table.name})) between 1 and 32`),
]);
export const feedbackTags = pgTable("feedback_tags", {
 workspaceId: uuid("workspace_id").notNull(),
 feedbackId: uuid("feedback_id").notNull(),
 tagId: uuid("tag_id").notNull(),
},table=>[
 primaryKey({columns:[table.feedbackId,table.tagId]}),
 foreignKey({columns:[table.feedbackId,table.workspaceId],foreignColumns:[feedback.id,feedback.workspaceId]}).onDelete("cascade"),
 foreignKey({columns:[table.tagId,table.workspaceId],foreignColumns:[tags.id,tags.workspaceId]}).onDelete("cascade"),
 index("feedback_tags_workspace_tag_idx").on(table.workspaceId,table.tagId),
]);

export const workspaceSubscriptions = pgTable('workspace_subscriptions', {
 workspaceId:uuid('workspace_id').primaryKey().references(()=>workspaces.id,{onDelete:'cascade'}),
 customerId:text('customer_id'),subscriptionId:text('subscription_id').unique(),
 status:text('status').notNull().default('none'),interval:text('interval').notNull().default('monthly'),
 trialUsed:boolean('trial_used').notNull().default(false),trialEnd:timestamp('trial_end',{withTimezone:true}),
 periodEnd:timestamp('period_end',{withTimezone:true}),cancelAtPeriodEnd:boolean('cancel_at_period_end').notNull().default(false),
 ...timestamps(),
});
export const billingCheckouts = pgTable('billing_checkouts', {
 id:uuid('id').primaryKey().defaultRandom(),workspaceId:uuid('workspace_id').notNull().references(()=>workspaces.id,{onDelete:'cascade'}),
 productId:text('product_id').notNull(),interval:text('interval').notNull(),status:text('status').notNull().default('creating'),
 checkoutId:text('checkout_id').unique(),checkoutUrl:text('checkout_url'),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),
 ...timestamps(),
},table=>[index('billing_checkouts_workspace_idx').on(table.workspaceId),uniqueIndex('billing_checkouts_one_pending').on(table.workspaceId).where(sql`${table.status} in ('creating','open')`)]);
export const billingWebhookEvents = pgTable('billing_webhook_events', {
 id:text('id').primaryKey(),type:text('type').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
});
