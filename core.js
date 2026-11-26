'use strict';
/* SGC Fiscalité — noyau : utilitaires, base, droits, chiffrement, synchro GitHub, calendrier fiscal */
const APP_NAME = 'SGC Fiscalité';
const KEY = { db: 'sgcfisc.db', cfg: 'sgcfisc.cfg', sess: 'sgcfisc.sess', theme: 'sgcfisc.theme', notif: 'sgcfisc.notif' };
const te = new TextEncoder(), td = new TextDecoder();
const store = s => ({
  get(k, d) { try { const v = s.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { s.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { s.removeItem(k); } catch { } }
});
const LS = store(localStorage), SS = store(sessionStorage);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayISO = () => { const d = new Date(); return ISO(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const toUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const addDays = (iso, n) => { const t = new Date(toUTC(iso) + n * 864e5); return ISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / 864e5);
const fmtD = iso => iso ? iso.split('-').reverse().join('/') : '';
const NF = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: 'always' });
const money = n => (n == null || n === '' || isNaN(n)) ? '—' : NF.format(+n).replace(/ | /g, ' ') + ' TND';
const greet = (d = new Date()) => (d.getHours() >= 5 && d.getHours() < 17 ? 'Bonjour' : 'Bonsoir');
const touch = r => { r.u = Date.now(); return r; };
const live = a => (a || []).filter(r => !r.d);
const rel = iso => { const n = diffDays(iso, todayISO()); return n === 0 ? "aujourd'hui" : n === 1 ? 'demain' : n > 1 ? `dans ${n} j` : `retard de ${-n} j`; };

/* ---------- modules et droits ---------- */
const MODS = [
  { k: 'ech', n: 'Échéances fiscales' },
  { k: 'ctl', n: "Taxation d'office / contrôle", sens: 1 },
  { k: 'soc', n: 'Sociétés', sens: 1 },
  { k: 'rap', n: 'Rapports et exports' },
  { k: 'adm', n: 'Administration (utilisateurs, synchro, journal)', sens: 1 }
];
const ACTS = [['v', 'Consulter'], ['c', 'Créer'], ['e', 'Modifier'], ['d', 'Supprimer']];
const allPerms = () => Object.fromEntries(MODS.map(m => [m.k, { v: 1, c: 1, e: 1, d: 1 }]));
const mkPerm = (o) => Object.fromEntries(MODS.map(m => [m.k, Object.assign({ v: 0, c: 0, e: 0, d: 0 }, o[m.k] || {})]));
function defaultRoles() {
  return [
    { id: 'r-admin', name: 'Administrateur', locked: 1, perms: allPerms(), u: 1 },
    { id: 'r-fisc', name: 'Fiscaliste / comptable', perms: mkPerm({ ech: { v: 1, c: 1, e: 1, d: 1 }, ctl: { v: 1, c: 1, e: 1, d: 1 }, soc: { v: 1, e: 1 }, rap: { v: 1 } }), u: 1 },
    { id: 'r-gerant', name: 'Gérant', perms: mkPerm({ ech: { v: 1 }, ctl: { v: 1 }, soc: { v: 1 }, rap: { v: 1 } }), u: 1 },
    { id: 'r-lect', name: 'Lecture seule', perms: mkPerm({ ech: { v: 1 }, ctl: { v: 1 }, rap: { v: 1 } }), u: 1 }
  ];
}
const COLLS = ['roles', 'users', 'companies', 'ech', 'ctl'];
const DELAYS_DEF = { to_regul: 30, tribunal: 60, verif_opp: 30, verif_rep: 90, verif_opp2: 15 };
function normalize(d) {
  d.meta = d.meta || { id: uid(), salt: b64(crypto.getRandomValues(new Uint8Array(16))) };
  d.settings = d.settings || { u: 0 };
  d.settings.holidays = d.settings.holidays || [];
  d.settings.delays = Object.assign({}, DELAYS_DEF, d.settings.delays || {});
  for (const c of COLLS) d[c] = d[c] || [];
  d.log = d.log || [];
  return d;
}
let db = null, me = null, cfg = LS.get(KEY.cfg, {});
const saveCfg = () => LS.set(KEY.cfg, cfg);
const role = id => db.roles.find(r => r.id === id);
function perm(co, mod, act) {
  if (!me) return false; if (me.platform) return true;
  const m = (me.mem || []).find(x => x.co === co); if (!m) return false;
  const r = role(m.role); return !!(r && r.perms && r.perms[mod] && r.perms[mod][act]);
}
const permAny = (mod, act) => !!me && (me.platform || (me.mem || []).some(m => perm(m.co, mod, act)));
const visibleCos = () => live(db.companies).filter(c => perm(c.id, 'ech', 'v') || perm(c.id, 'ctl', 'v'));
function logAct(text, action = 'modification', module = '', silent = false) {
  if (!db) return;
  db.log.unshift({ id: uid(), t: Date.now(), uid: me?.id || '', text, action, module });
  db.log = db.log.slice(0, 1500);
  if (!silent) commit(); else { LS.set(KEY.db, db); }
}
function commit() { LS.set(KEY.db, db); cfg.dirty = true; saveCfg(); schedSync(); }

/* ---------- mots de passe de compte ---------- */
async function hashPw(pw, salt) {
  const km = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, km, 256));
}
async function mkCred(pw) { const salt = b64(crypto.getRandomValues(new Uint8Array(16))); return { salt, hash: await hashPw(pw, salt) }; }

/* ---------- chiffrement AES-GCM de l'espace ---------- */
const keyCache = new Map();
async function getKey(pass, saltB64) {
  const id = saltB64 + '|' + pass; if (keyCache.has(id)) return keyCache.get(id);
  const km = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  keyCache.set(id, k); return k;
}
async function encryptDB(obj, pass) {
  const salt = obj.meta.salt, key = await getKey(pass, salt), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj)));
  return JSON.stringify({ app: 'sgc-fiscalite', v: 1, salt, iv: b64(iv), data: b64(ct) });
}
async function decryptDB(text, pass) {
  let f; try { f = JSON.parse(text); } catch { throw new Error('Fichier de données illisible'); }
  const key = await getKey(pass, f.salt);
  try { return normalize(JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, key, unb64(f.data))))); }
  catch { throw new Error("Mot de passe de l'espace incorrect"); }
}
function mergeDB(local, remote) {
  let localNewer = false, remoteNewer = false; const out = { ...remote, meta: remote.meta || local.meta };
  const ls = local.settings?.u || 0, rs = remote.settings?.u || 0;
  if (ls > rs) { out.settings = local.settings; localNewer = true; } else { out.settings = remote.settings || local.settings; if (rs > ls) remoteNewer = true; }
  for (const c of COLLS) {
    const map = new Map((remote[c] || []).map(r => [r.id, r])), seen = new Set();
    for (const r of local[c] || []) { seen.add(r.id); const o = map.get(r.id); if (!o || (r.u || 0) > (o.u || 0)) { map.set(r.id, r); localNewer = true; } else if ((o.u || 0) > (r.u || 0)) remoteNewer = true; }
    for (const id of map.keys()) if (!seen.has(id)) remoteNewer = true;
    out[c] = [...map.values()];
  }
  const lm = new Map((remote.log || []).map(x => [x.id, x]));
  for (const x of local.log || []) if (!lm.has(x.id)) { lm.set(x.id, x); localNewer = true; }
  out.log = [...lm.values()].sort((a, b) => b.t - a.t).slice(0, 1200);
  return { db: normalize(out), localNewer, remoteNewer };
}

/* ---------- GitHub (dépôt privé de données) ---------- */
const GH = {
  base: c => `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`,
  hdr: (c, raw) => ({ Authorization: 'Bearer ' + c.token, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }),
  fail(r) { return new Error(r.status === 401 ? 'Jeton GitHub refusé ou expiré' : r.status === 403 ? 'Accès GitHub refusé (droits du jeton ou limite atteinte)' : 'Erreur GitHub ' + r.status); },
  async get(c) {
    const url = `${this.base(c)}?ref=${encodeURIComponent(c.branch || 'main')}&t=${Date.now()}`;
    const r = await fetch(url, { headers: this.hdr(c), cache: 'no-store' });
    if (r.status === 404) { const p = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`, { headers: this.hdr(c), cache: 'no-store' }); if (p.status === 404) throw new Error('Dépôt introuvable (nom incorrect, ou jeton sans accès à ce dépôt)'); return null; }
    if (!r.ok) throw this.fail(r);
    const j = await r.json(); let text;
    if (j.content) text = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
    else text = await (await fetch(url, { headers: this.hdr(c, true), cache: 'no-store' })).text();
    return { sha: j.sha, text };
  },
  async put(c, text, sha) {
    const body = { message: 'sync ' + new Date().toISOString(), content: btoa(unescape(encodeURIComponent(text))), branch: c.branch || 'main' }; if (sha) body.sha = sha;
    const r = await fetch(this.base(c), { method: 'PUT', headers: { ...this.hdr(c), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) throw Object.assign(new Error('conflit'), { conflict: true });
    if (!r.ok) throw this.fail(r); return (await r.json()).content.sha;
  }
};
let syncState = 'off', syncTimer = null, syncBusy = false, onSynced = () => { };
const ghReady = () => !!(cfg.gh && cfg.gh.owner && cfg.gh.repo && cfg.gh.token && cfg.pass);
function schedSync() { if (!ghReady()) { syncState = 'off'; return; } syncState = 'pending'; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), 2500); }
async function syncNow(manual) {
  if (!ghReady()) { if (manual) throw new Error('Synchronisation non configurée'); return; }
  if (syncBusy) return; syncBusy = true; let remoteNewer = false;
  try {
    for (let i = 0; i < 3; i++) {
      const remote = await GH.get(cfg.gh), blank = !!remote && !remote.text.trim(); let push = !remote || blank;
      if (remote && !blank) {
        const rdb = await decryptDB(remote.text, cfg.pass);
        if (rdb.meta.id !== db.meta.id) throw new Error('Ce dépôt contient un autre espace de travail');
        const m = mergeDB(db, rdb); db = m.db; push = m.localNewer; remoteNewer = remoteNewer || m.remoteNewer; LS.set(KEY.db, db);
        if (me && (!db.users.find(u => u.id === me.id && !u.d && u.active !== false))) { syncBusy = false; onSynced('kicked'); return; }
        if (me) me = db.users.find(u => u.id === me.id) || me;
      }
      if (push) { try { await GH.put(cfg.gh, await encryptDB(db, cfg.pass), remote && remote.sha); } catch (e) { if (e.conflict && i < 2) continue; throw e; } }
      cfg.dirty = false; cfg.last = Date.now(); saveCfg(); break;
    }
    syncState = 'ok'; cfg.err = ''; saveCfg(); onSynced(remoteNewer ? 'newer' : 'ok');
  } catch (e) { syncState = 'err'; cfg.err = e.message; saveCfg(); onSynced('err'); if (manual) { syncBusy = false; throw e; } }
  syncBusy = false;
}
const linkCode = () => btoa(unescape(encodeURIComponent(JSON.stringify({ o: cfg.gh.owner, r: cfg.gh.repo, b: cfg.gh.branch || 'main', p: cfg.gh.path, t: cfg.gh.token, k: cfg.pass }))));
const parseLink = s => { const j = JSON.parse(decodeURIComponent(escape(atob(s.trim())))); return { gh: { owner: j.o, repo: j.r, branch: j.b || 'main', path: j.p, token: j.t }, pass: j.k }; };

/* ---------- calendrier fiscal tunisien ---------- */
const FIXED_HOL = ['01-01', '01-14', '03-20', '04-09', '05-01', '07-25', '08-13', '10-15'];
const isHoliday = iso => FIXED_HOL.includes(iso.slice(5)) || (db?.settings?.holidays || []).includes(iso);
function nextWorking(iso) {
  let n = 0;
  while (n < 20) { const wd = new Date(toUTC(iso)).getUTCDay(); if (wd === 0 || wd === 6 || isHoliday(iso)) { iso = addDays(iso, 1); n++; } else break; }
  return iso;
}
const CATS = { mensuelle: 'Mensuelle', trimestrielle: 'Trimestrielle', annuelle: 'Annuelle', autre: 'Autre' };
/* Règles : dates issues des agendas fiscaux DGI 2026 ; "ok:0" = à confirmer */
function ruleList(c, Y) {
  const out = [], mk = (code, label, cat, period, due, src, ok = 1) => out.push({ code, label, cat, period, due, src, ok });
  const tri = c.freq === 'trimestrielle';
  if (!tri) {
    for (let k = 1; k <= 12; k++) {
      const pm = k === 1 ? 12 : k - 1, py = k === 1 ? Y - 1 : Y, day = c.pm ? (c.tele ? 20 : 28) : 15;
      mk('DMI', `Déclaration mensuelle — ${MOIS[pm - 1]} ${py}`, 'mensuelle', `${py}-${pad(pm)}`, ISO(Y, k, day), 'Agenda DGI');
    }
  } else {
    [[1, 'T4', Y - 1], [4, 'T1', Y], [7, 'T2', Y], [10, 'T3', Y]].forEach(([m, t, py]) => mk('DTRI', `Déclaration trimestrielle — ${t} ${py}`, 'trimestrielle', `${py}-${t}`, ISO(Y, m, 15), 'Agenda DGI'));
  }
  if (c.cnss) [[1, 'T4', Y - 1], [4, 'T1', Y], [7, 'T2', Y], [10, 'T3', Y]].forEach(([m, t, py]) => mk('CNSS', `CNSS — déclaration des salaires et cotisations ${t} ${py}`, 'trimestrielle', `${py}-${t}`, ISO(Y, m, 15), 'CNSS (prorogations possibles)'));
  [[6, '1er'], [9, '2e'], [12, '3e']].forEach(([m, n], i) => mk('AP' + (i + 1), `${n} acompte provisionnel ${Y}`, 'trimestrielle', `${Y}-AP${i + 1}`, ISO(Y, m, c.pm ? 28 : 25), 'Agenda DGI'));
  if (c.pm) {
    const cm = +c.close || 12, delay = (c.cac || c.expo) ? 6 : 4;
    for (const ye of [Y - 1, Y]) { const a = cm + delay, y2 = ye + Math.floor((a - 1) / 12), m2 = ((a - 1) % 12) + 1; if (y2 === Y) mk('IS', `Déclaration annuelle de l'IS — exercice clos le ${pad(cm)}/${ye}`, 'annuelle', `${ye}-IS`, ISO(Y, m2, 25), 'Agenda DGI'); }
  } else mk('IR', `Déclaration annuelle de l'impôt sur le revenu — ${Y - 1}`, 'annuelle', `${Y - 1}-IR`, ISO(Y, 5, 25), "Agenda DGI mai 2026 (non-salariés)");
  if (c.emp) mk('DE', `Déclaration de l'employeur — ${Y - 1}`, 'annuelle', `${Y - 1}-DE`, ISO(Y, 4, 30), 'Agenda DGI avr. 2026 — à confirmer chaque année', 0);
  if (!c.pm) mk('IF', `Déclaration de l'impôt sur la fortune — ${Y}`, 'annuelle', `${Y}-IF`, ISO(Y, 6, 30), 'Agenda DGI juin 2026 — à confirmer', 0);
  return out;
}
function genEch(coId, Y, pastDone) {
  const c = db.companies.find(x => x.id === coId); if (!c) return 0;
  const have = new Set(db.ech.map(e => e.id)); let n = 0;
  for (const r of ruleList(c, Y)) {
    const id = `${coId}|${r.code}|${r.period}`; if (have.has(id)) continue;
    db.ech.push(touch({ id, co: coId, code: r.code, label: r.label, cat: r.cat, period: r.period, due: nextWorking(r.due), rawDue: r.due, amount: '', st: (pastDone && nextWorking(r.due) < todayISO()) ? 'done' : 'todo', paidOn: '', ref: '', note: (pastDone && nextWorking(r.due) < todayISO() ? 'Marquée déposée à la génération (échéance passée). ' : '') + (r.ok ? '' : 'Date à confirmer : ' + r.src), src: r.src, auto: 1 })); n++;
  }
  return n;
}
const status = e => e.st === 'done' ? 'paid' : (diffDays(e.due, todayISO()) < 0 ? 'late' : diffDays(e.due, todayISO()) <= 7 ? 'soon' : 'ok');

/* ---------- procédures de contrôle ---------- */
const CTL_TYPES = {
  "Taxation d'office": [['Régularisation après mise en demeure', 'to_regul'], ["Recours contre l'arrêté de taxation (tribunal)", 'tribunal']],
  'Vérification ponctuelle': [['Opposition aux résultats de la vérification', 'verif_opp'], ["Réponse de l'administration à l'opposition", 'verif_rep'], ['Seconde opposition / commission de conciliation', 'verif_opp2']],
  'Vérification approfondie': [['Opposition aux résultats de la vérification', 'verif_opp'], ["Réponse de l'administration à l'opposition", 'verif_rep'], ['Seconde opposition / commission de conciliation', 'verif_opp2']],
  'Autre contrôle': []
};
const CTL_ST = ['En cours', 'Opposition déposée', 'Commission de conciliation', 'Contentieux', 'Réglé', 'Clos'];
function ctlSteps(type, start) {
  return (CTL_TYPES[type] || []).map(([label, k], i) => ({ id: uid(), label, days: db.settings.delays[k] ?? 30, start: i === 0 ? start : '', done: 0 }));
}
const stepDue = s => s.start ? addDays(s.start, +s.days || 0) : '';
const ctlOpen = d => !['Réglé', 'Clos'].includes(d.st);
