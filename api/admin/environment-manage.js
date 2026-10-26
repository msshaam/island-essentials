const {requireMerchantAdmin}=require('../_lib/admin-auth');
const {effectiveConfig}=require('../_lib/config-store');
const {environment}=require('../_lib/paymesh-config');
const actions={
 payment:{method:'GET',path:id=>'/payments/'+encodeURIComponent(id)},
 customers:{method:'GET',path:()=>'/customers'},
 customer:{method:'GET',path:id=>'/customers/'+encodeURIComponent(id)},
 cards:{method:'GET',path:id=>'/customers/'+encodeURIComponent(id)+'/cards'},
 cancel:{method:'POST',path:id=>'/payments/'+encodeURIComponent(id)+'/cancel'},
 create:{method:'POST',path:()=>'/customers'},
 update:{method:'PATCH',path:id=>'/customers/'+encodeURIComponent(id)},
 delete:{method:'DELETE',path:id=>'/customers/'+encodeURIComponent(id)},
 remove:{method:'DELETE',path:(id,card)=>'/customers/'+encodeURIComponent(id)+'/cards/'+encodeURIComponent(card)}
};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private,no-store');
 try{
  await requireMerchantAdmin(req);
  const mode=environment(req.query.environment),action=String(req.query.action||''),spec=actions[action];
  if(mode!=='production')return res.status(400).json({error:'Use existing sandbox merchant API'});
  if(!spec||req.method!==spec.method)return res.status(405).json({error:'Unsupported action or method'});
  if(req.method!=='GET'&&process.env.PAYMESH_PRODUCTION_WRITES_ENABLED!=='true')return res.status(403).json({error:'Production changes are disabled until the integration is verified'});
  const id=String(req.query.id||''),card=String(req.query.card||'');
  if((['payment','customer','cards','cancel','update','delete','remove'].includes(action)&&!id)||id.length>128||card.length>128)return res.status(400).json({error:'Invalid resource ID'});
  if(action==='remove'&&!card)return res.status(400).json({error:'Card ID required'});
  const {baseUrl,apiKey}=await effectiveConfig(mode);
  const path=spec.path(id,card);
  const upstream=await fetch(baseUrl+path,{method:req.method,headers:{Authorization:'Bearer '+apiKey,Accept:'application/json',...(req.method==='GET'?{}:{'Content-Type':'application/json'})},...(req.method==='POST'||req.method==='PATCH'?{body:JSON.stringify(req.body||{})}:{}),signal:AbortSignal.timeout(12000)});
  const body=await upstream.text();let data;try{data=JSON.parse(body)}catch{data={error:'Invalid payment provider response'}};
  if(!upstream.ok)return res.status(upstream.status>=500?502:upstream.status).json({error:'PayMesh request failed',details:data?.message||data?.error||null});
  return res.status(200).json(data);
 }catch(e){return res.status(e.statusCode||502).json({error:e.statusCode?e.message:'Merchant request failed'})}
};
