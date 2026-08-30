import http from 'k6/http';
import { check } from 'k6';
import { ENV, url } from '../config/environments.js';
import { operationByKey } from './generated/openapi-catalog.js';
import { classify } from './http.js';

function enc(v){ return encodeURIComponent(String(v)); }
function buildPath(template, pathParams={}) {
  return template.replace(/\{([^}]+)\}/g,(_,name)=>{
    if(pathParams[name]===undefined || pathParams[name]===null || pathParams[name]==='') throw new Error(`Missing path param ${name} for ${template}`);
    return enc(pathParams[name]);
  });
}
function appendQuery(path, query={}) {
  const pairs=[];
  for(const [k,v] of Object.entries(query||{})){
    if(v===undefined || v===null || v==='') continue;
    if(Array.isArray(v)) v.forEach(x=>pairs.push(`${enc(k)}=${enc(x)}`)); else pairs.push(`${enc(k)}=${enc(v)}`);
  }
  return pairs.length ? `${path}${path.includes('?')?'&':'?'}${pairs.join('&')}` : path;
}
function baseParams(token, op, extra={}) {
  return {
    timeout: ENV.requestTimeout,
    redirects: 3,
    ...extra,
    headers: {accept:'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) , ...(extra.headers||{})},
    tags: {endpoint:op.path, api_group:(extra.apiGroup||op.tags[0]||'swagger').toLowerCase().replace(/\s+/g,'_'), swagger_class:op.class, ...(extra.tags||{})},
  };
}
export function invoke(key, token, args={}) {
  const op=operationByKey[key];
  if(!op) throw new Error(`Unknown Swagger operation: ${key}`);
  let path=appendQuery(buildPath(op.path,args.path),args.query);
  const target=url(path);
  const p=baseParams(token,op,args.params||{});
  let res;
  if(args.multipart){
    res=http.request(op.method,target,args.multipart,p);
  } else if(args.noBody && ['POST','PUT','PATCH'].includes(op.method)) {
    res=http.request(op.method,target,null,p);
  } else if(['POST','PUT','PATCH'].includes(op.method)) {
    p.headers={'Content-Type':'application/json',...p.headers};
    res=http.request(op.method,target,JSON.stringify(args.body??{}),p);
  } else if(op.method==='DELETE') res=http.del(target,null,p);
  else res=http.get(target,p);
  const accepted=args.accepted || null;
  const passed=classify(res,key,accepted);
  check(res,{[`${key}: ${accepted?'expected':'2xx'}`]:()=>passed});
  return res;
}
