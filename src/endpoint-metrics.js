import { Counter, Trend } from 'k6/metrics';

// Static endpoint registry for the final NiteOut user journey. These metrics are
// intentionally created in init context so they aggregate correctly across VUs.
export const ENDPOINT_DEFINITIONS = [
  { id:'setup_bars', phase:'Bootstrap', method:'GET', endpoint:'/bars', metricKey:'SETUP GET /bars' },
  { id:'setup_events', phase:'Bootstrap', method:'GET', endpoint:'/events?filter=CURRENT', metricKey:'SETUP GET /events' },

  { id:'get_bars', phase:'Session', method:'GET', endpoint:'/bars', metricKey:'GET /bars' },
  { id:'get_bar', phase:'Session', method:'GET', endpoint:'/bars/{barId}', metricKey:'GET /bars/{barId}' },
  { id:'get_playing_songs', phase:'Session', method:'GET', endpoint:'/home/playing-songs', metricKey:'GET /home/playing-songs' },
  { id:'get_queue', phase:'Session', method:'GET', endpoint:'/bars/{barId}/queue', metricKey:'GET /bars/{barId}/queue' },
  { id:'get_music', phase:'Heartbeat', method:'GET', endpoint:'/bars/{barId}/music', metricKey:'GET /bars/{barId}/music' },
  { id:'get_announcement', phase:'Heartbeat', method:'GET', endpoint:'/bars/{barId}/getannouncement', metricKey:'GET /bars/{barId}/getannouncement' },
  { id:'get_feed', phase:'Heartbeat', method:'GET', endpoint:'/bars/{barId}/feed', metricKey:'GET /bars/{barId}/feed' },
  { id:'get_stream_info', phase:'Optional', method:'GET', endpoint:'/bars/stream-info', metricKey:'GET /bars/stream-info' },

  { id:'get_current_events', phase:'Event', method:'GET', endpoint:'/events/current', metricKey:'GET /events/current' },
  { id:'get_event_rsvp', phase:'Event/Heartbeat', method:'GET', endpoint:'/events/{eventId}/rsvp', metricKey:'GET /events/{eventId}/rsvp' },
  { id:'post_event_rsvp', phase:'Runtime Write', method:'POST', endpoint:'/events/{eventId}/rsvp', metricKey:'POST /events/{eventId}/rsvp' },
  { id:'post_live_activity', phase:'Optional Write', method:'POST', endpoint:'/events/{eventId}/liveActivity', metricKey:'POST liveActivity update' },

  { id:'get_users', phase:'Social', method:'GET', endpoint:'/users', metricKey:'GET /users' },
  { id:'get_invite_code', phase:'Social', method:'GET', endpoint:'/user-invite-code', metricKey:'GET /user-invite-code' },
  { id:'get_blocked', phase:'Social', method:'GET', endpoint:'/my-blocked-users', metricKey:'GET /my-blocked-users' },
  { id:'get_who_blocked', phase:'Social', method:'GET', endpoint:'/who-blocked-me', metricKey:'GET /who-blocked-me' },
  { id:'get_leaderboard', phase:'Social', method:'GET', endpoint:'/leaderboard', metricKey:'GET /leaderboard' },

  { id:'post_waitinglist', phase:'Coverage Write', method:'POST', endpoint:'/phone-waitinglist', metricKey:'POST /phone-waitinglist' },
  { id:'post_handle_check', phase:'Coverage Write', method:'POST', endpoint:'/user/handle/check', metricKey:'POST /user/handle/check' },
  { id:'post_handle', phase:'Coverage Write', method:'POST', endpoint:'/user/handle', metricKey:'POST /user/handle' },
  { id:'post_profile', phase:'Coverage Write', method:'POST', endpoint:'/me', metricKey:'POST /me' },
  { id:'post_profile_image', phase:'Coverage Write', method:'POST', endpoint:'/profileImage', metricKey:'POST /profileImage' },
  { id:'post_group_chat_image', phase:'Coverage Write', method:'POST', endpoint:'/groupChats', metricKey:'POST /groupChats' },
  { id:'post_email_subscribe', phase:'Client Excluded', method:'POST', endpoint:'/subscribe-to-email-list', metricKey:'POST /subscribe-to-email-list' },
  { id:'post_chat', phase:'Runtime Write', method:'POST', endpoint:'/chat/messages', metricKey:'POST /chat/messages' },
];

const byKey = {};
export const endpointMetrics = {};
for (const def of ENDPOINT_DEFINITIONS) {
  byKey[def.metricKey] = def;
  endpointMetrics[def.id] = {
    calls: new Counter(`endpoint_${def.id}_calls`),
    passes: new Counter(`endpoint_${def.id}_passes`),
    failures: new Counter(`endpoint_${def.id}_failures`),
    duration: new Trend(`endpoint_${def.id}_duration`, true),
  };
}

export function recordEndpointResult(metricKey, response, passed, transportFailure=false) {
  const def = byKey[metricKey];
  if (!def) return;
  const m = endpointMetrics[def.id];
  m.calls.add(1);
  if (passed) m.passes.add(1); else m.failures.add(1);
  if (!transportFailure && response?.timings && Number.isFinite(response.timings.duration)) {
    m.duration.add(response.timings.duration);
  }
}
