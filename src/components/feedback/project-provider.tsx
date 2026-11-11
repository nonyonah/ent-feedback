"use client";
import {captureAnalytics} from "@/lib/analytics";

import * as React from "react";
import {features} from "@/lib/features";
import {createBoardAction,renameBoardAction,reorderBoardsAction} from "@/server/actions/boards";
import {useUser} from "@clerk/nextjs";
import {loadNotificationSettingsAction,loadSettingsAction,saveBrandingAction,saveWidgetSettingsAction,saveNotificationSettingsAction} from "@/server/actions/settings";
import {usePathname} from "next/navigation";

export type PublicUser = { name: string; email: string; avatar?: string };
export type WorkspaceRole = "owner" | "admin" | "member";
export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
  logo: string;
  theme?: "dynamic" | "light" | "dark";
  hideAttribution?: boolean;
  website?: string;
  role?: WorkspaceRole;
};
export type FeedbackBoard = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji?: string;
};

export function projectTheme(accent: string): React.CSSProperties {
  if (["#212529", "#7443e9"].includes(accent.toLowerCase())) {
    return {
      "--primary": "var(--project-primary)",
      "--primary-text": "color-mix(in oklab, var(--primary), var(--primary-text-tint) var(--primary-text-mix))",
      "--primary-foreground": "var(--project-primary-foreground)",
      "--ring": "var(--project-primary)",
      "--vote-active-bg": "var(--project-vote-bg)",
      "--vote-active-border": "var(--project-primary)",
    } as React.CSSProperties;
  }
  const channels = [1, 3, 5]
    .map((start) => parseInt(accent.slice(start, start + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4),
    );
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return {
    "--primary": accent,
    "--primary-text": "color-mix(in oklab, var(--primary), var(--primary-text-tint) var(--primary-text-mix))",
    "--ring": accent,
    "--primary-foreground": luminance > 0.179 ? "#000000" : "#ffffff",
    "--vote-active-bg": accent + "1f",
    "--vote-active-border": accent,
  } as React.CSSProperties;
}

const initial: Project = {
  id: "ent",
  name: "Ent Feedback",
  slug: "ent",
  description: "A little feedback. A better product.",
  accent: "#212529",
  logo: "",
};
const initialBoard: FeedbackBoard = {
  id: "product",
  projectId: "ent",
  name: "Product feedback",
  slug: "product",
  description: "Help shape what we build next.",
  color: "#737373",
};

export type NotificationPreferences = {
  email: string;
  newFeedback: boolean;
  comments: boolean;
  replies: boolean;
  commentReactions: boolean;
  feedbackReactions: boolean;
};
export type WidgetSettings = {
  enabled: boolean;
  details: "none" | "optional" | "required";
  email: boolean;
  name: boolean;
  greeting: string;
  replyTime: "automatic" | "day" | "days" | "week";
};
export const defaultWidgetSettings: WidgetSettings = {
  enabled: true,
  details: "optional",
  email: true,
  name: false,
  greeting: "",
  replyTime: "automatic",
};
export type TeamInvite = {
  id: string;
  projectId: string;
  email: string;
  role: "admin" | "member";
};
export type IntegrationSetup = {
  projectId: string;
  service: "slack" | "discord" | "email";
  label: string;
  channel: string;
  scope: "personal" | "workspace";
};

type ProjectContextValue = {
  publicUser: PublicUser | null;
  setPublicUser: (user: PublicUser | null) => void;
  project: Project;
  projects: Project[];
  workspaceReady: boolean;
  hydrateWorkspaces: (
    projects: Project[],
    boards: FeedbackBoard[],
  ) => void;
  switchProject: (id: string) => void;
  boards: FeedbackBoard[];
  activeBoard: FeedbackBoard | null;
  updateProject: (project: Project) => Promise<boolean>;
  settingsPending: boolean;
  settingsError: string;
  settingsSaveError: string;
  settingsReady: boolean;
  preferencesError: string;
  preferencesReady: boolean;
  preferencesPending: boolean;
  retrySettings: () => void;
  retryPreferences: () => void;
  hydrateWidgetSettings: (workspaceId:string,settings:WidgetSettings)=>void;
  createProject: (project: Project) => Project;
  createBoard: (
    input: Pick<FeedbackBoard, "name" | "color" | "emoji">,
  ) => Promise<FeedbackBoard>;
  selectBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => Promise<void>;
  boardsPending: boolean;
  widgetSettings: WidgetSettings;
  updateWidgetSettings: (next: WidgetSettings) => Promise<boolean>;
  teamInvites: TeamInvite[];
  inviteTeam: (emails: string[], role: TeamInvite["role"]) => void;
  cancelInvite: (id: string) => void;
  integrations: IntegrationSetup[];
  configureIntegration: (setup: Omit<IntegrationSetup, "projectId">) => void;
  removeIntegration: (
    service: IntegrationSetup["service"],
    scope: IntegrationSetup["scope"],
  ) => void;
  reorderBoards: (activeId: string, overId: string) => Promise<void>;
  notifications: NotificationPreferences;
  updateNotifications: (value:React.SetStateAction<NotificationPreferences>)=>Promise<boolean>;
};

const ProjectContext = React.createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] =
    React.useState<NotificationPreferences>({
      email: "",
      newFeedback: true,
      comments: true,
      replies: true,
      commentReactions: true,
      feedbackReactions: true,
    });
  const {user:clerkUser}=useUser();
  const clerkUserId=clerkUser?.id;
  const pathname=usePathname();
  const [settingsPending,setSettingsPending]=React.useState(false);
  const [settingsSaveFailure,setSettingsSaveFailure]=React.useState({workspaceId:"",message:""});
  const [settingsStatus,setSettingsStatus]=React.useState<{workspaceId:string;ready:boolean;error:string}>({workspaceId:"",ready:false,error:""});
  const [preferenceStatus,setPreferenceStatus]=React.useState<{userId:string;ready:boolean;error:string}>({userId:"",ready:false,error:""});
  const saving=React.useRef(false);
  const preferenceSaving=React.useRef(false);
  const [preferencesPending,setPreferencesPending]=React.useState(false);
  const [settingsAttempt,retrySettings]=React.useReducer(value=>value+1,0);
  const [preferencesAttempt,retryPreferences]=React.useReducer(value=>value+1,0);
  const [project, setProject] = React.useState(initial);
  const settingsReady=settingsStatus.workspaceId===project.id&&settingsStatus.ready;
  const settingsSaveError=settingsSaveFailure.workspaceId===project.id?settingsSaveFailure.message:"";
  const settingsError=settingsStatus.workspaceId===project.id?settingsStatus.error:"";
  const preferencesReady=Boolean(clerkUserId)&&preferenceStatus.userId===clerkUserId&&preferenceStatus.ready;
  const preferencesError=Boolean(clerkUserId)&&preferenceStatus.userId===clerkUserId?preferenceStatus.error:"";
  const [publicUsers, setPublicUsers] = React.useState<
    Record<string, PublicUser | null>
  >({});
  const publicUser = clerkUser ? (Object.prototype.hasOwnProperty.call(publicUsers,project.id)?publicUsers[project.id]:{name:clerkUser.fullName??clerkUser.firstName??clerkUser.username??"User",email:clerkUser.primaryEmailAddress?.emailAddress??"",avatar:clerkUser.hasImage?clerkUser.imageUrl:undefined}) : null;
  function setPublicUser(user: PublicUser | null) {
    setPublicUsers((current) => ({ ...current, [project.id]: user }));
  }
  const [projects, setProjects] = React.useState<Project[]>([initial]);
  const [workspaceReady, setWorkspaceReady] = React.useState(false);
  const [widgetByProject, setWidgetByProject] = React.useState<
    Record<string, WidgetSettings>
  >({});
  const [allInvites, setInvites] = React.useState<TeamInvite[]>([]);
  const [allIntegrations, setIntegrations] = React.useState<IntegrationSetup[]>(
    [],
  );
  const [allBoards, setBoards] = React.useState<FeedbackBoard[]>([
    initialBoard,
  ]);
  const [activeBoardId, selectBoard] = React.useState("product");
  const boardMutation = React.useRef(false);
  const [boardsPending,setBoardsPending] = React.useState(false);
  const activeWorkspaceRef = React.useRef(project.id);
  React.useLayoutEffect(()=>{activeWorkspaceRef.current=project.id;},[project.id]);
  async function mutateBoard<T>(operation:()=>Promise<T>):Promise<T>{
    if(boardMutation.current)throw new Error("A board is being saved. Try again when it finishes.");
    boardMutation.current=true;setBoardsPending(true);
    try{return await new Promise<T>((resolve,reject)=>{
      React.startTransition(async()=>{try{resolve(await operation());}catch(error){reject(error);}});
    });}finally{boardMutation.current=false;setBoardsPending(false);}
  }
  const boards = allBoards.filter((board) => board.projectId === project.id);
  const widgetSettings = widgetByProject[project.id] ?? defaultWidgetSettings;
  const teamInvites = allInvites.filter(
    (invite) => invite.projectId === project.id,
  );
  const integrations = allIntegrations.filter(
    (setup) => setup.projectId === project.id,
  );
  const activeBoard =
    boards.find(
      (board) => board.id === activeBoardId && board.projectId === project.id,
    ) ?? null;
  React.useLayoutEffect(() => {
    const media=matchMedia("(prefers-color-scheme: dark)");
    const apply=()=>{
      let stored:string|null=null;
      try{stored=localStorage.getItem("ent-theme");}catch{}
      const management=pathname.startsWith('/dashboard')||pathname.startsWith('/registration')||pathname.startsWith('/onboarding');
      const personal=stored==='light'||stored==='dark'?stored:'system';
      const chosen=management?personal:(project.theme==='dark'||project.theme==='light'?project.theme:'system');
      document.documentElement.classList.toggle('dark',chosen==='dark'||(chosen!=='light'&&media.matches));
    };
    apply();
    window.addEventListener('ent-theme-change',apply);window.addEventListener('storage',apply);window.addEventListener('pageshow',apply);document.addEventListener('visibilitychange',apply);media.addEventListener('change',apply);
    return()=>{window.removeEventListener('ent-theme-change',apply);window.removeEventListener('storage',apply);window.removeEventListener('pageshow',apply);document.removeEventListener('visibilitychange',apply);media.removeEventListener('change',apply);};
  }, [project.theme,pathname]);
  // Portalled menus and dialogs share the active workspace's color tokens.
  React.useEffect(()=>{
    const root=document.documentElement;
    const values=Object.entries(projectTheme(project.accent));
    values.forEach(([key,value])=>root.style.setProperty(key,String(value)));
    return ()=>values.forEach(([key])=>root.style.removeProperty(key));
  },[project.accent]);
  const hydrateWorkspaces = React.useCallback(
    (nextProjects: Project[], nextBoards: FeedbackBoard[]) => {
      nextProjects=nextProjects.map(item=>item.accent.toLowerCase()==="#7443e9"?{...item,accent:"#212529"}:item);
      setProjects(nextProjects);
      setBoards(nextBoards);

      if (nextProjects.length > 0) {
        let selectedId:string|null=null;
        try{selectedId=localStorage.getItem("ent-active-workspace:"+(clerkUserId??"anonymous"));}catch{}
        const nextProject = nextProjects.find(item=>item.id===selectedId)??nextProjects[0];
        setProject(nextProject);
        selectBoard(
          nextBoards.find((board) => board.projectId === nextProject.id)?.id ??
            "",
        );
      }

      setWorkspaceReady(true);
    },
    [clerkUserId],
  );
  async function persist(operation:()=>Promise<{ok:boolean;error?:{message:string}}>,apply:()=>void){
    if(saving.current)return false;saving.current=true;const workspaceId=project.id;setSettingsPending(true);setSettingsSaveFailure({workspaceId,message:""});
    try{const result=await operation();if(!result.ok){setSettingsSaveFailure({workspaceId,message:result.error?.message??"Changes could not be saved."});return false;}apply();return true;}
    catch{setSettingsSaveFailure({workspaceId,message:"Changes could not be saved. Try again."});return false;}
    finally{saving.current=false;setSettingsPending(false);}
  }
  async function updateProject(next: Project) {
    return persist(()=>saveBrandingAction(next.id,{name:next.name,description:next.description,accent:next.accent,logo:next.logo,theme:next.theme??"dynamic",hideAttribution:Boolean(next.hideAttribution)}),()=>{
      setProject(current=>current.id===next.id?next:current);
      setProjects(current=>current.map(item=>item.id===next.id?next:item));
    });
  }
  const updateNotifications=async(value:React.SetStateAction<NotificationPreferences>):Promise<boolean>=>{
    if(preferenceSaving.current||!clerkUserId)return false;
    const userId=clerkUserId;
    const next=typeof value==='function'?value(notifications):value;
    preferenceSaving.current=true;setPreferencesPending(true);
    setPreferenceStatus(current=>({...current,error:""}));
    try{
      const result=await saveNotificationSettingsAction(next);
      if(result.ok){setNotifications(next);return true;}
      setPreferenceStatus(current=>({...current,userId,error:result.error.message}));return false;
    }catch{setPreferenceStatus(current=>({...current,userId,error:"Preferences could not be saved. Try again."}));return false;}
    finally{preferenceSaving.current=false;setPreferencesPending(false);}
  };
  const management=pathname.startsWith('/dashboard');
  React.useEffect(()=>{
    if(!clerkUserId||!workspaceReady||!management||!project.id.match(/^[0-9a-f-]{36}$/i))return;
    let cancelled=false;
    void loadSettingsAction(project.id).then(result=>{if(cancelled)return;if(!result.ok){setSettingsStatus({workspaceId:project.id,ready:false,error:result.error.message});return;}setWidgetByProject(current=>({...current,[project.id]:result.data.widget??defaultWidgetSettings}));setSettingsStatus({workspaceId:project.id,ready:true,error:""});}).catch(()=>{if(!cancelled)setSettingsStatus({workspaceId:project.id,ready:false,error:"Settings could not be loaded. Refresh to retry."});});
    return()=>{cancelled=true;};
  },[clerkUserId,workspaceReady,project.id,management,settingsAttempt]);
  React.useEffect(()=>{
    if(!clerkUserId||pathname==="/"||pathname==="/landing-v2")return;let cancelled=false;
    void loadNotificationSettingsAction().then(result=>{if(cancelled)return;if(result.ok){setNotifications(result.data??{email:clerkUser?.primaryEmailAddress?.emailAddress??"",newFeedback:true,comments:true,replies:true,commentReactions:true,feedbackReactions:true});setPreferenceStatus({userId:clerkUserId,ready:true,error:""});}else setPreferenceStatus({userId:clerkUserId,ready:false,error:result.error.message});}).catch(()=>{if(!cancelled)setPreferenceStatus({userId:clerkUserId,ready:false,error:"Notification preferences could not be loaded."});});
    return()=>{cancelled=true;};
  },[clerkUserId,clerkUser?.primaryEmailAddress?.emailAddress,preferencesAttempt,pathname]);
  const hydrateWidgetSettings=React.useCallback((workspaceId:string,settings:WidgetSettings)=>setWidgetByProject(current=>({...current,[workspaceId]:settings})),[]);
  function switchProject(id: string) {
    const next = projects.find((item) => item.id === id);
    if (!next) return;
    setProject(next);
    try{localStorage.setItem("ent-active-workspace:"+(clerkUserId??"anonymous"),next.id);}catch{}
    selectBoard(allBoards.find((board) => board.projectId === id)?.id ?? "");
  }
  function createProject(input: Project) {
    const next = { ...input, id: "project-" + crypto.randomUUID() };
    setProjects((current) => [...current, next]);
    setProject(next);
    selectBoard("");
    return next;
  }
  async function renameBoard(id: string, name: string) {
    const workspaceId=project.id;
    await mutateBoard(async()=>{
      const result=await renameBoardAction(workspaceId,id,name);
      if(!result.ok)throw new Error(result.error.fieldErrors?.name?.[0]??result.error.message);
      setBoards(current=>current.map(board=>board.id===id&&board.projectId===workspaceId?result.data:board));
    });
  }
  async function updateWidgetSettings(next: WidgetSettings) {
    const workspaceId=project.id;
    return persist(()=>saveWidgetSettingsAction(workspaceId,next),()=>setWidgetByProject(current=>({...current,[workspaceId]:next})));
  }
  function inviteTeam(emails: string[], role: TeamInvite["role"]) {
    if(!features.teams)return;
    setInvites((current) => [
      ...current,
      ...Array.from(new Set(emails))
        .filter(
          (email) =>
            !current.some(
              (invite) =>
                invite.projectId === project.id && invite.email === email,
            ),
        )
        .map((email) => ({
          id: crypto.randomUUID(),
          projectId: project.id,
          email,
          role,
        })),
    ]);
  }
  function cancelInvite(id: string) {
    if(!features.teams)return;
    setInvites((current) => current.filter((invite) => invite.id !== id));
  }
  function configureIntegration(setup: Omit<IntegrationSetup, "projectId">) {
    if(!features.integrations)return;
    setIntegrations((current) => [
      ...current.filter(
        (item) =>
          !(
            item.projectId === project.id &&
            item.service === setup.service &&
            item.scope === setup.scope
          ),
      ),
      { ...setup, projectId: project.id },
    ]);
  }
  function removeIntegration(
    service: IntegrationSetup["service"],
    scope: IntegrationSetup["scope"],
  ) {
    if(!features.integrations)return;
    setIntegrations((current) =>
      current.filter(
        (item) =>
          !(
            item.projectId === project.id &&
            item.service === service &&
            item.scope === scope
          ),
      ),
    );
  }
  async function reorderBoards(activeId: string, overId: string) {
    const workspaceId=project.id;
    const from=boards.findIndex(board=>board.id===activeId);
    const to=boards.findIndex(board=>board.id===overId);
    if(from<0||to<0||from===to)return;
    await mutateBoard(async()=>{
      const previous=[...boards],ordered=[...boards];
      const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved);
      const replace=(list:FeedbackBoard[])=>setBoards(current=>[...current.filter(board=>board.projectId!==workspaceId),...list]);
      replace(ordered);
      try{
        const result=await reorderBoardsAction(workspaceId,ordered.map(board=>board.id));
        if(!result.ok)throw new Error(result.error.message);
        replace(result.data.map(board=>({...board,emoji:board.emoji??undefined})));
      }catch(error){replace(previous);throw error;}
    });
  }
  async function createBoard(input: Pick<FeedbackBoard,"name"|"color"|"emoji">):Promise<FeedbackBoard> {
    const workspaceId=project.id;
    return mutateBoard(async()=>{
      const result=await createBoardAction(workspaceId,input);
      if(!result.ok)throw new Error(result.error.fieldErrors?.name?.[0]??result.error.message);
      const board=result.data;
      captureAnalytics("board_created",{surface:"dashboard"});
      setBoards(current=>[...current,board]);
      if(activeWorkspaceRef.current===workspaceId)selectBoard(board.id);
      return board;
    });
  }
  return (
    <ProjectContext.Provider
      value={{
        publicUser,
        setPublicUser,
        project,
        projects,
        workspaceReady,
        hydrateWorkspaces,
        switchProject,
        boards,
        activeBoard,
        renameBoard,
        widgetSettings,
        updateWidgetSettings,
        teamInvites,
        inviteTeam,
        cancelInvite,
        integrations,
        configureIntegration,
        removeIntegration,
        updateProject,
        settingsPending,settingsError,settingsSaveError,settingsReady,preferencesError,preferencesReady,preferencesPending,retrySettings,retryPreferences,hydrateWidgetSettings,
        createProject,
        createBoard,
        selectBoard,
        reorderBoards,
        boardsPending,
        notifications,
        updateNotifications,
      }}
    >
      <div
        className="flex min-h-svh flex-1 flex-col"
        style={projectTheme(project.accent)}
      >
        {children}
      </div>
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = React.useContext(ProjectContext);
  if (!context)
    throw new Error("useProject must be used inside ProjectProvider.");
  return context;
}
