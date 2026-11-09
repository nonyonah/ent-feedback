'use client';
import * as React from 'react';
import type {BillingSummary} from '@/server/billing/summary';
type Cache=Map<string,BillingSummary>;
const BillingCacheContext=React.createContext<Cache|null>(null);
// Scoped to the authenticated dashboard tree; never persisted to browser storage.
export function BillingCacheProvider({initial,children}:{initial:Record<string,BillingSummary>;children:React.ReactNode}){
 const cache=React.useMemo(()=>new Map(Object.entries(initial)),[initial]);
 return <BillingCacheContext.Provider value={cache}>{children}</BillingCacheContext.Provider>;
}
export function useBillingCache(){return React.useContext(BillingCacheContext);}
