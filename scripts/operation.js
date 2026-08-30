import { setupTestData } from '../src/bootstrap.js';
import { tokenForVu } from '../src/auth.js';
import { invoke } from '../src/swagger-client.js';
import { operationByKey } from '../src/generated/openapi-catalog.js';
import { ENV } from '../config/environments.js';
function parse(name){if(!__ENV[name])return{};try{return JSON.parse(__ENV[name]);}catch(e){throw new Error(`${name} must be valid JSON`);}}
const key=__ENV.OPERATION_KEY||'';
const op=operationByKey[key];
if(!op) throw new Error('Set OPERATION_KEY exactly, e.g. "GET /me". Run scripts/swagger-catalog.js to list operations.');
if(op.class==='destructive'&&!ENV.enableDestructive) throw new Error(`Refusing destructive operation ${key}. Set ENABLE_DESTRUCTIVE_WRITES=true explicitly.`);
if(op.class==='operator_admin'&&!ENV.enableOperatorFlows&&!ENV.enableAdminFlows&&!ENV.enableIntegrations) throw new Error(`Refusing operator/admin/integration operation ${key}. Enable the appropriate explicit safety switch.`);
if(op.class==='user_write'&&!ENV.enableWrites) throw new Error(`Refusing write operation ${key}. Set ENABLE_WRITES=true explicitly.`);
export const options={vus:Number(__ENV.VUS||1),iterations:Number(__ENV.ITERATIONS||1)};
export function setup(){return setupTestData();}
export default function(data){invoke(key,tokenForVu(data.auth),{path:parse('PATH_PARAMS'),query:parse('QUERY_PARAMS'),body:parse('BODY_JSON'),params:{apiGroup:'single_operation'}});}
