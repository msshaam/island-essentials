// Server-side PayMesh environment resolver. Never import this module in browser code.
const ALLOWED = new Set(['sandbox', 'production']);
const DEFAULT_BASE = 'https://paymesh.saawee.com/v1';
function environment(value) {
  const name = String(value || 'sandbox').toLowerCase();
  if (!ALLOWED.has(name)) throw Object.assign(new Error('Invalid PayMesh environment'), { statusCode: 400 });
  return name;
}
function resolvePayMeshConfig(requestedEnvironment) {
  const mode = environment(requestedEnvironment);
  const production = mode === 'production';
  const baseUrl = (production
    ? process.env.PAYMESH_LIVE_API_BASE_URL
    : process.env.PAYMESH_API_BASE_URL) || DEFAULT_BASE;
  const apiKey = production ? process.env.PAYMESH_LIVE_API_KEY : process.env.PAYMESH_API_KEY;
  const webhookSecret = production ? process.env.PAYMESH_LIVE_WEBHOOK_SECRET : process.env.PAYMESH_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) throw Object.assign(new Error(mode + ' credentials not configured'), {statusCode:503});
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:') throw new Error('PayMesh API URL must use HTTPS');
  return {mode, baseUrl:parsed.toString().replace(/\/$/, ''), apiKey, webhookSecret};
}
function publicConfiguration() {
  return ['sandbox','production'].map(mode => {
    const production = mode === 'production';
    return {mode, baseUrl:(production ? process.env.PAYMESH_LIVE_API_BASE_URL : process.env.PAYMESH_API_BASE_URL)||DEFAULT_BASE,
      apiKeyConfigured:!!(production?process.env.PAYMESH_LIVE_API_KEY:process.env.PAYMESH_API_KEY),
      webhookSecretConfigured:!!(production?process.env.PAYMESH_LIVE_WEBHOOK_SECRET:process.env.PAYMESH_WEBHOOK_SECRET)};
  });
}
module.exports={environment,resolvePayMeshConfig,publicConfiguration};
