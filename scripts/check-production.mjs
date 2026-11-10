// Read-only configuration check. Prints verdicts, never environment values.
import {config} from 'dotenv';
import {productionReadiness} from '../src/lib/production-readiness.ts';
config({path:'.env.local',quiet:true});
const checks=productionReadiness(process.env);
for(const check of checks)console.log(`${check.status.toUpperCase()} ${check.id}: ${check.message}`);
console.log('Configuration checks do not establish live provider or deployment readiness.');
if(checks.some(check=>check.status==='blocked'))process.exitCode=1;
