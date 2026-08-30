import { ENV } from '../../config/environments.js';
import { venueForVu } from '../data.js';
import { getBar,getPlayingSongs,getStreamInfo,ok } from '../api.js';
import { skippedOperations } from '../metrics.js';

export function bootstrapJourney(token,shared){
  const venues=shared?.venues||[];
  const venueId=venueForVu(venues);
  if(!venueId){ skippedOperations.add(1,{operation:'missing_venue_context'}); return null; }

  let passed=true;
  passed=ok(getBar(token,venueId),'GET /bars/{barId}')&&passed;
  passed=ok(getPlayingSongs(token),'GET /home/playing-songs')&&passed;
  if(ENV.enableStreamInfo && venues.length){
    passed=ok(getStreamInfo(token,venues.slice(0,ENV.maxBootstrapVenues)),'GET /bars/stream-info')&&passed;
  } else skippedOperations.add(1,{operation:'stream_info_disabled'});

  return {venueId,venues,eventId:shared?.eventId||'',passed};
}
