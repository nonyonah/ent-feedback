'use client';

import {useEffect} from 'react';
import NextError from 'next/error';
import {captureAnalyticsException} from '@/lib/analytics';

export default function GlobalError({error}:{error:Error&{digest?:string}}){
 useEffect(()=>{captureAnalyticsException(error);},[error]);
 return <html><body><NextError statusCode={0}/></body></html>;
}
