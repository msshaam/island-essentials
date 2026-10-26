const crypto=require('node:crypto');
const {resolvePayMeshConfig}=require('../_lib/paymesh-config');
const {requireMerchantAdmin}=require('../_lib/admin-auth');
const S=()=>process.env.SUPABASE_URL,K=()=>process.env.SUPABASE_PUBLISHABLE_KEY;
const fail=(code,message)=>Object.assign(new Error(message),{statusCode:code});
async function user(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)throw fail(401,'Sign in required');const r=await fetch(S()+'/auth/v1/user',{headers:{apikey:K(),Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});if(!r.ok)throw fail(401,'Session expired');return r.json()}
async function paymesh(path,method='GET',body){const c=resolvePayMeshConfig('sandbox');const r=await fetch(c.baseUrl+path,{method,headers:{Authorization:'Bearer '+c.apiKey,Accept:'application/json',...(body?{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(14000)});const d=await r.json().catch(()=>({}));if(!r.ok)throw fail(r.status>=500?502:r.status,d.message||d.error||'PayMesh request failed');return d}
const price={islandship:'199.00',islanddrive:'100.00'};
module.exports=async(req,res)=>{res.setHeader('Cache-Control','private,no-store');try{
 const service=String(req.query.service||'');if(!price[service])throw fail(400,'Unknown service');
 if(req.method==='POST'&&req.query.action==='start'){
  const u=await user(req),name=String(req.body?.name||'').trim(),email=String(req.body?.email||u.email||'').trim();
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email))throw fail(400,'Enter your name and email');
  if(req.body?.consent!==true)throw fail(400,'Accept the payment terms before continuing');
  const origin='https://island-essentials.vercel.app',ref=(service==='islandship'?'SHIP':'DRIVE')+'_'+u.id.replace(/-/g,'')+'_'+crypto.randomBytes(5).toString('hex');
  const body={amount:price[service],currency:'MVR',merchant_reference:ref,customer:{reference:'IE_'+u.id.replace(/-/g,''),name,email},return_url:origin+'/payment/return'};
  if(service==='islandship'){body.description='IslandShip monthly forwarding membership';body.agreement={amount_variability:'FIXED',amount:price[service],frequency:'MONTHLY',description:'IslandShip monthly membership MVR 199'};}
  else {const amount=String(req.body?.rechargeAmount||'300');if(!['200','300','500'].includes(amount))throw fail(400,'Invalid recharge amount');body.description='IslandDrive initial service credit and auto-recharge consent';body.save_card='REQUESTED';body.mit_permission={purpose:'IslandDrive service credit automatic top-ups',max_amount_per_charge:amount+'.00'};}
  const result=await paymesh('/payments','POST',body);return res.status(200).json({checkout_url:result.checkout_url,payment_id:result.payment_id,service});
 }
 if(req.method==='GET'&&req.query.action==='verify'){
  const u=await user(req),id=String(req.query.payment_id||'');if(!/^pay_[a-zA-Z0-9_-]{8,100}$/.test(id))throw fail(400,'Invalid payment ID');
  const p=await paymesh('/payments/'+encodeURIComponent(id));const prefix=(service==='islandship'?'SHIP':'DRIVE')+'_'+u.id.replace(/-/g,'')+'_';
  if(!String(p.merchant_reference||'').startsWith(prefix))throw fail(403,'Payment is not associated with this account');
  return res.status(200).json({payment_id:p.payment_id,status:p.status,amount:p.amount,currency:p.currency,agreement_id:p.agreement_id||null,mit_permission_id:p.mit_permission_id||null,customer_id:p.customer_id||null,saved_card_id:p.saved_card_id||null});
 }
 if(req.method==='POST'&&req.query.action==='merchant-charge'){
  await requireMerchantAdmin(req);const amount=service==='islandship'?'199.00':String(req.body?.amount||'');
  if(service==='islanddrive'&&!/^(200|300|500)\.00$/.test(amount))throw fail(400,'Invalid recharge amount');
  const reference=(service==='islandship'?'SHIPMIT':'DRIVEMIT')+'_'+crypto.randomBytes(10).toString('hex');
  const path=service==='islandship'?'/agreements/'+encodeURIComponent(String(req.body?.agreement_id||''))+'/charges':'/customers/'+encodeURIComponent(String(req.body?.customer_id||''))+'/cards/'+encodeURIComponent(String(req.body?.card_id||''))+'/charges';
  const body={amount,merchant_reference:reference,description:service==='islandship'?'IslandShip monthly membership':'IslandDrive service credit recharge'};
  if(service==='islanddrive')body.currency='MVR';
  if(!req.body?.confirmed)throw fail(400,'Explicit charge confirmation required');
  const d=await paymesh(path,'POST',body);return res.status(200).json({payment_id:d.payment_id,status:d.status,merchant_reference:reference});
 }
 throw fail(405,'Unsupported operation');
 }catch(e){return res.status(e.statusCode||502).json({error:e.statusCode?e.message:'Service temporarily unavailable'})}};
