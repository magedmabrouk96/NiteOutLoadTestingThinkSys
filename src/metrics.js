import { Counter, Rate, Trend } from 'k6/metrics';

export const errorsTotal = new Counter('errors_total');
export const businessErrors = new Counter('business_errors_total');
export const skippedOperations = new Counter('skipped_operations_total');
export const transportErrors = new Counter('transport_errors_total');
export const applicationErrors = new Counter('application_errors_total');
export const bootstrapFailures = new Counter('bootstrap_failures_total');

export const transportErrorRate = new Rate('transport_error_rate');
export const applicationErrorRate = new Rate('application_error_rate');
export const journeySuccess = new Rate('journey_success');
export const heartbeatSuccess = new Rate('heartbeat_success');
export const bootstrapSuccess = new Rate('bootstrap_success');

export const journeyDuration = new Trend('journey_duration', true);
export const activeSessionDuration = new Trend('active_session_duration', true);
export const heartbeatDuration = new Trend('heartbeat_duration', true);
export const tokenDuration = new Trend('token_duration', true);
export const venueApiDuration = new Trend('venue_api_duration', true);
export const musicApiDuration = new Trend('music_api_duration', true);
export const eventApiDuration = new Trend('event_api_duration', true);
export const chatApiDuration = new Trend('chat_api_duration', true);
export const leaderboardApiDuration = new Trend('leaderboard_api_duration', true);
export const socialApiDuration = new Trend('social_api_duration', true);
export const profileApiDuration = new Trend('profile_api_duration', true);
