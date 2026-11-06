import { redirect } from "next/navigation";

import {getRegistrationState} from "@/server/onboarding";
import { OnboardingView } from "@/components/feedback/onboarding-view";
import { getOptionalAppUser } from "@/server/auth";

export const instant = false;

export default async function Page() {
  const user = await getOptionalAppUser();

  if (!user) {
    redirect("/auth?next=%2Fonboarding");
  }

  const {workspaces}=await getRegistrationState();
  if(!workspaces.length)redirect("/registration");
  return <OnboardingView />;
}
