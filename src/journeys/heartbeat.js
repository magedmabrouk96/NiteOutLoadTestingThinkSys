import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import { getBarMusic,getAnnouncement,getBarFeed,getEventRsvps,liveActivity,ok } from '../api.js';
import { heartbeatDuration,heartbeatSuccess,skippedOperations } from '../metrics.js';

export function heartbeatOnce(token,venueId,eventId=''){
  const start=Date.now(); let passed=true;
  passed=ok(getBarMusic(token,venueId),'GET /bars/{barId}/music')&&passed;
  if(ENV.enableAnnouncement) passed=ok(getAnnouncement(token,venueId),'GET /bars/{barId}/getannouncement')&&passed;
  else skippedOperations.add(1,{operation:'announcement_disabled'});
  if(ENV.enableVenueFeed) passed=ok(getBarFeed(token,venueId),'GET /bars/{barId}/feed')&&passed;
  else skippedOperations.add(1,{operation:'venue_feed_disabled'});
  if(eventId) passed=ok(getEventRsvps(token,eventId),'GET /events/{eventId}/rsvp')&&passed;
  if(eventId&&ENV.enableWrites&&ENV.enableLiveActivity) passed=ok(liveActivity(token,eventId,'update'),'POST liveActivity update')&&passed;
  heartbeatDuration.add(Date.now()-start);
  heartbeatSuccess.add(passed);
  return passed;
}
export function activeHeartbeatSession(token,venueId,eventId,seconds=ENV.sessionSeconds){
  const end=Date.now()+seconds*1000;
  let passed=true;
  while(Date.now()<end){
    passed=heartbeatOnce(token,venueId,eventId)&&passed;
    const jitter=Math.random()*ENV.heartbeatJitterSeconds;
    sleep(Math.max(1,ENV.heartbeatSeconds+jitter));
  }
  return passed;
}
