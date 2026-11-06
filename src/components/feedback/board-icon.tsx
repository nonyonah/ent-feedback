import type { FeedbackBoard } from "@/components/feedback/project-provider";
import { cn } from "@/lib/utils";
export function BoardIcon({board,className}:{board:Pick<FeedbackBoard,"color"|"emoji">;className?:string}){
 if(board.emoji)return <span role="img" aria-label={board.emoji+" board"} className={cn("inline-flex size-5 shrink-0 items-center justify-center text-lg leading-none",className)}>{board.emoji}</span>;
 return <span role="img" aria-label={"Board color "+board.color} className={cn("inline-block size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_#00000014]",className)} style={{backgroundColor:board.color??"#737373"}}/>;
}
