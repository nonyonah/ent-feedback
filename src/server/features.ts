import 'server-only';
import {features,type Feature} from '@/lib/features';
import {ServiceError} from '@/server/result';
export function requireFeature(feature:Feature){
 if(!features[feature])throw new ServiceError('forbidden','This feature is unavailable in v1.');
}
