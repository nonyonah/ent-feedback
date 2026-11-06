import type { ComponentProps } from "react";
import { BellIcon, LinkIcon, ShareNetworkIcon } from "@/components/icons";
const icons={bell:BellIcon,link:LinkIcon,share:ShareNetworkIcon};
export function PostActionIcon({name,...props}:ComponentProps<typeof BellIcon>&{name:keyof typeof icons}){const Icon=icons[name];return <Icon {...props} className="size-4! shrink-0"/>;}
