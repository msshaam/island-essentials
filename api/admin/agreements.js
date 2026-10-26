const {requireMerchantAdmin}=require('../_lib/admin-auth');
const {effectiveConfig}=require('../_lib/config-store');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','private,no-store');try{
await requireMerchantAdmin(req);
if(req.method!=='GET')return res.status(405).json({error:'Read-only endpoint'});
const mode=String(req.query.environment||'sandbox');if(!['sandbox','production'].includes(mode))return res.status(400).json({error:'Invalid environment'});
const id=String(req.query.id||'').trim();if(id&&(id.length>128||!/^[a-zA-Z0-9_-]+$/.test(id)))return res.status(400).json({error:'Invalid agreement ID'});
const customer=String(req.query.customer_id||'').trim();if(customer&&(customer.length>128||!/^[a-zA-Z0-9_-]+$/.test(customer)))return res.status(400).json({error:'Invalid customer ID'});
const {baseUrl,apiKey}=await effectiveConfig(mode);
const q=new URLSearchParams();if(!id&&customer)q.set('customer_id',customer);
const path='/agreements'+(id?'/'+encodeURIComponent(id):q.size?'?'+q.toString():'');
const r=await fetch(baseUrl+path,{headers:{Authorization:'Bearer '+apiKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
const body=await r.text();let data;try{data=JSON.parse(body)}catch{data={}};
if(!r.ok)return res.status(r.status>=500?502:r.status).json({error:data?.message||data?.error||'Could not retrieve agreements',status:r.status});
return res.status(200).json(data)
}catch(e){return res.status(e.statusCode||502).json({error:e.statusCode?e.message:'Agreement lookup unavailable'})}};