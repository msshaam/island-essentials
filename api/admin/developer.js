const {requireMerchantAdmin}=require('../_lib/admin-auth');
const {publicConfiguration}=require('../_lib/paymesh-config');
module.exports=async function(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Content-Type','application/json');
  try {
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    await requireMerchantAdmin(req);
    return res.status(200).json({environments:publicConfiguration(),active:'sandbox',
      liveSwitchEnabled:false,credentialEditingEnabled:false,
      message:'Production routing and secure credential editing are not yet enabled.'});
  } catch(error) {
    return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'Request failed'});
  }
};
