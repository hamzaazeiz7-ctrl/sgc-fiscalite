'use strict';
/* Calendrier, sociétés, utilisateurs, rôles, synchronisation, sauvegarde, journal, compte, paramètres */

/* ---------- calendrier fiscal ---------- */
function pCal() {
  const { y, m } = S.cal, key = `${y}-${pad(m)}`, all = myEch(), mon = all.filter(e => e.due.slice(0, 7) === key).sort((a, b) => a.due.localeCompare(b.due));
  const todo = mon.filter(e => e.st !== 'done'), done = mon.length - todo.length, t = todayISO();
  const first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, nd = new Date(y, m, 0).getDate();
  const byDay = {}; mon.forEach(e => { (byDay[e.due] = byDay[e.due] || []).push(e); });
  let cells = JOURS.map(j => `<div class="h">${j}</div>`).join('');
  for (let i = 0; i < off; i++) cells += '<div class="d o"></div>';
  for (let d = 1; d <= nd; d++) { const iso = ISO(y, m, d), l = byDay[iso] || []; cells += `<div class="d ${iso === t ? 'td' : ''} ${S.cal.day === iso ? 'sel' : ''}" data-act="calday" data-v="${iso}"><b>${d}</b><span class="pp">${l.map(e => `<i class="${e.st === 'done' ? 'p' : diffDays(e.due, t) < 0 ? 'l' : ''}"></i>`).join('')}</span></div>`; }
  const dayList = S.cal.mode === 'grille' && S.cal.day ? (byDay[S.cal.day] || []) : (S.cal.mode === 'liste' ? mon : []);
  const canC = visibleCos().some(c => perm(c.id, 'ech', 'c'));
  return `${head('Calendrier fiscal', 'Calendrier', 'Toutes les dates limites du mois, par société.')}
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><small>À déposer</small><b>${todo.length}</b><span>ce mois</span></div><div class="kpi"><small>Déposées</small><b>${done}</b><span>ce mois</span></div><div class="kpi red"><small>En retard</small><b>${todo.filter(e => diffDays(e.due, t) < 0).length}</b><span>ce mois</span></div></div>
  <div class="nav-m"><button class="btn sm" data-act="calnav" data-v="-1">${ic('back')}</button><h3>${MOIS[m - 1]} ${y}</h3><button class="btn sm" data-act="calnav" data-v="1" style="transform:none">${ic('chev')}</button></div>
  <div class="chips"><button class="chip ${S.cal.mode === 'grille' ? 'on' : ''}" data-act="calmode" data-v="grille">Grille</button><button class="chip ${S.cal.mode === 'liste' ? 'on' : ''}" data-act="calmode" data-v="liste">Liste</button><button class="chip" data-act="caltoday">Aujourd'hui</button></div>
  ${S.cal.mode === 'grille' ? `<div class="mgrid" style="margin-bottom:12px">${cells}</div><p class="sub">● à venir · <span style="color:var(--red)">●</span> en retard · <span style="color:var(--grn)">●</span> déposée</p>` : ''}
  ${S.cal.mode === 'grille' && S.cal.day ? `<h3 style="margin:10px 0">${fmtD(S.cal.day)}</h3>` + (canC ? `<button class="btn sm" data-act="ech-add" data-due="${S.cal.day}" style="margin-bottom:10px">${ic('plus')} Ajouter une échéance</button>` : '') : ''}
  ${dayList.length ? dayList.map(echRow).join('') : (S.cal.mode === 'liste' || S.cal.day ? '<div class="empty card">Aucune échéance.</div>' : '')}`;
}
ACT.calnav = el => { let { y, m } = S.cal; m += +el.dataset.v; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } S.cal.y = y; S.cal.m = m; S.cal.day = ''; render(); };
ACT.calmode = el => { S.cal.mode = el.dataset.v; render(); };
ACT.caltoday = () => { const d = new Date(); S.cal = { ...S.cal, y: d.getFullYear(), m: d.getMonth() + 1, day: todayISO() }; render(); };
ACT.calday = el => { S.cal.day = el.dataset.v; render(); };

/* ---------- menu Plus ---------- */
function pPlus() {
  const it = [];
  if (permAny('soc', 'v')) it.push(['soc', 'building', 'Sociétés', 'Profil fiscal de chaque société et génération du calendrier']);
  it.push(['set', 'clock', 'Délais et jours fériés', 'Délais de procédure de contrôle, jours fériés supplémentaires']);
  if (permAny('adm', 'v')) it.push(['usr', 'users', 'Utilisateurs', 'Comptes et accès par société'], ['rol', 'key', 'Rôles et droits', 'Matrice des droits'], ['syn', 'sync', 'Synchronisation', 'GitHub chiffré, code de liaison'], ['bak', 'dl', 'Sauvegarde', 'Exporter ou fusionner une sauvegarde'], ['log', 'file', "Journal d'activité", 'Qui a fait quoi']);
  it.push(['acc', 'users', 'Mon compte', 'Mot de passe, notifications']);
  return `${head('Administration', 'Plus', '')}<div class="menu">${it.map(([k, i, t, s]) => `<button data-act="nav" data-v="${k}">${ic(i)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}<button data-act="logout">${ic('out')}<span><b>Déconnexion</b><small>${esc(me.name)}</small></span></button></div>`;
}

/* ---------- sociétés ---------- */
function pSoc() {
  if (!permAny('soc', 'v')) return '<div class="empty">Accès refusé.</div>';
  return `${head('Administration', 'Sociétés', 'Le profil fiscal détermine les échéances générées.')}<div class="acts">${me.platform ? `<button class="btn pri" data-act="soc-add">${ic('plus')} Nouvelle société</button>` : ''}</div>` +
    visibleCos().map(c => `<div class="card" data-act="soc-edit" data-id="${c.id}" style="cursor:pointer"><h3>${esc(c.name)}</h3><p class="sub" style="margin:0 0 8px">${c.mf ? 'MF ' + esc(c.mf) : 'Matricule fiscal non renseigné'}</p><div class="badges"><span class="badge b-blu">${c.pm ? 'Personne morale' : 'Personne physique'}</span><span class="badge b-gray">${c.freq === 'trimestrielle' ? 'Déclaration trimestrielle' : 'Déclaration mensuelle'}</span>${c.pm ? `<span class="badge b-gray">${c.tele ? 'Télédéclaration' : 'Dépôt classique'}</span>` : ''}${c.cac || c.expo ? '<span class="badge b-gold">IS au 6e mois</span>' : ''}${c.emp ? '<span class="badge b-gray">Employeur</span>' : ''}${c.cnss ? '<span class="badge b-gray">CNSS</span>' : ''}</div></div>`).join('');
}
function socForm(c) {
  return `${F.t('name', 'Raison sociale', c.name, 'required')}${F.t('mf', 'Matricule fiscal', c.mf || '')}<div class="cos">${F.c('pm', 'Personne morale (sinon personne physique)', c.pm)}${F.c('tele', 'Adhérente à la télédéclaration / télépaiement (échéance le 20)', c.tele)}${F.c('cac', "Soumise à l'audit légal (commissaire aux comptes)", c.cac)}${F.c('expo', 'Totalement exportatrice', c.expo)}${F.c('emp', 'Employeur (déclaration de l\'employeur)', c.emp)}${F.c('cnss', 'Déclarations CNSS trimestrielles', c.cnss)}</div><div class="grid2">${F.s('freq', 'Rythme de déclaration', [['mensuelle', 'Mensuelle'], ['trimestrielle', 'Trimestrielle (forfaitaire / réel trimestriel)']], c.freq || 'mensuelle')}${F.s('close', "Mois de clôture de l'exercice", MOIS.map((m, i) => [i + 1, m]), c.close || 12)}</div>`;
}
const socSave = (c, d) => Object.assign(c, { name: d.name.trim(), mf: d.mf.trim(), pm: d.pm, tele: d.tele, cac: d.cac, expo: d.expo, emp: d.emp, cnss: d.cnss, freq: d.freq, close: +d.close });
ACT['soc-add'] = () => { if (!me.platform) return toast('Réservé aux administrateurs de plateforme', 1); openModal('Nouvelle société', socForm({ pm: true, tele: true, emp: true, cnss: true }), { onSave: d => { const c = socSave(touch({ id: uid() }), d); db.companies.push(c); const n = genEch(c.id, new Date().getFullYear(), true); logAct(`Société créée : ${c.name} (${n} échéances générées)`, 'création', 'soc'); render(); } }); };
ACT['soc-edit'] = el => {
  const c = db.companies.find(x => x.id === el.dataset.id); if (!c) return;
  openModal('Société', socForm(c), { ro: !perm(c.id, 'soc', 'e'), foot: me.platform ? `<button class="btn dng" type="button" data-act="soc-del" data-id="${c.id}" style="margin-right:auto">${ic('trash')} Supprimer</button>` : '', onSave: d => { socSave(c, d); touch(c); logAct(`Société modifiée : ${c.name}`, 'modification', 'soc'); toast('Profil enregistré. Utilisez « Générer l\'année » pour créer les nouvelles échéances.'); render(); } });
};
ACT['soc-del'] = async el => { const c = db.companies.find(x => x.id === el.dataset.id); if (!c || !me.platform) return; if (!await ask(`Supprimer la société « ${c.name} » ? Ses échéances ne seront plus visibles.`, 'Supprimer', 1)) return; c.d = true; touch(c); db.ech.filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }); db.ctl.filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }); logAct(`Société supprimée : ${c.name}`, 'suppression', 'soc'); if (S.co === c.id) S.co = 'all'; $$('.ov').forEach(o => o.close && o.close()); render(); };

/* ---------- utilisateurs ---------- */
const adminOK = a => me && (me.platform || permAny('adm', a));
const lastLogin = id => { const l = db.log.find(x => x.uid === id && x.action === 'connexion'); return l ? new Date(l.t).toLocaleString('fr-FR') : 'jamais'; };
function pUsers() {
  if (!adminOK('v')) return '<div class="empty">Accès refusé.</div>';
  return `${head('Administration', 'Utilisateurs', 'Un compte peut avoir un rôle différent dans chaque société.')}<div class="acts">${adminOK('c') ? `<button class="btn pri" data-act="usr-add">${ic('plus')} Nouvel utilisateur</button>` : ''}</div>` + live(db.users).map(u => `<div class="card" data-act="usr-edit" data-id="${u.id}" style="cursor:pointer"><div class="ucard"><div class="av">${esc(u.name.trim().slice(0, 1).toUpperCase())}</div><div><h3>${esc(u.name)}</h3><div class="em">${esc(u.email)}</div></div></div><div class="badges">${u.platform ? '<span class="badge b-gold">Administrateur de plateforme</span>' : ''}${u.active === false ? '<span class="badge b-red">Désactivé</span>' : ''}${(u.mem || []).map(m => `<span class="badge b-blu">${esc(coName(m.co))} : ${esc(role(m.role)?.name || '?')}</span>`).join('')}${!u.platform && !(u.mem || []).length ? '<span class="badge b-gray">Rattaché à aucune société</span>' : ''}</div><small class="sub">Dernière connexion : ${lastLogin(u.id)}</small></div>`).join('');
}
function usrForm(u) {
  const cos = live(db.companies);
  return `${F.t('name', 'Nom', u.name || '', 'required')}${F.t('email', 'E-mail (identifiant)', u.email || '', 'type="email" required')}${F.p('pw', u.id ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe', u.id ? '' : 'required minlength="8"')}<div class="cos">${me.platform ? F.c('platform', 'Administrateur de plateforme (voit tout)', u.platform) : ''}${F.c('active', 'Compte actif', u.active !== false)}</div><h3 style="margin:10px 0">Accès par société</h3>${cos.map(c => `<div class="macc"><b>${esc(c.name)}</b><select name="m_${c.id}"><option value="">Aucun accès</option>${db.roles.filter(r => !r.d).map(r => `<option value="${r.id}" ${(u.mem || []).find(m => m.co === c.id)?.role === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>`).join('')}`;
}
async function usrSave(u, d, isNew) {
  const act = live(db.users).filter(x => x.active !== false && x.platform && x.id !== u.id).length + ((me.platform ? d.platform : u.platform) && d.active ? 1 : 0);
  if (!act) throw new Error('Il faut au moins un administrateur de plateforme actif');
  if (u.id === me.id && !d.active) throw new Error('Vous ne pouvez pas désactiver votre propre compte');
  if (live(db.users).some(x => x.id !== u.id && x.email.toLowerCase() === d.email.trim().toLowerCase())) throw new Error('Cet e-mail existe déjà');
  if (!me.platform && u.platform) throw new Error('Compte réservé aux administrateurs de plateforme');
  u.name = d.name.trim(); u.email = d.email.trim(); u.active = d.active; if (me.platform) u.platform = !!d.platform;
  if (d.pw) Object.assign(u, await mkCred(d.pw)); u.mem = live(db.companies).filter(c => d['m_' + c.id]).map(c => ({ co: c.id, role: d['m_' + c.id] }));
  touch(u); if (isNew) db.users.push(u); logAct(`Utilisateur ${isNew ? 'créé' : 'modifié'} : ${u.name}`, isNew ? 'création' : 'modification', 'adm');
  if (u.id === me.id) me = u; render();
}
ACT['usr-add'] = () => openModal('Nouvel utilisateur', usrForm({}), { onSave: d => usrSave({ id: uid() }, d, true) });
ACT['usr-edit'] = el => { const u = db.users.find(x => x.id === el.dataset.id); if (!u) return; openModal('Utilisateur', usrForm(u), { ro: !adminOK('e'), foot: adminOK('d') && u.id !== me.id ? `<button class="btn dng" type="button" data-act="usr-del" data-id="${u.id}" style="margin-right:auto">${ic('trash')} Supprimer</button>` : '', onSave: d => usrSave(u, d, false) }); };
ACT['usr-del'] = async el => { const u = db.users.find(x => x.id === el.dataset.id); if (!u || !adminOK('d')) return; if (live(db.users).filter(x => x.platform && x.active !== false && x.id !== u.id).length < 1 && u.platform) return toast('Dernier administrateur de plateforme', 1); if (!await ask(`Supprimer ${u.name} ?`, 'Supprimer', 1)) return; u.d = true; touch(u); logAct(`Utilisateur supprimé : ${u.name}`, 'suppression', 'adm'); $$('.ov').forEach(o => o.close && o.close()); render(); };

/* ---------- rôles ---------- */
function pRoles() {
  if (!adminOK('v')) return '<div class="empty">Accès refusé.</div>';
  const roles = db.roles.filter(r => !r.d); const r = roles.find(x => x.id === S.sub) || roles[0]; S.sub = r.id; const ed = adminOK('e') && !r.locked;
  return `${head('Administration', 'Rôles et droits', 'Les rôles filtrent l\'interface selon la société.')}<div class="acts">${adminOK('c') ? `<button class="btn pri" data-act="rol-add">${ic('plus')} Nouveau rôle</button>` : ''}</div><div class="chips">${roles.map(x => `<button class="chip ${x.id === r.id ? 'on' : ''}" data-act="rol-sel" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  <div class="card"><h3>${esc(r.name)} ${r.locked ? '<span class="badge b-gold">Rôle de départ</span>' : ''}</h3><div class="matrix"><table><tr><th>Module</th>${ACTS.map(a => `<th>${a[1]}</th>`).join('')}</tr>${MODS.map(m => `<tr><td>${m.n} ${m.sens ? '<span class="badge b-red">Sensible</span>' : ''}</td>${ACTS.map(([k]) => `<td><input type="checkbox" class="cb" data-act="perm" data-m="${m.k}" data-a="${k}" ${r.perms[m.k]?.[k] ? 'checked' : ''} ${ed ? '' : 'disabled'}></td>`).join('')}</tr>`).join('')}</table></div>${ed ? `<div class="acts" style="margin-top:12px"><button class="btn sm" data-act="rol-ren" data-id="${r.id}">Renommer</button><button class="btn sm dng" data-act="rol-del" data-id="${r.id}">Supprimer</button></div>` : ''}</div>`;
}
ACT['rol-sel'] = el => { S.sub = el.dataset.id; render(); };
ACT.perm = el => {
  const r = role(S.sub); if (!r || r.locked || !adminOK('e')) return; const p = r.perms[el.dataset.m] = r.perms[el.dataset.m] || { v: 0, c: 0, e: 0, d: 0 }, a = el.dataset.a;
  p[a] = el.checked ? 1 : 0; if (a !== 'v' && el.checked) p.v = 1; if (a === 'v' && !el.checked) p.c = p.e = p.d = 0; touch(r); logAct(`Droits modifiés : ${r.name}`, 'modification', 'adm'); render();
};
ACT['rol-add'] = () => openModal('Nouveau rôle', F.t('name', 'Nom du rôle', '', 'required'), { onSave: d => { const r = touch({ id: uid(), name: d.name.trim(), perms: mkPerm({ ech: { v: 1 } }) }); db.roles.push(r); S.sub = r.id; logAct(`Rôle créé : ${r.name}`, 'création', 'adm'); render(); } });
ACT['rol-ren'] = el => { const r = role(el.dataset.id); openModal('Renommer', F.t('name', 'Nom', r.name, 'required'), { onSave: d => { r.name = d.name.trim(); touch(r); logAct(`Rôle renommé : ${r.name}`, 'modification', 'adm'); render(); } }); };
ACT['rol-del'] = async el => { const r = role(el.dataset.id); if (live(db.users).some(u => (u.mem || []).some(m => m.role === r.id))) return toast('Ce rôle est utilisé par des utilisateurs', 1); if (!await ask(`Supprimer le rôle ${r.name} ?`, 'Supprimer', 1)) return; r.d = true; touch(r); S.sub = ''; logAct(`Rôle supprimé : ${r.name}`, 'suppression', 'adm'); render(); };

/* ---------- synchronisation ---------- */
function pSync() {
  if (!adminOK('v')) return '<div class="empty">Accès refusé.</div>';
  const g = cfg.gh || {}, st = { ok: ['b-grn', 'Synchronisé'], pending: ['b-org', 'En attente'], err: ['b-red', 'Erreur'], off: ['b-gray', 'Non configurée'] }[ghReady() ? (syncState === 'off' ? 'ok' : syncState) : 'off'];
  return `${head('Administration', 'Synchronisation', 'PC, tablette et téléphone partagent les mêmes données, chiffrées sur un dépôt GitHub privé.')}
  <div class="card"><div class="badges"><span class="badge ${st[0]}">${st[1]}</span>${cfg.last ? `<span class="sub">Dernière synchro : ${new Date(cfg.last).toLocaleString('fr-FR')}</span>` : ''}</div>${cfg.err ? `<div class="note" style="background:var(--redbg);color:var(--red)">${esc(cfg.err)}</div>` : ''}
  <form id="syf">${F.t('owner', 'Propriétaire GitHub', g.owner || '')}${F.t('repo', 'Dépôt de données (PRIVÉ)', g.repo || '')}<div class="grid2">${F.t('branch', 'Branche', g.branch || 'main')}${F.t('path', 'Fichier', g.path || 'sgc-fiscalite-data.json')}</div>${F.p('token', 'Jeton GitHub (Contents : lecture/écriture)', 'autocomplete="off" placeholder="' + (g.token ? 'enregistré — laisser vide pour conserver' : '') + '"')}${F.p('pass', "Mot de passe de l'espace", 'autocomplete="off" placeholder="' + (cfg.pass ? 'enregistré — laisser vide pour conserver' : '') + '"')}<div class="acts"><button class="btn pri" type="submit">Enregistrer et synchroniser</button>${ghReady() ? `<button class="btn" type="button" data-act="sync">${ic('sync')} Synchroniser</button><button class="btn" type="button" data-act="lcode">Code de liaison</button>` : ''}</div></form></div>
  <div class="note">Le code de liaison contient le jeton et le mot de passe de l'espace : collez-le une seule fois sur l'autre appareil puis supprimez-le des messageries. Le jeton doit être limité au dépôt de données.</div>`;
}
ACT.sync = async () => { if (!ghReady()) { S.page = 'syn'; return render(); } try { toast('Synchronisation…'); await syncNow(true); render(); toast('Synchronisé'); } catch (e) { render(); toast(e.message, 1); } };
ACT.lcode = async () => { const c = linkCode(); try { await navigator.clipboard.writeText(c); toast('Code copié'); } catch { openModal('Code de liaison', `<textarea rows="6" style="width:100%" readonly>${esc(c)}</textarea>`, { save: false }); } };
document.addEventListener('submit', async e => {
  if (e.target.id !== 'syf') return; e.preventDefault(); const d = formData(e.target), g = cfg.gh || {};
  cfg.gh = { owner: d.owner.trim(), repo: d.repo.trim(), branch: d.branch.trim() || 'main', path: d.path.trim(), token: d.token.trim() || g.token || '' }; if (d.pass) cfg.pass = d.pass; cfg.dirty = true; saveCfg(); keyCache.clear();
  try { toast('Test de la connexion…'); await syncNow(true); toast('Synchronisation active'); } catch (er) { toast(er.message, 1); } render();
});

/* ---------- sauvegarde ---------- */
function pBackup() {
  if (!adminOK('v')) return '<div class="empty">Accès refusé.</div>';
  return `${head('Administration', 'Sauvegarde', '')}<div class="card"><h3>Exporter</h3><p>Fichier JSON <b>non chiffré</b> contenant toutes les données : à conserver en lieu sûr.</p><button class="btn pri" data-act="bk-exp">${ic('dl')} Exporter la sauvegarde</button></div><div class="card"><h3>Fusionner une sauvegarde</h3><p>Les enregistrements les plus récents l'emportent.</p><input type="file" id="bkf" accept=".json" class="sel"></div>`;
}
ACT['bk-exp'] = () => { download(new Blob([JSON.stringify(db)], { type: 'application/json' }), `sgc-fiscalite-sauvegarde-${todayISO()}.json`); logAct('Sauvegarde exportée', 'export', 'adm', true); };
document.addEventListener('change', async e => {
  if (e.target.id !== 'bkf' || !e.target.files[0]) return;
  try { const j = normalize(JSON.parse(await e.target.files[0].text())); if (j.meta.id !== db.meta.id) throw new Error("Cette sauvegarde provient d'un autre espace"); db = mergeDB(db, j).db; logAct('Sauvegarde fusionnée', 'import', 'adm'); toast('Sauvegarde fusionnée'); render(); } catch (er) { toast(er.message || 'Fichier invalide', 1); }
});

/* ---------- journal ---------- */
function pLog() {
  if (!adminOK('v')) return '<div class="empty">Accès refusé.</div>';
  const f = S.lf, q = f.q.trim().toLowerCase(), acts = [...new Set(db.log.map(l => l.action))];
  const l = db.log.filter(x => (!f.u || x.uid === f.u) && (!f.a || x.action === f.a) && (!q || x.text.toLowerCase().includes(q))).slice(0, 150);
  return `${head('Administration', "Journal d'activité", '')}<div class="tools"><input data-bind="lf.q" placeholder="Rechercher" value="${esc(f.q)}"><select data-bind="lf.u"><option value="">Tous les utilisateurs</option>${db.users.map(u => `<option value="${u.id}" ${f.u === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select><select data-bind="lf.a"><option value="">Toutes les actions</option>${acts.map(a => `<option ${f.a === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div><div class="card" id="xres">${logHTML(l)}</div>`;
}
const logHTML = l => l.length ? l.map(x => `<div class="logline"><b>${esc(x.text)}</b><small>${new Date(x.t).toLocaleString('fr-FR')} · ${esc(db.users.find(u => u.id === x.uid)?.name || '—')} · ${esc(x.action)}</small></div>`).join('') : '<div class="empty">Aucune entrée.</div>';

/* ---------- compte et paramètres ---------- */
function pAcc() {
  return `${head('Compte', 'Mon compte', '')}<div class="card"><div class="ucard"><div class="av">${esc(me.name.trim().slice(0, 1).toUpperCase())}</div><div><h3>${esc(me.name)}</h3><div class="em">${esc(me.email)}</div></div></div><div class="acts" style="margin-top:14px"><button class="btn" data-act="pw">${ic('key')} Changer mon mot de passe</button><button class="btn" data-act="notif">${ic('bell')} Activer les notifications</button></div><p class="sub">Les notifications s'affichent uniquement quand l'application est ouverte (résumé quotidien des retards et échéances proches). Il n'y a pas de notification poussée en arrière-plan.</p></div>`;
}
ACT.pw = () => openModal('Mot de passe', F.p('old', 'Mot de passe actuel', 'autocomplete="current-password" required') + F.p('n1', 'Nouveau mot de passe', 'required minlength="8"') + F.p('n2', 'Confirmer', 'required'), { onSave: async d => { if (await hashPw(d.old, me.salt) !== me.hash) throw new Error('Mot de passe actuel incorrect'); if (d.n1 !== d.n2) throw new Error('Les deux mots de passe diffèrent'); const u = db.users.find(x => x.id === me.id); Object.assign(u, await mkCred(d.n1)); touch(u); me = u; logAct('Mot de passe modifié', 'modification', 'adm'); toast('Mot de passe modifié'); } });
ACT.notif = async () => { if (!('Notification' in window)) return toast('Notifications non prises en charge', 1); const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Notifications activées' : 'Notifications refusées', p !== 'granted'); if (p === 'granted') dailyNotify(true); };
function dailyNotify(force) {
  if (!me || !('Notification' in window) || Notification.permission !== 'granted') return;
  const t = todayISO(); if (!force && LS.get(KEY.notif) === t + me.id) return;
  const al = alertsList(), late = al.filter(a => diffDays(a.due, t) < 0).length, soon = al.length - late; LS.set(KEY.notif, t + me.id);
  const body = al.length ? `${late} en retard, ${soon} dans les 7 jours` : 'Aucune échéance urgente';
  navigator.serviceWorker?.ready.then(r => r.showNotification(APP_NAME, { body, icon: 'icons/icon-192.png' })).catch(() => { }); try { navigator.setAppBadge && navigator.setAppBadge(al.length); } catch { }
}
function pSet() {
  const d = db.settings.delays, ed = adminOK('e');
  const lab = { to_regul: 'Régularisation après mise en demeure (taxation d\'office)', tribunal: "Recours contre l'arrêté de taxation d'office", verif_opp: 'Opposition aux résultats de vérification', verif_rep: "Réponse de l'administration à l'opposition", verif_opp2: 'Seconde opposition / commission de conciliation' };
  return `${head('Paramètres', 'Délais et jours fériés', '')}<div class="card"><h3>Délais de procédure (jours)</h3><div class="note">Valeurs indicatives, à confirmer avec le Code des droits et procédures fiscaux et la notification reçue. Elles servent de défaut à la création des dossiers.</div><form id="dlf"><fieldset ${ed ? '' : 'disabled'}>${Object.keys(lab).map(k => F.t(k, lab[k], d[k], 'type="number" min="0"')).join('')}${F.a('hol', 'Jours fériés supplémentaires (un par ligne, AAAA-MM-JJ) : fêtes religieuses, ponts, fermetures décidées', db.settings.holidays.join('\n'), 'placeholder="2026-12-25"')}<p class="sub">Fériés fixes déjà pris en compte : 1er janv., 14 janv., 20 mars, 9 avril, 1er mai, 25 juil., 13 août, 15 oct. Une date limite qui tombe un week-end ou un jour férié est reportée au premier jour ouvré suivant.</p>${ed ? '<button class="btn pri" type="submit">Enregistrer</button>' : ''}</fieldset></form></div>`;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'dlf') return; e.preventDefault(); const d = formData(e.target); const s = db.settings;
  Object.keys(DELAYS_DEF).forEach(k => { s.delays[k] = +d[k] || 0; }); s.holidays = d.hol.split(/\s+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)); s.u = Date.now(); logAct('Paramètres modifiés', 'modification', 'adm'); toast('Enregistré');
});
