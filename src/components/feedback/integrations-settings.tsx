'use client';
import {features} from '@/lib/features';
import {useProject} from '@/components/feedback/project-provider';
import {SettingsPage,SettingGroup} from '@/components/feedback/settings-layout';
import {AppConnections} from '@/components/feedback/app-connections';
function EnabledIntegrationsSettings(){const {project}=useProject();return <SettingsPage title="Integrations" showPreviewNote={false}><SettingGroup title="Workspace apps"><AppConnections key={project.id} workspaceId={project.id} returnTo="/dashboard/settings/integrations"/></SettingGroup><p className="px-4 text-xs leading-5 text-muted-foreground">Authorize an app to connect a channel to {project.name}. You can disconnect it anytime.</p></SettingsPage>;}

export function IntegrationsSettings(){return features.integrations?<EnabledIntegrationsSettings/>:null;}
