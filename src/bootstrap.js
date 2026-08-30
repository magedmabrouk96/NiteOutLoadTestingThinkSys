import http from 'k6/http';
import { ENV, url } from '../config/environments.js';
import { setupAuthentication } from './auth.js';
import { getBars,getEvents,parse,ok } from './api.js';
import { selectVenues,eventIdFrom } from './data.js';
import { bootstrapFailures,bootstrapSuccess } from './metrics.js';

function probeQueueVenues(token, venues){
  if(!ENV.enableQueue || !venues.length) return [];
  if(ENV.queueVenueIds.length) return venues.filter(id=>ENV.queueVenueIds.includes(id));

  const supported=[];
  for(const venueId of venues){
    const r=http.get(url(`/bars/${encodeURIComponent(venueId)}/queue`),{
      timeout:ENV.requestTimeout,
      headers:{accept:'application/json',Authorization:`Bearer ${token}`},
      tags:{endpoint:'/bars/{barId}/queue-probe',api_group:'probe',capability_probe:'true'},
      // A capability probe is allowed to return a client-side "not supported"
      // response without polluting the real user-journey http_req_failed metric.
      // 5xx and transport failures are still treated as genuine failures.
      responseCallback:http.expectedStatuses({min:200,max:499}),
    });
    if(r && r.status>=200 && r.status<300) supported.push(venueId);
  }
  return supported;
}

export function setupTestData(){
  const auth=setupAuthentication();
  const token=auth.tokens[0];
  let venues=[...ENV.venueIds];
  let eventId=ENV.eventId;

  if(!venues.length){
    const r=getBars(token);
    const passed=ok(r,'SETUP GET /bars');
    bootstrapSuccess.add(passed,{step:'bars'});
    if(!passed){ bootstrapFailures.add(1,{step:'bars'}); throw new Error('Preflight failed: GET /bars unavailable. Stop before load generation.'); }
    venues=selectVenues(parse(r),[]).slice(0,ENV.maxBootstrapVenues);
    if(!venues.length) throw new Error('Preflight failed: GET /bars returned no venue IDs.');
  }

  if(!eventId){
    const r=getEvents(token);
    const passed=ok(r,'SETUP GET /events');
    bootstrapSuccess.add(passed,{step:'events'});
    if(passed) eventId=eventIdFrom(parse(r),'');
    else bootstrapFailures.add(1,{step:'events'});
  }

  const queueVenueIds=probeQueueVenues(token,venues);
  console.log(`Queue capability: ${queueVenueIds.length}/${venues.length} venues enabled${ENV.queueVenueIds.length?' (configured override)':' (auto-probed)'}`);

  return {auth,context:{venues,eventId,queueVenueIds}};
}
