export default async function handler(req, res) {
  try {
    let code;
    let code_verifier;

    if (req.body) {
      try {
        const parsed = typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body;

        code = parsed.code;
        code_verifier = parsed.code_verifier;

      } catch (e) {
        return res.status(400).json({ error: 'Body inválido' });
      }
    }

    if (!code) {
      return res.status(400).json({ error: 'Code não enviado' });
    }

    if (!code_verifier) {
      return res.status(400).json({ error: 'code_verifier não enviado' });
    }

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: 'https://meli-monitor.vercel.app/callback.html',
        code_verifier
      })
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
