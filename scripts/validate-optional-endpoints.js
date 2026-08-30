import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { getStreamInfo,getBarFeed,getDjs,ok } from '../src/api.js';
export const options={vus:1,iterations:1};
export function setup(){return setupTestData();}
export default function(data){
  const token=tokenForVu(data.auth), venues=data.context.venues;
  if(venues.length) {
    ok(getStreamInfo(token,venues.slice(0,5)),'GET /bars/stream-info');
    ok(getBarFeed(token,venues[0]),'GET /bars/{barId}/feed');
  }
  ok(getDjs(token),'GET /djs');
}
