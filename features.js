'use strict';
/* Calendrier, sociétés, utilisateurs, rôles, synchronisation, sauvegarde, journal, compte, paramètres */

/* ---------- calendrier fiscal ---------- */
function pCal() {
  const { y, m } = S.cal, key = `${y}-${pad(m)}`, cos = scopeCos().filter(c => perm(c.id, 'ech', 'v'));
  const items = obls([y - 1, y, y + 1], cos).filter(o => o.due.slice(0, 7) === key).map(o => ({ o, s: oState(o), due: o.due })), man = myEch().filter(e => e.due.slice(0, 7) === key);
  const t = todayISO(), first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, nd = new Date(y, m, 0).getDate();
  const byDay = {}; items.forEach(x => { (byDay[x.due] = byDay[x.due] || []).push(x); });
  const open = items.filter(x => x.s.st !== 'done'), amt = r3(open.reduce((a, x) => a + amtOf(x.o, x.s), 0));
  let cells = JOURS.map(j => `<div class="h">${j}</div>`).join('');
  for (let i = 0; i < off; i++) cells += '<div class="d o"></div>';
  for (let d = 1; d <= nd; d++) { const iso = ISO(y, m, d), l = byDay[iso] || []; cells += `<div class="d ${iso === t ? 'td' : ''} ${S.cal.day === iso ? 'sel' : ''}" data-act="calday" data-v="${iso}"><b>${d}</b><span class="pp">${l.map(x => `<i class="${x.s.st === 'done' ? 'p' : (x.s.st === 'late' || x.s.st === 'unpaid') ? 'l' : ''}"></i>`).join('')}</span></div>`; }
  const sel = S.cal.mode === 'grille' ? (S.cal.day ? (byDay[S.cal.day] || []) : []) : items.sort((a, b) => a.due.localeCompare(b.due)), manSel = S.cal.mode === 'grille' ? man.filter(e => e.due === S.cal.day) : man;
  return `${head('Calendrier fiscal', 'Calendrier', 'Toutes les dates limites du mois, par société.')}
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><small>À traiter</small><b>${open.length}</b><span>ce mois</span></div><div class="kpi"><small>Réglées</small><b>${items.length - open.length}</b><span>ce mois</span></div><div class="kpi"><small>Montant restant</small><b style="font-size:1.2rem">${money(amt)}</b><span>connu</span></div></div>
  <div class="nav-m"><button class="btn sm" data-act="calnav" data-v="-1">${ic('back')}</button><h3>${MOIS[m - 1]} ${y}</h3><button class="btn sm" data-act="calnav" data-v="1">${ic('chev')}</button></div>
  <div class="chips"><button class="chip ${S.cal.mode === 'grille' ? 'on' : ''}" data-act="calmode" data-v="grille">Grille</button><button class="chip ${S.cal.mode === 'liste' ? 'on' : ''}" data-act="calmode" data-v="liste">Liste</button><button class="chip" data-act="caltoday">Aujourd'hui</button></div>
  ${S.cal.mode === 'grille' ? `<div class="mgrid" style="margin-bottom:12px">${cells}</div><p class="sub">● à venir · <span style="color:var(--red)">●</span> en retard ou impayée · <span style="color:var(--grn)">●</span> réglée</p>` : ''}
  ${S.cal.mode === 'grille' && S.cal.day ? `<h3 style="margin:10px 0">${fmtD(S.cal.day)}</h3>` : ''}
  ${sel.length || manSel.length ? sel.map(x => oRowFull(x.o)).join('') + manSel.map(echRow).join('') : (S.cal.mode === 'liste' || S.cal.day ? '<div class="empty card">Aucune échéance.</div>' : '')}`;
}
const oRowFull = o => oRow(o).replace('<div class="t"', `<div class="sub" style="margin:0">${esc(coName(o.co))}</div><div class="t"`);
ACT.calnav = el => { let { y, m } = S.cal; m += +el.dataset.v; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } S.cal.y = y; S.cal.m = m; S.cal.day = ''; render(); };
ACT.calmode = el => { S.cal.mode = el.dataset.v; render(); };
ACT.caltoday = () => { const d = new Date(); S.cal = { ...S.cal, y: d.getFullYear(), m: d.getMonth() + 1, day: todayISO() }; render(); };
ACT.calday = el => { S.cal.day = el.dataset.v; render(); };

/* ---------- menu Plus ---------- */
function pPlus() {
  const it = [['ctl', 'shield', "Taxation d'office et contrôles", 'Notifications, délais de réponse, oppositions'], ['cal', 'cal', 'Calendrier fiscal', 'Toutes les dates limites du mois'], ['ech', 'list', 'Autres échéances', 'Obligations saisies à la main']];
  if (permAny('soc', 'v')) it.push(['soc', 'building', 'Sociétés', 'Profil fiscal de chaque société et génération du calendrier']);
  it.push(['set', 'clock', 'Délais et jours fériés', 'Délais de procédure de contrôle, jours fériés supplémentaires']);
  if (permAny('adm', 'v')) it.push(['usr', 'users', 'Utilisateurs', 'Comptes et accès par société'], ['rol', 'key', 'Rôles et droits', 'Matrice des droits'], ['syn', 'sync', 'Synchronisation', 'GitHub chiffré, code de liaison'], ['bak', 'dl', 'Sauvegarde', 'Exporter ou fusionner une sauvegarde'], ['log', 'file', "Journal d'activité", 'Qui a fait quoi']);
  it.push(['acc', 'users', 'Mon compte', 'Mot de passe, notifications']);
  return `${head('Administration', 'Plus', '')}<div class="menu">${it.map(([k, i, t, s]) => `<button data-act="nav" data-v="${k}">${ic(i)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}<button data-act="logout">${ic('out')}<span><b>Déconnexion</b><small>${esc(me.name)}</small></span></button></div>`;
}

/* ---------- sociétés ---------- */
function pSoc() {
  if (!permAny('soc', 'v')) return '<div class="empty">Accès refusé.</div>';
  const cos = live(db.companies).filter(c => me.platform || perm(c.id, 'soc', 'v'));
  return `${head('Administration', 'Sociétés', 'Le profil fiscal détermine les déclarations à suivre.')}<div class="acts">${me.platform ? `<button class="btn pri" data-act="soc-add">${ic('plus')} Nouvelle société</button>` : ''}</div>` +
    (cos.map(c => `<div class="card" data-act="soc-edit" data-id="${c.id}" style="cursor:pointer;${c.statut === 'Archivé' ? 'opacity:.6' : ''}"><h3>${esc(c.name)} <span class="tag">${esc(c.code || '')}</span></h3><p class="sub" style="margin:0 0 8px">${c.mf ? 'MF ' + esc(c.mf) : 'Matricule fiscal non renseigné'}${c.forme ? ' · ' + esc(c.forme) : ''}${c.activite ? ' · ' + esc(c.activite) : ''}</p><div class="badges"><span class="badge b-blu">${esc(c.type || 'Personne morale')}</span><span class="badge b-gray">${c.decl === 'Trimestrielle' ? 'Déclaration trimestrielle' : 'Déclaration mensuelle'}</span>${c.regimeFiscal ? `<span class="badge b-gray">${esc(c.regimeFiscal)}</span>` : ''}${isPM(c) ? `<span class="badge b-gray">${c.tele ? 'Télédéclaration' : 'Dépôt classique'}</span>` : ''}${c.cac || c.expo ? '<span class="badge b-gold">IS au 6e mois</span>' : ''}${c.emp ? '<span class="badge b-gray">Employeur</span>' : ''}${c.cnss ? '<span class="badge b-gray">CNSS</span>' : ''}${c.statut === 'Archivé' ? '<span class="badge b-red">Archivée</span>' : ''}</div></div>`).join('') || '<div class="empty card">Aucune société.</div>');
}
const TVA_OPT = ['À vérifier', 'Mensuelle', 'Trimestrielle', 'Non assujetti'], REG_OPT = ['', 'Réel', "Forfait d'assiette", 'À vérifier'];
function socForm(c) {
  return `<p class="sub" style="margin-top:0">Les champs marqués * sont obligatoires.</p>
  ${F.t('name', 'Raison sociale / nom *', c.name || '', 'required')}
  <div class="grid2">${F.s('type', 'Type', ['Personne morale', 'Personne physique'], c.type || 'Personne morale')}${F.t('forme', 'Forme juridique', c.forme || '', 'list="fj"')}<datalist id="fj"><option>SARL</option><option>SA</option><option>SUARL</option><option>SNC</option><option>Entreprise individuelle</option><option>Association</option></datalist></div>
  ${F.t('activite', 'Activité principale', c.activite || '')}
  <div class="grid2">${F.t('mf', 'Matricule fiscal', c.mf || '')}${F.t('tel', 'Téléphone', c.tel || '')}${F.t('email', 'E-mail', c.email || '', 'type="email"')}${F.t('contact', 'Interlocuteur', c.contact || '')}</div>
  <h3 style="margin:12px 0 6px">Profil fiscal</h3><div class="grid2">${F.s('decl', 'Rythme de déclaration', ['Mensuelle', 'Trimestrielle'], c.decl || 'Mensuelle')}${F.s('regimeFiscal', 'Régime fiscal', REG_OPT, c.regimeFiscal || '')}${F.s('tva', 'Situation TVA', TVA_OPT, c.tva || 'À vérifier')}${F.s('clotM', "Mois de clôture de l'exercice", MOIS.map((m, i) => [i + 1, m]), c.clotM || 12)}${F.d('dateEntree', 'Suivi des échéances à partir du', c.dateEntree || '')}${F.s('irpp', 'Catégorie IRPP (personne physique)', IRPP_OPT, c.irpp || 'industriel')}</div>
  <div class="cos">${F.c('tele', 'Télédéclaration / télépaiement (déclaration mensuelle le 20)', c.tele)}${F.c('cac', "Soumise à l'audit légal (IS au 6e mois)", c.cac)}${F.c('expo', 'Totalement exportatrice (IS au 6e mois)', c.expo)}${F.c('emp', "Employeur (déclaration annuelle de l'employeur)", c.emp)}${F.c('cnss', 'Déclarations CNSS trimestrielles', c.cnss)}</div>
  <details style="margin-top:10px"><summary style="cursor:pointer;font-family:var(--serif);font-weight:700">Plus d'options</summary><div class="grid2" style="margin-top:8px">${F.t('activite2', 'Activité secondaire', c.activite2 || '')}${F.t('rne', 'RNE', c.rne || '')}${F.t('adresse', 'Adresse', c.adresse || '')}${F.t('gerant', 'Gérant ou représentant légal', c.gerant || '')}${F.d('dateConstitution', 'Date de constitution', c.dateConstitution || '')}${F.d('dateDebut', "Date de début d'activité", c.dateDebut || '')}${F.t('resp', 'Responsable du dossier', c.resp || '')}${F.s('statut', 'Statut', ['Actif', 'Archivé'], c.statut || 'Actif')}${F.t('cnssRegime', 'Régime CNSS', c.cnssRegime || '')}</div>${F.a('prestations', 'Prestations assurées', c.prestations || '')}${F.a('banques', 'Comptes bancaires (un par ligne, jamais de mot de passe)', c.banques || '')}${F.a('obs', 'Observations', c.obs || '')}</details>`;
}
const socSave = (c, d) => { ['name', 'type', 'forme', 'activite', 'mf', 'tel', 'email', 'contact', 'decl', 'regimeFiscal', 'tva', 'dateEntree', 'irpp', 'activite2', 'rne', 'adresse', 'gerant', 'dateConstitution', 'dateDebut', 'resp', 'statut', 'cnssRegime', 'prestations', 'banques', 'obs'].forEach(k => { c[k] = typeof d[k] === 'string' ? d[k].trim() : d[k]; }); ['tele', 'cac', 'expo', 'emp', 'cnss'].forEach(k => { c[k] = !!d[k]; }); c.clotM = +d.clotM || 12; if (!c.dateEntree) c.dateEntree = todayISO().slice(0, 8) + '01'; return c; };
const nextCode = () => 'C' + pad(live(db.companies).length + 1);
ACT['soc-add'] = () => { if (!me.platform) return toast('Réservé aux administrateurs de plateforme', 1); openModal('Nouvelle société', socForm({ type: 'Personne morale', tele: true, emp: true, dateEntree: todayISO().slice(0, 8) + '01' }), { onSave: d => { const c = socSave(touch({ id: uid(), code: nextCode() }), d); db.companies.push(c); logAct(`Société créée : ${c.name}`, 'création', 'soc'); S.co = c.id; render(); toast('Société créée'); } }); };
ACT['soc-edit'] = el => {
  const c = db.companies.find(x => x.id === el.dataset.id); if (!c) return;
  openModal('Société', socForm(c), { ro: !perm(c.id, 'soc', 'e'), foot: me.platform ? `<button class="btn dng" type="button" data-act="soc-del" data-id="${c.id}" style="margin-right:auto">${ic('trash')} Supprimer</button>` : '', onSave: d => { socSave(c, d); touch(c); logAct(`Société modifiée : ${c.name}`, 'modification', 'soc'); render(); } });
};
ACT['soc-del'] = async el => { const c = db.companies.find(x => x.id === el.dataset.id); if (!c || !me.platform) return; if (!await ask(`Supprimer la société « ${c.name} » ? Ses échéances ne seront plus visibles.`, 'Supprimer', 1)) return; c.d = true; touch(c); db.ech.filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }); db.rec.filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }); db.ctl.filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }); logAct(`Société supprimée : ${c.name}`, 'suppression', 'soc'); if (S.co === c.id) S.co = 'all'; $$('.ov').forEach(o => o.close && o.close()); render(); };

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
