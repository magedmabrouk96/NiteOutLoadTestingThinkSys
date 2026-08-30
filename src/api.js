import { url } from '../config/environments.js';
import { get, post, del, json, expect2xx } from './http.js';
import { venueApiDuration,musicApiDuration,eventApiDuration,chatApiDuration,leaderboardApiDuration,socialApiDuration,profileApiDuration } from './metrics.js';

function timed(metric,response){ if(response && response.timings) metric.add(response.timings.duration); return response; }
function ep(path,group){ return {tags:{endpoint:path,api_group:group}}; }

export const getBars=t=>timed(venueApiDuration,get(url('/bars'),t,ep('/bars','venue')));
export const getBar=(t,id)=>timed(venueApiDuration,get(url(`/bars/${encodeURIComponent(id)}`),t,ep('/bars/{barId}','venue')));
export const getBarMusic=(t,id)=>timed(musicApiDuration,get(url(`/bars/${encodeURIComponent(id)}/music`),t,ep('/bars/{barId}/music','music')));
export const getPlayingSongs=t=>timed(musicApiDuration,get(url('/home/playing-songs'),t,ep('/home/playing-songs','music')));
export const getBarQueue=(t,id)=>timed(musicApiDuration,get(url(`/bars/${encodeURIComponent(id)}/queue`),t,ep('/bars/{barId}/queue','music')));
export const getAnnouncement=(t,id)=>timed(venueApiDuration,get(url(`/bars/${encodeURIComponent(id)}/getannouncement`),t,ep('/bars/{barId}/getannouncement','venue')));
export const getBarFeed=(t,id)=>timed(venueApiDuration,get(url(`/bars/${encodeURIComponent(id)}/feed`),t,ep('/bars/{barId}/feed','venue')));
export const getStreamInfo=(t,ids)=>timed(venueApiDuration,get(url(`/bars/stream-info?barIds=${ids.map(encodeURIComponent).join(',')}`),t,ep('/bars/stream-info','venue')));

export const getEvents=t=>timed(eventApiDuration,get(url('/events?filter=CURRENT'),t,ep('/events','events')));
export const getCurrentEvents=t=>timed(eventApiDuration,get(url('/events/current'),t,ep('/events/current','events')));
export const getEventRsvps=(t,id)=>timed(eventApiDuration,get(url(`/events/${encodeURIComponent(id)}/rsvp`),t,ep('/events/{eventId}/rsvp','events')));
export const rsvpEvent=(t,id,status='GOING')=>timed(eventApiDuration,post(url(`/events/${encodeURIComponent(id)}/rsvp`),t,{status},ep('/events/{eventId}/rsvp','events')));
export const removeRsvp=(t,id)=>timed(eventApiDuration,del(url(`/events/${encodeURIComponent(id)}/rsvp`),t,ep('/events/{eventId}/rsvp','events')));
export const liveActivity=(t,id,action)=>timed(eventApiDuration,post(url(`/events/${encodeURIComponent(id)}/liveActivity`),t,{action},ep('/events/{eventId}/liveActivity','events')));
export const getEventGuests=(t,id)=>timed(eventApiDuration,get(url(`/event/${encodeURIComponent(id)}/guests`),t,ep('/event/{eventId}/guests','events')));
export const getEventProfile=t=>timed(profileApiDuration,get(url('/event/profile-data'),t,ep('/event/profile-data','profile')));

export const searchUsers=(t,q)=>timed(socialApiDuration,get(url(`/users?query=${encodeURIComponent(q)}`),t,ep('/users','social')));
export const getDjs=t=>timed(socialApiDuration,get(url('/djs'),t,ep('/djs','social')));
export const getInviteCode=t=>timed(socialApiDuration,get(url('/user-invite-code'),t,ep('/user-invite-code','social')));
export const getBlockedUsers=t=>timed(socialApiDuration,get(url('/my-blocked-users'),t,ep('/my-blocked-users','social')));
export const getWhoBlockedMe=t=>timed(socialApiDuration,get(url('/who-blocked-me'),t,ep('/who-blocked-me','social')));
export const getLeaderboard=(t,type='All')=>timed(leaderboardApiDuration,get(url(`/leaderboard?gameType=${encodeURIComponent(type)}`),t,ep('/leaderboard','social')));
export const postVenueChat=(t,payload)=>timed(chatApiDuration,post(url('/chat/messages'),t,payload,ep('/chat/messages','chat')));

export const parse=json;
export const ok=expect2xx;
