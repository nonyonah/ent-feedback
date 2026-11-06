// WorkspaceGate renders this segment after authenticated workspace bootstrap.
export const instant = false;

import {redirect} from "next/navigation";
export default function Page(){redirect("/dashboard/settings/branding");}
