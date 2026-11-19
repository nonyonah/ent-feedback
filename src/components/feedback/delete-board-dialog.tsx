'use client';

import {useState} from 'react';
import {useProject,type FeedbackBoard} from './project-provider';
import {Dialog,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ActionButton} from '@/components/ui/action-button';
import {ErrorNotice} from '@/components/ui/error-notice';
import {toastManager} from '@/components/ui/toast';

export function DeleteBoardDialog({board,onClose}:{board:FeedbackBoard|null;onClose:()=>void}){
 const {deleteBoard,boardsPending}=useProject();const [error,setError]=useState('');
 async function remove(){if(!board||boardsPending)return;setError('');try{await deleteBoard(board.id);toastManager.add({type:'success',title:'Board deleted'});onClose();}catch(e){setError(e instanceof Error?e.message:'The board couldn’t be deleted. Try again.');}}
 return <Dialog open={Boolean(board)} onOpenChange={open=>{if(!open&&!boardsPending)onClose();}}><DialogPopup className="max-w-sm" showCloseButton={!boardsPending}><div className="p-6"><DialogTitle>Delete {board?.name}?</DialogTitle><DialogDescription className="mt-2">This permanently deletes the board and all its feedback, comments and votes. Its public link and installed widgets will stop working. This can’t be undone.</DialogDescription>{error&&<ErrorNotice className="mt-4">{error}</ErrorNotice>}</div><DialogFooter><Button variant="secondary" disabled={boardsPending} onClick={onClose}>Cancel</Button><ActionButton variant="destructive" pendingLabel="Deleting board…" retryLabel="Retry deleting" state={boardsPending?'pending':error?'error':'idle'} disabled={boardsPending} onClick={()=>void remove()}>Delete board</ActionButton></DialogFooter></DialogPopup></Dialog>;
}
