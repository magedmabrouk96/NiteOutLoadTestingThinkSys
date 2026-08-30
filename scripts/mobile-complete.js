import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { mobileCompleteJourney } from '../src/journeys/mobile-complete.js';
import { ENV } from '../config/environments.js';
export const options={vus:Number(__ENV.VUS||1),iterations:Number(__ENV.ITERATIONS||1),thresholds:ENV.thresholds};
export function setup(){return setupTestData();}
export default function(data){mobileCompleteJourney(tokenForVu(data.auth),data.context);}
