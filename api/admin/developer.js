const {requireMerchantAdmin}=require('../_lib/admin-auth');
const {safeSummary,updateConfig}=require('../_lib/config-store');
const {environment}=require('../_lib/paymesh-config');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private,no-store');
 try{
  const user=await requireMerchantAdmin(req);
  if(req.method==='GET')return res.status(200).json({environments:await safeSummary(),active:'sandbox',checkoutEnvironment:'sandbox',productionCheckoutEnabled:false});
  if(req.method==='PATCH'){
   const token=String(req.headers.authorization).replace(/^Bearer\s+/i,'');
   const mode=environment(req.body?.environment);
   const result=await updateConfig(mode,req.body?.changes,token,user.id);
   return res.status(200).json(result);
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){return res.status(e.statusCode||500).json({error:e.statusCode?e.message:'Configuration request failed'})}
};
