import { check } from 'k6';
import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { getBar,getPlayingSongs,getCurrentEvents,getInviteCode,getLeaderboard,ok } from '../src/api.js';
export const options={vus:1,iterations:1,thresholds:{checks:['rate>0.99']}};
export function setup(){return setupTestData();}
export default function(data){
  const token=tokenForVu(data.auth), venue=data.context.venues[0];
  check(data.context,{ 'preflight has venue':x=>x.venues.length>0 });
  if(venue) ok(getBar(token,venue),'GET /bars/{barId}');
  ok(getPlayingSongs(token),'GET /home/playing-songs');
  ok(getCurrentEvents(token),'GET /events/current');
  ok(getInviteCode(token),'GET /user-invite-code');
  ok(getLeaderboard(token,'All'),'GET /leaderboard');
}
