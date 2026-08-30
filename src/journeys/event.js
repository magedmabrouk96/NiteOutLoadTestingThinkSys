import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import { bootstrapJourney } from './bootstrap.js';
import { getCurrentEvents,getEventRsvps,rsvpEvent,liveActivity,ok } from '../api.js';
import { journeyDuration,journeySuccess,skippedOperations } from '../metrics.js';

export function eventAttendeeJourney(token,shared){
  const start=Date.now(); let passed=true;
  const ctx=bootstrapJourney(token,shared);
  if(!ctx){ journeySuccess.add(false,{journey:'event_attendee'}); return; }
  passed=ctx.passed&&passed;
  passed=ok(getCurrentEvents(token),'GET /events/current')&&passed;
  if(ctx.eventId){
    passed=ok(getEventRsvps(token,ctx.eventId),'GET /events/{eventId}/rsvp')&&passed;
    if(ENV.enableWrites){
      passed=ok(rsvpEvent(token,ctx.eventId,'GOING'),'POST /events/{eventId}/rsvp')&&passed;
      if(ENV.enableLiveActivity) passed=ok(liveActivity(token,ctx.eventId,'create'),'POST liveActivity create')&&passed;
      sleep(1+Math.random()*2);
      if(ENV.enableLiveActivity) passed=ok(liveActivity(token,ctx.eventId,'end'),'POST liveActivity end')&&passed;
    } else skippedOperations.add(1,{operation:'event_writes_disabled'});
  } else skippedOperations.add(1,{operation:'event_id_unavailable'});
  journeyDuration.add(Date.now()-start,{journey:'event_attendee'});
  journeySuccess.add(passed,{journey:'event_attendee'});
}
