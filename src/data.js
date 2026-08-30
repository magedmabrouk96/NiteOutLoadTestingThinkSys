export function selectVenues(bars,configuredIds=[]) {
  if(configuredIds.length) return configuredIds;
  if(!Array.isArray(bars)) return [];
  return bars.map(b=>b?.barid||b?.id).filter(Boolean);
}
export function venueForVu(venues){ return venues?.length ? venues[(__VU-1)%venues.length] : ''; }
export function eventIdFrom(events,configuredId='') {
  if(configuredId) return configuredId;
  if(!Array.isArray(events)||!events.length) return '';
  const e=events[0]||{}; return e.id||e.eventId||e.eventid||e.uuid||'';
}
export function pickQuery(){ const a=['a','jo','mi','sa','an','ch']; return a[Math.floor(Math.random()*a.length)]; }
