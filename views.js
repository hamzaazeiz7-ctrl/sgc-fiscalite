'use strict';
/* Interface : icônes, fenêtres, formulaires, authentification, accueil, échéances, contrôles */
const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  sync: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0112 20C5 20 1 12 1 12a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L21 2M16 7l3 3"/>', file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
  dl: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>', chev: '<path d="M9 18l6-6-6-6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;
const logo = (kind, cls = '') => `<img class="lg-l ${cls}" src="logos/sgc-${kind}-couleur.png" alt="Sterling Gate Consulting"><img class="lg-d ${cls}" src="logos/sgc-${kind}-blanc.png" alt="">`;
const S = { page: 'home', sub: '', co: 'all', hz: 6, f: { cat: 'all', st: 'all', q: '', y: String(new Date().getFullYear()) }, cf: { st: 'open', q: '' }, cal: { y: new Date().getFullYear(), m: new Date().getMonth() + 1, day: '', mode: 'grille' }, lf: { u: '', a: '', q: '' } };
const ACT = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function toast(msg, err) { const d = document.createElement('div'); d.textContent = msg; if (err) d.className = 'err'; $('#toast').appendChild(d); setTimeout(() => d.remove(), err ? 5000 : 2800); }

/* ---------- formulaires ---------- */
const F = {
  t: (n, l, v = '', a = '') => `<label class="f"><span>${l}</span><input name="${n}" value="${esc(v)}" ${a}></label>`,
  n: (n, l, v = '', a = '') => `<label class="f"><span>${l}</span><input name="${n}" type="number" step="0.001" inputmode="decimal" value="${esc(v)}" ${a}></label>`,
  d: (n, l, v = '', a = '') => `<label class="f"><span>${l}</span><input name="${n}" type="date" value="${esc(v)}" ${a}></label>`,
  p: (n, l, a = '') => `<label class="f"><span>${l}</span><div class="pw"><input type="password" name="${n}" ${a.includes('autocomplete') ? '' : 'autocomplete="new-password"'} ${a}><button type="button" class="eye" data-act="eye" aria-label="Afficher ou masquer le mot de passe">${ic('eye')}</button></div></label>`,
  s: (n, l, opts, v = '', a = '') => `<label class="f"><span>${l}</span><select name="${n}" ${a}>${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select></label>`,
  a: (n, l, v = '', a = '') => `<label class="f"><span>${l}</span><textarea name="${n}" rows="3" ${a}>${esc(v)}</textarea></label>`,
  c: (n, l, v) => `<label class="cos"><label style="display:flex;gap:10px;align-items:center;margin:8px 0"><input class="cb" type="checkbox" name="${n}" ${v ? 'checked' : ''}> <span>${l}</span></label></label>`
};
ACT.eye = el => { const i = el.parentElement.querySelector('input'), s = i.type === 'password'; i.type = s ? 'text' : 'password'; el.innerHTML = ic(s ? 'eyeoff' : 'eye'); };
const formData = f => { const o = {}; new FormData(f).forEach((v, k) => { o[k] = v; }); $$('input[type=checkbox]', f).forEach(c => { o[c.name] = c.checked; }); return o; };
function openModal(title, html, o = {}) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<div class="sheet"><div class="sh-h"><h3>${esc(title)}</h3><button class="x" type="button" data-close aria-label="Fermer">×</button></div><form novalidate><fieldset ${o.ro ? 'disabled' : ''}><div class="sh-b">${html}</div></fieldset><div class="sh-f">${o.foot || ''}${(o.save === false || o.ro) ? '' : '<button class="btn pri" type="submit">Enregistrer</button>'}</div></form></div>`;
  document.body.appendChild(ov); document.body.classList.add('noscroll');
  const close = () => { ov.remove(); document.removeEventListener('keydown', kd); if (!$('.ov')) document.body.classList.remove('noscroll'); };
  const kd = e => { if (e.key === 'Escape' && ov === [...$$('.ov')].pop()) close(); };
  document.addEventListener('keydown', kd);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  $('[data-close]', ov).onclick = close; ov.close = close;
  $('form', ov).onsubmit = async e => { e.preventDefault(); if (!o.onSave) return close(); const btn = $('[type=submit]', ov); btn && (btn.disabled = true); try { const r = await o.onSave(formData(e.target), e.target); if (r !== false) close(); } catch (er) { toast(er.message, 1); } btn && (btn.disabled = false); };
  const first = $('input:not([type=checkbox]),select', ov); if (first && !o.ro && matchMedia('(min-width:700px)').matches) first.focus();
  return ov;
}
function ask(msg, ok = 'Confirmer', danger) {
  return new Promise(res => {
    const ov = document.createElement('div'); ov.className = 'ov top';
    ov.innerHTML = `<div class="sheet sm"><div class="sh-b" style="padding-top:22px"><h3 style="margin-bottom:8px">Confirmation</h3><p>${esc(msg)}</p></div><div class="sh-f"><button class="btn" data-n>Annuler</button><button class="btn ${danger ? 'dng' : 'pri'}" data-y>${esc(ok)}</button></div></div>`;
    document.body.appendChild(ov); const end = v => { ov.remove(); res(v); };
    $('[data-n]', ov).onclick = () => end(false); $('[data-y]', ov).onclick = () => end(true); ov.onmousedown = e => { if (e.target === ov) end(false); };
  });
}

/* ---------- authentification ---------- */
function authShell(inner) {
  return `<div class="auth"><div class="auth-card"><div class="brand"><img class="lg-l lg-v" src="logos/sgc-vertical-couleur.png" alt="Sterling Gate Consulting"><img class="lg-d lg-v" src="logos/sgc-horizontal-blanc.png" alt=""><h1>${APP_NAME}</h1><p>Obligations et échéances fiscales — Tunisie</p></div>${inner}</div></div>`;
}
function renderAuth(mode = 'login') {
  const hasDb = !!db;
  if (hasDb) {
    $('#app').innerHTML = authShell(`<form id="lf"><label class="f"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>${F.p('pw', 'Mot de passe du compte', 'autocomplete="current-password" required')}<label class="cos" style="display:flex;gap:10px;align-items:center;margin:4px 0 8px"><input class="cb" type="checkbox" name="keep" checked> <span>Rester connecté 30 jours</span></label><button class="btn pri" type="submit">Se connecter</button></form><button class="link" data-act="reset-dev">Réinitialiser cet appareil</button>`);
    $('#lf').onsubmit = async e => {
      e.preventDefault(); const d = formData(e.target), b = $('button[type=submit]', e.target); b.disabled = true;
      const u = live(db.users).find(x => x.email.toLowerCase() === d.email.trim().toLowerCase());
      const okp = u && u.active !== false && (await hashPw(d.pw, u.salt)) === u.hash;
      if (!okp) { await new Promise(r => setTimeout(r, 900)); b.disabled = false; return toast(u && u.active === false ? 'Compte désactivé' : 'E-mail ou mot de passe incorrect', 1); }
      me = u; const s = { id: u.id, exp: Date.now() + 30 * 864e5 }; d.keep ? LS.set(KEY.sess, s) : SS.set(KEY.sess, s);
      logAct('Connexion', 'connexion', '', true); startApp();
    };
    return;
  }
  const tab = mode;
  $('#app').innerHTML = authShell(`<div class="tabs"><button data-act="auth-tab" data-v="new" class="${tab === 'new' ? 'on' : ''}">Nouvel espace</button><button data-act="auth-tab" data-v="join" class="${tab === 'join' ? 'on' : ''}">Rejoindre</button></div>` + (tab === 'new' ? `<form id="sf">${F.t('co', 'Nom de la première société', '', 'required')}${F.p('sp', "Mot de passe de l'espace (chiffre les données sur GitHub)", 'required minlength="8"')}${F.p('sp2', "Confirmer le mot de passe de l'espace", 'required')}${F.t('name', 'Votre nom', '', 'required autocomplete="name"')}${F.t('email', 'Votre e-mail (identifiant)', '', 'type="email" required')}${F.p('pw', 'Mot de passe de votre compte', 'required minlength="8"')}<div class="note">Deux mots de passe : celui de l'espace protège le fichier chiffré ; celui du compte sert à vous connecter.</div><button class="btn pri" type="submit">Créer l'espace</button></form>` : `<form id="jf"><label class="f"><span>Code de liaison (généré sur le PC)</span><textarea name="code" rows="3" placeholder="Collez le code ici"></textarea></label><div class="note">Ou renseignez les champs GitHub ci-dessous.</div>${F.t('owner', 'Propriétaire GitHub')}${F.t('repo', 'Dépôt de données (privé)')}${F.t('branch', 'Branche', 'main')}${F.t('path', 'Fichier', 'sgc-fiscalite-data.json')}${F.p('token', 'Jeton GitHub', 'autocomplete="off"')}${F.p('pass', "Mot de passe de l'espace", 'autocomplete="off"')}<button class="btn pri" type="submit">Rejoindre l'espace</button></form>`));
  const sf = $('#sf'); if (sf) sf.onsubmit = async e => {
    e.preventDefault(); const d = formData(e.target);
    if (d.sp !== d.sp2) return toast("Les deux mots de passe de l'espace diffèrent", 1);
    const cred = await mkCred(d.pw), co = touch({ id: uid(), name: d.co.trim(), pm: true, tele: true, freq: 'mensuelle', close: 12, cnss: true, emp: true });
    db = normalize({ roles: defaultRoles(), users: [touch({ id: uid(), name: d.name.trim(), email: d.email.trim(), ...cred, platform: true, active: true, mem: [] })], companies: [co] });
    cfg = { pass: d.sp }; saveCfg(); LS.set(KEY.db, db); me = db.users[0]; SS.set(KEY.sess, { id: me.id, exp: Date.now() + 864e5 });
    genEch(co.id, new Date().getFullYear(), true); logAct('Création de l\'espace', 'création', 'adm'); startApp();
  };
  const jf = $('#jf'); if (jf) jf.onsubmit = async e => {
    e.preventDefault(); const d = formData(e.target), b = $('button[type=submit]', e.target); b.disabled = true;
    try {
      let g, pass; if (d.code.trim()) { const l = parseLink(d.code); g = l.gh; pass = l.pass; } else { g = { owner: d.owner.trim(), repo: d.repo.trim(), branch: d.branch.trim() || 'main', path: d.path.trim(), token: d.token.trim() }; pass = d.pass; }
      const r = await GH.get(g); if (!r || !r.text.trim()) throw new Error('Aucune donnée trouvée dans ce dépôt');
      db = await decryptDB(r.text, pass); cfg = { gh: g, pass, last: Date.now() }; saveCfg(); LS.set(KEY.db, db); toast('Espace récupéré. Connectez-vous.'); renderAuth('login');
    } catch (er) { toast(er.message || 'Code de liaison invalide', 1); b.disabled = false; }
  };
}
ACT['auth-tab'] = el => renderAuth(el.dataset.v);
ACT['reset-dev'] = async () => { if (await ask("Supprimer les données locales de cet appareil ? (les données GitHub ne sont pas touchées)", 'Réinitialiser', 1)) { [KEY.db, KEY.cfg, KEY.sess].forEach(k => { LS.del(k); SS.del(k); }); location.reload(); } };

/* ---------- ossature ---------- */
const NAV = [['home', 'Accueil', 'home'], ['ech', 'Échéances', 'list'], ['cal', 'Calendrier', 'cal'], ['ctl', 'Contrôles', 'shield'], ['plus', 'Plus', 'more']];
const scopeCos = () => { const v = visibleCos(); return S.co === 'all' ? v : v.filter(c => c.id === S.co); };
const myEch = () => { const ids = new Set(scopeCos().filter(c => perm(c.id, 'ech', 'v')).map(c => c.id)); return live(db.ech).filter(e => ids.has(e.co)); };
const myCtl = () => { const ids = new Set(scopeCos().filter(c => perm(c.id, 'ctl', 'v')).map(c => c.id)); return live(db.ctl).filter(e => ids.has(e.co)); };
function alertsList() {
  const t = todayISO(), out = [];
  for (const e of myEch()) if (e.st !== 'done' && diffDays(e.due, t) <= 7) out.push({ k: 'ech', id: e.id, due: e.due, title: e.label, sub: db.companies.find(c => c.id === e.co)?.name || '' });
  for (const d of myCtl()) if (ctlOpen(d)) for (const s of d.steps || []) { const du = stepDue(s); if (!s.done && du && diffDays(du, t) <= 7) out.push({ k: 'ctl', id: d.id, due: du, title: `${d.type} — ${s.label}`, sub: db.companies.find(c => c.id === d.co)?.name || '' }); }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
function shell(inner) {
  const al = alertsList(), late = al.some(a => diffDays(a.due, todayISO()) < 0);
  const nav = (cls, wrap) => NAV.map(([k, l, i]) => `<button data-act="nav" data-v="${k}" class="${S.page === k || (k === 'plus' && !NAV.some(n => n[0] === S.page)) ? 'on' : ''}">${ic(i)}<span>${l}</span></button>`).join('');
  const dot = syncState === 'err' ? '<i class="dot"></i>' : (syncState === 'pending' || cfg.dirty) && ghReady() ? '<i class="dot w"></i>' : '';
  const cos = visibleCos();
  return `<div class="shell"><aside class="side"><div class="brand-s">${logo('horizontal')}<span>${APP_NAME}</span></div>${nav()}<div class="sp"></div><button data-act="logout">${ic('out')}<span>Déconnexion</span></button></aside><div class="main"><div class="top">${logo('monogramme', 'top-logo')}<select data-bind="co" aria-label="Société"><option value="all">Toutes les sociétés</option>${cos.map(c => `<option value="${c.id}" ${S.co === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><button class="ib" data-act="sync" aria-label="Synchroniser">${ic('sync')}${dot}</button><button class="ib" data-act="theme" aria-label="Thème">${ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button><button class="ib" data-act="logout" aria-label="Déconnexion">${ic('out')}</button></div><div class="page">${inner}</div></div><nav class="bottom">${nav()}</nav></div>`;
}
function render() {
  if (!me) return;
  if (!live(db.users).find(u => u.id === me.id && u.active !== false)) return logout();
  const pages = { home: pHome, ech: pEch, cal: pCal, ctl: pCtl, plus: pPlus, soc: pSoc, usr: pUsers, rol: pRoles, syn: pSync, bak: pBackup, log: pLog, acc: pAcc, set: pSet };
  const back = !NAV.some(n => n[0] === S.page) ? `<button class="btn sm" data-act="nav" data-v="plus" style="margin-bottom:12px">${ic('back')} Retour</button>` : '';
  const y = window.scrollY; $('#app').innerHTML = shell(back + (pages[S.page] || pHome)()); window.scrollTo(0, y);
}
const head = (eb, t, lead) => `<div class="eyebrow">${eb}</div><h1>${t}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}`;
const xbar = k => `<div class="xbar">Exporter : <button class="btn sm" data-act="exp" data-k="${k}" data-f="xlsx">Excel</button><button class="btn sm" data-act="exp" data-k="${k}" data-f="pdf">PDF</button><button class="btn sm" data-act="exp" data-k="${k}" data-f="docx">Word</button><button class="btn sm" data-act="exp" data-k="${k}" data-f="csv">CSV</button></div>`;
ACT.exp = el => { if (!permAny('rap', 'v')) return toast("Droit d'export manquant", 1); const d = DOCS[el.dataset.k](); exportDoc(el.dataset.f, d); };
const coName = id => db.companies.find(c => c.id === id)?.name || '';

/* ---------- accueil ---------- */
function pHome() {
  const t = todayISO(), list = myEch(), todo = list.filter(e => e.st !== 'done'), cy = t.slice(0, 7);
  const late = todo.filter(e => diffDays(e.due, t) < 0), soon = todo.filter(e => { const n = diffDays(e.due, t); return n >= 0 && n <= 7; });
  const month = todo.filter(e => e.due.slice(0, 7) === cy), done = list.filter(e => e.st === 'done' && (e.paidOn || e.due).slice(0, 4) === t.slice(0, 4));
  const al = alertsList(), dossiers = myCtl().filter(ctlOpen);
  const d = new Date(), dl = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  // graphique : retard + mois à venir
  const H = S.hz, bars = [{ l: 'Retard', n: late.length, c: 'var(--red)' }];
  for (let i = 0; i < H; i++) { const dd = new Date(d.getFullYear(), d.getMonth() + i, 1), k = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}`; bars.push({ l: MOIS[dd.getMonth()].slice(0, 3), n: todo.filter(e => e.due.slice(0, 7) === k).length, c: 'var(--navy2)' }); }
  const mx = Math.max(1, ...bars.map(b => b.n)), bw = 600 / bars.length;
  const chart = `<svg class="chart" viewBox="0 0 640 190" role="img" aria-label="Échéances à venir par mois">${bars.map((b, i) => { const h = Math.round(b.n / mx * 120), x = 20 + i * bw; return `<rect x="${x + 6}" y="${150 - h}" width="${bw - 12}" height="${h}" rx="6" fill="${b.c}"/><text x="${x + bw / 2}" y="${144 - h}" text-anchor="middle">${b.n || ''}</text><text x="${x + bw / 2}" y="172" text-anchor="middle">${b.l}</text>`; }).join('')}</svg>`;
  const empty = !visibleCos().length ? `<div class="card empty">Aucune société. <button class="btn pri sm" data-act="soc-add">Ajouter une société</button></div>` : '';
  return `<div class="eyebrow">${esc(dl)}</div><h1>${greet()} ${esc(me.name.trim().split(/\s+/)[0])}</h1><p class="lead">Vos obligations fiscales en un coup d'œil.</p>${empty}
  <div class="kpis"><div class="kpi red" data-act="goto-ech" data-st="late"><small>En retard</small><b>${late.length}</b><span>${late.length ? 'à régulariser' : 'rien en retard'}</span></div><div class="kpi org" data-act="goto-ech" data-st="soon"><small>Sous 7 jours</small><b>${soon.length}</b><span>à déposer vite</span></div><div class="kpi" data-act="goto-ech" data-st="month"><small>Ce mois</small><b>${month.length}</b><span>${MOIS[d.getMonth()]}</span></div><div class="kpi" data-act="goto-ech" data-st="done"><small>Déposées</small><b>${done.length}</b><span>en ${d.getFullYear()}</span></div></div>
  <div class="card"><h3>À traiter</h3>${al.length ? al.slice(0, 8).map(a => { const n = diffDays(a.due, t); return `<div class="alertrow" data-act="${a.k === 'ech' ? 'ech-edit' : 'ctl-edit'}" data-id="${a.id}"><span class="badge ${n < 0 ? 'b-red' : 'b-org'}">${rel(a.due)}</span><div class="g"><b>${esc(a.title)}</b><small>${esc(a.sub)} · ${fmtD(a.due)}</small></div>${ic('chev')}</div>`; }).join('') + (al.length > 8 ? `<p class="sub" style="margin:10px 0 0">+ ${al.length - 8} autres dans Échéances</p>` : '') : '<div class="empty" style="padding:18px">Rien d\'urgent. Bien joué.</div>'}</div>
  <div class="card"><h3>Charge des échéances</h3><div class="chips" style="margin-bottom:8px">${[3, 6, 12].map(h => `<button class="chip ${H === h ? 'on' : ''}" data-act="hz" data-v="${h}">${h} mois</button>`).join('')}</div>${chart}</div>
  ${dossiers.length ? `<div class="card"><h3>Contrôles en cours</h3>${dossiers.slice(0, 4).map(dd => `<div class="alertrow" data-act="ctl-edit" data-id="${dd.id}"><span class="badge b-gold">${esc(dd.type)}</span><div class="g"><b>${esc(dd.ref || dd.objet || 'Dossier')}</b><small>${esc(coName(dd.co))} · ${esc(dd.st)}</small></div><b>${dd.montant ? money(dd.montant) : ''}</b></div>`).join('')}</div>` : ''}`;
}
ACT.hz = el => { S.hz = +el.dataset.v; render(); };
ACT['goto-ech'] = el => { S.f.st = el.dataset.st; S.f.cat = 'all'; S.f.y = 'all'; S.page = 'ech'; render(); };

/* ---------- échéances ---------- */
function echFiltered() {
  const f = S.f, t = todayISO(), q = f.q.trim().toLowerCase();
  return myEch().filter(e => {
    if (f.cat !== 'all' && e.cat !== f.cat) return false;
    if (f.y !== 'all' && e.due.slice(0, 4) !== f.y) return false;
    if (f.st !== 'all') { const s = status(e); if (f.st === 'late' && s !== 'late') return false; if (f.st === 'soon' && s !== 'soon' && s !== 'late') return false; if (f.st === 'todo' && e.st === 'done') return false; if (f.st === 'done' && e.st !== 'done') return false; if (f.st === 'month' && !(e.st !== 'done' && e.due.slice(0, 7) === t.slice(0, 7))) return false; }
    if (q && !(e.label + ' ' + coName(e.co) + ' ' + (e.ref || '') + ' ' + (e.note || '')).toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => a.due.localeCompare(b.due));
}
function echRow(e) {
  const st = status(e), done = e.st === 'done', can = perm(e.co, 'ech', 'e'), n = diffDays(e.due, todayISO());
  return `<div class="row s-${st}" data-act="ech-edit" data-id="${e.id}"><div><div class="t">${esc(e.label)}</div><small>${esc(coName(e.co))} · échéance ${fmtD(e.due)}${e.rawDue && e.rawDue !== e.due ? ' (reportée, jour non ouvré)' : ''}</small></div><div class="amt">${e.amount !== '' && e.amount != null ? money(e.amount) : ''}</div><div class="meta"><span class="badge ${st === 'late' ? 'b-red' : st === 'soon' ? 'b-org' : st === 'paid' ? 'b-grn' : 'b-blu'}">${st === 'late' ? 'En retard' : st === 'soon' ? 'Proche' : st === 'paid' ? 'Déposée' : 'À venir'}</span>${!done ? `<span class="${n < 0 ? 'late-t' : n <= 7 ? 'soon-t' : 'sub'}">${rel(e.due)}</span>` : `<span class="sub">le ${fmtD(e.paidOn)}</span>`}<span class="tag">${CATS[e.cat]}</span>${can ? `<span class="seg"><button type="button" class="${done ? '' : 'on'}" data-act="tgl" data-id="${e.id}" data-v="todo">À faire</button><button type="button" class="${done ? 'on g' : ''}" data-act="tgl" data-id="${e.id}" data-v="done">Déposée</button></span>` : ''}</div></div>`;
}
function echList() {
  const l = echFiltered(); if (!l.length) return '<div class="empty card">Aucune échéance pour ces filtres. Utilisez « Générer » dans une société pour créer le calendrier de l\'année.</div>';
  const tot = l.filter(e => e.amount !== '' && e.amount != null).reduce((a, e) => a + +e.amount, 0);
  return `<div class="total">${l.length} échéance(s)${tot ? ' · montants saisis : ' + money(tot) : ''}</div>` + l.map(echRow).join('');
}
function pEch() {
  const base = myEch(), cnt = c => base.filter(e => c === 'all' || e.cat === c).length, ys = [...new Set(base.map(e => e.due.slice(0, 4)).concat([String(new Date().getFullYear())]))].sort();
  const canC = visibleCos().some(c => perm(c.id, 'ech', 'c'));
  return `${head('Obligations fiscales', 'Échéances', 'Mensuelles, trimestrielles, annuelles et autres obligations, par société.')}
  <div class="acts">${canC ? `<button class="btn pri" data-act="ech-add">${ic('plus')} Nouvelle échéance</button><button class="btn" data-act="ech-gen">${ic('cal')} Générer l'année</button>` : ''}</div>
  <div class="chips">${[['all', 'Toutes'], ['mensuelle', 'Mensuelles'], ['trimestrielle', 'Trimestrielles'], ['annuelle', 'Annuelles'], ['autre', 'Autres']].map(([k, l]) => `<button class="chip ${S.f.cat === k ? 'on' : ''}" data-act="fcat" data-v="${k}">${l}<small>${cnt(k)}</small></button>`).join('')}</div>
  <div class="tools"><input data-bind="f.q" placeholder="Rechercher (libellé, société, référence)" value="${esc(S.f.q)}"><select data-bind="f.st">${[['all', 'Tous les statuts'], ['todo', 'À faire'], ['late', 'En retard'], ['soon', 'Proches (7 j) et retard'], ['month', 'Ce mois'], ['done', 'Déposées']].map(([k, l]) => `<option value="${k}" ${S.f.st === k ? 'selected' : ''}>${l}</option>`).join('')}</select><select data-bind="f.y"><option value="all">Toutes les années</option>${ys.map(y => `<option ${S.f.y === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
  ${permAny('rap', 'v') ? xbar('ech') : ''}<div id="xres">${echList()}</div>`;
}
ACT.fcat = el => { S.f.cat = el.dataset.v; render(); };
ACT.tgl = async el => {
  const e = db.ech.find(x => x.id === el.dataset.id); if (!e || !perm(e.co, 'ech', 'e')) return;
  if (el.dataset.v === 'done' && e.st !== 'done') { e.st = 'done'; e.paidOn = todayISO(); touch(e); logAct(`Échéance déposée : ${e.label} (${coName(e.co)})`, 'règlement', 'ech'); }
  else if (el.dataset.v === 'todo' && e.st === 'done') { if (!await ask('Remettre cette échéance « À faire » ?', 'Remettre')) return; e.st = 'todo'; e.paidOn = ''; touch(e); logAct(`Échéance rouverte : ${e.label}`, 'modification', 'ech'); }
  render();
};
function echForm(e, ro) {
  const cos = visibleCos().filter(c => perm(c.id, 'ech', e.id ? 'e' : 'c'));
  return `${F.s('co', 'Société', cos.map(c => [c.id, c.name]), e.co || (S.co !== 'all' ? S.co : cos[0]?.id), e.id ? 'disabled' : '')}${F.t('label', 'Libellé', e.label, 'required')}<div class="grid2">${F.s('cat', 'Catégorie', Object.entries(CATS), e.cat || 'autre')}${F.d('due', "Date limite", e.due || todayISO(), 'required')}${F.n('amount', 'Montant à payer (TND)', e.amount ?? '')}${F.t('ref', 'Référence / quittance', e.ref || '')}</div>${F.s('st', 'Statut', [['todo', 'À faire'], ['done', 'Déposée / payée']], e.st || 'todo')}${F.d('paidOn', 'Date de dépôt', e.paidOn || '')}${F.a('note', 'Note', e.note || '')}${e.src ? `<p class="sub">Source de la règle : ${esc(e.src)}${e.rawDue && e.rawDue !== e.due ? ` — date légale ${fmtD(e.rawDue)}, reportée au jour ouvré suivant` : ''}</p>` : ''}`;
}
ACT['ech-add'] = el => {
  if (!visibleCos().some(c => perm(c.id, 'ech', 'c'))) return toast('Droit de création manquant', 1);
  openModal('Nouvelle échéance', echForm({ due: el && el.dataset ? el.dataset.due : '' }), { onSave: d => { if (!perm(d.co, 'ech', 'c')) throw new Error('Droit de création manquant'); db.ech.push(touch({ id: uid(), co: d.co, code: 'MAN', label: d.label.trim(), cat: d.cat, period: d.due, due: d.due, amount: d.amount, st: d.st, paidOn: d.st === 'done' ? (d.paidOn || todayISO()) : '', ref: d.ref, note: d.note })); logAct(`Échéance créée : ${d.label}`, 'création', 'ech'); render(); } });
};
ACT['ech-edit'] = el => {
  const e = db.ech.find(x => x.id === el.dataset.id); if (!e) return; const can = perm(e.co, 'ech', 'e'), del = perm(e.co, 'ech', 'd');
  openModal('Échéance', echForm(e), {
    ro: !can, foot: del ? `<button class="btn dng" type="button" data-act="ech-del" data-id="${e.id}" style="margin-right:auto">${ic('trash')} Supprimer</button>` : '',
    onSave: d => { Object.assign(e, { label: d.label.trim(), cat: d.cat, due: d.due, amount: d.amount, ref: d.ref, note: d.note, st: d.st, paidOn: d.st === 'done' ? (d.paidOn || todayISO()) : '' }); touch(e); logAct(`Échéance modifiée : ${e.label}`, 'modification', 'ech'); render(); }
  });
};
ACT['ech-del'] = async el => { const e = db.ech.find(x => x.id === el.dataset.id); if (!e || !perm(e.co, 'ech', 'd')) return; if (!await ask('Supprimer cette échéance ?', 'Supprimer', 1)) return; e.d = true; touch(e); logAct(`Échéance supprimée : ${e.label}`, 'suppression', 'ech'); $$('.ov').forEach(o => o.close && o.close()); render(); };
ACT['ech-gen'] = () => {
  const cos = visibleCos().filter(c => perm(c.id, 'ech', 'c')); if (!cos.length) return toast('Aucune société avec droit de création', 1);
  const y = new Date().getFullYear();
  openModal("Générer le calendrier fiscal", `<p class="lead" style="margin-top:0">Crée les échéances de l'année selon le profil fiscal de chaque société (mensuel/trimestriel, télédéclaration, CNSS, employeur…). Les échéances déjà présentes ne sont jamais dupliquées.</p>${F.s('y', 'Année', [y - 1, y, y + 1, y + 2].map(String), String(y))}<div class="cos">${cos.map(c => `<label><input class="cb" type="checkbox" name="c_${c.id}" ${S.co === 'all' || S.co === c.id ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div><div class="cos"><label><input class="cb" type="checkbox" name="past" checked> Marquer « déposées » les échéances déjà passées</label></div><div class="note">Dates issues des agendas DGI 2026. Les dates marquées « à confirmer » doivent être vérifiées chaque année (loi de finances, prorogations, jours fériés religieux).</div>`, {
    onSave: d => { let n = 0; for (const c of cos) if (d['c_' + c.id]) n += genEch(c.id, +d.y, d.past); logAct(`Calendrier fiscal ${d.y} généré (${n} échéances)`, 'création', 'ech'); toast(n ? `${n} échéance(s) créée(s)` : 'Rien de nouveau à créer'); render(); }
  });
};
DOCS.ech = () => ({ title: 'Échéances fiscales', subtitle: S.co === 'all' ? 'Toutes les sociétés' : coName(S.co), filename: 'echeances-fiscales', kpis: [['Nombre d\'échéances', echFiltered().length]], sections: [{ title: 'Liste des échéances', sheet: 'Échéances', cols: [{ h: 'Société', k: 'co', w: 22 }, { h: 'Libellé', k: 'label', w: 52 }, { h: 'Catégorie', k: 'cat', w: 14 }, { h: 'Date limite', k: 'due', t: 'date', w: 13 }, { h: 'Statut', k: 'st', w: 12 }, { h: 'Date de dépôt', k: 'paidOn', t: 'date', w: 13 }, { h: 'Montant (TND)', k: 'amount', t: 'money', w: 16 }, { h: 'Référence', k: 'ref', w: 18 }], rows: echFiltered().map(e => ({ co: coName(e.co), label: e.label, cat: CATS[e.cat], due: e.due, st: e.st === 'done' ? 'Déposée' : status(e) === 'late' ? 'En retard' : 'À faire', paidOn: e.paidOn, amount: e.amount, ref: e.ref })) }] });

/* ---------- taxation d'office / contrôles ---------- */
function ctlFiltered() {
  const q = S.cf.q.trim().toLowerCase();
  return myCtl().filter(d => (S.cf.st === 'all' || (S.cf.st === 'open' ? ctlOpen(d) : !ctlOpen(d))) && (!q || (d.type + ' ' + (d.ref || '') + ' ' + (d.objet || '') + ' ' + coName(d.co)).toLowerCase().includes(q))).sort((a, b) => (a.dateNotif || '').localeCompare(b.dateNotif || '') * -1);
}
function nextStep(d) { return (d.steps || []).filter(s => !s.done && stepDue(s)).sort((a, b) => stepDue(a).localeCompare(stepDue(b)))[0]; }
function ctlList() {
  const l = ctlFiltered(); if (!l.length) return '<div class="empty card">Aucun dossier. Enregistrez ici une taxation d\'office ou un contrôle fiscal pour suivre les délais de réponse.</div>';
  return l.map(d => {
    const ns = nextStep(d), n = ns ? diffDays(stepDue(ns), todayISO()) : null, steps = d.steps || [];
    return `<div class="row s-${!ctlOpen(d) ? 'paid' : n != null && n < 0 ? 'late' : n != null && n <= 7 ? 'soon' : 'ok'}" data-act="ctl-edit" data-id="${d.id}"><div><div class="t">${esc(d.type)}${d.ref ? ' — ' + esc(d.ref) : ''}</div><small>${esc(coName(d.co))}${d.exercices ? ' · ' + esc(d.exercices) : ''}${d.dateNotif ? ' · notifié le ' + fmtD(d.dateNotif) : ''}</small></div><div class="amt">${d.montant ? money(d.montant) : ''}</div><div class="meta"><span class="badge b-gold">${esc(d.st)}</span>${ns ? `<span class="${n < 0 ? 'late-t' : n <= 7 ? 'soon-t' : 'sub'}">${esc(ns.label)} : ${fmtD(stepDue(ns))} (${rel(stepDue(ns))})</span>` : ''}</div>${steps.length ? `<div class="stepper" style="grid-column:1/-1">${steps.map(s => `<i class="${s.done ? 'd' : stepDue(s) && diffDays(stepDue(s), todayISO()) < 0 ? 'l' : stepDue(s) ? 'c' : ''}"></i>`).join('')}</div>` : ''}</div>`;
  }).join('');
}
function pCtl() {
  const canC = visibleCos().some(c => perm(c.id, 'ctl', 'c'));
  return `${head('Contrôle fiscal', "Taxation d'office et contrôles", "Suivez chaque notification, ses délais de réponse et d'opposition.")}
  <div class="acts">${canC ? `<button class="btn pri" data-act="ctl-add">${ic('plus')} Nouveau dossier</button>` : ''}<button class="btn" data-act="nav" data-v="set">${ic('clock')} Délais de procédure</button></div>
  <div class="chips">${[['open', 'En cours'], ['closed', 'Réglés / clos'], ['all', 'Tous']].map(([k, l]) => `<button class="chip ${S.cf.st === k ? 'on' : ''}" data-act="cst" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="tools" style="grid-template-columns:1fr"><input data-bind="cf.q" placeholder="Rechercher (type, référence, société)" value="${esc(S.cf.q)}"></div>${permAny('rap', 'v') ? xbar('ctl') : ''}<div id="xres">${ctlList()}</div>`;
}
ACT.cst = el => { S.cf.st = el.dataset.v; render(); };
function stepRow(s) {
  return `<div class="stg" data-step><input type="hidden" name="s_id" value="${esc(s.id)}"><b>${esc(s.label)}</b><input type="hidden" name="s_label" value="${esc(s.label)}"><div class="grid2">${F.d('s_start', 'Point de départ (réception / notification)', s.start || '')}${F.t('s_days', 'Délai (jours)', s.days, 'type="number" min="0"')}</div><p class="sub" style="margin:2px 0 8px">${stepDue(s) ? `Échéance : <b class="${diffDays(stepDue(s), todayISO()) < 0 && !s.done ? 'late-t' : ''}">${fmtD(stepDue(s))}</b>` : 'Renseignez le point de départ pour calculer l\'échéance'}</p><label style="display:flex;gap:10px;align-items:center"><input class="cb" type="checkbox" name="s_done" value="${esc(s.id)}" ${s.done ? 'checked' : ''}> Étape accomplie</label></div>`;
}
function ctlForm(d) {
  const cos = visibleCos().filter(c => perm(c.id, 'ctl', d.id ? 'e' : 'c'));
  return `${F.s('co', 'Société', cos.map(c => [c.id, c.name]), d.co || (S.co !== 'all' ? S.co : cos[0]?.id), d.id ? 'disabled' : '')}<div class="grid2">${F.s('type', 'Type de procédure', Object.keys(CTL_TYPES), d.type || "Taxation d'office")}${F.s('st', 'Statut', CTL_ST, d.st || CTL_ST[0])}${F.t('ref', 'Référence de la notification', d.ref || '')}${F.d('dateNotif', 'Date de réception', d.dateNotif || todayISO())}${F.t('exercices', 'Exercices / impôts concernés', d.exercices || '', 'placeholder="ex. 2022-2023, TVA"')}${F.n('montant', 'Montant réclamé (TND)', d.montant ?? '')}${F.n('paye', 'Montant déjà payé (TND)', d.paye ?? '')}</div>${F.a('objet', 'Objet / observations', d.objet || '')}<h3 style="margin:10px 0">Étapes et délais</h3><div id="steps">${(d.steps || []).map(stepRow).join('') || '<p class="sub">Les étapes se créent automatiquement selon le type, à l\'enregistrement.</p>'}</div>${d.id ? '<button class="btn sm" type="button" data-act="addstep" style="margin-bottom:8px">' + ic('plus') + ' Ajouter une étape</button>' : ''}<div class="note">Délais indicatifs modifiables dans « Délais de procédure » : à confirmer avec le texte du Code des droits et procédures fiscaux et la notification reçue.</div>`;
}
ACT.addstep = () => { const w = $('#steps'); if (!w) return; $('.sub', w)?.remove(); const t = document.createElement('div'); t.innerHTML = stepRow({ id: uid(), label: 'Étape personnalisée', days: 30, start: todayISO(), done: 0 }); w.appendChild(t.firstElementChild); };
function readSteps(form, old) {
  const g = n => $$(`[name=${n}]`, form).map(i => i.value), ids = g('s_id'), lab = g('s_label'), st = g('s_start'), dy = g('s_days'), done = new Set($$('[name=s_done]', form).filter(c => c.checked).map(c => c.value));
  return ids.map((id, i) => ({ id, label: lab[i], start: st[i], days: +dy[i] || 0, done: done.has(id) ? 1 : 0 }));
}
ACT['ctl-add'] = () => {
  if (!visibleCos().some(c => perm(c.id, 'ctl', 'c'))) return toast('Droit de création manquant', 1);
  openModal('Nouveau dossier de contrôle', ctlForm({}), { onSave: d => { if (!perm(d.co, 'ctl', 'c')) throw new Error('Droit de création manquant'); const r = touch({ id: uid(), co: d.co, type: d.type, st: d.st, ref: d.ref, dateNotif: d.dateNotif, exercices: d.exercices, montant: d.montant, paye: d.paye, objet: d.objet, steps: ctlSteps(d.type, d.dateNotif) }); db.ctl.push(r); logAct(`Dossier de contrôle créé : ${d.type} ${d.ref}`, 'création', 'ctl'); render(); } });
};
ACT['ctl-edit'] = el => {
  const d = db.ctl.find(x => x.id === el.dataset.id); if (!d) return; const can = perm(d.co, 'ctl', 'e'), del = perm(d.co, 'ctl', 'd');
  openModal('Dossier de contrôle', ctlForm(d), { ro: !can, foot: del ? `<button class="btn dng" type="button" data-act="ctl-del" data-id="${d.id}" style="margin-right:auto">${ic('trash')} Supprimer</button>` : '', onSave: (x, form) => { Object.assign(d, { type: x.type, st: x.st, ref: x.ref, dateNotif: x.dateNotif, exercices: x.exercices, montant: x.montant, paye: x.paye, objet: x.objet, steps: readSteps(form, d.steps) }); touch(d); logAct(`Dossier de contrôle modifié : ${d.type} ${d.ref}`, 'modification', 'ctl'); render(); } });
};
ACT['ctl-del'] = async el => { const d = db.ctl.find(x => x.id === el.dataset.id); if (!d || !perm(d.co, 'ctl', 'd')) return; if (!await ask('Supprimer ce dossier ?', 'Supprimer', 1)) return; d.d = true; touch(d); logAct(`Dossier supprimé : ${d.type} ${d.ref}`, 'suppression', 'ctl'); $$('.ov').forEach(o => o.close && o.close()); render(); };
DOCS.ctl = () => ({ title: "Taxation d'office et contrôles fiscaux", subtitle: S.co === 'all' ? 'Toutes les sociétés' : coName(S.co), filename: 'controles-fiscaux', kpis: [['Dossiers', ctlFiltered().length]], sections: [{ title: 'Dossiers', sheet: 'Dossiers', cols: [{ h: 'Société', k: 'co', w: 22 }, { h: 'Type', k: 'type', w: 24 }, { h: 'Référence', k: 'ref', w: 18 }, { h: 'Réception', k: 'dateNotif', t: 'date', w: 13 }, { h: 'Statut', k: 'st', w: 22 }, { h: 'Prochaine échéance', k: 'next', t: 'date', w: 16 }, { h: 'Étape', k: 'step', w: 40 }, { h: 'Montant réclamé', k: 'montant', t: 'money', w: 16 }, { h: 'Déjà payé', k: 'paye', t: 'money', w: 16 }], rows: ctlFiltered().map(d => { const s = nextStep(d); return { co: coName(d.co), type: d.type, ref: d.ref, dateNotif: d.dateNotif, st: d.st, next: s ? stepDue(s) : '', step: s ? s.label : '', montant: d.montant, paye: d.paye }; }) }] });
