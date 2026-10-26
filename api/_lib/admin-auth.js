// Require a valid Supabase user who is present in shop_admins.
// Uses the same authorization model as the existing merchant dashboard.
async function requireMerchantAdmin(req) {
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)throw Object.assign(new Error('Sign in required'),{statusCode:401});
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Object.assign(new Error('Authentication unavailable'),{statusCode:503});
  const headers={apikey:key,Authorization:'Bearer '+token};
  const userResponse=await fetch(url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(8000)});
  if(!userResponse.ok)throw Object.assign(new Error('Session expired'),{statusCode:401});
  const user=await userResponse.json();
  if(!user.id)throw Object.assign(new Error('Invalid session'),{statusCode:401});
  const adminResponse=await fetch(url+'/rest/v1/shop_admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id&limit=1',{headers,signal:AbortSignal.timeout(8000)});
  if(!adminResponse.ok)throw Object.assign(new Error('Authorization unavailable'),{statusCode:503});
  if(!(await adminResponse.json()).length)throw Object.assign(new Error('Merchant administrator access required'),{statusCode:403});
  return user;
}
module.exports={requireMerchantAdmin};
