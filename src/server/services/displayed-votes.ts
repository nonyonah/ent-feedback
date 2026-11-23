import { sql } from "drizzle-orm";
import { feedback, votes } from "@/server/db/schema";

export const displayedVotes = sql<number>`(${feedback.startingVotes} + (select count(*)::int from ${votes} v where v.feedback_id = ${feedback}.id))`;
