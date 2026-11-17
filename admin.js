const admin = require('./_fb');
const P = require('./_planos');
module.exports = async (req, res) => {
  try {
    const u = await admin.auth().verifyIdToken((req.headers.authorization || '').replace('Bearer ', ''));
    if (!process.env.ADMIN_UID || u.uid !== process.env.ADMIN_UID) return res.status(403).end();
    const v = (await admin.database().ref('subscriptions').once('value')).val() || {};
    const now = Date.now(), lista = Object.values(v).sort((a, b) => b.ate - a.ate);
    const ativos = lista.filter(s => s.ate > now);
    const mrr = ativos.reduce((t, s) => t + P[s.plano].preco / P[s.plano].meses, 0);
    res.json({ ativos: ativos.length, mrr, lista: lista.slice(0, 50) });
  } catch (e) { res.status(401).end(); }
};
