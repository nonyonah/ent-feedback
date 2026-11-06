// Keep local data URLs in the draft; only attachment IDs cross the mutation boundary.
type UploadScope = {workspaceId:string;boardId:string;actorKey:string;guestToken?:string};
const prefix=(scope:UploadScope)=>`${scope.workspaceId}:${scope.boardId}:${scope.actorKey}:`;
export function createFeedbackUploader() {
  const uploaded = new Map<string, Promise<string>>();
  return {
    async upload(images: string[] | undefined, scope: UploadScope) {
      if (!images?.length) return undefined;
      if (images.length > 3) throw Error('Attach up to 3 images.');
      const ids: string[] = [];
      for (const image of images) {
        if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image) || image.length > 2_800_000) throw Error('Choose a supported image under 2 MB.');
        const key = prefix(scope)+image;
        let pending = uploaded.get(key);
        if (!pending) {
          pending = (async () => {
            const blob = await (await fetch(image)).blob();
            if (blob.size > 2 * 1024 * 1024) throw Error('Choose an image under 2 MB.');
            const form = new FormData();
            form.set('file', blob, 'attachment');
            form.set('workspaceId', scope.workspaceId);
            form.set('boardId', scope.boardId);
            if (scope.guestToken) form.set('guestToken', scope.guestToken);
            const response = await fetch('/api/attachments', { method: 'POST', body: form, credentials: 'same-origin' });
            const result = await response.json();
            if (!response.ok || !result.ok || typeof result.data?.id !== 'string') throw Error(result.error?.message ?? 'Your image could not be uploaded. Try again.');
            return result.data.id as string;
          })();
          uploaded.set(key, pending);
          // Bound retained preview memory. Successful submissions clear this cache.
          if (uploaded.size > 12) uploaded.delete(uploaded.keys().next().value!);
          pending.catch(() => { if (uploaded.get(key) === pending) uploaded.delete(key); });
        }
        ids.push(await pending);
      }
      return ids;
    },
    clear(scope?:UploadScope) { if(!scope){uploaded.clear();return;}for(const key of uploaded.keys())if(key.startsWith(prefix(scope)))uploaded.delete(key); },
  };
}
