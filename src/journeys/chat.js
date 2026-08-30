import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import { bootstrapJourney } from './bootstrap.js';
import { postVenueChat,ok } from '../api.js';
import { skippedOperations,journeyDuration,journeySuccess } from '../metrics.js';

export function chatJourney(token,shared){
  const start=Date.now(); let passed=true;
  const ctx=bootstrapJourney(token,shared);
  if(!ctx){ journeySuccess.add(false,{journey:'chat'}); return; }
  passed=ctx.passed&&passed;
  if(!ENV.enableWrites){
    skippedOperations.add(1,{operation:'venue_chat_write_disabled'});
    sleep(2+Math.random()*3);
  } else {
    const payload={barid:ctx.venueId,environment:ENV.environment,timestamp:Date.now(),message:`k6-${__VU}-${__ITER}-${Date.now()}`,userUUID:`k6-vu-${__VU}`,userName:`K6User${__VU}`,userProfilePicture:'',userRole:'USER'};
    passed=ok(postVenueChat(token,payload),'POST /chat/messages')&&passed;
    sleep(2+Math.random()*4);
  }
  journeyDuration.add(Date.now()-start,{journey:'chat'});
  journeySuccess.add(passed,{journey:'chat'});
}
