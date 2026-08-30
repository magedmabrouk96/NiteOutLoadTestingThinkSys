import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { mobileWriteValidationJourney } from '../src/journeys/mobile-complete.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    transport_error_rate: ['rate<0.01'],
    application_error_rate: ['rate<0.01'],
    checks: ['rate>0.99'],
    journey_success: ['rate>0.99'],
  },
};

export function setup() { return setupTestData(); }
export default function (data) {
  mobileWriteValidationJourney(tokenForVu(data.auth), data.context);
}
