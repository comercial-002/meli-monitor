/**
 * /api/config.js
 * Expõe configurações públicas do servidor para o frontend.
 * Apenas o client_id é público — o client_secret NUNCA é exposto.
 *
 * O frontend precisa do client_id para montar a URL de autorização OAuth.
 * O client_secret fica seguro no servidor (variável de ambiente).
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    client_id: process.env.ML_CLIENT_ID || null,
    configured: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET),
  });
};
