export function needsWorkspaceRegistration({hasWorkspace,complete,hasSetupWorkspace}:{hasWorkspace:boolean;complete:boolean;hasSetupWorkspace:boolean}){
  return !hasWorkspace||(!complete&&hasSetupWorkspace);
}
