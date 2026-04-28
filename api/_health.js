/**
 * GET /api/_health
 * Rota de diagnóstico — confirma que as serverless functions estão ativas.
 * Acesse: https://SEU-PROJETO.vercel.app/api/_health
 */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      has_ml_client_id:     !!process.env.ML_CLIENT_ID,
      has_ml_client_secret: !!process.env.ML_CLIENT_SECRET,
      has_master_password:  !!process.env.MASTER_PASSWORD,
      has_jwt_secret:       !!process.env.JWT_SECRET,
      has_kv_url:           !!process.env.KV_REST_API_URL,
      has_kv_token:         !!process.env.KV_REST_API_TOKEN,
    },
    node_version: process.version,
  });
};
