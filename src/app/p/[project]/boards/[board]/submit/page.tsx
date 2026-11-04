import { BoardRoute } from "@/components/feedback/board-route";
export const instant = false;
export default async function Page({params}:{params:Promise<{project:string;board:string}>}){const route=await params;return <BoardRoute projectSlug={route.project} boardSlug={route.board} view="submit"/>;}
