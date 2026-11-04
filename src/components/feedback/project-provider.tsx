"use client";
import * as React from "react";
export type Project = { id: string; name: string; slug: string; description: string; accent: string; logo: string };
export type FeedbackBoard = { id: string; projectId: string; name: string; slug: string; description: string };
export function projectTheme(accent: string): React.CSSProperties {
  if (accent.toLowerCase() === "#262626") return { "--primary": "var(--project-primary)", "--primary-foreground": "var(--project-primary-foreground)", "--ring": "#737373", "--vote-active-bg": "var(--project-vote-bg)", "--vote-active-border": "var(--project-primary)" } as React.CSSProperties;
  const channels = [1, 3, 5].map((start) => parseInt(accent.slice(start, start + 2), 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return { "--primary": accent, "--ring": accent, "--primary-foreground": luminance > 0.179 ? "#000000" : "#ffffff", "--vote-active-bg": accent + "1f", "--vote-active-border": accent } as React.CSSProperties;
}
const initial: Project = { id: "ent", name: "Ent Feedback", slug: "ent", description: "A little feedback. A better product.", accent: "#262626", logo: "" };
const initialBoard: FeedbackBoard = { id: "product", projectId: "ent", name: "Product feedback", slug: "product", description: "Help shape what we build next." };
type ProjectContextValue = {
  project: Project; boards: FeedbackBoard[]; activeBoard: FeedbackBoard | null;
  updateProject: (project: Project) => void; createProject: (project: Project) => void;
  createBoard: (input: Pick<FeedbackBoard,"name"|"slug"|"description">) => FeedbackBoard;
  selectBoard: (id:string) => void;
};
const ProjectContext = React.createContext<ProjectContextValue | null>(null);
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, updateProject] = React.useState(initial);
  const [boards, setBoards] = React.useState<FeedbackBoard[]>([initialBoard]);
  const [activeBoardId, selectBoard] = React.useState("product");
  const activeBoard = boards.find(board => board.id === activeBoardId && board.projectId === project.id) ?? null;
  function createProject(input: Project) {
    updateProject({ ...input, id: "project-" + crypto.randomUUID() });
    setBoards([]); selectBoard("");
  }
  function createBoard(input: Pick<FeedbackBoard,"name"|"slug"|"description">): FeedbackBoard {
    const board = { ...input, id: "board-" + crypto.randomUUID(), projectId: project.id };
    setBoards(current => [...current, board]); selectBoard(board.id); return board;
  }
  return <ProjectContext.Provider value={{ project, boards, activeBoard, updateProject, createProject, createBoard, selectBoard }}><div className="flex min-h-svh flex-1 flex-col" style={projectTheme(project.accent)}>{children}</div></ProjectContext.Provider>;
}
export function useProject() { const context = React.useContext(ProjectContext); if (!context) throw new Error("useProject must be used inside ProjectProvider."); return context; }
