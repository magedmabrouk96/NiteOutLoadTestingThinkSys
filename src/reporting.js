import { ENDPOINT_DEFINITIONS, NON200_STATUS_BUCKETS } from './endpoint-metrics.js';
import {
  sloForEndpoint,
  SLO_WARN_RATIO,
  ENDPOINT_FAIL_RATE_FAIL,
  ENDPOINT_FAIL_RATE_WARN,
} from './slo.js';

function n(v, fallback=0) { return Number.isFinite(Number(v)) ? Number(v) : fallback; }
function metric(data,name){ return data?.metrics?.[name]?.values || {}; }
function count(data,name){ return n(metric(data,name).count,0); }
function rate(data,name){ return n(metric(data,name).rate,0); }
function trend(data,name,key){ return n(metric(data,name)[key],0); }
function fmtMs(v){
  const x=n(v,0);
  if(x===0) return '-';
  if(x>=1000) return `${(x/1000).toFixed(x>=10000?1:2)}s`;
  return `${x.toFixed(x>=100?0:1)}ms`;
}
function fmtPct(v){ return `${(n(v,0)*100).toFixed(2)}%`; }
function fmtInt(v){ const x=Math.round(n(v,0)); return String(x); }
function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function pad(s,len,side='right'){
  s=String(s);
  if(s.length>len) return s.slice(0,len-1)+'…';
  const p=' '.repeat(Math.max(0,len-s.length));
  return side==='left'?p+s:s+p;
}
function thresholdStatus(data){
  const rows=[];
  for(const [name,m] of Object.entries(data?.metrics||{})){
    if(!m.thresholds) continue;
    for(const [expr,t] of Object.entries(m.thresholds)) rows.push({metric:name,expression:expr,ok:t.ok!==false});
  }
  return rows;
}

/** Non-200 rows from per-endpoint status-bucket counters (reliable in k6 summary). */
function non200StatusRows(data){
  const rows=[];
  for(const def of ENDPOINT_DEFINITIONS){
    for(const bucket of NON200_STATUS_BUCKETS){
      const c=count(data,`endpoint_${def.id}_non200_${bucket}`);
      if(!c) continue;
      const kind = bucket==='0' ? 'timeout_or_network'
        : bucket==='other_2xx' ? 'non_200_success'
        : 'error';
      const statusLabel = bucket==='0' ? '0 (timeout/network)'
        : bucket==='other_2xx' ? '2xx (not 200)'
        : bucket==='other' ? 'other'
        : bucket;
      rows.push({
        endpoint: `${def.method} ${def.endpoint}`,
        status: bucket==='other'||bucket==='other_2xx' ? NaN : Number(bucket),
        statusLabel,
        kind,
        count: c,
      });
    }
  }
  rows.sort((a,b)=> b.count-a.count || String(a.endpoint).localeCompare(b.endpoint) || String(a.statusLabel).localeCompare(b.statusLabel));
  return rows;
}

function kindLabel(kind){
  if(kind==='timeout_or_network') return 'Timeout / network';
  if(kind==='non_200_success') return '2xx (not 200)';
  return 'Error (non-2xx)';
}
function endpointRows(data){
  return ENDPOINT_DEFINITIONS.map(def=>{
    const calls=count(data,`endpoint_${def.id}_calls`);
    const pass=count(data,`endpoint_${def.id}_passes`);
    const fail=count(data,`endpoint_${def.id}_failures`);
    const d=`endpoint_${def.id}_duration`;
    return { ...def, calls, pass, fail, passRate:calls?pass/calls:0, avg:trend(data,d,'avg'), p95:trend(data,d,'p(95)'), p99:trend(data,d,'p(99)'), max:trend(data,d,'max') };
  }).filter(r=>r.calls>0);
}
function section(title){ return `\n${'='.repeat(118)}\n${title}\n${'='.repeat(118)}\n`; }

function endpointAssessment(e, profile){
  const sla=sloForEndpoint(e.id, profile);
  const failRate = e.calls > 0 ? e.fail / e.calls : 0;

  // Reliability: grade by error *rate*, not absolute fail count.
  // 10 failures in 43k calls (~0.02%) is noise, not an endpoint outage.
  if (failRate >= ENDPOINT_FAIL_RATE_FAIL) {
    return {
      status: 'FAIL',
      severity: 'HIGH',
      reason: `${e.fail}/${e.calls} failed (${fmtPct(failRate)} ≥ ${fmtPct(ENDPOINT_FAIL_RATE_FAIL)} budget)`,
      sla,
    };
  }
  if (failRate >= ENDPOINT_FAIL_RATE_WARN) {
    return {
      status: 'WARN',
      severity: 'WATCH',
      reason: `${e.fail}/${e.calls} failed (${fmtPct(failRate)} approaching ${fmtPct(ENDPOINT_FAIL_RATE_FAIL)} budget)`,
      sla,
    };
  }

  if (sla && (e.p95 > sla.p95 || e.p99 > sla.p99)) {
    const reasons = [];
    if (e.p95 > sla.p95) reasons.push(`p95 ${fmtMs(e.p95)} > ${fmtMs(sla.p95)}`);
    if (e.p99 > sla.p99) reasons.push(`p99 ${fmtMs(e.p99)} > ${fmtMs(sla.p99)}`);
    return { status: 'FAIL', severity: 'HIGH', reason: reasons.join('; '), sla };
  }
  if (sla && (e.p95 >= sla.p95 * SLO_WARN_RATIO || e.p99 >= sla.p99 * SLO_WARN_RATIO)) {
    return {
      status: 'WARN',
      severity: 'WATCH',
      reason: `Approaching provisional SLO (${fmtMs(e.p95)} p95 / ${fmtMs(e.p99)} p99 · tier ${sla.tier})`,
      sla,
    };
  }

  const note =
    e.fail > 0
      ? `Within budget (${e.fail}/${e.calls} failed, ${fmtPct(failRate)})`
      : sla
        ? `Within provisional SLO (${sla.label})`
        : 'No request failures';
  return { status: 'PASS', severity: 'OK', reason: note, sla };
}
function deriveIssues(result){
  const issues=[];
  for(const e of result.endpoints){
    const a=endpointAssessment(e,result.metadata.profile);
    if(a.status!=='PASS') issues.push({type:'endpoint',status:a.status,severity:a.severity,title:`${e.method} ${e.endpoint}`,detail:a.reason,actual:`p95 ${fmtMs(e.p95)} · p99 ${fmtMs(e.p99)}`,sla:a.sla ? `Provisional SLO (${a.sla.tier}): p95 < ${fmtMs(a.sla.p95)} · p99 < ${fmtMs(a.sla.p99)}` : ''});
  }
  for(const t of result.thresholds.filter(x=>!x.ok)){
    if(issues.some(i=>t.metric.includes('chat') && i.title.includes('/chat/messages'))) continue;
    let detail=`Threshold breached: ${t.expression}`;
    if(t.metric==='journey_success'){
      const chat=result.endpoints.find(e=>e.id==='post_chat');
      if(chat && chat.fail>0){
        detail+=`. Driven by POST /chat/messages (${fmtInt(chat.fail)}/${fmtInt(chat.calls)} failed) — each chat failure fails that journey lap.`;
      }
    }
    issues.push({type:'threshold',status:'FAIL',severity:'HIGH',title:t.metric,detail,actual:'',sla:''});
  }
  return issues;
}


function coverageMatrixRows(data, meta={}){
  const current = new Map(endpointRows(data).map(r=>[r.id,r]));
  const profile = String(meta.profile||'').toLowerCase();
  const isCoverage = profile === 'coverage';

  const LOAD_JOURNEY_IDS = new Set([
    'get_bars','get_bar','get_playing_songs','get_queue',
    'get_music','get_announcement',
    'get_current_events','get_event_rsvp','post_event_rsvp',
    'get_users','get_invite_code','get_blocked','get_who_blocked','get_leaderboard',
    'post_chat',
  ]);
  const ONE_TIME_IDS = new Set([
    'post_waitinglist','post_handle_check','post_handle',
    'post_profile','post_profile_image','post_group_chat_image',
  ]);
  const OPTIONAL_IDS = new Set(['get_feed','get_stream_info','post_live_activity']);

  const rows = [];

  function pushRow(def, extra){
    rows.push({
      ...def,
      section: extra.section,
      coverageStatus: extra.coverageStatus,
      runStatus: extra.runStatus,
      status: extra.status,
      calls: extra.calls ?? 0,
      note: extra.note,
    });
  }

  for (const def of ENDPOINT_DEFINITIONS) {
    const e = current.get(def.id);

    if (def.id === 'setup_bars' || def.id === 'setup_events') {
      if (e) {
        const a = endpointAssessment(e, profile);
        pushRow(def, {
          section: 'bootstrap',
          coverageStatus: 'VALIDATED',
          runStatus: 'EXECUTED',
          status: a.status,
          calls: e.calls,
          note: def.id === 'setup_bars' ? 'Bootstrap venue discovery' : 'Bootstrap event discovery',
        });
      }
      continue;
    }

    if (def.id === 'post_email_subscribe') {
      if (e) {
        const a = endpointAssessment(e, profile);
        pushRow(def, {
          section: 'excluded',
          coverageStatus: 'EXCLUDED',
          runStatus: 'EXECUTED',
          status: a.status,
          calls: e.calls,
          note: 'Excluded by client — should not run; investigate if calls > 0',
        });
      } else {
        pushRow(def, {
          section: 'excluded',
          coverageStatus: 'EXCLUDED',
          runStatus: 'NOT IN LOAD',
          status: 'EXCLUDED',
          calls: 0,
          note: 'Excluded by client confirmation — not part of app flow under test',
        });
      }
      continue;
    }

    if (ONE_TIME_IDS.has(def.id)) {
      if (e) {
        const a = endpointAssessment(e, profile);
        pushRow(def, {
          section: 'one_time',
          coverageStatus: 'ONE-TIME',
          runStatus: 'EXECUTED',
          status: a.status,
          calls: e.calls,
          note: isCoverage
            ? 'One-time coverage write executed in this run'
            : 'Executed this run (unexpected on concurrent load — usually coverage profile only)',
        });
      } else {
        pushRow(def, {
          section: 'one_time',
          coverageStatus: 'ONE-TIME',
          runStatus: isCoverage ? 'MISSING' : 'COVERAGE PROFILE',
          status: isCoverage ? 'FAIL' : 'INFO',
          calls: 0,
          note: isCoverage
            ? 'Expected in coverage profile but recorded 0 calls — investigate'
            : 'Not under concurrent load — run ./scripts/run-final.sh coverage (once per run)',
        });
      }
      continue;
    }

    if (OPTIONAL_IDS.has(def.id)) {
      if (e) {
        const a = endpointAssessment(e, profile);
        pushRow(def, {
          section: 'optional',
          coverageStatus: 'OPTIONAL',
          runStatus: 'EXECUTED',
          status: a.status,
          calls: e.calls,
          note: 'Optional endpoint was enabled and executed this run',
        });
      } else {
        const flag =
          def.id === 'get_feed' ? 'ENABLE_VENUE_FEED' :
          def.id === 'get_stream_info' ? 'ENABLE_STREAM_INFO' :
          'ENABLE_LIVE_ACTIVITY (+ ENABLE_WRITES)';
        pushRow(def, {
          section: 'optional',
          coverageStatus: 'OPTIONAL',
          runStatus: 'NOT IN LOAD',
          status: 'OPTIONAL',
          calls: 0,
          note: `Not part of defined concurrent load — enable with ${flag} if client requires it`,
        });
      }
      continue;
    }

    if (e) {
      const a = endpointAssessment(e, profile);
      pushRow(def, {
        section: 'concurrent',
        coverageStatus: 'LOAD',
        runStatus: 'EXECUTED',
        status: a.status,
        calls: e.calls,
        note: def.phase === 'Runtime Write' ? 'Every session lap under concurrent load' : 'Concurrent load journey',
      });
      continue;
    }

    if (LOAD_JOURNEY_IDS.has(def.id)) {
      pushRow(def, {
        section: 'concurrent',
        coverageStatus: 'LOAD',
        runStatus: 'MISSING',
        status: 'FAIL',
        calls: 0,
        note: 'Defined in concurrent load journey but recorded 0 calls — investigate',
      });
    }
  }

  return rows;
}

function coverageRowsBySection(rows, section){
  return (rows || []).filter(r => r.section === section);
}

function coverageTableHtml(rows){
  return (rows || []).map(c => {
    const pillCls = c.status === 'EXCLUDED' ? 'muted'
      : (c.status === 'OPTIONAL' || c.status === 'INFO') ? 'info'
      : c.status === 'FAIL' ? 'fail'
      : c.status === 'WARN' ? 'warn'
      : 'pass';
    return `<tr><td><span class="pill ${pillCls}">${esc(c.coverageStatus)}</span></td><td>${esc(c.runStatus)}</td><td>${esc(c.method)}</td><td class="endpoint">${esc(c.endpoint)}</td><td>${fmtInt(c.calls)}</td><td>${esc(c.note)}</td></tr>`;
  }).join('');
}
export function buildDetailedResult(data, meta={}){
  const rows=endpointRows(data);
  const thresholds=thresholdStatus(data);
  const thresholdPassed=thresholds.every(t=>t.ok);
  const checks=metric(data,'checks');
  const httpReqs=count(data,'http_reqs');
  const httpFailed=rate(data,'http_req_failed');
  const appErr=rate(data,'application_error_rate');
  const transportErr=rate(data,'transport_error_rate');
  const journey=rate(data,'journey_success');
  const heartbeat=rate(data,'heartbeat_success');
  const iterations=count(data,'iterations');
  const result = {
    metadata:{
      framework:'NiteOut k6 Performance Framework', version:'9.3-client-report',
      profile:meta.profile||'', environment:meta.environment||'', runId:meta.runId||'',
      generatedAt:new Date().toISOString(), configuredVUs:meta.vus||'', configuredDuration:meta.duration||'',
      sessionSeconds:meta.sessionSeconds||'', heartbeatSeconds:meta.heartbeatSeconds||'',
      venueIds:meta.venueIds||[], authModel:meta.authModel||'Single client-provided Firebase test identity shared by VUs',
      testUserIdentity:meta.testUserIdentity||'test user (+1 1234567891)',
      excludedEndpoints:meta.excludedEndpoints||['POST /subscribe-to-email-list (excluded by client)'],
    },
    overall:{
      thresholdPassed, totalRequests:httpReqs, httpFailureRate:httpFailed,
      checksTotal:n(checks.passes,0)+n(checks.fails,0), checksPassed:n(checks.passes,0), checksFailed:n(checks.fails,0),
      applicationErrorRate:appErr, transportErrorRate:transportErr,
      journeySuccessRate:journey, heartbeatSuccessRate:heartbeat, iterations,
      overallAvgMs:trend(data,'http_req_duration','avg'), overallP95Ms:trend(data,'http_req_duration','p(95)'), overallP99Ms:trend(data,'http_req_duration','p(99)'), overallMaxMs:trend(data,'http_req_duration','max'),
    },
    endpoints:rows,
    thresholds,
    non200Statuses: non200StatusRows(data),
  };
  result.coverageMatrix=coverageMatrixRows(data,result.metadata);
  result.endpointAssessments=rows.map(e=>({id:e.id,...endpointAssessment(e,result.metadata.profile)}));
  result.issues=deriveIssues(result);
  result.slowest=[...rows].sort((a,b)=>b.p95-a.p95).slice(0,5);
  result.finalPass=thresholdPassed && appErr<0.01 && transportErr<0.01 && result.issues.every(i=>i.status!=='FAIL');
  return result;
}

export function detailedConsoleSummary(data, meta={}){
  const r=buildDetailedResult(data,meta);
  const o=r.overall;
  let out='';
  out+=section('NITEOUT PERFORMANCE TEST — DETAILED FINAL SUMMARY');
  out+=`Run ID               : ${r.metadata.runId||'-'}\n`;
  out+=`Profile              : ${r.metadata.profile||'-'}\n`;
  out+=`Environment          : ${r.metadata.environment||'-'}\n`;
  out+=`Authenticated User   : ${r.metadata.testUserIdentity||'-'}\n`;
  out+=`Configured VUs       : ${r.metadata.configuredVUs||'-'}\n`;
  out+=`Configured Duration  : ${r.metadata.configuredDuration||'-'}\n`;
  out+=`Session / Heartbeat  : ${r.metadata.sessionSeconds||'-'}s / ${r.metadata.heartbeatSeconds||'-'}s\n`;
  out+=`Iterations Completed : ${fmtInt(o.iterations)}\n`;
  out+=`Total HTTP Requests  : ${fmtInt(o.totalRequests)}\n`;
  out+=`HTTP Failure Rate    : ${fmtPct(o.httpFailureRate)}\n`;
  out+=`Application Errors   : ${fmtPct(o.applicationErrorRate)}\n`;
  out+=`Transport Errors     : ${fmtPct(o.transportErrorRate)}\n`;
  out+=`Journey Success      : ${fmtPct(o.journeySuccessRate)}\n`;
  out+=`Heartbeat Success    : ${fmtPct(o.heartbeatSuccessRate)}\n`;
  out+=`Overall latency      : avg ${fmtMs(o.overallAvgMs)} | p95 ${fmtMs(o.overallP95Ms)} | p99 ${fmtMs(o.overallP99Ms)} | max ${fmtMs(o.overallMaxMs)}\n`;

  if(r.issues.length){
    out+=section('ISSUES / ATTENTION REQUIRED');
    for(const i of r.issues) out+=`${i.status==='FAIL'?'FAIL':'WARN'}  ${pad(i.title,48)} ${i.detail}${i.sla?` | ${i.sla}`:''}\n`;
  }

  out+=section('ENDPOINT RESULTS — AGGREGATED ACROSS ALL VUs');
  out+=`${pad('STATUS',7)} ${pad('PHASE',14)} ${pad('METHOD',6)} ${pad('ENDPOINT',36)} ${pad('CALLS',6,'left')} ${pad('PASS',6,'left')} ${pad('FAIL',6,'left')} ${pad('P95',8,'left')} ${pad('P99',8,'left')} ${pad('MAX',8,'left')}\n`;
  out+='-'.repeat(118)+'\n';
  for(const e of r.endpoints){
    const a=endpointAssessment(e,r.metadata.profile);
    out+=`${pad(a.status,7)} ${pad(e.phase,14)} ${pad(e.method,6)} ${pad(e.endpoint,36)} ${pad(fmtInt(e.calls),6,'left')} ${pad(fmtInt(e.pass),6,'left')} ${pad(fmtInt(e.fail),6,'left')} ${pad(fmtMs(e.p95),8,'left')} ${pad(fmtMs(e.p99),8,'left')} ${pad(fmtMs(e.max),8,'left')}\n`;
  }
  if(!r.endpoints.length) out+='No classified endpoint calls were completed.\n';

  out+=section('HTTP STATUS CODES OTHER THAN 200');
  if(r.non200Statuses?.length){
    out+=`${pad('STATUS',18)} ${pad('KIND',22)} ${pad('ENDPOINT',48)} ${pad('COUNT',8,'left')}\n`;
    out+='-'.repeat(118)+'\n';
    for(const s of r.non200Statuses){
      out+=`${pad(s.statusLabel,18)} ${pad(kindLabel(s.kind),22)} ${pad(s.endpoint,48)} ${pad(fmtInt(s.count),8,'left')}\n`;
    }
  } else {
    out+='None — every recorded journey response returned HTTP 200.\n';
  }

  out+=section('CONCURRENT LOAD — ENDPOINTS THIS RUN');
  out+=`${pad('SCOPE',10)} ${pad('THIS RUN',16)} ${pad('METHOD',6)} ${pad('ENDPOINT',36)} ${pad('CALLS',6,'left')} NOTE\n`;
  out+='-'.repeat(118)+'\n';
  for(const c of coverageRowsBySection(r.coverageMatrix,'concurrent').concat(coverageRowsBySection(r.coverageMatrix,'bootstrap'))){
    out+=`${pad(c.coverageStatus,10)} ${pad(c.runStatus,16)} ${pad(c.method,6)} ${pad(c.endpoint,36)} ${pad(fmtInt(c.calls),6,'left')} ${c.note}\n`;
  }

  out+=section('ONE-TIME WRITES (coverage profile — not concurrent load)');
  out+=`${pad('SCOPE',10)} ${pad('THIS RUN',16)} ${pad('METHOD',6)} ${pad('ENDPOINT',36)} ${pad('CALLS',6,'left')} NOTE\n`;
  out+='-'.repeat(118)+'\n';
  for(const c of coverageRowsBySection(r.coverageMatrix,'one_time')){
    out+=`${pad(c.coverageStatus,10)} ${pad(c.runStatus,16)} ${pad(c.method,6)} ${pad(c.endpoint,36)} ${pad(fmtInt(c.calls),6,'left')} ${c.note}\n`;
  }

  out+=section('OPTIONAL / EXCLUDED (not in defined concurrent load)');
  out+=`${pad('SCOPE',10)} ${pad('THIS RUN',16)} ${pad('METHOD',6)} ${pad('ENDPOINT',36)} ${pad('CALLS',6,'left')} NOTE\n`;
  out+='-'.repeat(118)+'\n';
  for(const c of coverageRowsBySection(r.coverageMatrix,'optional').concat(coverageRowsBySection(r.coverageMatrix,'excluded'))){
    out+=`${pad(c.coverageStatus,10)} ${pad(c.runStatus,16)} ${pad(c.method,6)} ${pad(c.endpoint,36)} ${pad(fmtInt(c.calls),6,'left')} ${c.note}\n`;
  }

  out+=section('PROVISIONAL SLO GATES');
  for(const t of r.thresholds){ out+=`${t.ok?'PASS':'FAIL'}  ${pad(t.metric,52)} ${t.expression}\n`; }
  if(!r.thresholds.length) out+='No SLO gates configured.\n';

  out+=section('FINAL RESULT');
  out+=r.finalPass ? '>>> TEST PASSED <<<\n' : '>>> TEST FAILED — REVIEW ISSUES / FAILED GATES ABOVE <<<\n';
  out+='='.repeat(118)+'\n';
  return out;
}

function statusClass(status){ return status==='FAIL'?'fail':status==='WARN'?'warn':'pass'; }
function metricCard(label,value,sub='',cls='neutral'){
  return `<div class="card ${cls}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub?`<div class="sub">${esc(sub)}</div>`:''}</div>`;
}
export function clientHtmlReport(data, meta={}){
  const r=buildDetailedResult(data,meta); const o=r.overall;
  const failed=r.issues.filter(i=>i.status==='FAIL'); const warnings=r.issues.filter(i=>i.status==='WARN');
  const endpointRowsHtml=r.endpoints.map(e=>{
    const a=endpointAssessment(e,r.metadata.profile); const c=statusClass(a.status); const sla=a.sla ? `${fmtMs(a.sla.p95)} / ${fmtMs(a.sla.p99)}` : '—';
    return `<tr class="${c}"><td><span class="pill ${c}">${a.status}</span></td><td>${esc(e.phase)}</td><td>${esc(e.method)}</td><td class="endpoint">${esc(e.endpoint)}</td><td>${fmtInt(e.calls)}</td><td>${fmtInt(e.pass)}</td><td>${fmtInt(e.fail)}</td><td>${fmtPct(e.passRate)}</td><td>${fmtMs(e.avg)}</td><td>${fmtMs(e.p95)}</td><td>${fmtMs(e.p99)}</td><td>${fmtMs(e.max)}</td><td>${sla}</td></tr>`;
  }).join('');
  const issuesHtml=r.issues.length ? r.issues.map(i=>`<div class="issue ${statusClass(i.status)}"><div><span class="pill ${statusClass(i.status)}">${i.status}</span> <strong>${esc(i.title)}</strong></div><div class="issue-detail">${esc(i.detail)}</div>${i.actual?`<div class="issue-meta">Actual: ${esc(i.actual)}</div>`:''}${i.sla?`<div class="issue-meta">${esc(i.sla)}</div>`:''}</div>`).join('') : `<div class="empty good">No failed performance gates or endpoint issues detected.</div>`;
  const slowHtml=r.slowest.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.method)} ${esc(e.endpoint)}</td><td>${fmtMs(e.avg)}</td><td><strong>${fmtMs(e.p95)}</strong></td><td>${fmtMs(e.p99)}</td><td>${fmtMs(e.max)}</td></tr>`).join('');
  const thresholdHtml=r.thresholds.map(t=>`<tr><td><span class="pill ${t.ok?'pass':'fail'}">${t.ok?'PASS':'FAIL'}</span></td><td>${esc(t.metric)}</td><td>${esc(t.expression)}</td></tr>`).join('');
  const concurrentHtml=coverageTableHtml(
    coverageRowsBySection(r.coverageMatrix,'bootstrap').concat(coverageRowsBySection(r.coverageMatrix,'concurrent'))
  );
  const oneTimeHtml=coverageTableHtml(coverageRowsBySection(r.coverageMatrix,'one_time'));
  const optionalHtml=coverageTableHtml(
    coverageRowsBySection(r.coverageMatrix,'optional').concat(coverageRowsBySection(r.coverageMatrix,'excluded'))
  );
  const non200Html = (r.non200Statuses||[]).length
    ? (r.non200Statuses||[]).map(s=>`<tr><td><code>${esc(s.statusLabel)}</code></td><td>${esc(kindLabel(s.kind))}</td><td class="endpoint">${esc(s.endpoint)}</td><td>${fmtInt(s.count)}</td></tr>`).join('')
    : '';
  const venues=(r.metadata.venueIds||[]).map((v,i)=>`<li>Venue ${i+1}: <code>${esc(v)}</code></li>`).join('');
  const finalClass=r.finalPass?'pass':'fail';
  const matrixHead='<thead><tr><th>Scope</th><th>This Run</th><th>Method</th><th>Endpoint</th><th>Calls</th><th>Reason / Scope Note</th></tr></thead>';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NiteOut Performance Report — ${esc(r.metadata.runId)}</title><style>
  :root{--bg:#f5f7fb;--surface:#fff;--ink:#172033;--muted:#667085;--line:#e4e7ec;--green:#067647;--greenbg:#ecfdf3;--red:#b42318;--redbg:#fef3f2;--amber:#b54708;--amberbg:#fffaeb;--blue:#175cd3;--bluebg:#eff8ff;}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.wrap{max-width:1320px;margin:auto;padding:28px}.hero{background:#101828;color:white;border-radius:18px;padding:28px 32px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.hero h1{margin:0 0 8px;font-size:28px}.hero .meta{color:#d0d5dd}.result{padding:12px 18px;border-radius:999px;font-weight:800;letter-spacing:.4px}.result.pass{background:#12b76a;color:#fff}.result.fail{background:#f04438;color:#fff}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px}.card .label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.5px}.card .value{font-size:26px;font-weight:750;margin-top:5px}.card .sub{font-size:12px;color:var(--muted);margin-top:4px}.card.pass{border-left:5px solid #12b76a}.card.fail{border-left:5px solid #f04438}.card.warn{border-left:5px solid #f79009}.section{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;margin:18px 0}.section h2{font-size:18px;margin:0 0 14px}.section h3{font-size:14px;margin:18px 0 8px;color:var(--muted)}.issue{padding:14px 16px;border-radius:12px;margin:10px 0}.issue.fail{background:var(--redbg);border:1px solid #fecdca}.issue.warn{background:var(--amberbg);border:1px solid #fedf89}.issue-detail{margin-top:6px}.issue-meta{font-size:12px;color:var(--muted);margin-top:3px}.empty.good{padding:14px;background:var(--greenbg);border:1px solid #abefc6;border-radius:12px;color:var(--green)}.pill{display:inline-block;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800}.pill.pass{background:var(--greenbg);color:var(--green)}.pill.fail{background:var(--redbg);color:var(--red)}.pill.warn{background:var(--amberbg);color:var(--amber)}.pill.info{background:var(--bluebg);color:var(--blue)}.pill.muted{background:#f2f4f7;color:#475467}table{width:100%;border-collapse:collapse;font-size:12px}th{position:sticky;top:0;background:#f9fafb;text-align:left;color:#475467;padding:10px 8px;border-bottom:1px solid var(--line)}td{padding:9px 8px;border-bottom:1px solid #f0f2f5;vertical-align:top}.endpoint{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.table-wrap{overflow:auto;max-height:620px;border:1px solid var(--line);border-radius:10px}.note{background:var(--bluebg);border:1px solid #b2ddff;border-radius:12px;padding:14px;color:#1849a9}.scope{display:grid;grid-template-columns:1fr 1fr;gap:18px}.scope ul{margin:6px 0 0;padding-left:20px}.footer{color:var(--muted);text-align:center;font-size:12px;padding:16px}code{background:#f2f4f7;padding:2px 5px;border-radius:5px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.scope{grid-template-columns:1fr}.hero{display:block}.result{display:inline-block;margin-top:16px}}@media(max-width:560px){.grid{grid-template-columns:1fr}.wrap{padding:12px}}
  </style></head><body><div class="wrap">
  <div class="hero"><div><h1>NiteOut Performance Test Report</h1><div class="meta">Run ${esc(r.metadata.runId)} · ${esc(r.metadata.environment)} · profile ${esc(r.metadata.profile)} · generated ${esc(r.metadata.generatedAt)}<br><strong>Authenticated test user:</strong> ${esc(r.metadata.testUserIdentity)}</div></div><div class="result ${finalClass}">${r.finalPass?'TEST PASSED':'TEST FAILED'}</div></div>
  <div class="grid">
    ${metricCard('Virtual Users',r.metadata.configuredVUs||'—',`Duration ${r.metadata.configuredDuration}`)}
    ${metricCard('Total Requests',fmtInt(o.totalRequests),`${fmtInt(o.iterations)} completed journeys`)}
    ${metricCard('Journey Success',fmtPct(o.journeySuccessRate),'Target > 98%',o.journeySuccessRate>=.98?'pass':'fail')}
    ${metricCard('Heartbeat Success',fmtPct(o.heartbeatSuccessRate),'Target > 99%',o.heartbeatSuccessRate>=.99?'pass':'fail')}
    ${metricCard('HTTP Failure Rate',fmtPct(o.httpFailureRate),'Transport + HTTP failures',o.httpFailureRate===0?'pass':o.httpFailureRate<.01?'warn':'fail')}
    ${metricCard('Application Errors',fmtPct(o.applicationErrorRate),'Target < 1%',o.applicationErrorRate<.01?'pass':'fail')}
    ${metricCard('Overall p95',fmtMs(o.overallP95Ms),`p99 ${fmtMs(o.overallP99Ms)}`)}
    ${metricCard('Failed Gates',String(failed.length),warnings.length?`${warnings.length} warning(s)`:'No warnings',failed.length?'fail':warnings.length?'warn':'pass')}
  </div>
  <div class="section"><h2>${failed.length?'Issues Requiring Attention':'Executive Summary'}</h2>${issuesHtml}</div>
  <div class="section"><h2>1 — Concurrent Load Journey</h2><div class="note"><strong>Hammered by every VU every lap.</strong> Expect <strong>EXECUTED</strong> with calls &gt; 0. Queue may be lower when only some venues support it. Runtime writes (RSVP + chat) run every lap.</div><div class="table-wrap" style="margin-top:12px"><table>${matrixHead}<tbody>${concurrentHtml}</tbody></table></div></div>
  <div class="section"><h2>2 — One-Time Writes (coverage profile)</h2><div class="note"><strong>Not concurrent load.</strong> These onboarding/profile POSTs are checked once via <code>./scripts/run-final.sh coverage</code>. On a normal load/CI run they show <strong>COVERAGE PROFILE</strong> (listed for transparency, not missing from load). On a coverage run they should show <strong>EXECUTED</strong>.</div><div class="table-wrap" style="margin-top:12px"><table>${matrixHead}<tbody>${oneTimeHtml}</tbody></table></div></div>
  <div class="section"><h2>3 — Optional / Excluded</h2><div class="note">Feed, stream-info, and liveActivity are <strong>optional</strong> (off unless client enables them). Email subscribe is <strong>excluded</strong> by client confirmation.</div><div class="table-wrap" style="margin-top:12px"><table>${matrixHead}<tbody>${optionalHtml}</tbody></table></div></div>
  <div class="section"><h2>Endpoint Performance — Executed This Run</h2><div class="table-wrap"><table><thead><tr><th>Status</th><th>Phase</th><th>Method</th><th>Endpoint</th><th>Calls</th><th>Pass</th><th>Fail</th><th>Pass %</th><th>Avg</th><th>p95</th><th>p99</th><th>Max</th><th>Provisional SLO p95 / p99</th></tr></thead><tbody>${endpointRowsHtml}</tbody></table></div></div>
  <div class="section"><h2>HTTP Status Codes Other Than 200</h2><div class="note">Every journey response that is <strong>not exactly HTTP 200</strong> is listed here: timeouts (<code>0</code>), other 2xx (e.g. 201), and 4xx/5xx. Pass/fail for the run still uses <strong>any 2xx</strong> as success.</div>${non200Html?`<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Status</th><th>Kind</th><th>Endpoint</th><th>Count</th></tr></thead><tbody>${non200Html}</tbody></table></div>`:`<div class="empty good" style="margin-top:12px">None — every recorded journey response returned HTTP 200.</div>`}</div>
  <div class="section"><h2>Slowest Endpoints by p95</h2><table><thead><tr><th>#</th><th>Endpoint</th><th>Avg</th><th>p95</th><th>p99</th><th>Max</th></tr></thead><tbody>${slowHtml}</tbody></table></div>
  <div class="section"><h2>Provisional SLO Gates</h2><div class="note"><strong>Model:</strong> Reliability gates always apply. Latency SLOs are tiered by criticality (interactive / browse / write / heavy). Smoke fails on reliability only. Values are QA provisional — not client-approved contractual SLAs. See <code>src/slo.js</code>.</div><div style="height:12px"></div><table><thead><tr><th>Status</th><th>Metric</th><th>Gate</th></tr></thead><tbody>${thresholdHtml}</tbody></table></div>
  <div class="section scope"><div><h2>Test Configuration</h2><p><strong>Sessions:</strong> ${esc(r.metadata.configuredVUs)} VUs · <strong>Duration:</strong> ${esc(r.metadata.configuredDuration)} · <strong>Session:</strong> ${esc(r.metadata.sessionSeconds)}s · <strong>Heartbeat:</strong> ${esc(r.metadata.heartbeatSeconds)}s</p><h3>Venue configuration</h3><ul>${venues||'<li>Not specified</li>'}</ul></div><div><h2>Scope & Assumptions</h2><div class="note"><strong>Authenticated test user:</strong> ${esc(r.metadata.testUserIdentity)}<br><strong>Authentication model:</strong> ${esc(r.metadata.authModel)}.</div><h3>Client-confirmed exclusions</h3><ul>${(r.metadata.excludedEndpoints||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
  <div class="footer">NiteOut k6 Performance Framework · Client-facing report · Raw k6 dashboard and JSON artifacts are retained separately for engineering analysis.</div>
  </div></body></html>`;
}
