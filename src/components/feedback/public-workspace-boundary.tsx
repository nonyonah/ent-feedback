'use client';
import * as React from 'react';
import {useProject,type Project,type WidgetSettings,type FeedbackBoard} from '@/components/feedback/project-provider';
import {BoardLoading} from '@/components/feedback/board-states';
export function PublicWorkspaceBoundary({project,boards,widget,children}:{project:Project;boards:FeedbackBoard[];widget:WidgetSettings|null;children:React.ReactNode}){const state=useProject();const hydrate=state.hydrateWorkspaces;const hydrateWidget=state.hydrateWidgetSettings;React.useEffect(()=>{hydrate([project],boards);if(widget)hydrateWidget(project.id,widget);},[project,boards,widget,hydrate,hydrateWidget]);return state.workspaceReady&&state.project.id===project.id?children:<BoardLoading/>;}
