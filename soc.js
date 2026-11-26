'use strict';
/* Sociétés : liste, fiche détaillée, associés et capital, banques et RIB, export de la fiche client.
   Données reprises du modèle de SGC Freelance Pilot : c.capital, c.associes, c.assocHist, c.v343bk, c.hist. */
const NR = 'Non renseigné';
const hasNum = v => v !== '' && v != null && !isNaN(+v);
const nowTS = () => new Date().toISOString();
const fmtDT = s => { try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
const dOK = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s));
const co1 = id => db.companies.find(c => c.id === id && !c.d);
const cHist = (c, txt) => { (c.hist = c.hist || []).push({ d: nowTS(), txt }); };
const sec = t => `<h3 class="fsec">${t}</h3>`;
const nextCode = () => 'C-' + String(Math.max(0, ...db.companies.map(c => +String(c.code || '').replace(/\D/g, '') || 0)) + 1).padStart(3, '0');
const cObls = c => obls([new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1], [c]);
const dlist = rows => `<dl class="dl">${rows.map(r => r[0] === '#' ? `<h3>${esc(r[1])}</h3>` : `<dt>${esc(r[0])}</dt><dd>${r[1] ? esc(r[1]) : '—'}</dd>`).join('')}</dl>`;
const yn = v => v ? 'Oui' : 'Non';
const TVA_OPT = ['À vérifier', 'Assujetti — déclaration mensuelle', 'Assujetti — déclaration trimestrielle', 'Non assujetti'];
const ETAT_OPT = [['', 'Calculé automatiquement'], ['À jour', 'À jour'], ['À traiter', 'À traiter'], ['En retard', 'En retard'], ['En sommeil', 'En sommeil']];
function etatDossier(c) {
  if (c.etatDossier) return c.etatDossier; if (c.statut === 'Archivé') return 'Archivé';
  const st = cObls(c).filter(o => o.due <= addDays(todayISO(), 30)).map(oState).filter(s => s.st !== 'done').map(s => s.st);
  return st.some(s => s === 'late' || s === 'unpaid') ? 'En retard' : st.length ? 'À traiter' : 'À jour';
}
const canSoc = (c, a) => me.platform || perm(c.id, 'soc', a);

/* ---------- liste ---------- */
function socCards() {
  const f = S.sf, q = f.q.trim().toLowerCase(), Y = new Date().getFullYear();
  const cos = live(db.companies).filter(c => canSoc(c, 'v') && (S.co === 'all' || c.id === S.co) && (S.co !== 'all' || f.st === 'all' || (c.statut || 'Actif') === f.st) && (!q || [c.name, c.code, c.activite, c.contact, c.mf].join(' ').toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!cos.length) return `<div class="empty card">${db.companies.some(c => !c.d) ? 'Aucune société pour ce filtre.' : 'Aucune société. Créez la première avec « Nouvelle société ».'}</div>`;
  return `<div class="clients-grid">${cos.map(c => { const st = obls([Y], [c]).map(oState), open = st.filter(s => s.st !== 'done').length, late = st.filter(s => s.st === 'late' || s.st === 'unpaid').length; return `<div class="client-card" data-act="cli-open" data-id="${c.id}"><h3>${esc(c.name)}</h3><div class="sub">${esc(c.code || '')} · ${esc(c.forme || c.type || '')}${c.activite ? ' · ' + esc(c.activite) : ''}</div><div class="chips" style="margin:10px 0 0"><span class="badge b-gray">${open} obligation${open > 1 ? 's' : ''}</span>${late ? `<span class="badge b-red">${late} échéance${late > 1 ? 's' : ''} dépassée${late > 1 ? 's' : ''}</span>` : ''}${c.statut === 'Archivé' ? '<span class="badge b-gray">Archivée</span>' : ''}</div></div>`; }).join('')}</div>`;
}
function pSoc() {
  if (!permAny('soc', 'v')) return '<div class="empty">Accès refusé.</div>';
  return `${head('Où en est chaque dossier ?', 'Sociétés', '')}<div class="tools" style="grid-template-columns:1fr"><input data-bind="sf.q" type="search" placeholder="Rechercher une société…" value="${esc(S.sf.q)}"></div>
  <div class="acts"><select data-bind="sf.st" style="max-width:150px;width:auto;background:var(--card);border:1px solid var(--bd2);border-radius:14px;padding:12px 14px">${[['Actif', 'Actives'], ['Archivé', 'Archivées'], ['all', 'Toutes']].map(([v, l]) => `<option value="${v}" ${S.sf.st === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${me.platform ? `<button class="btn pri" data-act="soc-add">${ic('plus')} Nouvelle société</button>` : ''}</div><div id="xres">${socCards()}</div>`;
}
ACT['cli-open'] = el => { S.cid = el.dataset.id; S.co = el.dataset.id; S.ctab = 'overview'; S.page = 'cli'; window.scrollTo(0, 0); render(); };
ACT['cli-back'] = () => { S.page = 'soc'; S.co = 'all'; render(); };
ACT['cli-tab'] = el => { S.ctab = el.dataset.tab; render(); };

/* ---------- formulaire ---------- */
const LBL = { name: 'Raison sociale', type: 'Type', forme: 'Forme juridique', activite: 'Activité', activite2: 'Activité secondaire', mf: 'Matricule fiscal', rne: 'RNE', adresse: 'Adresse', tel: 'Téléphone', email: 'E-mail', contact: 'Interlocuteur', dateEntree: "Date d'entrée", gerant: 'Gérant', dateConstitution: 'Date de constitution', dateDebut: "Début d'activité", dateCloture: 'Clôture', resp: 'Responsable', etatDossier: 'État du dossier', statut: 'Statut', regimeFiscal: 'Régime fiscal', tva: 'Situation TVA', exercice: 'Exercice', cnssRegime: 'Régime CNSS', decl: 'Rythme de déclaration', irpp: 'Catégorie IRPP', tele: 'Télédéclaration', cac: 'Audit légal', expo: 'Exportatrice', emp: 'Employeur', cnss: 'CNSS', infosCompl: 'Informations complémentaires', obs: 'Observations' };
const TXT = ['name', 'type', 'forme', 'activite', 'activite2', 'mf', 'rne', 'adresse', 'tel', 'email', 'contact', 'dateEntree', 'gerant', 'dateConstitution', 'dateDebut', 'dateCloture', 'resp', 'etatDossier', 'statut', 'regimeFiscal', 'tva', 'exercice', 'cnssRegime', 'decl', 'irpp', 'infosCompl', 'obs'], FLAGS = ['tele', 'cac', 'expo', 'emp', 'cnss'];
const BKS = ['BIAT', 'STB', 'BNA', 'Attijari Bank', 'Amen Bank', 'BH Bank', 'UIB', 'UBCI', 'BT', 'ATB', 'Banque Zitouna', 'QNB', 'Wifak Bank', 'La Poste tunisienne'];
const bkcRow = i => `<div class="bkc-r" style="border:1px solid var(--bd);border-radius:12px;padding:10px;margin:8px 0"><div class="grid2"><label class="f"><span>Banque</span><input data-bk="banque" list="bkl"></label><label class="f"><span>Agence</span><input data-bk="agence"></label></div><label class="f"><span>RIB ou IBAN</span><input data-bk="num" placeholder="20 chiffres, ou IBAN"></label><div class="grid2"><label class="f"><span>Devise</span><select data-bk="devise">${DEVISES.map(d => `<option>${d}</option>`).join('')}</select></label><label style="display:flex;gap:10px;align-items:center;margin:8px 0"><input class="cb" type="radio" name="bkmain" data-bk="principal" ${i === 0 ? 'checked' : ''}> <span>Compte principal</span></label></div><button type="button" class="btn sm" data-act="bkc-del">Retirer ce compte</button></div>`;
function socForm(c, isNew) {
  const g = (k, d = '') => c[k] ?? d;
  return `<p class="sub" style="margin-top:0">Le champ marqué * est obligatoire.</p>
  ${sec('Identité')}${F.t('name', 'Raison sociale / nom *', g('name'), 'required')}
  <div class="grid2">${F.s('type', 'Type', ['Personne morale', 'Personne physique'], g('type', 'Personne morale'))}${F.t('forme', 'Forme juridique', g('forme'), 'list="fj"')}</div><datalist id="fj"><option>SARL</option><option>SA</option><option>SUARL</option><option>SNC</option><option>Entreprise individuelle</option><option>Association</option></datalist>
  ${F.t('activite', 'Activité principale', g('activite'))}${F.t('activite2', 'Activité secondaire', g('activite2'))}
  <div class="grid2">${F.t('mf', 'Matricule fiscal', g('mf'))}${F.t('rne', 'RNE', g('rne'))}</div>
  ${sec('Siège et coordonnées')}${F.t('adresse', 'Adresse', g('adresse'))}
  <div class="grid2">${F.t('tel', 'Téléphone', g('tel'))}${F.t('email', 'E-mail', g('email'), 'type="email"')}${F.t('contact', 'Interlocuteur', g('contact'))}${F.d('dateEntree', "Date d'entrée (début du suivi des échéances)", g('dateEntree', todayISO().slice(0, 8) + '01'))}</div>
  ${sec('Dirigeant, dates et suivi du dossier')}
  <div class="grid2">${F.t('gerant', 'Gérant ou représentant légal', g('gerant'))}${F.d('dateConstitution', 'Date de constitution', g('dateConstitution'))}${F.d('dateDebut', "Date de début d'activité", g('dateDebut'))}${F.t('dateCloture', "Date de clôture de l'exercice", g('dateCloture'), 'placeholder="Ex. 31/12"')}${F.t('resp', 'Responsable du dossier', g('resp'))}${F.s('etatDossier', 'État du dossier', ETAT_OPT, g('etatDossier'))}</div>
  ${sec('Régimes')}
  <div class="grid2">${F.s('statut', 'Statut', ['Actif', 'Archivé'], g('statut', 'Actif'))}${F.t('regimeFiscal', 'Régime fiscal', g('regimeFiscal'))}${F.s('tva', 'Situation TVA', TVA_OPT, g('tva', 'À vérifier'))}${F.t('exercice', 'Exercice comptable', g('exercice'), 'placeholder="Ex. Année civile"')}${F.t('cnssRegime', 'Régime CNSS', g('cnssRegime'))}</div>
  ${sec('Profil des déclarations (calcul des échéances)')}
  <div class="grid2">${F.s('decl', 'Rythme de déclaration', ['Mensuelle', 'Trimestrielle'], g('decl', 'Mensuelle'))}<div class="pp-only" ${isPM(c) ? 'hidden' : ''}>${F.s('irpp', 'Catégorie IRPP', IRPP_OPT, g('irpp', 'industriel'))}</div></div>
  <div class="cos"><div class="pm-only" ${isPM(c) ? '' : 'hidden'}>${F.c('tele', 'Télédéclaration / télépaiement (déclaration mensuelle le 20)', g('tele', isNew ? true : false))}${F.c('cac', "Soumise à l'audit légal (IS au 6e mois)", g('cac'))}${F.c('expo', 'Totalement exportatrice (IS au 6e mois)', g('expo'))}</div>${F.c('emp', "Employeur (déclaration annuelle de l'employeur)", g('emp', isNew ? true : false))}${F.c('cnss', 'Déclarations CNSS trimestrielles', g('cnss'))}</div>
  ${sec('Compléments')}${F.a('infosCompl', 'Informations complémentaires', g('infosCompl'))}${F.a('obs', 'Observations', g('obs'))}
  ${isNew ? `${sec('Identification → Banques et RIB <span class="sub">(facultatif)</span>')}<p class="sub" style="margin:0">Ajoutez autant de comptes que nécessaire ; vous pourrez aussi le faire plus tard dans la fiche (Identification). Jamais de mot de passe ni de code.</p><div id="bkc-rows"></div><datalist id="bkl">${BKS.map(b => `<option value="${b}">`).join('')}</datalist><button type="button" class="btn sm" data-act="bkc-add" style="margin-top:6px">${ic('plus')} Ajouter un compte bancaire</button>` : ''}`;
}
ACT['bkc-add'] = () => { const b = $('#bkc-rows'); if (b) { b.insertAdjacentHTML('beforeend', bkcRow(b.children.length)); b.lastElementChild.querySelector('input').focus(); } };
ACT['bkc-del'] = el => { const r = el.closest('.bkc-r'); if (r) r.remove(); };
function socApply(c, d) {
  TXT.forEach(k => { c[k] = typeof d[k] === 'string' ? d[k].trim() : (d[k] ?? ''); }); FLAGS.forEach(k => { c[k] = !!d[k]; });
  const m = String(c.dateCloture || '').match(/^\s*\d{1,2}\s*[\/\-.]\s*(\d{1,2})/); c.clotM = m && +m[1] >= 1 && +m[1] <= 12 ? +m[1] : (c.clotM || 12);
  if (!c.dateEntree) c.dateEntree = todayISO().slice(0, 8) + '01'; if (!c.statut) c.statut = 'Actif'; return c;
}
ACT['soc-add'] = () => {
  if (!me.platform) return toast('Réservé aux administrateurs de plateforme', 1);
  openModal('Nouvelle société', socForm({}, true), {
    onSave: async (d, form) => {
      if (!d.name.trim()) throw new Error('Raison sociale obligatoire');
      const rows = [...form.querySelectorAll('.bkc-r')].map(r => { const g = k => { const e = r.querySelector(`[data-bk="${k}"]`); return e ? (e.type === 'radio' ? e.checked : String(e.value || '').trim()) : ''; }; const n = bkDig(g('num')); return { banque: g('banque'), agence: g('agence'), rib: /^[A-Z]{2}\d{2}/.test(n) ? '' : n, iban: /^[A-Z]{2}\d{2}/.test(n) ? n : '', devise: g('devise') || 'TND', principal: g('principal') }; }).filter(x => x.banque || x.rib || x.iban);
      const fake = { id: '__new__', name: d.name };
      for (const a of rows) { const C = bkCheck(fake, a, null); if (C.err.length) throw new Error(`Compte bancaire (${a.banque || 'sans banque'}) : ${C.err[0][1]}`); if (C.warn.length && !await ask(`Compte ${a.banque || ''} ${bkMask(a.rib || a.iban)} :\n\n${C.warn.join('\n\n')}\n\nEnregistrer quand même ?`, 'Enregistrer')) return false; }
      const c = socApply(touch({ id: uid(), code: nextCode(), hist: [{ d: nowTS(), txt: 'Fiche créée' }] }), d); db.companies.push(c);
      if (rows.length) { c.v343bk = []; const used = {}; rows.forEach(a => { const x = Object.assign({ id: uid(), created: nowTS(), hist: [], intitule: c.name, bic: '', type: 'Compte courant', ouverture: '', cloture: '', statut: 'Actif', obs: '', piece: '' }, a); if (x.principal) { if (used[x.devise]) x.principal = false; used[x.devise] = 1; } c.v343bk.push(x); bkHist(c, x, 'Compte ajouté à la création : ' + bkLab(x)); }); }
      logAct(`Société créée : ${c.name}`, 'création', 'soc'); S.cid = c.id; S.co = c.id; S.ctab = 'overview'; S.page = 'cli'; render(); toast('Société créée');
    }
  });
};
ACT['soc-edit'] = el => {
  const c = co1(el.dataset.id); if (!c) return;
  openModal('Modifier la société', socForm(c, false), {
    ro: !canSoc(c, 'e'), onSave: d => {
      if (!d.name.trim()) throw new Error('Raison sociale obligatoire');
      const old = { ...c }; socApply(c, d); const chg = [...TXT, ...FLAGS].filter(k => String(old[k] ?? '') !== String(c[k] ?? '')).map(k => LBL[k]);
      touch(c); cHist(c, 'Fiche modifiée' + (chg.length ? ' — ' + chg.join(', ') : '')); logAct(`Société modifiée : ${c.name}`, 'modification', 'soc'); render(); toast('Société modifiée');
    }
  });
};
ACT['soc-arch'] = async el => { const c = co1(el.dataset.id); if (!c || !canSoc(c, 'e')) return; const arch = c.statut !== 'Archivé'; if (arch && !await ask(`Archiver « ${c.name} » ? Ses échéances ne seront plus suivies.`, 'Archiver')) return; c.statut = arch ? 'Archivé' : 'Actif'; touch(c); cHist(c, arch ? 'Société archivée' : 'Société réactivée'); logAct(`Société ${arch ? 'archivée' : 'réactivée'} : ${c.name}`, 'modification', 'soc'); render(); };
ACT['soc-del'] = async el => {
  const c = co1(el.dataset.id); if (!c) return; if (!me.platform) return toast('Suppression réservée aux administrateurs de plateforme', 1);
  if (!await ask(`Supprimer la société « ${c.name} » avec ses récaps et dossiers de contrôle ? Cette action ne peut pas être annulée depuis l'application.`, 'Supprimer', 1)) return;
  c.d = true; touch(c); ['ech', 'rec', 'ctl'].forEach(k => db[k].filter(e => e.co === c.id && !e.d).forEach(e => { e.d = true; touch(e); }));
  logAct(`Société supprimée : ${c.name}`, 'suppression', 'soc'); if (S.co === c.id) S.co = 'all'; S.page = 'soc'; $$('.ov').forEach(o => o.close && o.close()); render();
};

/* ---------- associés et capital ---------- */
const capOf = c => c.capital && typeof c.capital === 'object' ? c.capital : {};
const assOf = (c, all) => { const L = Array.isArray(c.associes) ? c.associes : []; return all ? L : L.filter(a => !a.sortie || a.sortie > todayISO()); };
function assPct(c, a) { const k = capOf(c); if (hasNum(k.nbParts) && +k.nbParts > 0 && hasNum(a.parts)) return r3(+a.parts * 100 / +k.nbParts); if (hasNum(k.montant) && +k.montant > 0 && hasNum(a.valeur)) return r3(+a.valeur * 100 / +k.montant); return null; }
function assChecks(c) {
  const k = capOf(c), L = assOf(c), W = [], sp = r3(L.reduce((s, a) => s + (hasNum(a.parts) ? +a.parts : 0), 0)), sv = r3(L.reduce((s, a) => s + (hasNum(a.valeur) ? +a.valeur : 0), 0));
  if (!hasNum(k.montant)) W.push('Capital social non renseigné.');
  if (hasNum(k.montant) && hasNum(k.nbParts) && hasNum(k.valNom) && Math.abs(+k.nbParts * +k.valNom - +k.montant) > 0.001) W.push(`Nombre de parts × valeur nominale (${money(r3(k.nbParts * k.valNom))}) différent du capital (${money(k.montant)}).`);
  if (L.length && hasNum(k.nbParts) && L.some(a => hasNum(a.parts)) && Math.abs(sp - +k.nbParts) > 0.001) W.push(`Parts détenues par les associés actuels (${sp}) différentes du nombre de parts du capital (${k.nbParts}).`);
  if (L.length && hasNum(k.montant) && L.some(a => hasNum(a.valeur)) && Math.abs(sv - +k.montant) > 0.001) W.push(`Valeur des participations (${money(sv)}) différente du capital (${money(k.montant)}).`);
  assOf(c, true).forEach(a => { if (a.sortie && a.entree && a.sortie < a.entree) W.push(`« ${a.nom} » : date de sortie antérieure à la date d'entrée.`); });
  return W;
}
function assCard(c) {
  const k = capOf(c), L = assOf(c), old = assOf(c, true).filter(a => a.sortie && a.sortie <= todayISO()), W = assChecks(c), can = canSoc(c, 'e');
  const row = a => { const p = assPct(c, a); return `<tr><td><b>${esc(a.nom)}</b><div class="sub">${a.type === 'PM' ? 'Personne morale' : 'Personne physique'}${a.ident ? ' · ' + esc(a.ident) : ''}${a.nationalite ? ' · ' + esc(a.nationalite) : ''}</div></td><td class="r">${hasNum(a.parts) ? esc(String(a.parts)) : '—'}</td><td class="r">${hasNum(a.valeur) ? money(a.valeur) : '—'}</td><td class="r">${p == null ? '—' : String(p).replace('.', ',') + ' %'}</td><td>${a.entree ? fmtD(a.entree) : '—'}${a.sortie ? ' → ' + fmtD(a.sortie) : ''}</td><td>${esc(a.qualite || '—')}</td><td>${can ? `<button type="button" class="btn sm" data-act="ass-edit" data-id="${c.id}" data-a="${a.id}">Modifier</button>` : ''}</td></tr>`; };
  return `<div class="card"><h3 style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Associés et capital<span style="flex:1"></span>${can ? `<button type="button" class="btn sm" data-act="cap-edit" data-id="${c.id}">Capital social</button><button type="button" class="btn sm pri" data-act="ass-edit" data-id="${c.id}">${ic('plus')} Associé</button>` : ''}</h3>
  <p><b>Capital social :</b> ${hasNum(k.montant) ? money(k.montant) : NR}${hasNum(k.nbParts) ? ' · ' + k.nbParts + ' parts/actions' : ''}${hasNum(k.valNom) ? ' de ' + money(k.valNom) : ''}${k.dateMaj ? ` <span class="sub">(à jour au ${fmtD(k.dateMaj)})</span>` : ''}</p>
  ${W.length ? `<div class="note"><b>Contrôles de cohérence</b><ul style="margin:4px 0 0 18px">${W.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : (L.length ? '<p class="sub">✓ Participations cohérentes avec le capital.</p>' : '')}
  ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Associé</th><th class="r">Parts / actions</th><th class="r">Valeur</th><th class="r">% du capital</th><th>Entrée / sortie</th><th>Qualité</th><th></th></tr></thead><tbody>${L.map(row).join('')}</tbody></table></div>` : '<div class="empty" style="padding:14px">Aucun associé renseigné.</div>'}
  ${old.length ? `<details style="margin-top:6px"><summary>Anciens associés (${old.length})</summary><div class="tbl-wrap"><table class="tbl"><tbody>${old.map(row).join('')}</tbody></table></div></details>` : ''}
  <p class="sub">Un associé n'est pas automatiquement gérant ni bénéficiaire effectif : ces qualités se renseignent séparément.</p>
  ${(c.assocHist || []).length ? `<details><summary>Historique des changements (${c.assocHist.length})</summary>${c.assocHist.slice().reverse().map(h => `<div class="logline"><small>${esc(fmtDT(h.d))}</small>${esc(h.txt)}</div>`).join('')}</details>` : ''}</div>`;
}
ACT['cap-edit'] = el => {
  const c = co1(el.dataset.id); if (!c) return; const k = capOf(c);
  openModal('Capital social — ' + c.name, `<div class="grid2">${F.n('montant', 'Montant du capital (TND)', hasNum(k.montant) ? k.montant : '')}${F.n('nbParts', "Nombre de parts ou d'actions", hasNum(k.nbParts) ? k.nbParts : '')}${F.n('valNom', 'Valeur nominale (TND)', hasNum(k.valNom) ? k.valNom : '')}${F.d('dateMaj', 'À jour au', k.dateMaj || todayISO())}</div>`, {
    ro: !canSoc(c, 'e'), onSave: f => {
      for (const x of ['montant', 'nbParts', 'valNom']) if (f[x] !== '' && f[x] != null && !(+f[x] >= 0)) throw new Error('Valeur invalide : nombre positif attendu');
      if (f.dateMaj && !dOK(f.dateMaj)) throw new Error('Date invalide');
      const nv = { montant: f.montant === '' ? '' : r3(+f.montant), nbParts: f.nbParts === '' ? '' : +f.nbParts, valNom: f.valNom === '' ? '' : r3(+f.valNom), dateMaj: f.dateMaj || '' };
      (c.assocHist = c.assocHist || []).push({ d: nowTS(), txt: `Capital : ${hasNum(k.montant) ? k.montant : '—'} → ${hasNum(nv.montant) ? nv.montant : '—'} TND ; parts : ${hasNum(k.nbParts) ? k.nbParts : '—'} → ${hasNum(nv.nbParts) ? nv.nbParts : '—'}` });
      c.capital = nv; touch(c); logAct(`Capital social modifié : ${c.name}`, 'modification', 'soc'); render(); toast('Capital enregistré');
    }
  });
};
ACT['ass-edit'] = el => {
  const c = co1(el.dataset.id); if (!c) return; const a = el.dataset.a ? (c.associes || []).find(x => x.id === el.dataset.a) : null, v = a || { type: 'PP' };
  openModal((a ? `Modifier l'associé « ${a.nom} »` : 'Nouvel associé') + ' — ' + c.name, `${F.t('nom', 'Nom ou dénomination *', v.nom || '', 'required')}<div class="grid2">${F.s('type', 'Type de personne', [['PP', 'Personne physique'], ['PM', 'Personne morale']], v.type || 'PP')}${F.t('ident', 'Identifiant (CIN, matricule fiscal, RNE…)', v.ident || '')}${F.t('nationalite', 'Nationalité (si pertinente)', v.nationalite || '')}${F.n('parts', "Nombre de parts ou d'actions", hasNum(v.parts) ? v.parts : '')}${F.n('valeur', 'Valeur des participations (TND)', hasNum(v.valeur) ? v.valeur : '')}${F.d('entree', "Date d'entrée", v.entree || '')}${F.d('sortie', 'Date de sortie', v.sortie || '')}</div>${F.t('qualite', 'Qualité (ex. associé fondateur, cogérant…)', v.qualite || '')}${F.a('obs', 'Observations', v.obs || '')}`, {
    ro: !canSoc(c, 'e'), onSave: f => {
      const nom = String(f.nom || '').trim(); if (!nom) throw new Error('Nom obligatoire');
      for (const x of ['parts', 'valeur']) if (f[x] !== '' && f[x] != null && !(+f[x] >= 0)) throw new Error('Valeur invalide : nombre positif attendu');
      for (const x of ['entree', 'sortie']) if (f[x] && !dOK(f[x])) throw new Error('Date invalide');
      if (f.entree && f.sortie && f.sortie < f.entree) throw new Error("La date de sortie ne peut pas précéder la date d'entrée");
      if (!Array.isArray(c.associes)) c.associes = [];
      const nv = { nom, type: f.type, ident: f.ident.trim(), nationalite: f.nationalite.trim(), parts: f.parts === '' ? '' : +f.parts, valeur: f.valeur === '' ? '' : r3(+f.valeur), entree: f.entree || '', sortie: f.sortie || '', qualite: f.qualite.trim(), obs: f.obs.trim() }; let txt;
      if (a) { const ch = Object.keys(nv).filter(k => String(a[k] ?? '') !== String(nv[k] ?? '')).map(k => `${k} : ${a[k] === '' || a[k] == null ? '—' : a[k]} → ${nv[k] === '' ? '—' : nv[k]}`); if (!ch.length) throw new Error('Aucune modification'); Object.assign(a, nv); txt = `Associé « ${nom} » modifié — ${ch.join(' ; ')}`; }
      else { c.associes.push({ id: uid(), ...nv }); txt = `Associé ajouté : ${nom}${hasNum(nv.parts) ? ` (${nv.parts} parts)` : ''}`; }
      (c.assocHist = c.assocHist || []).push({ d: nowTS(), txt }); touch(c); logAct(txt, a ? 'modification' : 'création', 'soc'); render(); toast(a ? 'Associé modifié (historisé)' : 'Associé ajouté');
    }
  });
};

/* ---------- banques et RIB ---------- */
const DEVISES = ['TND', 'EUR', 'USD', 'GBP', 'CHF', 'Autre'], BKT = ['Compte courant', 'Compte professionnel', 'Compte en devises', "Compte d'épargne", 'Autre'];
const bkDig = s => String(s || '').replace(/[\s.\-]/g, '').toUpperCase();
const bkLast = s => { const d = bkDig(s); return d ? d.slice(-4) : ''; };
const bkMask = s => { const l = bkLast(s); return l ? '•••• •••• ' + l : '—'; };
const bkRibFmt = s => { const d = bkDig(s); return /^\d{20}$/.test(d) ? d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 18) + ' ' + d.slice(18) : d; };
const bkIbanFmt = s => bkDig(s).replace(/(.{4})/g, '$1 ').trim();
function mod97(str) { let r = 0; for (const ch of str) { const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch; for (const d of v) r = (r * 10 + Number(d)) % 97; } return r; }
const IBANLEN = { TN: 24, FR: 27, DE: 22, IT: 27, ES: 24, BE: 16, GB: 22, CH: 21, LU: 20, NL: 18, PT: 25 };
function ibanCheck(iban) { const s = bkDig(iban); if (!s) return null; if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(s)) return 'format IBAN invalide (2 lettres de pays, 2 chiffres de contrôle, puis le numéro)'; const L = IBANLEN[s.slice(0, 2)]; if (L && s.length !== L) return `un IBAN ${s.slice(0, 2)} compte ${L} caractères (saisi : ${s.length})`; return mod97(s.slice(4) + s.slice(0, 4)) === 1 ? null : "clé de contrôle de l'IBAN incorrecte (erreur de saisie probable)"; }
function ribCheck(rib) { const s = bkDig(rib); if (!s) return null; if (!/^\d+$/.test(s)) return 'le RIB ne doit contenir que des chiffres'; if (s.length !== 20) return `un RIB tunisien compte 20 chiffres (saisi : ${s.length})`; return mod97(s + '292359') === 1 ? null : 'clé du RIB incohérente (les 2 derniers chiffres ne correspondent pas : erreur de saisie probable)'; }
const SECRET = /mot\s*de\s*passe|\bmdp\b|\bpin\b|code\s*(pin|secret|de\s*validation|d.acc[eè]s|confidentiel)|identifiant\s*(de\s*connexion|banque|en\s*ligne)|\blogin\b|password/i;
const bkOf = c => (c && Array.isArray(c.v343bk)) ? c.v343bk : [];
const bkSort = L => L.slice().sort((a, b) => (b.statut === 'Actif' && b.principal ? 2 : 0) - (a.statut === 'Actif' && a.principal ? 2 : 0) || (a.statut === 'Actif' ? 0 : 1) - (b.statut === 'Actif' ? 0 : 1) || String(a.banque).localeCompare(String(b.banque)));
const bkNum = a => a.iban ? bkIbanFmt(a.iban) : bkRibFmt(a.rib);
const bkLab = a => (a.banque || 'Banque') + ' ' + bkMask(a.rib || a.iban);
const bkAll = () => { const out = []; live(db.companies).forEach(c => bkOf(c).forEach(a => out.push({ c, a }))); return out; };
function bkCheck(c, v, selfId) {
  const err = [], warn = [], rib = bkDig(v.rib), iban = bkDig(v.iban);
  if (!rib && !iban) err.push(['rib', "Saisissez le RIB ou l'IBAN du compte."]); if (!String(v.banque || '').trim()) err.push(['banque', 'Indiquez la banque.']);
  const r1 = ribCheck(rib); if (r1) warn.push('RIB : ' + r1 + '.'); const i1 = ibanCheck(iban); if (i1) warn.push('IBAN : ' + i1 + '.');
  if (rib && iban && iban.startsWith('TN') && iban.slice(4) !== rib) warn.push("Le RIB et l'IBAN ne désignent pas le même compte (l'IBAN tunisien = TN59 + le RIB).");
  if (v.bic && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bkDig(v.bic))) warn.push('BIC/SWIFT : 8 ou 11 caractères attendus (ex. BIATTNTT).');
  if (SECRET.test(String(v.obs || '') + ' ' + String(v.piece || '') + ' ' + String(v.intitule || ''))) err.push(['obs', "Ne saisissez jamais de mot de passe, code PIN, code de validation ni identifiant de banque en ligne : retirez cette information."]);
  if (v.cloture && v.ouverture && v.cloture < v.ouverture) err.push(['cloture', "La date de clôture précède la date d'ouverture."]);
  const keys = [rib, iban.startsWith('TN') ? iban.slice(4) : iban].filter(Boolean);
  bkAll().forEach(({ c: cc, a }) => { if (a.id === selfId) return; const k2 = [bkDig(a.rib), bkDig(a.iban).startsWith('TN') ? bkDig(a.iban).slice(4) : bkDig(a.iban)].filter(Boolean); if (keys.some(k => k2.includes(k))) warn.push(cc.id === c.id ? `Ce compte existe déjà pour cette société (${bkLab(a)}${a.statut !== 'Actif' ? ', clôturé' : ''}).` : `Ce numéro est déjà enregistré pour « ${cc.name} » (${bkLab(a)}) : vérifiez qu'il ne s'agit pas d'une erreur.`); });
  return { err, warn };
}
function bkHist(c, a, txt) { (a.hist = a.hist || []).push({ d: nowTS(), txt }); cHist(c, 'Banques et RIB : ' + txt); }
function bkMain(c, a) { let n = 0; bkOf(c).forEach(x => { if (x !== a && x.principal && x.statut === 'Actif' && (x.devise || 'TND') === (a.devise || 'TND')) { x.principal = false; bkHist(c, x, `N'est plus le compte principal (${a.devise || 'TND'})`); n++; } }); return n; }
function bkCard(c) {
  const L = bkSort(bkOf(c)), act = L.filter(a => a.statut === 'Actif'), show = S.bkShow || {}, can = canSoc(c, 'e');
  const row = a => `<tr class="${a.statut !== 'Actif' ? 'muted' : ''}"><td><b>${esc(a.banque || '—')}</b>${a.agence ? `<div class="sub">${esc(a.agence)}</div>` : ''}</td><td>${esc(a.intitule || '—')}<div class="sub">${esc(a.type || '')}</div></td><td><code>${esc(show[a.id] ? bkNum(a) : bkMask(a.rib || a.iban))}</code>${a.iban && a.rib && show[a.id] ? `<div class="sub">RIB ${esc(bkRibFmt(a.rib))}</div>` : ''}${a.bic ? `<div class="sub">BIC ${esc(a.bic)}</div>` : ''}</td><td>${esc(a.devise || 'TND')}</td><td>${a.principal && a.statut === 'Actif' ? '<span class="badge b-grn">Principal</span>' : '<span class="badge b-gray">Secondaire</span>'}</td><td>${a.statut === 'Actif' ? '<span class="badge b-grn">Actif</span>' : `<span class="badge b-gray">Clôturé${a.cloture ? ' le ' + fmtD(a.cloture) : ''}</span>`}${a.piece ? `<div class="sub">${esc(a.piece)}</div>` : ''}</td><td><div class="acts" style="margin:0;gap:4px"><button type="button" class="btn sm" data-act="bk-show" data-a="${a.id}">${show[a.id] ? 'Masquer' : 'Afficher'}</button>${can ? `<button type="button" class="btn sm" data-act="bk-edit" data-id="${c.id}" data-a="${a.id}">Modifier</button>${a.statut === 'Actif' && !a.principal ? `<button type="button" class="btn sm" data-act="bk-main" data-id="${c.id}" data-a="${a.id}">Désigner principal</button>` : ''}${a.statut === 'Actif' ? `<button type="button" class="btn sm" data-act="bk-close" data-id="${c.id}" data-a="${a.id}">Clôturer</button>` : ''}` : ''}<button type="button" class="btn sm" data-act="bk-hist" data-id="${c.id}" data-a="${a.id}">Historique</button></div></td></tr>`;
  const mains = {}, W = []; act.filter(a => a.principal).forEach(a => { mains[a.devise || 'TND'] = (mains[a.devise || 'TND'] || 0) + 1; });
  Object.keys(mains).filter(d => mains[d] > 1).forEach(d => W.push(`Plusieurs comptes principaux actifs en ${d} : n'en gardez qu'un.`)); if (act.length && !act.some(a => a.principal)) W.push('Aucun compte principal désigné.');
  return `<div class="card" id="bk-card"><h3 style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Banques et RIB <span class="tag">${act.length}${L.length > act.length ? ' + ' + (L.length - act.length) + ' clôturé(s)' : ''}</span><span style="flex:1"></span>${can ? `<button type="button" class="btn sm pri" data-act="bk-edit" data-id="${c.id}">${ic('plus')} Ajouter un compte bancaire</button>` : ''}</h3>
  <p class="sub">Comptes de la société cliente. Numéros masqués par défaut (seuls les 4 derniers chiffres) : « Afficher » montre le numéro complet sur cet écran seulement. Ils figurent dans l'export complet de la fiche. Ne saisissez jamais de mot de passe, code PIN ni identifiant de banque en ligne.</p>
  ${W.length ? `<div class="note">${W.map(esc).join('<br>')}</div>` : ''}
  ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Banque / agence</th><th>Intitulé</th><th>RIB / IBAN</th><th>Devise</th><th>Rôle</th><th>Statut</th><th></th></tr></thead><tbody>${L.map(row).join('')}</tbody></table></div>` : '<div class="empty" style="padding:14px">Aucun compte bancaire enregistré (facultatif).</div>'}</div>`;
}
ACT['bk-show'] = el => { const s = S.bkShow = S.bkShow || {}; s[el.dataset.a] = !s[el.dataset.a]; render(); };
ACT['bk-edit'] = el => {
  const c = co1(el.dataset.id); if (!c) return; const a = el.dataset.a ? bkOf(c).find(x => x.id === el.dataset.a) : null, isNew = !a;
  const v = a ? { ...a } : { banque: '', agence: '', intitule: c.name || '', rib: '', iban: '', bic: '', devise: 'TND', type: 'Compte courant', principal: !bkOf(c).some(x => x.principal && x.statut === 'Actif'), ouverture: '', cloture: '', statut: 'Actif', obs: '', piece: '' };
  openModal((isNew ? 'Ajouter un compte bancaire' : 'Modifier le compte bancaire') + ' — ' + c.name, `<div class="note">Coordonnées bancaires professionnelles de la société cliente (pas celles du cabinet). Ne saisissez jamais de mot de passe, code PIN, code de validation ni identifiant de banque en ligne.</div>
  ${F.t('banque', 'Banque *', v.banque, 'list="bkl2"')}<datalist id="bkl2">${BKS.map(b => `<option value="${b}">`).join('')}</datalist>${F.t('agence', 'Agence', v.agence)}${F.t('intitule', 'Intitulé du compte', v.intitule)}${F.t('rib', 'Numéro de compte ou RIB (20 chiffres en Tunisie)', v.rib, 'placeholder="Ex. 08 006 0001234567890 12"')}${F.t('iban', 'IBAN (si applicable)', v.iban, 'placeholder="Ex. TN59 0800 6000 …"')}
  <div class="grid2">${F.t('bic', 'BIC / SWIFT (si applicable)', v.bic)}${F.s('devise', 'Devise', DEVISES, v.devise || 'TND')}${F.s('type', 'Type de compte', BKT, v.type || 'Compte courant')}${F.s('statut', 'Statut', ['Actif', 'Clôturé'], v.statut || 'Actif')}${F.d('ouverture', "Date d'ouverture", v.ouverture)}${F.d('cloture', 'Date de clôture', v.cloture)}</div>
  ${F.c('principal', 'Compte principal (un seul compte principal actif par devise)', v.principal)}${F.t('piece', 'Pièce justificative (RIB ou attestation : nom du fichier, chemin ou lien)', v.piece)}${F.a('obs', 'Observations', v.obs)}`, {
    onSave: async f => {
      const C = bkCheck(c, f, a && a.id); if (C.err.length) throw new Error(C.err[0][1]);
      if (C.warn.length && !await ask(C.warn.join('\n\n') + '\n\nEnregistrer quand même ?', 'Enregistrer')) return false;
      if (f.statut === 'Clôturé' && !f.cloture) f.cloture = todayISO(); if (f.statut === 'Clôturé') f.principal = false;
      f.rib = bkDig(f.rib); f.iban = bkDig(f.iban); f.bic = bkDig(f.bic); let x = a; const chg = [];
      if (isNew) { x = { id: uid(), created: nowTS(), hist: [], ...f }; (c.v343bk = c.v343bk || []).push(x); bkHist(c, x, 'Compte ajouté : ' + bkLab(x)); }
      else { ['banque', 'agence', 'intitule', 'devise', 'type', 'statut', 'ouverture', 'cloture', 'piece', 'bic'].forEach(k => { if (String(a[k] || '') !== String(f[k] || '')) chg.push(k); }); if (bkDig(a.rib) !== f.rib) chg.push(`RIB (ancien ${bkMask(a.rib)} → ${bkMask(f.rib)})`); if (bkDig(a.iban) !== f.iban) chg.push(`IBAN (ancien ${bkMask(a.iban)} → ${bkMask(f.iban)})`); if (!!a.principal !== !!f.principal) chg.push(f.principal ? 'désigné principal' : "n'est plus principal"); if (a.obs !== f.obs) chg.push('observations'); Object.assign(a, f); if (chg.length) bkHist(c, a, `Compte modifié (${bkLab(a)}) : ${chg.join(', ')}`); }
      if (x.principal && x.statut === 'Actif') bkMain(c, x); touch(c); logAct(`Banques et RIB : ${isNew ? 'compte ajouté' : 'compte modifié'} (${bkLab(x)}) — ${c.name}`, isNew ? 'création' : 'modification', 'soc'); render(); toast(isNew ? 'Compte ajouté' : 'Compte modifié');
    }
  });
};
ACT['bk-main'] = el => { const c = co1(el.dataset.id), a = c && bkOf(c).find(x => x.id === el.dataset.a); if (!a) return; const n = bkMain(c, a); a.principal = true; bkHist(c, a, `Désigné compte principal (${a.devise || 'TND'})`); touch(c); logAct(`Compte principal : ${bkLab(a)} — ${c.name}`, 'modification', 'soc'); render(); toast('Compte principal : ' + bkLab(a) + (n ? " (l'ancien devient secondaire)" : '')); };
ACT['bk-close'] = el => {
  const c = co1(el.dataset.id), a = c && bkOf(c).find(x => x.id === el.dataset.a); if (!a) return;
  openModal('Clôturer le compte — ' + bkLab(a), `<div class="note">Le compte est conservé (historique, exports) avec le statut « Clôturé ». Rien n'est supprimé.</div>${F.d('cloture', 'Date de clôture *', todayISO())}${F.t('motif', 'Motif', '')}`, { label: 'Clôturer', onSave: f => { if (!f.cloture) throw new Error('Date de clôture obligatoire'); if (a.ouverture && f.cloture < a.ouverture) throw new Error("Antérieure à la date d'ouverture"); const was = a.principal; a.statut = 'Clôturé'; a.cloture = f.cloture; a.principal = false; bkHist(c, a, `Compte clôturé le ${fmtD(f.cloture)}${f.motif ? ' — ' + f.motif : ''}${was ? " (n'est plus principal)" : ''}`); touch(c); logAct(`Compte clôturé : ${bkLab(a)} — ${c.name}`, 'modification', 'soc'); render(); toast('Compte clôturé et conservé'); } });
};
ACT['bk-hist'] = el => { const c = co1(el.dataset.id), a = c && bkOf(c).find(x => x.id === el.dataset.a); if (!a) return; openModal('Historique — ' + bkLab(a), (a.hist || []).slice().reverse().map(h => `<div class="logline"><small>${esc(fmtDT(h.d))}</small>${esc(h.txt)}</div>`).join('') || '<div class="empty">Aucune modification.</div>', { save: false }); };

/* ---------- fiche société ---------- */
const RUB = [['over', "Vue d'ensemble", [['overview', 'Synthèse'], ['ident', 'Identification'], ['hist', 'Historique'], ['infos', 'Fiche complète']]], ['fs', 'Fiscalité & Social', [['decl', 'Déclarations'], ['ctl', 'Contrôles']]]];
const CTAB = Object.fromEntries(RUB.flatMap(r => r[2]));
function bkLine(c) { const A = bkOf(c).filter(a => a.statut === 'Actif'), m = A.find(a => a.principal); return `<p class="sub" style="margin:0 0 10px"><b>Banques et RIB</b> : ${A.length ? A.length + ' compte(s) actif(s)' + (m ? ` · principal : ${esc(bkLab(m))} (${esc(m.devise || 'TND')})` : ' · aucun principal') : 'aucun compte enregistré'} <button type="button" class="link" style="width:auto;margin:0" data-act="cli-tab" data-tab="ident">Voir</button></p>`; }
function cliOverview(c) {
  const t = todayISO(), os = cObls(c).map(o => ({ o, s: oState(o) })), open = os.filter(x => x.s.st !== 'done'), late = open.filter(x => x.s.st === 'late' || x.s.st === 'unpaid'), fut = open.filter(x => x.s.n >= 0), pay = r3(fut.filter(x => x.s.n <= 30).reduce((a, x) => a + amtOf(x.o, x.s), 0)), ctl = db.ctl.filter(d => !d.d && d.co === c.id && ctlOpen(d)).length;
  const steps = [['Société créée', true, ''], ['Informations complétées (forme, matricule fiscal, adresse)', !!(c.forme && c.mf && c.adresse), `<button type="button" class="btn sm" data-act="soc-edit" data-id="${c.id}">Compléter</button>`], ['Régime fiscal et situation TVA renseignés', !!(c.regimeFiscal && c.tva && c.tva !== 'À vérifier'), `<button type="button" class="btn sm" data-act="soc-edit" data-id="${c.id}">Compléter</button>`], ['Banques et RIB enregistrés (facultatif)', bkOf(c).length > 0, `<button type="button" class="btn sm" data-act="bk-edit" data-id="${c.id}">Ajouter</button>`], ['Premier récap saisi', db.rec.some(r => !r.d && r.co === c.id), `<button type="button" class="btn sm" data-act="cli-tab" data-tab="decl">Ouvrir les déclarations</button>`]], n = steps.filter(x => x[1]).length;
  return (n < steps.length && !c.setupHide ? `<div class="card"><h3 style="display:flex;gap:8px;align-items:center">Mise en place du dossier <span class="tag">${n} / ${steps.length}</span><span style="flex:1"></span><button type="button" class="btn sm" data-act="cli-hide" data-id="${c.id}">Masquer</button></h3>${steps.map(x => `<div class="logline" style="display:flex;gap:10px;justify-content:space-between;align-items:center;${x[1] ? 'color:var(--grn)' : ''}"><span>${x[1] ? '✓ ' : ''}${esc(x[0])}</span>${x[1] ? '' : x[2]}</div>`).join('')}</div>` : '') +
    `<div class="kpis"><div class="kpi"><small>À payer sous 30 j</small><b style="font-size:1.3rem">${money(pay)}</b><span>${fut.filter(x => x.s.n <= 30).length} échéance(s)</span></div><div class="kpi red"><small>En retard</small><b>${late.length}</b><span>${late.length ? money(r3(late.reduce((a, x) => a + amtOf(x.o, x.s), 0))) : 'rien en retard'}</span></div><div class="kpi"><small>Obligations ouvertes</small><b>${open.length}</b><span>3 années</span></div><div class="kpi"><small>Contrôles en cours</small><b>${ctl}</b><span>taxation, vérification</span></div></div>` +
    bkLine(c) + `<h3 style="margin:14px 0 8px">Prochaines obligations</h3>` + (open.length ? open.sort((a, b) => a.o.due.localeCompare(b.o.due)).slice(0, 8).map(x => oRow(x.o)).join('') : '<div class="empty card">Aucune obligation ouverte.</div>');
}
ACT['cli-hide'] = el => { const c = co1(el.dataset.id); if (c) { c.setupHide = true; touch(c); logAct('Mise en place masquée : ' + c.name, 'modification', 'soc', true); render(); } };
function cliIdent(c) {
  const D = x => x ? fmtD(x) : '', rl = IRPP_OPT.find(o => o[0] === c.irpp);
  return `<div class="card"><h3 style="display:flex;gap:8px;align-items:center">Identification<span style="flex:1"></span>${canSoc(c, 'e') ? `<button type="button" class="btn sm" data-act="soc-edit" data-id="${c.id}">Modifier</button>` : ''}</h3>${dlist([['Code client', c.code], ['Raison sociale', c.name], ['Type', c.type], ['Forme juridique', c.forme], ['Activité principale', c.activite], ['Activité secondaire', c.activite2], ['Matricule fiscal', c.mf], ['RNE', c.rne], ['#', 'Siège et coordonnées'], ['Adresse', c.adresse], ['Téléphone', c.tel], ['E-mail', c.email], ['Interlocuteur', c.contact], ["Date d'entrée", D(c.dateEntree)], ['#', 'Dirigeant, dates et suivi'], ['Gérant / représentant légal', c.gerant], ['Date de constitution', D(c.dateConstitution)], ["Début d'activité", D(c.dateDebut)], ["Clôture de l'exercice", c.dateCloture], ['Responsable du dossier', c.resp], ['État du dossier', etatDossier(c) + (c.etatDossier ? '' : ' (calculé)')], ['Statut', c.statut || 'Actif'], ['#', 'Régimes et profil des déclarations'], ['Régime fiscal', c.regimeFiscal], ['Situation TVA', c.tva], ['Exercice comptable', c.exercice], ['Régime CNSS', c.cnssRegime], ['Rythme de déclaration', c.decl || 'Mensuelle'], ['Télédéclaration', isPM(c) ? yn(c.tele) : ''], ['Audit légal', isPM(c) ? yn(c.cac) : ''], ['Totalement exportatrice', isPM(c) ? yn(c.expo) : ''], ['Employeur', yn(c.emp)], ['CNSS trimestrielle', yn(c.cnss)], ['Catégorie IRPP', !isPM(c) && rl ? rl[1] : ''], ['#', 'Compléments'], ['Informations complémentaires', c.infosCompl], ['Observations', c.obs]])}</div>` + assCard(c) + bkCard(c);
}
function cliDecl(c) {
  const all = obls([+S.y], [c]), blocks = [['M', 'Déclarations mensuelles'], ['T', 'Déclarations trimestrielles (régime trimestriel)'], ['AP', 'Acomptes provisionnels'], ['CNSS', 'CNSS'], ['IS', "Impôt sur les sociétés"], ['IRPP', 'Impôt sur le revenu'], ['DE', "Déclaration de l'employeur"]];
  return `<div class="acts">${yearSel()}</div>` + blocks.map(([k, t]) => { const os = all.filter(o => o.kind === k); return os.length ? `<h3 style="margin:14px 0 8px">${t}</h3>${os.map(oRow).join('')}` : ''; }).join('') || '<div class="empty card">Aucune obligation.</div>';
}
function cliCtl(c) { const keep = S.co; S.co = c.id; const h = ctlList(); S.co = keep; return `<div class="acts">${perm(c.id, 'ctl', 'c') ? `<button class="btn pri" data-act="ctl-add">${ic('plus')} Nouveau dossier</button>` : ''}</div>${h}`; }
function pCli() {
  const c = co1(S.cid); if (!c || !canSoc(c, 'v')) return pSoc();
  const R = RUB.find(r => r[2].some(s => s[0] === S.ctab)) || RUB[0];
  const body = { overview: cliOverview, ident: cliIdent, decl: cliDecl, ctl: cliCtl, hist: cliHist, infos: cliInfos }[S.ctab] || cliOverview;
  return `<nav class="crumbs"><button type="button" class="link" style="width:auto;margin:0" data-act="cli-back">Sociétés</button> › <b>${esc(c.name)}</b> › ${esc(CTAB[S.ctab] || '')}</nav>
  <h1 style="margin-top:6px">${esc(c.name)} <span class="tag">${esc(c.code || '')}</span></h1><p class="sub" style="margin:2px 0 10px">${esc(c.forme || c.type || '')}${c.activite ? ' · ' + esc(c.activite) : ''}</p>
  <div class="badges"><span class="badge b-blu">${esc(c.type || 'Personne morale')}</span><span class="badge b-gray">${c.decl === 'Trimestrielle' ? 'Déclaration trimestrielle' : 'Déclaration mensuelle'}</span><span class="badge ${etatDossier(c) === 'En retard' ? 'b-red' : etatDossier(c) === 'À jour' ? 'b-grn' : 'b-gold'}">${esc(etatDossier(c))}</span>${c.statut === 'Archivé' ? '<span class="badge b-gray">Archivée</span>' : ''}</div>
  <div class="acts"><button class="btn sm" data-act="cli-back">${ic('back')} Sociétés</button>${permAny('rap', 'v') ? `<button class="btn sm" data-act="fiche-open" data-id="${c.id}">${ic('dl')} Exporter la fiche</button>` : ''}${canSoc(c, 'e') ? `<button class="btn sm" data-act="soc-edit" data-id="${c.id}">Modifier</button><button class="btn sm" data-act="soc-arch" data-id="${c.id}">${c.statut === 'Archivé' ? 'Réactiver' : 'Archiver'}</button>` : ''}${me.platform ? `<button class="btn sm dng" data-act="soc-del" data-id="${c.id}">${ic('trash')} Supprimer</button>` : ''}</div>
  <div class="chips">${RUB.map(r => `<button class="chip ${r === R ? 'on' : ''}" data-act="cli-tab" data-tab="${r[2][0][0]}">${r[1]}</button>`).join('')}</div>
  <div class="dtabs">${R[2].map(s => `<button class="chip ${s[0] === S.ctab ? 'on' : ''}" data-act="cli-tab" data-tab="${s[0]}">${s[1]}</button>`).join('')}</div>${body(c)}`;
}
function cliHist(c) { const h = (c.hist || []).slice().reverse(); return `<div class="card"><h3>Historique</h3>${h.length ? h.map(x => `<div class="logline"><small>${esc(fmtDT(x.d))}</small>${esc(x.txt)}</div>`).join('') : '<div class="empty">Aucun événement.</div>'}</div>`; }
function cliInfos(c) {
  const secs = ficheData(c, 'full', 'masque');
  return `<div class="acts">${permAny('rap', 'v') ? `<button class="btn pri" data-act="fiche-open" data-id="${c.id}">${ic('dl')} Exporter la fiche client</button>` : ''}</div><p class="sub">Aperçu de la fiche complète, telle qu'elle sera exportée (numéros bancaires masqués ici).</p>` + secs.map(s => `<div class="card"><h3>${esc(s.h)}</h3>${s.kind === 'kv' ? dlist(s.rows) : `<div class="tbl-wrap"><table class="tbl"><thead><tr>${s.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(s.rows.length ? s.rows : [s.head.map((_, i) => i ? '' : (s.empty || NR))]).map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}</div>`).join('');
}

/* ---------- export de la fiche client ---------- */
const FICHE = { admin: 'Fiche administrative', fisc: 'Fiche fiscale et sociale', full: 'Fiche complète' };
const vNR = v => v == null || String(v).trim() === '' ? NR : String(v);
function ficheData(c, kind, ribMode) {
  const S2 = [], kv = (h, rows) => S2.push({ h, kind: 'kv', rows: rows.map(r => [r[0], vNR(r[1])]) }), tb = (h, head, rows, al, empty) => S2.push({ h, kind: 'tb', head, rows, al, empty }), D = x => x ? fmtD(x) : '';
  if (kind !== 'fisc') {
    kv('Identité de la société', [['Raison sociale', c.name], ['Forme juridique', c.forme], ['Matricule fiscal', c.mf], ['RNE', c.rne], ['Activité principale', c.activite], ['Activité secondaire', c.activite2], ['Date de constitution', D(c.dateConstitution)], ["Date de début d'activité", D(c.dateDebut)]]);
    kv('Adresse et coordonnées', [['Adresse', c.adresse], ['Téléphone', c.tel], ['E-mail', c.email], ['Interlocuteur', c.contact]]);
    kv('Gérant ou représentant légal', [['Gérant / représentant', c.gerant]]);
    const k = capOf(c), L = assOf(c);
    kv('Capital social', [['Montant', hasNum(k.montant) ? money(k.montant) : ''], ['Nombre de parts / actions', hasNum(k.nbParts) ? String(k.nbParts) : ''], ['Valeur nominale', hasNum(k.valNom) ? money(k.valNom) : ''], ['À jour au', D(k.dateMaj)]]);
    tb('Associés', ['Associé', 'Type', 'Parts / actions', 'Valeur', '% du capital', 'Entrée', 'Qualité'], L.map(a => { const p = assPct(c, a); return [a.nom, a.type === 'PM' ? 'Personne morale' : 'Personne physique', hasNum(a.parts) ? String(a.parts) : '—', hasNum(a.valeur) ? money(a.valeur) : '—', p == null ? '—' : String(p).replace('.', ',') + ' %', a.entree ? fmtD(a.entree) : '—', a.qualite || '—']; }), ['l', 'l', 'r', 'r', 'r', 'l', 'l'], 'Aucun associé renseigné.');
    const BL = bkSort(bkOf(c)), nm = a => ribMode === 'masque' ? bkMask(a.rib || a.iban) : bkNum(a) + (a.iban && a.rib ? ` (RIB ${bkRibFmt(a.rib)})` : '');
    tb('Coordonnées bancaires — Banques et RIB' + (ribMode === 'masque' ? ' (numéros partiellement masqués)' : ''), ['Banque', 'Agence', 'Intitulé du compte', 'RIB / IBAN', 'Devise', 'Principal', 'Statut'], BL.map(a => [a.banque || NR, a.agence || '—', a.intitule || '—', nm(a), a.devise || 'TND', a.principal && a.statut === 'Actif' ? 'Oui' : 'Non', a.statut === 'Actif' ? 'Actif' : 'Clôturé' + (a.cloture ? ' le ' + fmtD(a.cloture) : '')]), ['l', 'l', 'l', 'l', 'l', 'l', 'l'], 'Aucun compte bancaire enregistré.');
  }
  if (kind !== 'admin') {
    const rl = IRPP_OPT.find(o => o[0] === c.irpp);
    kv('Informations fiscales', [['Régime fiscal', c.regimeFiscal], ['Situation TVA', c.tva], ['Exercice comptable', c.exercice], ["Date de clôture de l'exercice", c.dateCloture]]);
    kv('Informations sociales', [['Régime CNSS', c.cnssRegime]]);
    kv('Profil des déclarations', [['Type de personne', c.type], ['Rythme de déclaration', c.decl || 'Mensuelle'], ['Télédéclaration / télépaiement', isPM(c) ? yn(c.tele) : ''], ['Audit légal (IS au 6e mois)', isPM(c) ? yn(c.cac) : ''], ['Totalement exportatrice', isPM(c) ? yn(c.expo) : ''], ['Employeur', yn(c.emp)], ['CNSS trimestrielle', yn(c.cnss)], ['Catégorie IRPP', !isPM(c) && rl ? rl[1] : '']]);
    const t0 = todayISO(), E = cObls(c).map(o => ({ o, s: oState(o) })).filter(x => (x.o.due >= t0 && x.o.due <= addDays(t0, 365)) || (x.s.st !== 'done' && x.o.due < t0 && x.s.st !== 'ok')).sort((a, b) => a.o.due.localeCompare(b.o.due));
    tb('Échéances (12 prochains mois et situations en cours)', ['Obligation', 'Date limite', 'Situation', 'Montant'], E.map(x => [x.o.label, fmtD(x.o.due), ST_LAB[x.s.st][0], amtOf(x.o, x.s) ? money(amtOf(x.o, x.s)) : '—']), ['l', 'l', 'l', 'r'], 'Aucune échéance.');
  }
  if (kind === 'full') kv('Informations complémentaires et observations', [['Informations complémentaires', c.infosCompl], ['Observations', c.obs]]);
  return S2;
}
function ficheDoc(c, kind, mode, ribMode) {
  const sections = ficheData(c, kind, ribMode).map(s => s.kind === 'kv' ? { title: s.h, cols: [{ h: 'Rubrique', k: 'a', w: 35 }, { h: 'Information', k: 'b', w: 65 }], rows: s.rows.map(r => ({ a: r[0], b: r[1] })) } : { title: s.h, cols: s.head.map((h, i) => ({ h, k: 'c' + i, w: 100 / s.head.length, al: s.al[i] })), rows: (s.rows.length ? s.rows : [s.head.map((_, i) => i ? '' : (s.empty || NR))]).map(r => Object.fromEntries(r.map((v, i) => ['c' + i, v]))) });
  return { title: FICHE[kind] + ' — ' + c.name, subtitle: c.name + (c.mf ? ' — MF ' + c.mf : ''), intro: `${FICHE[kind]} de ${c.name}, établie le ${fmtD(todayISO())}. Les informations absentes sont indiquées « ${NR} » : rien n'est complété ou déduit.`, filename: 'Fiche_' + ({ admin: 'administrative', fisc: 'fiscale_sociale', full: 'complete' })[kind] + '_' + String(c.code || c.name).replace(/[^A-Za-z0-9À-ÿ-]+/g, '_'), compact: true, portrait: true, fiche: true, mode, sig: { SGC: 'Hamza AZAEIZ, Sterling Gate Consulting (SGC)', MISSION: 'Hamza AZAEIZ, expert-comptable stagiaire' }, sections };
}
ACT['fiche-open'] = el => {
  const c = co1(el.dataset.id); if (!c) return; if (!permAny('rap', 'v')) return toast("Droit d'export manquant", 1);
  const m0 = exportMode({});
  openModal('Exporter la fiche client — ' + c.name, `<p class="sub" style="margin-top:0">La fiche reprend uniquement les informations saisies dans l'application ; les champs vides sont indiqués « ${NR} ».</p><div class="grid2">${F.s('kind', 'Contenu', Object.entries(FICHE), 'full')}${F.s('fmt', 'Format', [['docx', 'Word (.docx)'], ['pdf', 'PDF'], ['xlsx', 'Excel (.xlsx)']], 'docx')}</div>${F.s('mode', 'Présentation', [['SGC', 'SGC — avec logo et mention Sterling Gate Consulting'], ['MISSION', 'MISSION — sans logo ni nom SGC']], m0)}<div class="note">Confidentialité : la fiche administrative et la fiche complète contiennent les coordonnées bancaires de la société (section « Coordonnées bancaires — Banques et RIB »). Ne transmettez le fichier qu'à des destinataires autorisés.</div>${F.s('ribMode', 'Coordonnées bancaires dans le fichier', [['complet', 'Numéros complets (RIB / IBAN)'], ['masque', 'Numéros partiellement masqués (4 derniers chiffres)']], 'complet')}`, {
    label: 'Générer le fichier', onSave: async f => { try { localStorage.setItem('sgcfisc.mode', f.mode); } catch (e) { } await exportDoc(f.fmt, ficheDoc(c, f.kind, f.mode, f.ribMode)); cHist(c, `${FICHE[f.kind]} exportée (${f.fmt.toUpperCase()}, ${f.mode})`); touch(c); }
  });
};

/* codes clients : attribue un code aux sociétés qui n'en ont pas (anciennes données) */
function fixCodes() {
  const miss = db.companies.filter(c => !c.d && !String(c.code || '').trim()); if (!miss.length) return;
  miss.sort((a, b) => String(a.created || a.u || '').localeCompare(String(b.created || b.u || ''))).forEach(c => { c.code = nextCode(); touch(c); });
  logAct('Codes clients attribués : ' + miss.map(c => c.name).join(', '), 'modification', 'soc', true);
}
/* formulaire société : champs selon le type de personne */
document.addEventListener('change', e => {
  const el = e.target; if (!el.matches || !el.matches('select[name=type]')) return; const f = el.closest('form'); if (!f) return;
  const pm = el.value !== 'Personne physique';
  f.querySelectorAll('.pm-only').forEach(x => { x.hidden = !pm; }); f.querySelectorAll('.pp-only').forEach(x => { x.hidden = pm; });
});
