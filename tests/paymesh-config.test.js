const test=require('node:test');const assert=require('node:assert/strict');
const {environment,resolvePayMeshConfig,publicConfiguration}=require('../api/_lib/paymesh-config');
test('defaults to sandbox',()=>assert.equal(environment(),'sandbox'));
test('rejects unknown environment',()=>assert.throws(()=>environment('staging')));
test('production credentials are independent',()=>{
 const previous={...process.env};
 try{
  process.env.PAYMESH_API_BASE_URL='https://sandbox.example/v1';
  process.env.PAYMESH_API_KEY='sandbox-key';process.env.PAYMESH_WEBHOOK_SECRET='sandbox-secret';
  process.env.PAYMESH_LIVE_API_BASE_URL='https://live.example/v1';
  process.env.PAYMESH_LIVE_API_KEY='live-key';process.env.PAYMESH_LIVE_WEBHOOK_SECRET='live-secret';
  assert.equal(resolvePayMeshConfig('production').apiKey,'live-key');
  assert.equal(resolvePayMeshConfig('sandbox').apiKey,'sandbox-key');
  const serialized=JSON.stringify(publicConfiguration());
  assert.equal(serialized.includes('live-key'),false);
  assert.equal(serialized.includes('sandbox-secret'),false);
 }finally{for(const key of ['PAYMESH_API_BASE_URL','PAYMESH_API_KEY','PAYMESH_WEBHOOK_SECRET','PAYMESH_LIVE_API_BASE_URL','PAYMESH_LIVE_API_KEY','PAYMESH_LIVE_WEBHOOK_SECRET']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
test('rejects non-HTTPS base URLs',()=>{
 process.env.PAYMESH_API_KEY='test';process.env.PAYMESH_WEBHOOK_SECRET='test';process.env.PAYMESH_API_BASE_URL='http://unsafe.example';
 assert.throws(()=>resolvePayMeshConfig('sandbox'),/HTTPS/);
});
