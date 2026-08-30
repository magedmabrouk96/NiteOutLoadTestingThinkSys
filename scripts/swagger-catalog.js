import { OPENAPI_OPERATIONS } from '../src/generated/openapi-catalog.js';
export const options={vus:1,iterations:1};
export default function(){
 const counts={}; for(const o of OPENAPI_OPERATIONS)counts[o.class]=(counts[o.class]||0)+1;
 console.log(`Swagger catalog: ${OPENAPI_OPERATIONS.length} operations :: ${JSON.stringify(counts)}`);
 for(const o of OPENAPI_OPERATIONS) console.log(`${o.class.padEnd(14)} ${o.method.padEnd(6)} ${o.path} :: ${o.tags.join(',')} :: ${o.summary}`);
}
