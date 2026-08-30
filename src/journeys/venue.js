import { sleep } from 'k6';
import { bootstrapJourney } from './bootstrap.js';
import { activeHeartbeatSession } from './heartbeat.js';
import { getBarQueue,getPlayingSongs,ok } from '../api.js';
import { activeSessionDuration,journeyDuration,journeySuccess,skippedOperations } from '../metrics.js';
import { ENV } from '../../config/environments.js';

export function venueSessionJourney(token,shared){
  const start=Date.now(); let passed=true;
  const ctx=bootstrapJourney(token,shared);
  if(!ctx){ journeySuccess.add(false,{journey:'venue_session'}); return; }
  passed=ctx.passed&&passed;
  const queueSupported=Array.isArray(shared?.queueVenueIds) && shared.queueVenueIds.includes(ctx.venueId);
  if(ENV.enableQueue && queueSupported) passed=ok(getBarQueue(token,ctx.venueId),'GET /bars/{barId}/queue')&&passed;
  else if(ENV.enableQueue) skippedOperations.add(1,{operation:'queue_unsupported_for_venue'});
  else skippedOperations.add(1,{operation:'queue_disabled'});
  passed=ok(getPlayingSongs(token),'GET /home/playing-songs')&&passed;
  sleep(Math.random()*2);
  const activeStart=Date.now();
  passed=activeHeartbeatSession(token,ctx.venueId,ctx.eventId,ENV.sessionSeconds)&&passed;
  activeSessionDuration.add(Date.now()-activeStart,{journey:'venue_session'});
  journeyDuration.add(Date.now()-start,{journey:'venue_session'});
  journeySuccess.add(passed,{journey:'venue_session'});
}
