import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import {
  getBars, getBar, getBarQueue, getPlayingSongs,
  getCurrentEvents, getEventRsvps, rsvpEvent,
  searchUsers, getInviteCode, getBlockedUsers, getWhoBlockedMe, getLeaderboard,
  postVenueChat, ok,
} from '../api.js';
import { venueForVu, pickQuery } from '../data.js';
import { activeHeartbeatSession } from './heartbeat.js';
import { journeyDuration, journeySuccess, skippedOperations, activeSessionDuration } from '../metrics.js';

export function finalUserJourney(token, shared){
  const started = Date.now();
  let passed = true;
  const venues = shared?.venues || [];
  const venueId = venueForVu(venues);
  const eventId = shared?.eventId || '';

  if(!venueId){
    skippedOperations.add(1,{operation:'final_journey_missing_venue'});
    journeySuccess.add(false,{journey:'final_user_journey'});
    return;
  }

  // 1) App/session bootstrap — Mobile reads + venue context.
  passed = ok(getBars(token),'GET /bars') && passed;
  passed = ok(getBar(token,venueId),'GET /bars/{barId}') && passed;
  passed = ok(getPlayingSongs(token),'GET /home/playing-songs') && passed;

  const queueSupported = Array.isArray(shared?.queueVenueIds) && shared.queueVenueIds.includes(venueId);
  if(ENV.enableQueue && queueSupported) passed = ok(getBarQueue(token,venueId),'GET /bars/{barId}/queue') && passed;
  else skippedOperations.add(1,{operation:ENV.enableQueue?'queue_unsupported_for_venue':'queue_disabled'});

  // 2) Event state and RSVP
  passed = ok(getCurrentEvents(token),'GET /events/current') && passed;
  if(eventId){
    passed = ok(getEventRsvps(token,eventId),'GET /events/{eventId}/rsvp') && passed;
    if(ENV.enableRuntimeWrites){
      passed = ok(rsvpEvent(token,eventId,ENV.testRsvpStatus),'POST /events/{eventId}/rsvp') && passed;
    } else skippedOperations.add(1,{operation:'runtime_writes_disabled'});
  } else skippedOperations.add(1,{operation:'event_id_unavailable'});

  // 3) Social/discovery actions performed during a normal session.
  if(ENV.enableUserSearch) passed = ok(searchUsers(token,pickQuery()),'GET /users') && passed;
  else skippedOperations.add(1,{operation:'user_search_disabled'});
  passed = ok(getInviteCode(token),'GET /user-invite-code') && passed;
  passed = ok(getBlockedUsers(token),'GET /my-blocked-users') && passed;
  passed = ok(getWhoBlockedMe(token),'GET /who-blocked-me') && passed;
  passed = ok(getLeaderboard(token,'All'),'GET /leaderboard') && passed;

  // 4) Active venue presence. This is the recurring heartbeat behavior agreed for the load model:
  // music + announcement + RSVP state every HEARTBEAT_SECONDS (+ jitter).
  const activeStart = Date.now();
  passed = activeHeartbeatSession(token,venueId,eventId,ENV.sessionSeconds) && passed;
  activeSessionDuration.add(Date.now()-activeStart,{journey:'final_user_journey'});

  // 5) Venue chat
  if(ENV.enableRuntimeWrites && ENV.chatUserUuid){
    const payload = {
      barid: venueId,
      environment: ENV.environment,
      timestamp: Date.now(),
      message: `${ENV.chatMessagePrefix}-${__VU}-${__ITER}-${Date.now()}`,
      userUUID: ENV.chatUserUuid,
      userName: ENV.chatUserName,
      userProfilePicture: ENV.chatUserProfilePicture,
      userRole: ENV.chatUserRole,
    };
    passed = ok(postVenueChat(token,payload),'POST /chat/messages') && passed;
  } else skippedOperations.add(1,{operation: ENV.enableRuntimeWrites ? 'runtime_chat_missing_user_uuid' : 'runtime_writes_disabled'});

  sleep(1 + Math.random()*2);
  journeyDuration.add(Date.now()-started,{journey:'final_user_journey'});
  journeySuccess.add(passed,{journey:'final_user_journey'});
}
