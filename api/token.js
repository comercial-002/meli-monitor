/**
 * /api/token.js
 * Proxy para trocar authorization_code por access_token
 * e renovar tokens via refresh_token.
 *
 * IMPORTANTE: usa CommonJS (module.exports) — obrigatório para
 * Vercel Serverless Functions em .js sem configuração extra.
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Vercel já faz parse do JSON automaticamente.
  // Fallback manual caso o body chegue como string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const {
    grant_type,
    client_id,
    client_secret,
    code,
    redirect_uri,
    code_verifier,
    refresh_token,
  } = body;

  // Validações
  if (!grant_type)    return res.status(400).json({ error: 'grant_type obrigatorio' });
  if (!client_id)     return res.status(400).json({ error: 'client_id obrigatorio' });
  if (!client_secret) return res.status(400).json({ error: 'client_secret obrigatorio' });

  if (grant_type === 'authorization_code') {
    if (!code)         return res.status(400).json({ error: 'code obrigatorio' });
    if (!redirect_uri) return res.status(400).json({ error: 'redirect_uri obrigatorio' });
  }
  if (grant_type === 'refresh_token' && !refresh_token) {
    return res.status(400).json({ error: 'refresh_token obrigatorio' });
  }

  // Body para o ML (x-www-form-urlencoded)
  const params = new URLSearchParams();
  params.append('grant_type',    grant_type);
  params.append('client_id',     client_id);
  params.append('client_secret', client_secret);

  if (grant_type === 'authorization_code') {
    params.append('code',         code);
    params.append('redirect_uri', redirect_uri);
    if (code_verifier) params.append('code_verifier', code_verifier);
  }
  if (grant_type === 'refresh_token') {
    params.append('refresh_token', refresh_token);
  }

  try {
    const mlRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body: params.toString(),
    });

    const data = await mlRes.json();
    return res.status(mlRes.status).json(data);

  } catch (err) {
    console.error('[api/token]', err.message);
    return res.status(502).json({
      error:  'Falha ao comunicar com o Mercado Livre',
      detail: err.message,
    });
  }
};
