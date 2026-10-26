const {requireMerchantAdmin}=require('../_lib/admin-auth');
const {environment}=require('../_lib/paymesh-config');
const {effectiveConfig}=require('../_lib/config-store');
// Read-only production transaction lookup. Existing sandbox endpoint remains authoritative.
// The upstream auth header follows the existing PayMesh Bearer-key integration.
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  await requireMerchantAdmin(req);
  const mode=environment(req.query.environment);
  if(mode!=='production')return res.status(400).json({error:'Use the existing sandbox transaction endpoint'});
  const {baseUrl,apiKey}=await effectiveConfig(mode);
  const query=new URLSearchParams();
  for(const name of ['merchant_reference','status','cursor']){
    const value=String(req.query[name]||'').trim();
    if(value){if(value.length>128)return res.status(400).json({error:'Invalid search parameter'});query.set(name,value)}
  }
  const url=baseUrl+'/payments'+(query.size?'?'+query.toString():'');
  const upstream=await fetch(url,{headers:{Authorization:'Bearer '+apiKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const body=await upstream.text();
  let data;try{data=JSON.parse(body)}catch{data={error:'Invalid PayMesh response'}}
  if(!upstream.ok)return res.status(upstream.status>=500?502:upstream.status).json({error:'PayMesh transaction lookup failed',details:data?.message||data?.error||null});
  return res.status(200).json(data);
 }catch(e){return res.status(e.statusCode||502).json({error:e.statusCode?e.message:'Transaction lookup unavailable'})}
};
