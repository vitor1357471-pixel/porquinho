const admin = require('./_fb');
const P = require('./_planos');
module.exports = async (req, res) => {
  try {
    const id = (req.body && req.body.data && req.body.data.id) || (req.query && (req.query['data.id'] || req.query.id));
    if (!id) return res.status(200).end();
    // Confirma o pagamento direto no Mercado Pago (não confia no corpo da notificação).
    const pay = await (await fetch('https://api.mercadopago.com/v1/payments/' + id, { headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN } })).json();
    if (pay.status === 'approved' && pay.external_reference) {
      const [uid, plano] = pay.external_reference.split('|'), p = P[plano];
      if (p && Number(pay.transaction_amount) === p.preco) {
        const ref = admin.database().ref('subscriptions/' + uid);
        const cur = (await ref.once('value')).val();
        if (!cur || cur.pagamento !== String(id)) {
          const d = new Date(Math.max(Date.now(), (cur && cur.ate) || 0));
          d.setMonth(d.getMonth() + p.meses);
          const user = await admin.auth().getUser(uid);
          await ref.set({ plano, ate: d.getTime(), email: user.email || '', pagamento: String(id) });
        }
      }
    }
  } catch (e) { return res.status(500).end(); }
  res.status(200).end();
};
