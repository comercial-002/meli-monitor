/**
 * /api/token
 * Proxy para trocar authorization_code por access_token
 * e para renovar tokens via refresh_token.
 *
 * O navegador NÃO pode chamar api.mercadolibre.com diretamente (CORS).
 * Esta função roda no servidor Vercel e faz a chamada por ele.
 *
 * POST /api/token
 * Body (JSON):
 *   grant_type    : "authorization_code" | "refresh_token"
 *   client_id     : APP ID do app no ML Developer Center
 *   client_secret : Secret Key do app
 *   code          : código recebido no callback (só para authorization_code)
 *   redirect_uri  : exatamente igual ao cadastrado no app
 *   code_verifier : gerado no PKCE (só para authorization_code)
 *   refresh_token : token de renovação (só para refresh_token)
 */

const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — permite chamadas do mesmo domínio Vercel e localhost (desenvolvimento)
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.APP_URL || '',
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);

  if (allowed.length === 0 || allowed.some(o => origin.startsWith(o)) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    grant_type,
    client_id,
    client_secret,
    code,
    redirect_uri,
    code_verifier,
    refresh_token,
  } = req.body || {};

  // Validações básicas
  if (!grant_type)    return res.status(400).json({ error: 'grant_type é obrigatório' });
  if (!client_id)     return res.status(400).json({ error: 'client_id é obrigatório' });
  if (!client_secret) return res.status(400).json({ error: 'client_secret é obrigatório' });

  if (grant_type === 'authorization_code') {
    if (!code)         return res.status(400).json({ error: 'code é obrigatório para authorization_code' });
    if (!redirect_uri) return res.status(400).json({ error: 'redirect_uri é obrigatório para authorization_code' });
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token é obrigatório' });
  }

  // Montar o body para o ML
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
    const mlRes = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Accept':        'application/json',
        'User-Agent':    'MLMonitor/1.0',
      },
      body: params.toString(),
    });

    const data = await mlRes.json();

    // Repassa o status original do ML
    return res.status(mlRes.status).json(data);

  } catch (err) {
    console.error('[api/token] Erro ao chamar ML:', err);
    return res.status(502).json({
      error: 'Falha ao comunicar com o Mercado Livre',
      detail: err.message,
    });
  }
}
