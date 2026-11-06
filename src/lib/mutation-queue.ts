/** Serialize writes, and let later work continue even if an earlier write fails. */
export function createMutationQueue(){
 let tail:Promise<unknown>=Promise.resolve();
 return {run<T>(operation:()=>Promise<T>):Promise<T>{
  const task=tail.then(operation);
  tail=task.then(()=>undefined,()=>undefined);
  return task;
 }};
}
