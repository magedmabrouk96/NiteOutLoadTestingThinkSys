import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import { searchUsers,getDjs,getInviteCode,getBlockedUsers,getWhoBlockedMe,getLeaderboard,ok } from '../api.js';
import { pickQuery } from '../data.js';
import { journeyDuration,journeySuccess,skippedOperations } from '../metrics.js';

export function socialJourney(token){
  const start=Date.now(); let passed=true;
  if(ENV.enableUserSearch) passed=ok(searchUsers(token,pickQuery()),'GET /users')&&passed;
  else skippedOperations.add(1,{operation:'user_search_disabled'});
  if(ENV.enableDjs) passed=ok(getDjs(token),'GET /djs')&&passed;
  else skippedOperations.add(1,{operation:'djs_disabled'});
  passed=ok(getInviteCode(token),'GET /user-invite-code')&&passed;
  passed=ok(getBlockedUsers(token),'GET /my-blocked-users')&&passed;
  passed=ok(getWhoBlockedMe(token),'GET /who-blocked-me')&&passed;
  passed=ok(getLeaderboard(token,'All'),'GET /leaderboard')&&passed;
  sleep(2+Math.random()*3);
  journeyDuration.add(Date.now()-start,{journey:'social'});
  journeySuccess.add(passed,{journey:'social'});
}
