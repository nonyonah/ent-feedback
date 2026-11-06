import { connection } from "next/server";

import { requireAppUser } from "@/server/auth";
import { runService, toResponse } from "@/server/result";
import { listWorkspacesForUser } from "@/server/services/workspaces";

export async function GET() {
  await connection();

  const result = await runService(async () => {
    const user = await requireAppUser();
    return listWorkspacesForUser(user.id);
  });

  return toResponse(result);
}
