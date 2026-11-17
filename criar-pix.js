const admin = require('./_fb');
const P = require('./_planos');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  let u;
  try { u = await admin.auth().verifyIdToken((req.headers.authorization || '').replace('Bearer ', '')); }
  catch (e) { return res.status(401).json({ erro: 'auth' }); }
  const plano = req.body && req.body.plano, p = P[plano];
  if (!p) return res.status(400).json({ erro: 'plano' });
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json', 'X-Idempotency-Key': require('crypto').randomUUID() },
      body: JSON.stringify({
        transaction_amount: p.preco,
        description: 'Porquinho Financeiro - ' + p.nome,
        payment_method_id: 'pix',
        payer: { email: u.email },
        external_reference: u.uid + '|' + plano,
        notification_url: 'https://' + req.headers.host + '/api/webhook'
      })
    });
    const t = ((await r.json()).point_of_interaction || {}).transaction_data;
    if (!t) return res.status(502).json({ erro: 'mp' });
    res.json({ qr: t.qr_code, b64: t.qr_code_base64 });
  } catch (e) { res.status(502).json({ erro: 'mp' }); }
};
