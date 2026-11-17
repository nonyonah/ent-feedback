import "server-only";
import {z} from "zod";
import {buildBillingSummary,type BillingSummary} from "@/server/billing/summary";
import {consumeRateLimit} from "@/server/rate-limit";
import {requireFeature} from "@/server/features";
import {normalizeWorkspaceName,validNewWorkspaceDomain} from "@/lib/workspace-domain";

import { createHash, randomBytes } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { getDb, type Queryable } from "@/server/db/client";
import { isUniqueViolation } from "@/server/db/errors";
import {
  lifecycleEmailState,
  boards,
  invitations,
  users,
  workspaceMembers,
  workspaceSubscriptions,
  workspaces,
} from "@/server/db/schema";
import { sendInvitationAcceptedEmail, sendInvitationEmail } from "@/server/email";
import { ServiceError, validationError } from "@/server/result";
import {
  findActiveWorkspaceMembership,
  requireWorkspaceRole,
  type WorkspaceRole,
} from "@/server/services/access";

export type WorkspaceBoardSummary = {
  id: string;
  name: string;
  handle: string;
  description: string;
  color: string;
  emoji: string | null;
  position: number;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  handle: string;
  description: string;
  website: string | null;
  accentColor: string;
  logoUrl: string | null;
  theme: "dynamic" | "light" | "dark";
  hideAttribution: boolean;
  role: WorkspaceRole;
  boards: WorkspaceBoardSummary[];
  billing?: BillingSummary;
};

export type WorkspaceMemberSummary = {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: Date;
};

export type PendingInvitationSummary = {
  id: string;
  email: string;
  role: "admin" | "member";
  emailSentAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_INVITATIONS_PER_REQUEST = 10;
const PENDING_INVITATION_LIMIT = 50;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

async function loadBoardsByWorkspace(
  db: Queryable,
  workspaceIds: string[],
): Promise<Map<string, WorkspaceBoardSummary[]>> {
  const grouped = new Map<string, WorkspaceBoardSummary[]>();

  if (workspaceIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: boards.id,
      workspaceId: boards.workspaceId,
      name: boards.name,
      handle: boards.handle,
      description: boards.description,
      color: boards.color,
      emoji: boards.emoji,
      position: boards.position,
    })
    .from(boards)
    .where(inArray(boards.workspaceId, workspaceIds))
    .orderBy(asc(boards.position), asc(boards.createdAt));

  for (const row of rows) {
    const list = grouped.get(row.workspaceId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      handle: row.handle,
      description: row.description,
      color: row.color,
      emoji: row.emoji,
      position: row.position,
    });
    grouped.set(row.workspaceId, list);
  }

  return grouped;
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      handle: workspaces.handle,
      description: workspaces.description,
      website: workspaces.website,
      accentColor: workspaces.accentColor,
      logoUrl: workspaces.logoUrl,
      theme: workspaces.theme,
      hideAttribution: workspaces.hideAttribution,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, "active")))
    .orderBy(asc(workspaces.createdAt), asc(workspaces.id));

  if(!rows.length)return [];
  const ids=rows.map(row=>row.id);
  const [boardMap,subscriptions]=await Promise.all([
    loadBoardsByWorkspace(db,ids),
    db.select().from(workspaceSubscriptions).where(inArray(workspaceSubscriptions.workspaceId,ids)),
  ]);
  const subscriptionMap=new Map(subscriptions.map(row=>[row.workspaceId,row]));
  return rows.map(row=>{
    const workspaceBoards=boardMap.get(row.id)??[];
    const billing=buildBillingSummary(subscriptionMap.get(row.id),workspaceBoards.length,row.role==='owner');
    return {...row,hideAttribution:billing.hideAttribution,boards:workspaceBoards,billing};
  });
}

export async function checkWorkspaceAvailability(name:string,handle:string,db:Queryable=getDb()){
 const [existingName]=await db.select({id:workspaces.id}).from(workspaces).where(sql`lower(regexp_replace(btrim(${workspaces.name}), '[[:space:]]+', ' ', 'g')) = lower(${normalizeWorkspaceName(name)})`).limit(1);
 const [existingHandle]=await db.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.handle,handle)).limit(1);
 return {nameAvailable:!existingName,handleAvailable:validNewWorkspaceDomain(handle)&&!existingHandle};
}

/** Insert a workspace, its owner membership and its first board on one connection. */
async function insertWorkspace(tx:Queryable,input:{userId:string;name:string;handle:string;website?:string|null}){
 const [workspace]=await tx.insert(workspaces).values({
  name: normalizeWorkspaceName(input.name),
  accentColor:"#212529",
  handle: input.handle,
  website: input.website ?? null,
 }).returning();
 await tx.insert(workspaceMembers).values({workspaceId:workspace.id,userId:input.userId,role:"owner"});
 const [board]=await tx.insert(boards).values({
  workspaceId:workspace.id,
  handle:"product",
  name:"Product feedback",
  description:"Help shape what we build next.",
  color:"#737373",
  position:0,
 }).returning();
 return {
  id:workspace.id,
  name:workspace.name,
  handle:workspace.handle,
  description:workspace.description,
  website:workspace.website,
  accentColor:workspace.accentColor,
  logoUrl:workspace.logoUrl,
  theme:workspace.theme,
  hideAttribution:workspace.hideAttribution,
  role:"owner" as const,
  boards:[{
   id:board.id,
   name:board.name,
   handle:board.handle,
   description:board.description,
   color:board.color,
   emoji:board.emoji,
   position:board.position,
  }],
 };
}

function workspaceConflict(error:unknown):ServiceError{
 let current:unknown=error;
 let constraint='';
 for(let depth=0;depth<4&&current;depth++){if(typeof current==='object'&&current!==null){constraint=String(('constraint' in current?current.constraint:undefined)??constraint);current='cause' in current?current.cause:undefined;}else break;}
 if(constraint==='workspaces_name_normalized_unique')return new ServiceError('conflict','That workspace name is already taken.',{fieldErrors:{name:['Choose a different workspace name.']}});
 return new ServiceError('conflict','That workspace subdomain is already taken.',{fieldErrors:{handle:['Choose a different subdomain.']}});
}

export async function createWorkspaceForUser(input: {
  userId: string;
  name: string;
  handle: string;
  website?: string | null;
}): Promise<WorkspaceSummary> {
  const db = getDb();
  await consumeRateLimit("workspace-create:"+input.userId,10,3600);
  const availability=await checkWorkspaceAvailability(input.name,input.handle);
  if(!availability.nameAvailable)throw new ServiceError("conflict","That workspace name is already taken.",{fieldErrors:{name:["Choose a different workspace name."]}});
  if(!availability.handleAvailable)throw new ServiceError("conflict","That workspace subdomain is unavailable.",{fieldErrors:{handle:["Choose a different subdomain."]}});

  try {
    return await db.transaction(async (tx) => insertWorkspace(tx,input));
  } catch (error) {
    if (isUniqueViolation(error)) throw workspaceConflict(error);
    throw error;
  }
}

/**
 * Create the account's first workspace exactly once.
 *
 * Two concurrent registration submissions would otherwise both observe "no
 * workspace yet" and each create one, leaving the new account owning two
 * workspaces. An advisory lock serializes the submissions for this account,
 * and the second one then returns the workspace the first one created.
 */
export async function createFirstWorkspaceForUser(input: {
  userId: string;
  name: string;
  handle: string;
  website?: string | null;
}): Promise<WorkspaceSummary> {
  const db = getDb();
  await consumeRateLimit("workspace-create:"+input.userId,10,3600);
  try {
    return await db.transaction(async (tx) => {
      // Serialize concurrent registrations for this account. Transaction scoped,
      // so the lock is released on commit or rollback.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'ent:first-workspace:'+input.userId},0))`);
      const [owned]=await tx.select({id:workspaces.id}).from(workspaces)
       .innerJoin(workspaceMembers,and(eq(workspaceMembers.workspaceId,workspaces.id),eq(workspaceMembers.userId,input.userId),eq(workspaceMembers.role,'owner'),eq(workspaceMembers.status,'active')))
       .orderBy(asc(workspaces.createdAt)).limit(1);
      if(owned){
       const boardMap=await loadBoardsByWorkspace(tx,[owned.id]);
       const [workspace]=await tx.select().from(workspaces).where(eq(workspaces.id,owned.id)).limit(1);
       return {...workspace,role:'owner' as const,boards:boardMap.get(owned.id)??[]};
      }
      const availability=await checkWorkspaceAvailability(input.name,input.handle,tx);
      if(!availability.nameAvailable)throw new ServiceError('conflict','That workspace name is already taken.',{fieldErrors:{name:['Choose a different workspace name.']}});
      if(!availability.handleAvailable)throw new ServiceError('conflict','That workspace subdomain is unavailable.',{fieldErrors:{handle:['Choose a different subdomain.']}});
      return insertWorkspace(tx,input);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw workspaceConflict(error);
    throw error;
  }
}

export async function listWorkspaceMembers(input: {
  workspaceId: string;
  userId: string;
}): Promise<WorkspaceMemberSummary[]> {
  requireFeature("teams");
  const db = getDb();
  const membership = await findActiveWorkspaceMembership(db, input.workspaceId, input.userId);

  if (!membership) {
    throw new ServiceError("forbidden", "You do not have access to this workspace.");
  }

  const rows = await db
    .select({
      id: workspaceMembers.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.status, "active"),
      ),
    )
    .orderBy(asc(workspaceMembers.createdAt));

  return rows;
}

export async function listPendingInvitations(input: {
  workspaceId: string;
  userId: string;
}): Promise<PendingInvitationSummary[]> {
  requireFeature("teams");
  const db = getDb();
  await requireWorkspaceRole(db, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    minimumRole: "admin",
  });

  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      emailSentAt: invitations.emailSentAt,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(eq(invitations.workspaceId, input.workspaceId), eq(invitations.state, "pending"),sql`${invitations.expiresAt}>now()`),
    )
    .orderBy(asc(invitations.createdAt));

  return rows.map((row) => ({ ...row, role: row.role as "admin" | "member" }));
}

export async function createInvitations(input: {
  workspaceId: string;
  inviterUserId: string;
  emails: string[];
  role: "admin" | "member";
}): Promise<{
  invitations: PendingInvitationSummary[];
  failures: { email: string; message: string }[];
}> {
  requireFeature("teams");
  if(input.role!=="member")throw validationError("New teammates join as members. Custom roles are not available yet.");
  const db = getDb();
  await requireWorkspaceRole(db, {
    workspaceId: input.workspaceId,
    userId: input.inviterUserId,
    minimumRole: "admin",
  });

  const emails = Array.from(
    new Set(input.emails.map(email=>z.email().parse(normalizeEmail(email)))),
  );

  if (emails.length === 0) {
    throw validationError("Enter at least one email address.", {
      emails: ["Enter at least one email address."],
    });
  }

  if (emails.length > MAX_INVITATIONS_PER_REQUEST) {
    throw validationError(
      `Invite up to ${MAX_INVITATIONS_PER_REQUEST} people at a time.`,
      { emails: [`Invite up to ${MAX_INVITATIONS_PER_REQUEST} people at a time.`] },
    );
  }

  await consumeRateLimit('team:invite:'+input.inviterUserId,20,3600);
  const {created,skipped,inviter,workspace}=await db.transaction(async tx=>{
   await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,input.workspaceId)).for('update');
   await requireWorkspaceRole(tx,{workspaceId:input.workspaceId,userId:input.inviterUserId,minimumRole:'admin'});
   await tx.update(invitations).set({state:'expired',updatedAt:new Date()}).where(and(eq(invitations.workspaceId,input.workspaceId),eq(invitations.state,'pending'),sql`${invitations.expiresAt}<=now()`));
  const [pendingCount] = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(invitations)
    .where(
      and(eq(invitations.workspaceId, input.workspaceId), eq(invitations.state, "pending"),sql`${invitations.expiresAt}>now()`),
    );

  if ((pendingCount?.value ?? 0) + emails.length > PENDING_INVITATION_LIMIT) {
    throw new ServiceError(
      "conflict",
      `This workspace already has ${PENDING_INVITATION_LIMIT} pending invitations.`,
    );
  }

  const [inviter] = await tx
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, input.inviterUserId))
    .limit(1);
  const [workspace] = await tx
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new ServiceError("not_found", "Workspace not found.");
  }

  const memberRows = await tx
    .select({ email: users.email })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.status, "active"),
      ),
    );
  const memberEmails = new Set(
    memberRows.map((row) => row.email).filter((email): email is string => Boolean(email)),
  );

  const created: {
    id: string;
    email: string;
    role: "admin" | "member";
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }[] = [];
  const skipped: { email: string; message: string }[] = [];

  for (const email of emails) {
    if (memberEmails.has(email)) {
      skipped.push({ email, message: "This person is already a member." });
      continue;
    }

    const [pending]=await tx.select({id:invitations.id}).from(invitations).where(and(eq(invitations.workspaceId,input.workspaceId),eq(invitations.email,email),eq(invitations.state,'pending'))).limit(1);
    if(pending){skipped.push({email,message:'An invitation is already pending for this email.'});continue;}
    const { token, tokenHash } = newInvitationToken();

    {
      const [invitation] = await tx
        .insert(invitations)
        .values({
          workspaceId: input.workspaceId,
          email,
          role: input.role,
          inviterUserId: input.inviterUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
        })
        .returning();

      created.push({
        id: invitation.id,
        email,
        role: input.role,
        token,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      });
    }
  }

   return {created,skipped,inviter,workspace};
  });

  const failures: { email: string; message: string }[] = [...skipped];
  const invitationSummaries: PendingInvitationSummary[] = [];

  for (const invitation of created) {
    try {
      await sendInvitationEmail({
        to: invitation.email,
        workspaceName: workspace.name,
        inviterName: inviter?.name ?? inviter?.email ?? "A teammate",
        role: invitation.role,
        token: invitation.token,
      });

      const [updated] = await db
        .update(invitations)
        .set({ emailSentAt: new Date(), updatedAt: new Date() })
        .where(eq(invitations.id, invitation.id))
        .returning({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          emailSentAt: invitations.emailSentAt,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
        });

      invitationSummaries.push({ ...updated, role: updated.role as "admin" | "member" });
    } catch {
      failures.push({ email: invitation.email, message: "The invitation email could not be sent." });
      invitationSummaries.push({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        emailSentAt: null,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      });
    }
  }

  return { invitations: invitationSummaries, failures };
}

export async function cancelInvitation(input: {
  workspaceId: string;
  invitationId: string;
  userId: string;
}): Promise<void> {
  requireFeature("teams");
  const db = getDb();
  await db.transaction(async tx=>{
  await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,input.workspaceId)).for('update');
  await requireWorkspaceRole(tx, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    minimumRole: "admin",
  });

  const [cancelled] = await tx
    .update(invitations)
    .set({ state: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(invitations.id, input.invitationId),
        eq(invitations.workspaceId, input.workspaceId),
        eq(invitations.state, "pending"),
      ),
    )
    .returning({ id: invitations.id });

  if (!cancelled) {
    throw new ServiceError("not_found", "Invitation not found.");
  }
  });
}

const invitationPreviewSelect = {
  id: invitations.id,
  workspaceId: invitations.workspaceId,
  email: invitations.email,
  role: invitations.role,
  state: invitations.state,
  expiresAt: invitations.expiresAt,
  workspaceName: workspaces.name,
  workspaceHandle: workspaces.handle,
  inviterName: users.name,
} as const;

export type InvitationPreview = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  state: "pending" | "accepted" | "cancelled" | "expired";
  expiresAt: Date;
  workspaceName: string;
  workspaceHandle: string;
  inviterName: string | null;
  expired: boolean;
};

export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  requireFeature("teams");
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  const db = getDb();
  const [row] = await db
    .select(invitationPreviewSelect)
    .from(invitations)
    .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
    .leftJoin(users, eq(users.id, invitations.inviterUserId))
    .where(eq(invitations.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) {
    return null;
  }

  return { ...row, expired: row.expiresAt.getTime() <= Date.now() };
}

export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string | null;
}): Promise<{ workspaceId: string; workspaceName: string }> {
  requireFeature("teams");
  const db = getDb();
  if(!/^[A-Za-z0-9_-]{43}$/.test(input.token))throw new ServiceError("not_found","This invitation could not be found.");
  const tokenHash = hashToken(input.token);

  const accepted = await db.transaction(async (tx) => {
    const [destination]=await tx.select({workspaceId:invitations.workspaceId}).from(invitations).where(eq(invitations.tokenHash,tokenHash)).limit(1);
    if(!destination)throw new ServiceError('not_found','This invitation could not be found.');
    await tx.select({id:workspaces.id}).from(workspaces).where(eq(workspaces.id,destination.workspaceId)).for('update');

    const [invitation] = await tx
      .select({
        id: invitations.id,
        workspaceId: invitations.workspaceId,
        email: invitations.email,
        role: invitations.role,
        state: invitations.state,
        acceptedByUserId:invitations.acceptedByUserId,
        inviterUserId:invitations.inviterUserId,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(eq(invitations.tokenHash, tokenHash))
      .limit(1)
      .for("update");

    if (!invitation) {
      throw new ServiceError("not_found", "This invitation could not be found.");
    }

    if (invitation.state === "accepted") {
      if(invitation.acceptedByUserId!==input.userId)throw new ServiceError("forbidden","This invitation has already been accepted.");
      await requireWorkspaceRole(tx,{workspaceId:invitation.workspaceId,userId:input.userId,minimumRole:'member'});
      const [workspace]=await tx.select({name:workspaces.name}).from(workspaces).where(eq(workspaces.id,invitation.workspaceId)).limit(1);
      return {workspaceId:invitation.workspaceId,workspaceName:workspace.name};
    }

    if (invitation.state !== "pending") {
      throw new ServiceError("forbidden", "This invitation is no longer valid.");
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await tx
        .update(invitations)
        .set({ state: "expired", updatedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      throw new ServiceError("forbidden", "This invitation has expired.");
    }

    const userEmail = input.userEmail ? normalizeEmail(input.userEmail) : null;

    const [account]=await tx.select({email:users.email,name:users.name}).from(users).where(eq(users.id,input.userId)).limit(1);
    if (!userEmail || userEmail !== invitation.email || account?.email!==invitation.email) {
      throw new ServiceError(
        "forbidden",
        "Sign in with the email address this invitation was sent to.",
      );
    }

    const [existingMembership] = await tx
      .select({ id: workspaceMembers.id, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invitation.workspaceId),
          eq(workspaceMembers.userId, input.userId),
        ),
      )
      .limit(1);

    if (existingMembership) {
      await tx
        .update(workspaceMembers)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(workspaceMembers.id, existingMembership.id));
    } else {
      await tx.insert(workspaceMembers).values({
        workspaceId: invitation.workspaceId,
        userId: input.userId,
        role: invitation.role,
      });
    }

    await tx
      .update(invitations)
      .set({
        state: "accepted",
        acceptedByUserId: input.userId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id));

    await tx.update(lifecycleEmailState).set({onboardingCompletedAt:sql`coalesce(${lifecycleEmailState.onboardingCompletedAt},now())`}).where(eq(lifecycleEmailState.userId,input.userId));
    const [workspace] = await tx
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .limit(1);
    const [inviter] = invitation.inviterUserId
      ? await tx.select({email:users.email,name:users.name}).from(users).where(eq(users.id,invitation.inviterUserId)).limit(1)
      : [];

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      invitationId: invitation.id,
      inviter,
      role: invitation.role,
      memberName: account?.name ?? userEmail,
    };
  });

  if ("inviter" in accepted && accepted.inviter?.email) {
    try {
      await sendInvitationAcceptedEmail({
        to: accepted.inviter.email,
        workspaceName: accepted.workspaceName,
        memberName: accepted.memberName,
        role: accepted.role,
        key: `invitation-accepted:${accepted.invitationId}`,
      });
    } catch {
      // Joining must succeed even when the confirmation email cannot be sent.
    }
  }

  return { workspaceId: accepted.workspaceId, workspaceName: accepted.workspaceName };
}
