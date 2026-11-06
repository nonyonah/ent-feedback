"use client";
import {DashboardView} from './dashboard-view';
import {useSettingsHref} from './use-settings-href';
import type {SettingsSection} from './dashboard-settings';
/** Legacy /settings entry renders immediately; sidebar links target the remembered route directly. */
export default function SettingsRedirect(){const href=useSettingsHref();return <DashboardView view="settings" settingsSection={href.split('/').at(-1) as SettingsSection}/>;}
