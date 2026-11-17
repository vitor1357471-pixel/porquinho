import { firebaseConfig } from './firebase-config.js';
const $ = s => document.querySelector(s);
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mkey = d => dkey(d).slice(0, 7);
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const uid = () => Math.random().toString(36).slice(2, 9);
const num = s => {
  s = String(s).trim().replace(/[^\d,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
};
const CATS = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'];
const COLORS = ['#B83A62', '#F2C14E', '#1F7A55', '#3B1F2B', '#F4A6B7', '#6B4A57', '#2F6DB5', '#C9B8BF'];
const KEY = 'porquinho:v1';
const PASTEL = ['#FBD9E1', '#FCEBB8', '#CFEBDD', '#D9CDD1', '#FFE6EC', '#E6DCE0'];
const big = n => { const [i, c] = Math.abs(n).toFixed(2).split('.'); return `${n < 0 ? '−' : ''}<small>R$</small>${Number(i).toLocaleString('pt-BR')}<small>,${c}</small>`; };
let drop = true, off = 0, sub = null, admin = false, ADM = null, pix = null;
const cats = () => [...CATS, ...S.cats];
const THEMES = { rosa: ['Rosa', '#B83A62', '#FFF6F0'], escuro: ['Escuro', '#D9507A', '#1D1419'], oceano: ['Oceano', '#1E6FA8', '#EEF6FB'], floresta: ['Floresta', '#2F7D4F', '#F0F7F1'], lavanda: ['Lavanda', '#7A4FC2', '#F5F1FB'] };
let theme = 'rosa';
try { theme = localStorage.getItem('porquinho:theme') || 'rosa'; } catch (e) { /* ok */ }
if (!THEMES[theme]) theme = 'rosa';
const setTheme = t => {
  theme = t; document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = THEMES[t][2];
  try { localStorage.setItem('porquinho:theme', t); } catch (e) { /* ok */ }
};
setTheme(theme);

const CLOUD = !String(firebaseConfig.apiKey).startsWith('COLE');
const blank = () => ({ incomes: [], fixed: [], inst: [], exp: [], goals: [], cats: [], budgets: [] });
const norm = v => {
  const L = x => Array.isArray(x) ? x : Object.values(x || {});
  const o = { ...blank(), ...(v || {}) };
  ['incomes', 'fixed', 'inst', 'exp', 'goals', 'cats', 'budgets'].forEach(k => { o[k] = L(o[k]); });
  o.fixed.forEach(f => { f.paid = f.paid || {}; });
  o.inst.forEach(i => { i.paid = i.paid || {}; });
  return o;
};
let S = blank(), user = null, fb = null, status = '', authMode = 'login';
if (!CLOUD) { try { S = norm(JSON.parse(localStorage.getItem(KEY))); } catch (e) { S = blank(); } }
const paintStatus = () => { const el = $('#sync'); if (el) el.textContent = status; };
const save = () => {
  if (!CLOUD) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sem armazenamento */ } return; }
  if (!user) return;
  status = 'Salvando…'; paintStatus();
  fb.set(fb.ref(fb.db, `users/${user.uid}`), S).then(() => { status = 'Salvo na nuvem'; }).catch(() => { status = 'Erro ao salvar'; }).finally(paintStatus);
};
const say = t => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => el.classList.remove('on'), 2600); };
const errMsg = c => ({ 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'E-mail inválido.', 'auth/email-already-in-use': 'Este e-mail já tem conta. Use Entrar.', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.', 'auth/too-many-requests': 'Muitas tentativas. Tente de novo em alguns minutos.', 'auth/network-request-failed': 'Sem internet. Tente de novo.' }[c] || 'Não deu certo. Tente de novo.');
const AUTH = {
  login: d => fb.signInWithEmailAndPassword(fb.auth, d.e, d.p).catch(x => say(errMsg(x.code))),
  signup: d => fb.createUserWithEmailAndPassword(fb.auth, d.e, d.p).then(r => fb.updateProfile(r.user, { displayName: d.n.trim() }).then(render)).catch(x => say(errMsg(x.code))),
  reset: d => fb.sendPasswordResetEmail(fb.auth, d.e).then(() => say('Enviamos um e-mail para redefinir a senha.')).catch(x => say(errMsg(x.code))),
  name: d => fb.updateProfile(user, { displayName: d.n.trim() }).then(() => { render(); say('Nome atualizado.'); })
};

let tab = 'inicio';

function calc(o = 0) {
  const t0 = new Date(), now = o ? new Date(t0.getFullYear(), t0.getMonth() + o, 1) : t0, m = mkey(now), today = dkey(now);
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const left = dim - now.getDate() + 1;
  const income = sum(S.incomes, x => x.value);
  const mexp = S.exp.filter(e => e.date.startsWith(m));
  const fx = S.fixed.map(f => ({ ...f, isPaid: !!f.paid[m] }));
  const ins = S.inst.map(i => {
    const [y1, m1] = i.start.split('-').map(Number);
    const n = (now.getFullYear() - y1) * 12 + (now.getMonth() + 1 - m1) + 1;
    return { ...i, n, isPaid: !!i.paid[m] };
  }).filter(i => i.n >= 1 && i.n <= i.total);
  const fixPaid = sum(fx.filter(f => f.isPaid), f => f.value);
  const insPaid = sum(ins.filter(i => i.isPaid), i => i.value);
  const pend = sum(fx.filter(f => !f.isPaid), f => f.value) + sum(ins.filter(i => !i.isPaid), i => i.value);
  const variable = sum(mexp, e => e.value);
  const spent = variable + fixPaid + insPaid;
  const sobrou = income - spent;
  const livre = sobrou - pend;
  const todaySpent = sum(mexp.filter(e => e.date === today), e => e.value);
  const limit = (livre + todaySpent) / left;
  return { now, m, left, income, mexp, fx, ins, fixPaid, insPaid, pend, variable, spent, sobrou, livre, todaySpent, limit, podeHoje: limit - todaySpent };
}

const pig = (sad, r, drop) => `<svg role="img" aria-label="${sad ? 'Porquinho preocupado' : 'Porquinho feliz'}" width="200" viewBox="0 0 220 155"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC2D0"/><stop offset="1" stop-color="#F08CA6"/></linearGradient></defs><ellipse cx="110" cy="149" rx="70" ry="5" fill="#3B1F2B" opacity=".12"/><path d="M32 80q-16-4-10-18q6 10 14 6" fill="none" stroke="#E88AA0" stroke-width="5" stroke-linecap="round"/><rect x="58" y="116" width="22" height="28" rx="9" fill="#E27C98"/><rect x="132" y="116" width="22" height="28" rx="9" fill="#E27C98"/><ellipse cx="110" cy="84" rx="78" ry="54" fill="url(#pg)"/><clipPath id="bc"><ellipse cx="110" cy="84" rx="78" ry="54"/></clipPath><g clip-path="url(#bc)"><rect class="lvl" x="30" y="${138 - 108 * r}" width="160" height="${108 * r + 1}" fill="#EE7A9C" opacity=".45"/></g><path d="M62 46L52 18L88 36Z" fill="#E27C98"/><ellipse cx="88" cy="60" rx="26" ry="11" fill="#fff" opacity=".35" transform="rotate(-18 88 60)"/><ellipse cx="182" cy="86" rx="20" ry="15" fill="#E27C98"/><circle cx="176" cy="86" r="2.5" fill="#8F3550"/><circle cx="188" cy="86" r="2.5" fill="#8F3550"/><circle cx="150" cy="82" r="8" fill="#F2608A" opacity=".45"/><circle cx="148" cy="68" r="5" fill="#3B1F2B"/><circle cx="149.5" cy="66.5" r="1.6" fill="#fff"/><path d="${sad ? 'M158 98q8-6 14 0' : 'M158 94q8 6 14 0'}" fill="none" stroke="#8F3550" stroke-width="2.5" stroke-linecap="round"/><rect x="92" y="34" width="44" height="7" rx="3.5" fill="#8F3550"/><g class="coin ${drop ? 'go' : ''}"><circle cx="114" cy="18" r="11" fill="#F2C14E" stroke="#C99A22" stroke-width="2"/><text x="114" y="22" font-size="10" font-weight="800" text-anchor="middle" fill="#7A5A0E">R$</text></g></svg>`;

const delBtn = (k, id, name) => `<button class="x" data-act="del" data-k="${k}" data-id="${id}" aria-label="Excluir ${esc(name)}">Excluir</button>`;
const paidBtn = (k, id, on) => `<button class="paid ${on ? 'on' : ''}" data-act="paid" data-k="${k}" data-id="${id}" aria-pressed="${on}">${on ? 'Pago' : 'Marcar pago'}</button>`;
const tile = (l, v, cls) => `<div class="c" style="flex:1;padding:12px 14px;border-radius:18px"><div class="m">${l}</div><div class="b ${cls || ''}" style="font-size:19px;font-weight:800">${brl(v)}</div></div>`;

function vInicio(c) {
  const month = c.now.toLocaleDateString('pt-BR', { month: 'long' });
  const sad = c.livre < 0 || c.podeHoje < 0;
  const chip = !S.incomes.length ? ['warn', 'Cadastre quanto você recebe na aba Contas']
    : c.livre < 0 ? ['warn', 'Atenção: as contas passam do que sobrou']
    : c.podeHoje < 0 ? ['warn', 'Você passou do limite de hoje']
    : ['', 'Tudo certo: dentro do limite de hoje'];
  const rem = c.income ? Math.min(1, Math.max(0, c.sobrou / c.income)) : 0;
  const dr = drop;
  drop = false;
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const k = dkey(d);
    return { l: i === 6 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), v: sum(S.exp.filter(e => e.date === k), e => e.value) };
  });
  const lim = Math.max(c.limit, 0);
  const mx = Math.max(lim, ...days.map(x => x.v), 1) * 1.1;
  const last = [...S.exp].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return `
  <div><span class="m">${user && user.displayName ? 'Olá, ' + esc(user.displayName.split(' ')[0]) + ' · ' : ''}${c.left - 1} dias para acabar o mês</span><h1>${month[0].toUpperCase() + month.slice(1)}</h1></div>
  <div class="layout"><div class="side">
  <section class="pig">${pig(sad, rem, dr)}
    <span class="m">Sobrou no porquinho</span>
    <strong class="big ${c.sobrou < 0 ? 'neg' : ''}">${big(c.sobrou)}</strong>
    <span class="chip ${chip[0]}">${chip[1]}</span>
    <span class="m">${Math.round(rem * 100)}% do que você recebeu ainda está no porquinho</span>
  </section>
  <div style="display:flex;gap:10px">${tile('Recebi', c.income, 'pos')}${tile('Gastei', c.spent, 'neg')}</div>
  <div class="dark r"><span class="b">Pode gastar hoje</span><strong class="big">${big(c.podeHoje)}</strong></div>
  ${c.pend > 0 ? `<div class="c r"><div><div class="b">Contas e parcelas a vencer</div><div class="m">Livre depois delas: ${brl(c.livre)}</div></div><div class="rt"><strong class="neg">${brl(c.pend)}</strong><br><button class="lnk" data-act="tab" data-t="contas">Ver todas</button></div></div>` : ''}
  ${S.incomes.length ? '' : '<div class="c step"><h2>Primeiro passo</h2><p class="m" style="margin:4px 0 12px">Diga quanto você recebe por mês para o porquinho começar a contar.</p><button class="pb" data-act="tab" data-t="contas">Cadastrar o que recebo</button></div>'}
  <form class="c" data-f="exp"><h2>Lançar gasto</h2>
    <div class="two"><div><label for="ev">Valor</label><input id="ev" class="in" name="v" inputmode="decimal" placeholder="32,50" required></div><div><label for="ec">Categoria</label><select id="ec" class="in" name="c">${cats().map(x => `<option>${x}</option>`).join('')}</select></div></div>
    <label for="ed">O que foi?</label><input id="ed" class="in" name="d" placeholder="Ex.: Almoço">
    <label for="edt">Data</label><input id="edt" class="in" type="date" name="dt" value="${dkey(new Date())}" max="${dkey(new Date())}">
    <button class="pb">Lançar gasto</button>
  </form>
  </div><div class="main">
  <section class="c"><div class="r" style="margin-bottom:10px"><h2>Últimos 7 dias</h2><span class="m">linha = limite de hoje</span></div>
    <div class="chart"><div class="line" style="bottom:${24 + lim / mx * 110}px"></div>${days.map(x => `<div class="d"><i class="${x.v > c.limit ? 'over' : ''}" style="height:${x.v ? Math.max(x.v / mx * 110, 3) : 0}px"></i>${x.l}</div>`).join('')}</div>
    <div class="m" style="margin-top:6px">Barra escura = passou do limite</div></section>
  <section class="col"><h2>Últimos lançamentos</h2>
    ${last.length ? last.map(e => `<div class="c r row"><span class="av" style="background:${PASTEL[Math.max(0, CATS.indexOf(e.cat))]}">${esc(e.cat[0])}</span><div style="flex:1"><div class="b">${esc(e.desc)}</div><div class="m">${esc(e.cat)} · ${e.date.split('-').reverse().slice(0, 2).join('/')}</div></div><div class="rt"><strong>${brl(e.value)}</strong>${delBtn('exp', e.id, e.desc)}</div></div>`).join('') : '<div class="empty">Nenhum gasto ainda. Lance o primeiro acima.</div>'}
  </section></div></div>`;
}

function vMes(c) {
  const sl = [...cats().map(n => ({ n, v: sum(c.mexp.filter(e => e.cat === n), e => e.value) })), { n: 'Contas fixas', v: c.fixPaid }, { n: 'Parcelas', v: c.insPaid }].filter(x => x.v > 0);
  const total = sum(sl, x => x.v), C = 2 * Math.PI * 54;
  let acc = 0;
  const arcs = sl.map((x, i) => { const len = x.v / total * C; const s = `<circle cx="70" cy="70" r="54" stroke="${COLORS[i % 8]}" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-acc}"/>`; acc += len; return s; }).join('');
  const pct = c.income ? Math.round(c.spent / c.income * 100) : 0;
  return `
  <div class="mn"><button class="lnk" data-act="moff" data-t="-1" aria-label="Mês anterior">‹</button><h1 style="text-transform:capitalize">${c.now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h1><button class="lnk" data-act="moff" data-t="1" aria-label="Próximo mês" ${off >= 0 ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div style="display:flex;gap:10px">${tile('Recebi', c.income, 'pos')}${tile('Gastei', c.spent, 'neg')}${tile('Sobrou', c.sobrou)}</div>
  <section class="c col" style="gap:10px"><h2>Para onde foi o dinheiro</h2>
    ${total ? `<svg role="img" aria-label="Gastos por categoria" width="160" viewBox="0 0 140 140" style="align-self:center"><g fill="none" stroke-width="22" transform="rotate(-90 70 70)">${arcs}</g><text x="70" y="74" font-size="26" font-weight="800" text-anchor="middle" style="fill:var(--ink)">${pct}%</text><text x="70" y="92" font-size="11" text-anchor="middle" style="fill:var(--mu)">do recebido</text></svg>
    ${sl.map((x, i) => `<div class="r b leg" style="font-size:15px"><span><i style="background:${COLORS[i % 8]}"></i>${x.n}</span><span>${brl(x.v)}</span></div>`).join('')}` : '<div class="empty">Sem gastos neste mês ainda.</div>'}
  </section>
  <div class="dark col"><div class="r"><span class="b">Contas a vencer</span><strong>${brl(c.pend)}</strong></div><div class="m" style="color:var(--ac2)">Livre depois das contas: ${brl(c.livre)}</div></div>
  <section class="col"><h2>Orçamento por categoria</h2>
    ${S.budgets.map(b => { const sp = sum(c.mexp.filter(e => e.cat === b.cat), e => e.value), p = b.value ? sp / b.value * 100 : 0; return `<div class="c col"><div class="r"><div><div class="b">${esc(b.cat)}</div><div class="m ${sp > b.value ? 'neg b' : ''}">${brl(sp)} de ${brl(b.value)}${sp > b.value ? ' · passou!' : ''}</div></div>${delBtn('budgets', b.id, b.cat)}</div><div class="t"><i style="width:${Math.min(100, p)}%;${sp > b.value ? 'background:#C0392B' : ''}"></i></div></div>`; }).join('') || '<div class="empty">Defina quanto quer gastar por categoria.</div>'}
    <details class="c add"><summary>Definir orçamento</summary><form data-f="bud"><label for="bc">Categoria</label><select id="bc" class="in" name="c">${cats().map(x => `<option>${esc(x)}</option>`).join('')}</select><label for="bv">Limite por mês</label><input id="bv" class="in" name="v" inputmode="decimal" placeholder="600,00" required><button class="pb">Salvar orçamento</button></form></details>
  </section>
  <section class="col"><h2>Lançamentos do mês</h2>
    ${[...c.mexp].sort((x, y) => y.date.localeCompare(x.date)).map(e => `<div class="c r row"><span class="av" style="background:${PASTEL[Math.max(0, CATS.indexOf(e.cat))]}">${esc(e.cat[0])}</span><div style="flex:1"><div class="b">${esc(e.desc)}</div><div class="m">${esc(e.cat)} · ${e.date.split('-').reverse().slice(0, 2).join('/')}</div></div><div class="rt"><strong>${brl(e.value)}</strong>${delBtn('exp', e.id, e.desc)}</div></div>`).join('') || '<div class="empty">Nenhum lançamento neste mês.</div>'}
  </section>`;
}

function vContas(c) {
  const m = c.m;
  const fx = [...c.fx].sort((a, b) => a.day - b.day);
  const dueSoon = f => !f.isPaid && f.day >= c.now.getDate() && f.day - c.now.getDate() <= 5;
  return `
  <div><h1>Contas</h1><span class="m">Entradas, gastos fixos e parcelas</span></div>
  <div class="c" style="background:var(--ac);color:#fff;border-radius:26px"><div class="b" style="font-size:14px">Entra por mês</div><div class="big">${big(c.income)}</div></div>
  <section class="col"><h2>Entradas</h2>
    ${S.incomes.map(x => `<div class="c r row"><div class="b">${esc(x.name)}</div><div class="rt"><strong class="pos">${brl(x.value)}</strong>${delBtn('incomes', x.id, x.name)}</div></div>`).join('') || '<div class="empty">Nenhuma entrada ainda.</div>'}
    <details class="c add"><summary>Adicionar entrada</summary><form data-f="inc"><div class="two"><div><label for="in1">De onde veio?</label><input id="in1" class="in" name="n" placeholder="Salário" required></div><div><label for="in2">Quanto?</label><input id="in2" class="in" name="v" inputmode="decimal" placeholder="3.800,00" required></div></div><button class="pb">Adicionar entrada</button></form></details>
  </section>
  <section class="col"><div class="r"><h2>Gastos fixos</h2><span class="m">${brl(sum(fx, f => f.value))} por mês</span></div>
    ${fx.map(f => `<div class="c r row ${dueSoon(f) ? 'due' : ''}"><div><div class="b">${esc(f.name)}</div><div class="m">Todo dia ${f.day}</div></div><div class="rt"><strong>${brl(f.value)}</strong><br>${paidBtn('fixed', f.id, f.isPaid)}${delBtn('fixed', f.id, f.name)}</div></div>`).join('') || '<div class="empty">Nenhum gasto fixo ainda.</div>'}
    <details class="c add"><summary>Adicionar gasto fixo</summary><form data-f="fix"><label for="f1">Nome</label><input id="f1" class="in" name="n" placeholder="Aluguel" required>
      <div class="two"><div><label for="f2">Valor</label><input id="f2" class="in" name="v" inputmode="decimal" placeholder="1.100,00" required></div><div><label for="f3">Dia do mês</label><input id="f3" class="in" name="day" inputmode="numeric" placeholder="5" required></div></div><button class="pb">Adicionar gasto fixo</button></form></details>
  </section>
  <section class="col"><div class="r"><h2>Parcelas</h2><span class="m">Falta pagar ${brl(sum(c.ins, i => (i.total - i.n + (i.isPaid ? 0 : 1)) * i.value))}</span></div>
    ${c.ins.map(i => { const paidN = i.n - (i.isPaid ? 0 : 1); return `<div class="c row"><div class="r"><div><div class="b">${esc(i.name)}</div><div class="m">${paidN} de ${i.total} pagas</div></div><div class="rt"><strong>${brl(i.value)}</strong><br>${paidBtn('inst', i.id, i.isPaid)}${delBtn('inst', i.id, i.name)}</div></div><div class="t"><i style="width:${paidN / i.total * 100}%"></i></div></div>`; }).join('') || '<div class="empty">Nenhuma parcela neste mês.</div>'}
    <details class="c add"><summary>Adicionar parcelamento</summary><form data-f="inst"><label for="p1">Nome</label><input id="p1" class="in" name="n" placeholder="Notebook" required>
      <div class="two"><div><label for="p2">Valor da parcela</label><input id="p2" class="in" name="v" inputmode="decimal" placeholder="215,00" required></div><div><label for="p3">Total de parcelas</label><input id="p3" class="in" name="t" inputmode="numeric" placeholder="12" required></div></div>
      <div><label for="p4">Parcela deste mês é a número</label><input id="p4" class="in" name="cur" inputmode="numeric" value="1"></div><button class="pb">Adicionar parcelamento</button></form></details>
  </section>`;
}

const vMetas = () => `
  <div><h1>Metas</h1><span class="m">Cofrinhos para os seus sonhos</span></div>
  ${S.goals.map(g => { const p = g.target ? Math.min(100, g.saved / g.target * 100) : 0; return `<div class="c col"><div class="r"><div><div class="b">${esc(g.name)}</div><div class="m">${brl(g.saved)} de ${brl(g.target)} · ${Math.round(p)}%</div></div><div class="rt"><button class="paid" data-act="gdep" data-id="${g.id}">Guardar</button>${delBtn('goals', g.id, g.name)}</div></div><div class="t"><i style="width:${p}%"></i></div></div>`; }).join('') || '<div class="empty">Nenhuma meta ainda. Crie a primeira abaixo.</div>'}
  <details class="c add" open><summary>Nova meta</summary><form data-f="goal"><label for="g1">Nome</label><input id="g1" class="in" name="n" placeholder="Viagem" required><label for="g2">Valor da meta</label><input id="g2" class="in" name="v" inputmode="decimal" placeholder="5.000,00" required><button class="pb">Criar meta</button></form></details>`;
const PLANOS = { mensal: ['Mensal', 14.9, 1], semestral: ['Semestral', 71.4, 6], anual: ['Anual', 106.8, 12] };
const hasAccess = () => admin || (sub && sub.ate > Date.now()) || (user.metadata && Date.parse(user.metadata.creationTime) + 7 * 864e5 > Date.now());
const vPlanos = () => pix && pix !== 'load' ? `
  <div class="auth"><div class="c col" style="align-items:center;text-align:center"><h1>Pague com Pix</h1><span class="m">Abra o app do seu banco, escolha Pix e leia o QR Code.</span>
  <img src="data:image/png;base64,${pix.b64}" alt="QR Code do Pix" width="220" height="220"><button class="pb" data-act="copy">Copiar código Pix</button>
  <span class="m">Aguardando o pagamento. A tela atualiza sozinha.</span><button class="lnk" data-act="cancelpix">Escolher outro plano</button></div></div>` : `
  <div class="auth"><div class="pig" style="padding:22px"><h1>Continue com o seu porquinho</h1><p class="m">Seu período de acesso terminou. Escolha um plano e pague com Pix.</p></div>
  ${Object.entries(PLANOS).map(([k, [n, p, m]]) => `<div class="c r"><div><div class="b">${n}</div><div class="m">${brl(p / m)}/mês${m > 1 ? ' · ' + brl(p) + ' a cada ' + m + ' meses' : ''}</div></div><button class="paid" data-act="buy" data-t="${k}" ${pix === 'load' ? 'disabled' : ''}>Pagar com Pix</button></div>`).join('')}
  <button class="lnk" data-act="logout">Sair da conta</button></div>`;
async function buy(plano) {
  pix = 'load'; render();
  try {
    const r = await fetch('/api/criar-pix', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() }, body: JSON.stringify({ plano }) });
    const j = await r.json();
    if (!j.qr) throw new Error('pix');
    pix = j; render();
    clearInterval(buy.t);
    buy.t = setInterval(async () => {
      try {
        const s = (await fb.get(fb.ref(fb.db, `subscriptions/${user.uid}`))).val();
        if (s && s.ate > Date.now()) { sub = s; pix = null; clearInterval(buy.t); render(); say('Pagamento confirmado! Obrigado.'); }
      } catch (e) { /* tenta de novo */ }
    }, 5000);
  } catch (e) { pix = null; render(); say('Não foi possível gerar o Pix. Tente de novo.'); }
}
const vAdmin = () => `
  <div><h1>Administrador</h1><span class="m">Assinaturas pagas via Pix</span></div>
  <div style="display:flex;gap:10px">${tile('Receita mensal', ADM.mrr, 'pos')}<div class="c" style="flex:1;padding:12px 14px;border-radius:18px"><div class="m">Assinantes ativos</div><div class="b" style="font-size:19px;font-weight:800">${ADM.ativos}</div></div></div>
  <section class="col"><h2>Assinantes</h2>${ADM.lista.map(s => `<div class="c r row"><div><div class="b">${esc(s.email || 'Sem e-mail')}</div><div class="m">${esc(PLANOS[s.plano] ? PLANOS[s.plano][0] : s.plano)} · até ${new Date(s.ate).toLocaleDateString('pt-BR')}</div></div><span class="chip ${s.ate > Date.now() ? '' : 'warn'}">${s.ate > Date.now() ? 'Ativo' : 'Vencido'}</span></div>`).join('') || '<div class="empty">Nenhum assinante ainda.</div>'}</section>`;
const fld = (id, l, n, type, ph, ac) => `<label for="${id}">${l}</label><input id="${id}" class="in" name="${n}" type="${type}" placeholder="${ph}" autocomplete="${ac}" required${n === 'p' ? ' minlength="6"' : ''}>`;
const vAuth = () => `
  <section class="auth"><div class="pig">${pig(false, 0.6, true)}<h1>Porquinho Financeiro</h1><p class="m">Anote o que você gasta e veja quanto ainda pode gastar. Sua conta guarda tudo, em qualquer aparelho.</p></div>
  <div class="c">
    ${authMode === 'reset' ? '<h2 style="margin-bottom:10px">Redefinir senha</h2>' : `<div class="seg"><button class="${authMode === 'login' ? 'on' : ''}" data-act="am" data-t="login">Entrar</button><button class="${authMode === 'signup' ? 'on' : ''}" data-act="am" data-t="signup">Criar conta</button></div>`}
    ${authMode === 'signup' ? `<form data-f="signup">${fld('sn', 'Seu nome', 'n', 'text', 'Como quer ser chamado', 'name')}${fld('se', 'E-mail', 'e', 'email', 'voce@email.com', 'username')}${fld('sp', 'Senha', 'p', 'password', 'Mínimo de 6 caracteres', 'new-password')}<button class="pb">Criar minha conta</button></form>`
    : authMode === 'reset' ? `<form data-f="reset">${fld('re', 'E-mail da conta', 'e', 'email', 'voce@email.com', 'username')}<button class="pb">Enviar e-mail</button><button type="button" class="lnk" data-act="am" data-t="login">Voltar</button></form>`
    : `<form data-f="login">${fld('le', 'E-mail', 'e', 'email', 'voce@email.com', 'username')}${fld('lp', 'Senha', 'p', 'password', 'Sua senha', 'current-password')}<button class="pb">Entrar</button><button type="button" class="lnk" data-act="am" data-t="reset">Esqueci a senha</button></form>`}
    ${authMode === 'reset' ? '' : '<button class="ghost" data-act="google">Continuar com Google</button>'}
  </div></section>`;
const vConta = () => `
  <div><h1>Minha conta</h1><span class="m" id="sync">${CLOUD ? status : 'Modo local: os dados ficam só neste aparelho'}</span></div>
  ${CLOUD && user ? `<div class="c r"><span class="av" style="background:var(--soft)">${esc((user.displayName || user.email || '?')[0].toUpperCase())}</span><div style="flex:1;min-width:0"><div class="b">${esc(user.displayName || 'Sem nome')}</div><div class="m">${esc(user.email || '')}</div></div></div>
  <details class="c add"><summary>Mudar meu nome</summary><form data-f="name"><label for="nm">Nome</label><input id="nm" class="in" name="n" value="${esc(user.displayName || '')}" required><button class="pb">Salvar nome</button></form></details>
  <button class="paid" data-act="resetpw">Redefinir senha por e-mail</button>` : ''}
  <div class="c col"><h2>Categorias</h2><div class="m">${CATS.join(', ')}</div>
    ${S.cats.map(x => `<div class="r"><span class="b">${esc(x)}</span><button class="x" data-act="delcat" data-t="${esc(x)}" aria-label="Excluir categoria ${esc(x)}">Excluir</button></div>`).join('')}
    <form data-f="cat"><label for="nc">Nova categoria</label><input id="nc" class="in" name="n" placeholder="Pets" maxlength="20" required><button class="pb">Adicionar categoria</button></form></div>
  <div class="c col"><h2>Tema</h2><div class="themes">${Object.entries(THEMES).map(([k, v]) => `<button class="th ${k === theme ? 'on' : ''}" data-act="theme" data-t="${k}" aria-pressed="${k === theme}"><span class="sw" style="background:${v[1]}"></span>${v[0]}</button>`).join('')}</div></div>
  <button class="lnk" data-act="export">Baixar backup dos dados</button>
  <button class="lnk" data-act="csv">Baixar gastos em planilha (CSV)</button>
  <button class="lnk" data-act="import">Restaurar backup</button><input type="file" id="imp" accept="application/json,.json" hidden>
  ${CLOUD ? '<button class="pb" data-act="logout">Sair da conta</button>' : ''}`;

function render() {
  $('#nav').hidden = CLOUD && !user;
  $('#admbtn').hidden = !admin;
  if (CLOUD && !user) { $('#app').className = 'narrow'; $('#app').innerHTML = !fb ? '<div class="empty">Carregando…</div>' : vAuth(); return; }
  if (CLOUD && user && !hasAccess()) { $('#nav').hidden = true; $('#app').className = 'narrow'; $('#app').innerHTML = vPlanos(); return; }
  const c = calc();
  $('#app').className = tab === 'inicio' ? '' : 'narrow';
  $('#app').innerHTML = tab === 'inicio' ? vInicio(c) : tab === 'admin' && admin ? vAdmin() : tab === 'mes' ? vMes(calc(off)) : tab === 'metas' ? vMetas() : tab === 'conta' ? vConta() : vContas(c);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, k, id, t } = b.dataset;
  if (act === 'tab') { tab = t; window.scrollTo(0, 0); }
  else if (act === 'am') authMode = t;
  else if (act === 'buy') { buy(t); return; }
  else if (act === 'copy') { navigator.clipboard.writeText(pix.qr).then(() => say('Código Pix copiado.')); return; }
  else if (act === 'cancelpix') { pix = null; clearInterval(buy.t); }
  else if (act === 'moff') off = Math.min(0, off + Number(t));
  else if (act === 'theme') setTheme(t);
  else if (act === 'delcat') {
    if (S.exp.some(e => e.cat === t) || S.budgets.some(x => x.cat === t)) { say('Essa categoria já tem gastos ou orçamento.'); return; }
    S.cats = S.cats.filter(x => x !== t); save();
  }
  else if (act === 'import') { $('#imp').click(); return; }
  else if (act === 'csv') {
    const q = s => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['Data', 'Categoria', 'Descrição', 'Valor'], ...[...S.exp].sort((x, y) => x.date.localeCompare(y.date)).map(e => [e.date, e.cat, e.desc, String(e.value).replace('.', ',')])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'porquinho-gastos.csv'; a.click(); return;
  }
  else if (act === 'gdep') {
    const g = S.goals.find(x => x.id === id), v = num(prompt('Quanto quer guardar? (use - para retirar)') || '');
    if (g && v) { g.saved = Math.max(0, g.saved + v); save(); }
  }
  else if (act === 'google') { fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider()).catch(x => say(errMsg(x.code))); return; }
  else if (act === 'logout') { tab = 'inicio'; fb.signOut(fb.auth); return; }
  else if (act === 'resetpw') { fb.sendPasswordResetEmail(fb.auth, user.email).then(() => say('Enviamos um e-mail para redefinir a senha.')).catch(x => say(errMsg(x.code))); return; }
  else if (act === 'del') { S[k] = S[k].filter(x => x.id !== id); save(); }
  else if (act === 'paid') { const x = S[k].find(x => x.id === id), m = mkey(new Date()); x.paid[m] = !x.paid[m]; save(); }
  else if (act === 'export') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = 'porquinho-backup.json'; a.click(); return;
  }
  render();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f)), v = num(d.v), now = new Date();
  if (AUTH[f.dataset.f]) return AUTH[f.dataset.f](d);
  if (f.dataset.f === 'cat') {
    const n = d.n.replace(/[.#$\[\]\/]/g, '').trim();
    if (!n || cats().includes(n)) { say('Nome inválido ou já existe.'); return; }
    S.cats.push(n); save(); render(); say('Categoria adicionada.'); return;
  }
  if (v <= 0) return;
  const kind = f.dataset.f;
  if (kind === 'exp') drop = true;
  if (kind === 'exp') S.exp.push({ id: uid(), date: d.dt || dkey(now), desc: d.d.trim() || 'Gasto', value: v, cat: d.c });
  if (kind === 'inc') S.incomes.push({ id: uid(), name: d.n.trim(), value: v });
  if (kind === 'bud') { const b = S.budgets.find(x => x.cat === d.c); if (b) b.value = v; else S.budgets.push({ id: uid(), cat: d.c, value: v }); }
  if (kind === 'goal') S.goals.push({ id: uid(), name: d.n.trim(), target: v, saved: 0 });
  if (kind === 'fix') S.fixed.push({ id: uid(), name: d.n.trim(), value: v, day: Math.min(31, Math.max(1, parseInt(d.day) || 1)), paid: {} });
  if (kind === 'inst') {
    const total = Math.max(1, parseInt(d.t) || 1), cur = Math.min(total, Math.max(1, parseInt(d.cur) || 1));
    S.inst.push({ id: uid(), name: d.n.trim(), value: v, total, start: mkey(new Date(now.getFullYear(), now.getMonth() - (cur - 1), 1)), paid: {} });
  }
  save(); render();
  say({ exp: 'Gasto lançado.', inc: 'Entrada adicionada.', fix: 'Gasto fixo adicionado.', inst: 'Parcelamento adicionado.', goal: 'Meta criada.', bud: 'Orçamento salvo.' }[kind]);
});

document.addEventListener('change', e => {
  if (e.target.id !== 'imp' || !e.target.files[0]) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const n = norm(JSON.parse(r.result));
      if (!confirm('Isso substitui os dados atuais pelos do backup. Continuar?')) return;
      S = n; save(); render(); say('Backup restaurado.');
    } catch (x) { say('Arquivo de backup inválido.'); }
  };
  r.readAsText(e.target.files[0]);
});

async function boot() {
  if (!CLOUD) { render(); return; }
  render();
  const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
  try {
    const [app, auth, db] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')]);
    const a = app.initializeApp(firebaseConfig);
    fb = { ...auth, ...db, auth: auth.getAuth(a), db: db.getDatabase(a) };
  } catch (e) { $('#app').innerHTML = '<div class="empty">Não foi possível carregar o login. Verifique sua conexão.</div>'; return; }
  fb.onAuthStateChanged(fb.auth, async u => {
    user = u; status = '';
    if (u) {
      try { S = norm((await fb.get(fb.ref(fb.db, `users/${u.uid}`))).val()); status = 'Salvo na nuvem'; }
      catch (e) { S = blank(); status = 'Sem conexão com o banco'; }
    } else S = blank();
    sub = null; admin = false; ADM = null; pix = null;
    if (u) {
      try { sub = (await fb.get(fb.ref(fb.db, `subscriptions/${u.uid}`))).val(); } catch (e) { /* sem assinatura */ }
      try {
        const r = await fetch('/api/admin', { headers: { Authorization: 'Bearer ' + await u.getIdToken() } });
        if (r.ok) { ADM = await r.json(); admin = true; }
      } catch (e) { /* não é admin */ }
    }
    render();
  });
}
boot();
