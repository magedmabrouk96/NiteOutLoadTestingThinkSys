import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { venueSessionJourney } from '../src/journeys/venue.js';
import { eventAttendeeJourney } from '../src/journeys/event.js';
import { socialJourney } from '../src/journeys/social.js';
import { chatJourney } from '../src/journeys/chat.js';
import { ENV } from '../config/environments.js';

const profile=(__ENV.TEST_PROFILE||'smoke').toLowerCase();

function split(total){
  total=Math.max(1,total);
  let venue=Math.floor(total*0.70), event=Math.floor(total*0.15), social=Math.floor(total*0.10);
  let chat=total-venue-event-social;
  if(total>=4){ venue=Math.max(1,venue); event=Math.max(1,event); social=Math.max(1,social); chat=Math.max(1,total-venue-event-social); }
  return {venue,event,social,chat};
}
function constant(vus,duration,exec){return{executor:'constant-vus',vus,duration,exec,gracefulStop:'45s'};}
function durationSeconds(value){
  const m=String(value||'').trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/i);
  if(!m) throw new Error(`Unsupported TEST_DURATION=${value}. Use values like 45s, 3m, 1h.`);
  const n=Number(m[1]), unit=m[2].toLowerCase();
  return Math.max(1,Math.round(n*({ms:.001,s:1,m:60,h:3600}[unit])));
}
function stageDurations(total,weights){
  const seconds=durationSeconds(total), out=[]; let used=0;
  weights.forEach((w,i)=>{ const v=i===weights.length-1 ? Math.max(1,seconds-used) : Math.max(1,Math.floor(seconds*w)); out.push(`${v}s`); used+=v; });
  return out;
}
function ramping(target,totalDuration,exec){
  const p=n=>Math.max(1,Math.round(target*n));
  const d=stageDurations(totalDuration,[.10,.10,.10,.10,.10,.40,.10]);
  return {executor:'ramping-vus',exec,startVUs:0,stages:[
    {duration:d[0],target:p(.10)}, {duration:d[1],target:p(.25)}, {duration:d[2],target:p(.50)},
    {duration:d[3],target:p(.75)}, {duration:d[4],target}, {duration:d[5],target}, {duration:d[6],target:0},
  ],gracefulRampDown:'45s',gracefulStop:'45s'};
}
function stress(target,totalDuration,exec){
  const p=n=>Math.max(1,Math.round(target*n));
  const d=stageDurations(totalDuration,[.12,.12,.12,.12,.18,.22,.12]);
  return {executor:'ramping-vus',exec,startVUs:0,stages:[
    {duration:d[0],target:p(.25)}, {duration:d[1],target:p(.50)}, {duration:d[2],target:p(.75)},
    {duration:d[3],target}, {duration:d[4],target:Math.round(target*1.25)},
    {duration:d[5],target:Math.round(target*1.5)}, {duration:d[6],target:0},
  ],gracefulRampDown:'45s'};
}
function add(out,name,count,builder,exec){if(count>0)out[name]=builder(count,exec);}

function scenarios(){
  if(profile==='smoke'){
    const d=__ENV.TEST_DURATION||'45s';
    return {venue_session:constant(1,d,'venueScenario'),event_attendee:constant(1,d,'eventScenario'),social:constant(1,d,'socialScenario'),chat:constant(1,d,'chatScenario')};
  }
  if(profile==='local'){
    const target=Math.min(ENV.totalVUs,ENV.localMaxVUs); const c=split(target),out={};
    add(out,'venue_session',c.venue,(n,e)=>ramping(n,ENV.duration,e),'venueScenario');
    add(out,'event_attendee',c.event,(n,e)=>ramping(n,ENV.duration,e),'eventScenario');
    add(out,'social',c.social,(n,e)=>ramping(n,ENV.duration,e),'socialScenario');
    add(out,'chat',c.chat,(n,e)=>ramping(n,ENV.duration,e),'chatScenario'); return out;
  }
  const target=ENV.totalVUs,c=split(target),out={};
  const builder=profile==='soak' ? ((n,e)=>constant(n,ENV.duration,e)) : profile==='stress' ? ((n,e)=>stress(n,e)) : ((n,e)=>ramping(n,ENV.duration,e));
  add(out,'venue_session',c.venue,builder,'venueScenario'); add(out,'event_attendee',c.event,builder,'eventScenario'); add(out,'social',c.social,builder,'socialScenario'); add(out,'chat',c.chat,builder,'chatScenario'); return out;
}

export const options={
  scenarios:scenarios(), thresholds:ENV.thresholds,
  userAgent:'NiteOut-K6-Performance/4.0',
  tags:{test_profile:profile,environment:ENV.environment,load_generator:ENV.loadGenerator},
  discardResponseBodies:false,
  noConnectionReuse:false,
  noVUConnectionReuse:false,
  batchPerHost:6,
};

export function setup(){
  if(ENV.loadGenerator==='local' && ENV.totalVUs>ENV.localMaxVUs && profile!=='smoke' && !ENV.allowHighLocalLoad){
    throw new Error(`Safety guard: VUS=${ENV.totalVUs} exceeds LOCAL_MAX_VUS=${ENV.localMaxVUs}. Use TEST_PROFILE=local, lower VUS, set LOAD_GENERATOR=ci/cloud, or explicitly set ALLOW_HIGH_LOCAL_LOAD=true.`);
  }
  const data=setupTestData();
  if(ENV.enableWrites && data.auth.tokens.length < Math.min(ENV.totalVUs,10) && profile!=='smoke' && !ENV.allowSharedWriteIdentity){
    throw new Error('Write-load safety guard: provide a K6_TOKEN_FILE with multiple test-user tokens, or explicitly set ALLOW_SHARED_WRITE_IDENTITY=true.');
  }
  return data;
}
function token(data){return tokenForVu(data.auth);}
export function venueScenario(data){venueSessionJourney(token(data),data.context);}
export function eventScenario(data){eventAttendeeJourney(token(data),data.context);}
export function socialScenario(data){socialJourney(token(data));}
export function chatScenario(data){chatJourney(token(data),data.context);}

