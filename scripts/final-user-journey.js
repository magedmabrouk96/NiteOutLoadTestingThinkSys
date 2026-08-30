import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { ENV } from '../config/environments.js';
import { finalUserJourney } from '../src/journeys/final-user-journey.js';
import { executeMobileWrite } from '../src/journeys/mobile-complete.js';
import { detailedConsoleSummary, buildDetailedResult, clientHtmlReport } from '../src/reporting.js';

const profile = (__ENV.TEST_PROFILE || 'load').toLowerCase();

function durationSeconds(value){
  const m=String(value||'').trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/i);
  if(!m) throw new Error(`Unsupported TEST_DURATION=${value}. Use 45s, 5m, 1h, etc.`);
  const n=Number(m[1]); const u=m[2].toLowerCase();
  return Math.max(1,Math.round(n*({ms:.001,s:1,m:60,h:3600}[u])));
}
function stages(total,target){
  const seconds=durationSeconds(total);
  const weights=[.10,.10,.10,.10,.10,.40,.10];
  let used=0; const ds=weights.map((w,i)=>{const v=i===weights.length-1?seconds-used:Math.max(1,Math.floor(seconds*w));used+=v;return `${v}s`;});
  const p=n=>Math.max(1,Math.round(target*n));
  return [
    {duration:ds[0],target:p(.10)}, {duration:ds[1],target:p(.25)}, {duration:ds[2],target:p(.50)},
    {duration:ds[3],target:p(.75)}, {duration:ds[4],target}, {duration:ds[5],target}, {duration:ds[6],target:0},
  ];
}
function scenario(){
  if(profile==='coverage') return {executor:'shared-iterations',vus:1,iterations:1,maxDuration:ENV.duration,exec:'completeJourney',gracefulStop:'45s'};
  if(profile==='smoke') return {executor:'constant-vus',vus:1,duration:ENV.duration,exec:'completeJourney',gracefulStop:'45s'};
  return {executor:'ramping-vus',startVUs:0,stages:stages(ENV.duration,ENV.totalVUs),exec:'completeJourney',gracefulRampDown:'45s',gracefulStop:'45s'};
}

export const options={
  scenarios:{final_niteout_user_journey:scenario()},
  thresholds:ENV.thresholds,
  userAgent:'NiteOut-K6-Final-Journey/9.4',
  tags:{test_profile:profile,environment:ENV.environment,load_generator:ENV.loadGenerator},
  discardResponseBodies:false,
  noConnectionReuse:false,
  noVUConnectionReuse:false,
  batchPerHost:6,
  summaryTrendStats:['avg','min','med','max','p(90)','p(95)','p(99)'],
};

export function setup(){
  if(ENV.loadGenerator==='local' && ENV.totalVUs>ENV.localMaxVUs && profile!=='smoke' && profile!=='coverage' && !ENV.allowHighLocalLoad){
    throw new Error(`Safety guard: VUS=${ENV.totalVUs} exceeds LOCAL_MAX_VUS=${ENV.localMaxVUs}. Use a dedicated generator or lower VUS.`);
  }
  const data=setupTestData();
  const token=data.auth.tokens[0];

  // Full API coverage phase: execute validated onboarding/profile writes exactly once globally.
  // This is enabled only in the coverage profile, never repeatedly in normal load.
  if(ENV.runRareMobileWritesOnce){
    const once=['waitinglist','handle-check','handle-update','profile','profile-image','group-chat-image','rsvp','chat-message'];
    for(const target of once){
      const success=executeMobileWrite(target,token,data.context);
      if(!success) throw new Error(`One-time Mobile coverage step failed: ${target}`);
    }
    if(!ENV.excludeEmailSubscribe){
      const success=executeMobileWrite('email-subscribe',token,data.context);
      if(!success) throw new Error('One-time Mobile coverage step failed: email-subscribe');
    } else {
      console.log('[COVERAGE] POST /subscribe-to-email-list excluded per client confirmation.');
    }
  }

  console.log(`[FINAL] venues=${data.context.venues.length} targetVUs=${ENV.totalVUs} session=${ENV.sessionSeconds}s heartbeat=${ENV.heartbeatSeconds}s runtimeWrites=${ENV.enableRuntimeWrites}`);
  return data;
}

export function completeJourney(data){
  finalUserJourney(tokenForVu(data.auth),data.context);
}

export function handleSummary(data){
  const meta={profile,environment:ENV.environment,runId:__ENV.K6_RUN_ID||'',vus:ENV.totalVUs,duration:ENV.duration,sessionSeconds:ENV.sessionSeconds,heartbeatSeconds:ENV.heartbeatSeconds,venueIds:ENV.venueIds,authModel:'Concurrent virtual sessions use the single client-provided Firebase test identity',testUserIdentity:ENV.testUserIdentity,excludedEndpoints:['POST /subscribe-to-email-list — excluded by client confirmation']};
  const detailed=buildDetailedResult(data,meta);
  const jsonPath=__ENV.K6_DETAILED_JSON || 'reports/latest-detailed-summary.json';
  const clientHtmlPath=__ENV.K6_CLIENT_HTML || 'reports/latest-client-report.html';
  return {
    stdout: detailedConsoleSummary(data,meta),
    [jsonPath]: JSON.stringify(detailed,null,2),
    [clientHtmlPath]: clientHtmlReport(data,meta),
  };
}
