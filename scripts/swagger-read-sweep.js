import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { invoke } from '../src/swagger-client.js';
import { OPENAPI_OPERATIONS } from '../src/generated/openapi-catalog.js';
import { ENV } from '../config/environments.js';
import { skippedOperations } from '../src/metrics.js';
export const options={vus:1,iterations:1};
export function setup(){return setupTestData();}
function argsFor(op,c){
 const a={path:{},query:{},params:{apiGroup:'swagger_read'}};
 for(const p of op.parameters||[]){
   let v=''; if(p.name==='barId')v=c.venueIds?.[0]||''; else if(p.name==='eventId')v=c.eventId||ENV.eventId; else if(p.name==='planId')v=ENV.planId; else if(p.name==='playlistId')v=ENV.playlistId; else if(p.name==='userId')v=ENV.targetUserId; else if(p.name==='email')v=ENV.testEmail; else if(p.name==='query')v='a'; else if(p.name==='barIds')v=(c.venueIds||[]).join(','); else if(p.name==='page')v=1; else if(p.name==='gameType')v='All'; else if(p.name==='withAccess')v='true'; else if(p.name==='filter')v='CURRENT';
   if(p.required && !v)return null; (p.in==='path'?a.path:a.query)[p.name]=v;
 }
 return a;
}
export default function(data){
 const t=tokenForVu(data.auth),c=data.context;
 for(const op of OPENAPI_OPERATIONS.filter(o=>o.class==='safe_read')){
   if(op.path==='/bars/stream-info'&&!ENV.enableStreamInfo){skippedOperations.add(1,{operation:op.key});continue;}
   if(op.path.endsWith('/feed')&&!ENV.enableVenueFeed){skippedOperations.add(1,{operation:op.key});continue;}
   if(op.path==='/djs'&&!ENV.enableDjs){skippedOperations.add(1,{operation:op.key});continue;}
   const a=argsFor(op,c); if(!a){skippedOperations.add(1,{operation:op.key});continue;}
   invoke(op.key,t,a);
 }
}
