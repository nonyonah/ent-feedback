import type {FeedbackCategory,FeedbackStatus} from './feedback-data';
export const roadmapStatuses=['planned','in-progress','shipped'] as const;
export const adminRoadmapStatuses=['open',...roadmapStatuses] as const;
export type RoadmapStatus=typeof adminRoadmapStatuses[number];
export type RoadmapVoter={name:string;avatar_url:string|null};
export type RoadmapItem={voters?:RoadmapVoter[];id:string;board_id:string;title:string;category:FeedbackCategory;status:FeedbackStatus;vote_count:number;comment_count:number;public_note:string|null;shipped_at:string|null;roadmap_order:number|null;roadmap_visible?:boolean;shipped_notified_at?:string|null};
export type RoadmapData={has_older_shipped?:boolean;planned:RoadmapItem[];in_progress:RoadmapItem[];shipped:RoadmapItem[];open_items?:RoadmapItem[];next_cursor:number|null};
export function columnKey(status:RoadmapStatus){return status==='open'?'open_items':status==='in-progress'?'in_progress':status;}
export function fractionalOrder(before:number|null|undefined,after:number|null|undefined){
 const value=before==null?(after==null?0:after-1):after==null?before+1:before+(after-before)/2;
 if(!Number.isFinite(value)||(before!=null&&value<=before)||(after!=null&&value>=after))throw Error('This position is too close to another item. Choose another position and retry.');
 return value;
}
