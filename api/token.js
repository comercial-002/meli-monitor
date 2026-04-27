/**
 * /api/token.js
 * Troca authorization_code por access_token usando as credenciais
 * da aplicação salvas nas variáveis de ambiente do Vercel.
 * O usuário NÃO precisa mais informar Client ID / Secret.
 *
 * Env vars necessárias no Vercel:
 *   ML_CLIENT_ID     — App ID do Developer Center
 *   ML_CLIENT_SECRET — Secret do Developer Center
 *   MASTER_PASSWORD  — senha do login master do sistema
 *   JWT_SECRET       — segredo para assinar tokens de sessão
 */

const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const { grant_type, code, redirect_uri, code_verifier, refresh_token } = body;

  // Credenciais vêm das env vars — nunca do cliente
  const client_id     = process.env.ML_CLIENT_ID;
  const client_secret = process.env.ML_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return res.status(500).json({
      error: 'Variáveis de ambiente ML_CLIENT_ID e ML_CLIENT_SECRET não configuradas no Vercel.'
    });
  }
  if (!grant_type) return res.status(400).json({ error: 'grant_type obrigatorio' });

  const params = new URLSearchParams({ grant_type, client_id, client_secret });

  if (grant_type === 'authorization_code') {
    if (!code)         return res.status(400).json({ error: 'code obrigatorio' });
    if (!redirect_uri) return res.status(400).json({ error: 'redirect_uri obrigatorio' });
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    if (code_verifier) params.append('code_verifier', code_verifier);
  } else if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token obrigatorio' });
    params.append('refresh_token', refresh_token);
  } else {
    return res.status(400).json({ error: `grant_type inválido: ${grant_type}` });
  }

  try {
    const mlRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params.toString(),
    });
    const data = await mlRes.json();
    return res.status(mlRes.status).json(data);
  } catch (err) {
    console.error('[api/token]', err.message);
    return res.status(502).json({ error: 'Falha ao comunicar com o Mercado Livre', detail: err.message });
  }
};
