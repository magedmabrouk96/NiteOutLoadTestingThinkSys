import http from 'k6/http';
import { check } from 'k6';
import { ENV } from '../config/environments.js';
import {
  errorsTotal, transportErrors, applicationErrors,
  transportErrorRate, applicationErrorRate, non200StatusCount,
} from './metrics.js';
import { recordEndpointResult } from './endpoint-metrics.js';

function headers(token, extra={}) {
  return { accept:'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...extra };
}
function params(token, input={}) {
  return {
    timeout: ENV.requestTimeout,
    redirects: 3,
    ...input,
    headers: headers(token, input.headers || {}),
    tags: input.tags || {},
  };
}
export function get(path, token, input={}) { return http.get(path, params(token,input)); }
export function post(path, token, body, input={}) {
  return http.post(path, JSON.stringify(body), params(token,{...input,headers:{'Content-Type':'application/json',...(input.headers||{})}}));
}
export function del(path, token, input={}) { return http.del(path,null,params(token,input)); }

function recordNon200(response, name) {
  const status = response && Number.isFinite(response.status) ? response.status : 0;
  if (status === 200) return;
  non200StatusCount.add(1, {
    status: String(status),
    endpoint: name,
    kind: status === 0 ? 'timeout_or_network' : (status >= 200 && status < 300 ? 'non_200_success' : 'error'),
  });
}

export function classify(response, name, accepted=null) {
  const transportFailure = !response || response.status === 0;
  transportErrorRate.add(transportFailure, { endpoint:name });
  recordNon200(response, name);
  if (transportFailure) {
    transportErrors.add(1,{endpoint:name,error_code:String(response?.error_code||'unknown')});
    errorsTotal.add(1,{type:'transport',endpoint:name});
    recordEndpointResult(name,response,false,true);
    return false;
  }

  const httpOk = accepted ? accepted.includes(response.status) : (response.status>=200 && response.status<300);
  applicationErrorRate.add(!httpOk,{endpoint:name,status:String(response.status)});
  if (!httpOk) {
    applicationErrors.add(1,{endpoint:name,status:String(response.status)});
    errorsTotal.add(1,{type:'application',endpoint:name,status:String(response.status)});
  }
  recordEndpointResult(name,response,httpOk,false);
  return httpOk;
}

export function expect2xx(response,name) {
  const passed=classify(response,name);
  check(response,{[`${name}: 2xx`]:()=>passed});
  return passed;
}
export function expectAny(response,name,accepted) {
  const passed=classify(response,name,accepted);
  check(response,{[`${name}: expected status`]:()=>passed});
  return passed;
}
export function json(response) { try { return response && response.status ? response.json() : null; } catch(_) { return null; } }
