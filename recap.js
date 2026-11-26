'use strict';
/* Récaps (mensuel, trimestriel, AP, IS, autres), versions rectificatives, import/export Excel au format des modèles SGC */

/* ---------- calculs ---------- */
function calcRec(v) {
  const n = k => num(v[k]);
  const rs = r3(n('sal_m') + n('sal_css') + n('h10_b') * .10 + n('h3_b') * .03 + n('m1_b') * .01 + n('m05_b') * .005 + n('m15_b') * .015);
  const tfp = r3(n('tfp_b') * .01), fop = r3(n('tfp_b') * .01), ded = r3(n('tvaL_m') + n('tvaI_m') + n('tvaV_m'));
  const net = r3(n('tva_m') - ded - n('report')), tvaPay = Math.max(0, net), reportNext = r3(Math.max(0, n('report') + ded - n('tva_m') - n('rev')));
  const fodec = r3(n('fodec_b') * .01), tcl2 = r3((n('tva_b') + n('tva_m')) * .002), tcl1 = r3(n('tcl1_b') * .001);
  const total = r3(rs + tfp + fop + tvaPay + n('timbres') + tcl2 + tcl1 + fodec + n('pen'));
  return { rs, tfp, fop, ded, tvaPay, reportNext, fodec, tcl2, tcl1, total, h10: r3(n('h10_b') * .10), h3: r3(n('h3_b') * .03), m1: r3(n('m1_b') * .01), m05: r3(n('m05_b') * .005), m15: r3(n('m15_b') * .015) };
}
function calcAP(v) { const montant = r3(num(v.base) * (v.taux === '' || v.taux == null ? 30 : num(v.taux)) / 100), reste = r3(num(v.deduire) - montant); return { montant, reste, payer: Math.max(0, -reste), credit: Math.max(0, reste) }; }
function calcIS(v) {
  const taux = v.taux === '' || v.taux == null ? 20 : num(v.taux), du = r3(num(v.resFiscal) * taux / 100), imputes = r3(num(v.apPaye) + num(v.report) + num(v.rs) + num(v.avirpp)), reste = r3(imputes - du), css = r3(num(v.resFiscal) * .03);
  return { du, imputes, reste, css, payer: r3(Math.max(0, -reste) + css), credit: Math.max(0, reste) };
}
function recTotal(kind, vals) {
  vals = vals || {};
  if (kind === 'M' || kind === 'T') return calcRec(vals).total;
  if (kind === 'AP') return calcAP(vals).payer;
  if (kind === 'IS') return calcIS(vals).payer;
  return num(vals.montant);
}
const KIND_FULL = { M: 'mensuel', T: 'trimestriel', AP: 'acompte provisionnel', IS: 'IS', DE: 'employeur', CNSS: 'CNSS', IRPP: 'IRPP' };

/* ---------- champs du formulaire récap ---------- */
const RC_GROUPS = [
  ['Retenues à la source', [['sal_b', 'RS salaires — base'], ['sal_m', 'RS salaires — montant'], ['sal_css', 'CSS 1 %'], ['h10_b', 'Honoraires 10 % — base'], ['h3_b', 'Honoraires 3 % — base'], ['m1_b', 'Marchés 1 % — base'], ['m05_b', 'Marchés 0,5 % — base'], ['m15_b', 'Marchés 1,5 % — base']]],
  ['TFP et FOPROLOS', [['tfp_b', 'Base (TFP 1 % et FOPROLOS 1 %)']]],
  ['TVA', [['tva_b', 'TVA collectée — base'], ['tva_m', 'TVA collectée — montant'], ['tvaL_b', 'Déductible local — base'], ['tvaL_m', 'Déductible local — TVA'], ['tvaI_b', 'Déductible import — base'], ['tvaI_m', 'Déductible import — TVA'], ['tvaV_b', 'Déductible investissement — base'], ['tvaV_m', 'Déductible investissement — TVA'], ['report', 'Ancien report'], ['rev', 'Reversement TVA'], ['exp_b', 'Vente export — base'], ['exp_m', 'Vente export — montant']]],
  ['Autres taxes', [['fodec_b', 'FODEC — base (1 %)'], ['timbres', 'Timbres'], ['tcl1_b', 'TCL CA local 0,1 % — base'], ['pen', 'Pénalités']]]
];
const RC_KEYS = RC_GROUPS.flatMap(g => g[1].map(f => f[0]));
const nf = (name, label, val, a = '') => `<label class="f"><span>${label}</span><input type="number" step="0.001" inputmode="decimal" name="${name}" data-rec value="${esc(val ?? '')}" ${a}></label>`;
function recSummaryHTML(kind, v) {
  const row = (l, x, b) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--bd)${b ? ';font-weight:700' : ''}"><span>${l}</span><span>${money(x)}</span></div>`;
  if (kind === 'M' || kind === 'T') { const c = calcRec(v); return row('Retenues à la source (total)', c.rs) + row('TFP', c.tfp) + row('FOPROLOS', c.fop) + row('TVA à payer', c.tvaPay) + row('Report TVA suivant', c.reportNext) + row('FODEC, timbres, TCL, pénalités', r3(c.fodec + c.tcl2 + c.tcl1 + num(v.timbres) + num(v.pen))) + row('NET À PAYER', c.total, 1); }
  if (kind === 'AP') { const c = calcAP(v); return row('Montant de l\'acompte', c.montant) + row('Reste (à déduire − montant)', c.reste) + row('À PAYER', c.payer, 1); }
  if (kind === 'IS') { const c = calcIS(v); return row('IS normalement dû', c.du) + row('Imputations (AP, report, RS, AV/IRPP)', c.imputes) + row('Reste (report)', c.reste) + row('CSS à payer', c.css) + row('TOTAL À PAYER', c.payer, 1); }
  return row('MONTANT À PAYER', num(v.montant), 1);
}
function recFields(kind, v, o) {
  if (kind === 'M' || kind === 'T') return RC_GROUPS.map(([t, fs], i) => `<details open style="margin-bottom:8px"><summary style="cursor:pointer;font-family:var(--serif);font-weight:700;padding:6px 0">${t}</summary><div class="grid2">${fs.map(([k, l]) => nf(k, l, v[k], k === 'tva_m' ? `data-auto="${(v.tva_m === '' || v.tva_m == null || Math.abs(num(v.tva_m) - r3(num(v.tva_b) * .19)) < .0005) ? 1 : 0}"` : '')).join('')}</div></details>`).join('');
  if (kind === 'AP') return `<div class="grid2">${nf('base', 'Base de l\'acompte (IS dû N-1)', v.base)}${nf('taux', 'Taux (%)', v.taux ?? 30)}${nf('deduire', 'À déduire (report précédent)', v.deduire)}</div>`;
  if (kind === 'IS') return `<div class="grid2">${nf('stock1', 'Stock N-1', v.stock1)}${nf('stock2', 'Stock N', v.stock2)}${nf('achat', 'Total achats', v.achat)}${nf('venteHT', 'Total ventes HT', v.venteHT)}${nf('resComptable', 'Résultat comptable (bénéfice)', v.resComptable)}${nf('resFiscal', 'Résultat fiscal (bénéfice)', v.resFiscal)}${nf('taux', 'Taux d\'IS (%)', v.taux ?? 20)}${nf('apPaye', 'Acomptes provisionnels payés', v.apPaye)}${nf('report', 'Ancien report', v.report)}${nf('rs', 'Retenues à la source', v.rs)}${nf('avirpp', 'AV / IRPP', v.avirpp)}</div>`;
  return `<div class="grid2">${nf('montant', 'Montant à payer (TND)', v.montant)}</div>`;
}
const readVals = (kind, d) => { const keys = kind === 'M' || kind === 'T' ? RC_KEYS : kind === 'AP' ? ['base', 'taux', 'deduire'] : kind === 'IS' ? ['stock1', 'stock2', 'achat', 'venteHT', 'resComptable', 'resFiscal', 'taux', 'apPaye', 'report', 'rs', 'avirpp'] : ['montant']; const o = {}; keys.forEach(k => { o[k] = d[k] === '' || d[k] == null ? '' : +d[k]; }); return o; };
document.addEventListener('input', e => {
  const f = e.target.closest && e.target.closest('form[data-recform]'); if (!f || !e.target.hasAttribute('data-rec')) return;
  if (e.target.name === 'tva_m') e.target.dataset.auto = '0';
  const m = f.elements.tva_m;
  if (e.target.name === 'tva_b' && m && m.dataset.auto === '1') m.value = e.target.value === '' ? '' : String(r3(num(e.target.value) * .19));
  const kind = f.dataset.recform, d = formData(f), v = readVals(kind, d); const box = $('#rc-sum', f); if (box) box.innerHTML = recSummaryHTML(kind, v);
  const ec = $('#rc-ecart', f); if (ec) { const prev = +ec.dataset.prev, t = recTotal(kind, v); ec.innerHTML = `Écart avec la version précédente : <b>${money(r3(t - prev))}</b> ${t - prev > 0 ? '(complément à payer)' : t - prev < 0 ? '(crédit)' : ''}`; }
});

/* ---------- accès aux obligations ---------- */
const coById = id => db.companies.find(c => c.id === id);
function oFromKey(key) {
  const [co, kind, y, p] = key.split('|'), c = coById(co), rec = db.rec.find(r => r.id === key && !r.d);
  return { key, co, kind, y: +y, p: +p, due: oDue(c, kind, +y, +p), label: oLabel(kind, +y, +p), rec };
}
function prefillVals(o) { // valeurs de départ pour une première saisie
  const v = {};
  if (o.kind === 'M' || o.kind === 'T') { const pk = o.kind === 'M' ? (o.p === 1 ? recKey(o.co, 'M', o.y - 1, 12) : recKey(o.co, 'M', o.y, o.p - 1)) : (o.p === 1 ? recKey(o.co, 'T', o.y - 1, 4) : recKey(o.co, 'T', o.y, o.p - 1)), pr = db.rec.find(r => r.id === pk && !r.d), lv = lastV(pr); if (lv) { const rn = calcRec(lv.vals).reportNext; if (rn) v.report = rn; } }
  if (o.kind === 'AP' && o.p > 1) { const pr = db.rec.find(r => r.id === recKey(o.co, 'AP', o.y, o.p - 1) && !r.d), lv = lastV(pr); if (lv) { v.base = lv.vals.base; v.taux = lv.vals.taux; v.deduire = calcAP(lv.vals).credit || ''; } }
  if (o.kind === 'IS') { let s = 0; for (let p = 1; p <= 3; p++) { const r = db.rec.find(x => x.id === recKey(o.co, 'AP', o.y, p) && !x.d); if (r) s += r.versions.reduce((a, z) => a + num(z.paid), 0); } if (s) v.apPaye = r3(s); const a1 = db.rec.find(x => x.id === recKey(o.co, 'AP', o.y + 1, 1) && !x.d); }
  return v;
}

/* ---------- fenêtre d'une obligation (initiale + rectificatives) ---------- */
function openObl(key, vi) {
  const o = oFromKey(key), c = coById(o.co), r = o.rec, vs = r ? r.versions : [], can = perm(o.co, 'ech', vs.length ? 'e' : 'c');
  const isNewRect = vi >= vs.length && vs.length > 0, isNew0 = vs.length === 0, cur = vs[vi] || {}, prev = vi > 0 ? vs[Math.min(vi, vs.length) - 1] : null;
  const vals = isNew0 ? prefillVals(o) : isNewRect ? { ...vs[vs.length - 1].vals } : (cur.vals || {});
  const kind = o.kind, st = oState(o), prevTotal = prev ? recTotal(kind, prev.vals) : 0;
  const tabs = vs.length ? `<div class="seg" style="margin-bottom:12px;flex-wrap:wrap">${vs.map((_, i) => `<button type="button" class="${i === vi ? 'on' : ''}" data-act="obl-tab" data-key="${esc(key)}" data-vi="${i}">${i ? 'Rectificative ' + i : 'Initiale'}</button>`).join('')}${isNewRect ? `<button type="button" class="on">+ Nouvelle rectificative</button>` : ''}</div>` : '';
  const head = `<p class="sub" style="margin:0 0 8px">${esc(c.name)} · échéance <b>${fmtD(o.due)}</b> · ${esc(ST_LAB[st.st][0])}</p>`;
  const n = isNewRect ? vs.length : vi, meta = isNewRect ? {} : cur;
  const body = tabs + head + (n > 0 ? `<div class="note">Rectificative n° ${n} : saisissez les montants <b>corrigés</b> de la déclaration complète. L'écart par rapport à la version précédente est le complément à payer.</div>` : '') +
    recFields(kind, vals, o) + `<h3 style="margin:12px 0 6px">Résultat</h3><div id="rc-sum">${recSummaryHTML(kind, vals)}</div>${n > 0 ? `<p id="rc-ecart" data-prev="${prevTotal}" class="sub" style="margin:8px 0">Écart avec la version précédente : <b>${money(r3(recTotal(kind, vals) - prevTotal))}</b></p>` : ''}
    <h3 style="margin:12px 0 6px">Dépôt et paiement</h3><div class="grid2">${F.d('depDate', 'Date de dépôt', meta.depDate || '')}${F.t('quit', 'Quittance n°', meta.quit || '')}${F.d('quitDate', 'Date de la quittance', meta.quitDate || '')}${F.t('recette', 'Recette des finances', meta.recette || '')}${nf('paid', 'Montant payé (TND)', meta.paid ?? '')}${F.d('paidDate', 'Date de paiement', meta.paidDate || '')}</div>${F.a('note', 'Note', meta.note || '')}`;
  const delOK = vs.length && !isNewRect && perm(o.co, 'ech', 'd') && vi === vs.length - 1;
  const ov = openModal(`${o.label}`, body, {
    ro: !can, foot: (vs.length && vs[0].depDate && !isNewRect && can ? `<button class="btn" type="button" data-act="obl-rect" data-key="${esc(key)}">${ic('plus')} Rectificative</button>` : '') + (delOK ? `<button class="btn dng" type="button" data-act="obl-delv" data-key="${esc(key)}" style="margin-right:auto">${ic('trash')}</button>` : '') + (vs.length ? `<button class="btn" type="button" data-act="obl-fill" data-key="${esc(key)}" data-vi="${vi}" title="Marquer payé le montant total">Marquer payé</button>` : ''),
    onSave: d => {
      if (!perm(o.co, 'ech', vs.length ? 'e' : 'c')) throw new Error('Droit manquant');
      if (n > 0 && !(vs[0] && vs[0].depDate)) throw new Error("Une rectificative suppose une déclaration initiale déposée : enregistrez d'abord son dépôt");
      if (d.quit && !d.quitDate && !d.depDate) throw new Error('Indiquez la date de dépôt ou de la quittance');
      const nv = { id: cur.id || uid(), n, vals: readVals(kind, d), depDate: d.depDate, quit: d.quit.trim(), quitDate: d.quitDate, recette: d.recette.trim(), paid: d.paid === '' ? '' : +d.paid, paidDate: d.paidDate, note: d.note };
      if (nv.paid !== '' && !nv.paidDate) nv.paidDate = nv.quitDate || nv.depDate || todayISO();
      let rec = r; if (!rec) { rec = { id: key, co: o.co, kind, y: o.y, p: o.p, versions: [] }; db.rec.push(rec); } if (rec.d) rec.d = false;
      if (isNewRect || isNew0) rec.versions.push(nv); else rec.versions[vi] = nv; touch(rec);
      logAct(`${n ? 'Rectificative ' + n : 'Récap'} : ${o.label} (${c.name}) — ${money(recTotal(kind, nv.vals))}`, n ? 'création' : 'modification', 'ech'); render();
    }
  });
  $('form', ov).dataset.recform = kind;
}
ACT['obl-open'] = el => openObl(el.dataset.key, 0);
ACT['obl-tab'] = el => { $$('.ov').forEach(o => o.close && o.close()); openObl(el.dataset.key, +el.dataset.vi); };
ACT['obl-rect'] = el => { const r = db.rec.find(x => x.id === el.dataset.key); $$('.ov').forEach(o => o.close && o.close()); openObl(el.dataset.key, r.versions.length); };
ACT['obl-fill'] = el => { const f = el.closest('form'), d = formData(f), t = recTotal(f.dataset.recform, readVals(f.dataset.recform, d)); f.elements.paid.value = String(t); if (!f.elements.depDate.value) f.elements.depDate.value = todayISO(); if (!f.elements.paidDate.value) f.elements.paidDate.value = todayISO(); };
ACT['obl-delv'] = async el => {
  const r = db.rec.find(x => x.id === el.dataset.key); if (!r || !await ask('Supprimer cette version ?', 'Supprimer', 1)) return;
  r.versions.pop(); if (!r.versions.length) r.d = true; touch(r); logAct(`Version supprimée : ${oLabel(r.kind, r.y, r.p)}`, 'suppression', 'ech'); $$('.ov').forEach(o => o.close && o.close()); render();
};

/* ---------- pages ---------- */
const pickCo = () => S.co !== 'all' ? coById(S.co) : null;
function companyPicker(kind) {
  const cos = scopeCos().filter(c => perm(c.id, 'ech', 'v')); if (!cos.length) return '<div class="empty card">Aucune société. Créez-en une dans Plus → Sociétés.</div>';
  const y = S.y, t = todayISO();
  return `<p class="lead">Choisissez une société.</p>` + cos.map(c => { const os = obls([y], [c]).filter(o => kind.includes(o.kind)), sts = os.map(oState), late = sts.filter(s => s.st === 'late' || s.st === 'unpaid').length, done = sts.filter(s => s.filed).length; return `<div class="row ${late ? 's-late' : 's-ok'}" data-act="pick-co" data-id="${c.id}"><div><div class="t">${esc(c.name)}</div><small>${esc(c.type || '')} · ${c.decl === 'Trimestrielle' ? 'déclaration trimestrielle' : 'déclaration mensuelle'}</small></div><div class="amt">${done}/${os.length}</div><div class="meta">${late ? `<span class="badge b-red">${late} en retard</span>` : '<span class="badge b-grn">À jour</span>'}<span class="sub">${done} déposée(s) en ${y}</span></div></div>`; }).join('');
}
ACT['pick-co'] = el => { S.co = el.dataset.id; render(); };
const yearSel = () => { const y0 = new Date().getFullYear(); return `<select data-bind="y" style="max-width:130px;width:auto;background:var(--card);border:1px solid var(--bd2);border-radius:14px;padding:12px 14px">${[y0 - 2, y0 - 1, y0, y0 + 1].map(y => `<option ${+S.y === y ? 'selected' : ''}>${y}</option>`).join('')}</select>`; };
function oRow(o) {
  const s = oState(o), lab = ST_LAB[s.st], short = o.kind === 'M' ? MOIS[o.p - 1] : o.kind === 'T' || o.kind === 'CNSS' ? QTR[o.p - 1] : o.label;
  const amt = s.due ? money(s.due) : '';
  return `<div class="row ${ST_ROW[s.st]}" data-act="obl-open" data-key="${esc(o.key)}"><div><div class="t" style="text-transform:${o.kind === 'M' ? 'capitalize' : 'none'}">${esc(short)}</div><small>échéance ${fmtD(o.due)}${s.rects ? ` · <b>${s.rects} rectificative(s)</b>` : ''}${o.rec && lastV(o.rec).quit ? ' · quittance ' + esc(lastV(o.rec).quit) : ''}</small></div><div class="amt">${amt}</div><div class="meta"><span class="badge ${lab[1]}">${lab[0]}</span>${s.st === 'late' || s.st === 'soon' || s.st === 'ok' ? `<span class="${s.n < 0 ? 'late-t' : s.n <= 7 ? 'soon-t' : 'sub'}">${rel(o.due)}</span>` : s.solde ? `<span class="sub">reste ${money(s.solde)}</span>` : ''}</div></div>`;
}
function periodPage(title, eb, lead, kinds, sections) {
  const c = pickCo(); const head2 = head(eb, title, lead);
  if (!c) return head2 + `<div class="acts">${yearSel()}</div>` + companyPicker(kinds);
  const all = obls([+S.y], [c]);
  const secs = sections.map(([k, t, empty]) => { const os = all.filter(o => o.kind === k); if (!os.length) return empty ? `<div class="card empty">${empty}</div>` : ''; const tot = r3(os.reduce((a, o) => a + oState(o).due, 0)); return `<h3 style="margin:16px 0 8px">${t} <span class="sub" style="font-family:var(--sans)">· total ${money(tot)}</span></h3>${os.map(oRow).join('')}`; }).join('');
  const ex = kinds.includes('M') || kinds.includes('T') ? `<div class="xbar">Exporter : <button class="btn sm" data-act="rx" data-f="xlsx">Excel (modèle récap)</button><button class="btn sm" data-act="rx" data-f="docx">Word</button><button class="btn sm" data-act="rx" data-f="pdf">PDF</button><button class="btn sm" data-act="rx" data-f="csv">CSV</button><button class="btn sm" data-act="rimp">Importer un récap Excel</button><button class="btn sm" data-act="rblank">Modèle vierge</button></div>` : `<div class="xbar">Exporter : <button class="btn sm" data-act="rx" data-f="docx">Word</button><button class="btn sm" data-act="rx" data-f="pdf">PDF</button><button class="btn sm" data-act="rx" data-f="xlsx">Excel</button><button class="btn sm" data-act="rimp">Importer un récap Excel (IS / AP)</button></div>`;
  S.pk = kinds;
  return head2 + `<div class="acts">${yearSel()}<button class="btn" data-act="pick-co" data-id="all">${esc(c.name)} ✕</button></div>${ex}${secs}`;
}
const pMens = () => periodPage('Déclarations mensuelles', 'Récaps mensuels', 'Un récap par mois : RS, TFP, FOPROLOS, TVA, timbres, TCL. Rectificatives possibles pour chaque mois.', ['M'], [['M', 'Mois', 'Cette société déclare chaque trimestre : voir Trimestrielles.']]);
const pTrim = () => periodPage('Déclarations trimestrielles', 'Récaps trimestriels', 'Déclarations trimestrielles et CNSS.', ['T', 'CNSS'], [['T', 'Déclarations trimestrielles', 'Cette société déclare chaque mois : voir Mensuelles.'], ['CNSS', 'CNSS (cotisations trimestrielles)']]);
const pAnn = () => periodPage('Déclarations annuelles', 'Annuelles et acomptes', 'IS ou IRPP, acomptes provisionnels, déclaration de l\'employeur.', ['IS', 'IRPP', 'AP', 'DE'], [['IS', "Impôt sur les sociétés"], ['IRPP', 'Impôt sur le revenu'], ['AP', 'Acomptes provisionnels'], ['DE', "Déclaration de l'employeur"]]);

/* ---------- documents Word / PDF / CSV ---------- */
function recDoc() {
  const c = pickCo(), y = +S.y, kinds = S.pk || ['M'], os = obls([y], [c]).filter(o => kinds.includes(o.kind));
  const rows = os.map(o => { const lv = lastV(o.rec), s = oState(o), v = lv ? lv.vals : {}, cr = (o.kind === 'M' || o.kind === 'T') ? calcRec(v) : null; return { label: o.kind === 'M' ? MOIS[o.p - 1] : o.label, rs: cr ? cr.rs : '', tfp: cr ? r3(cr.tfp + cr.fop) : '', tva: cr ? cr.tvaPay : '', autres: cr ? r3(cr.fodec + cr.tcl2 + cr.tcl1 + num(v.timbres) + num(v.pen)) : '', total: s.due || '', st: ST_LAB[s.st][0], due: o.due, quit: lv ? lv.quit : '', qd: lv ? lv.quitDate : '', rect: s.rects || '' }; });
  const hasCalc = kinds.includes('M') || kinds.includes('T');
  const cols = [{ h: 'Période', k: 'label', w: hasCalc ? 14 : 40 }, ...(hasCalc ? [{ h: 'RS', k: 'rs', t: 'money', w: 14 }, { h: 'TFP + FOPROLOS', k: 'tfp', t: 'money', w: 16 }, { h: 'TVA à payer', k: 'tva', t: 'money', w: 14 }, { h: 'Autres taxes', k: 'autres', t: 'money', w: 14 }] : []), { h: 'Net à payer', k: 'total', t: 'money', w: 16 }, { h: 'Statut', k: 'st', w: 18 }, { h: 'Échéance', k: 'due', t: 'date', w: 13 }, { h: 'Quittance', k: 'quit', w: 14 }, { h: 'Date quittance', k: 'qd', t: 'date', w: 13 }, { h: 'Rectif.', k: 'rect', w: 8 }];
  const tot = r3(rows.reduce((a, r) => a + num(r.total), 0));
  return { title: `${hasCalc ? 'Récap ' + (kinds[0] === 'M' ? 'mensuel' : 'trimestriel') : 'Déclarations annuelles'} ${y}`, subtitle: c.name + (c.mf ? ' — MF ' + c.mf : ''), filename: `recap-${kinds[0]}-${c.name.replace(/\W+/g, '-')}-${y}`, kpis: [['Total à payer sur l\'année', money(tot)], ['Déclarations déposées', `${os.filter(o => oState(o).filed).length} / ${os.length}`]], sections: [{ title: 'Détail', sheet: 'Récap', cols, rows }] };
}
ACT.rx = async el => {
  if (!permAny('rap', 'v')) return toast("Droit d'export manquant", 1); const c = pickCo(); if (!c) return;
  if (el.dataset.f === 'xlsx' && (S.pk.includes('M') || S.pk.includes('T'))) { download(recapXlsx(c, +S.y, S.pk.includes('M') ? 'M' : 'T', false), `Recap-${S.pk[0] === 'M' ? 'mensuel' : 'trimestriel'}-${c.name.replace(/\W+/g, '-')}-${S.y}.xlsx`); logAct(`Export récap Excel : ${c.name} ${S.y}`, 'export', 'rap', true); return; }
  exportDoc(el.dataset.f, recDoc());
};
ACT.rblank = () => { const c = pickCo(); download(recapXlsx(c, +S.y, S.pk.includes('M') ? 'M' : 'T', true), `Modele-recap-${S.pk[0] === 'M' ? 'mensuel' : 'trimestriel'}.xlsx`); };

/* ---------- Excel : écriture au format du modèle de récap ---------- */
const RC_COLS = { B: 'sal_b', C: 'sal_m', D: 'sal_css', E: 'h10_b', G: 'h3_b', I: 'm1_b', K: 'm05_b', M: 'm15_b', P: 'tfp_b', T: 'tva_b', U: 'tva_m', V: 'tvaL_b', W: 'tvaL_m', X: 'tvaI_b', Y: 'tvaI_m', Z: 'tvaV_b', AA: 'tvaV_m', AB: 'report', AE: 'rev', AH: 'exp_b', AI: 'exp_m', AJ: 'fodec_b', AL: 'timbres', AO: 'tcl1_b', AQ: 'pen' };
const RC_CALC = { F: c => c.h10, H: c => c.h3, J: c => c.m1, L: c => c.m05, N: c => c.m15, O: c => c.rs, Q: c => c.tfp, R: (c, v) => num(v.tfp_b), S: c => c.fop, AC: c => c.reportNext, AD: c => c.tvaPay, AG: c => c.tvaPay, AK: c => c.fodec, AM: (c, v) => r3(num(v.tva_b) + num(v.tva_m)), AN: c => c.tcl2, AP: c => c.tcl1, AR: c => c.total };
const RC_HEAD1 = [['A', 'A', 'MOIS'], ['B', 'D', 'R/S-SALAIRE'], ['E', 'F', 'R/S-HONORAIRE 10%'], ['G', 'H', 'R/S-HONORAIRE 3%'], ['I', 'J', 'R/S-MARCHE 1%'], ['K', 'L', 'R/S-MARCHE 0,5%'], ['M', 'N', 'R/S-MARCHE 1,5%'], ['O', 'O', 'RS'], ['P', 'Q', 'TFP 1%'], ['R', 'S', 'FOPROLOS 1%'], ['T', 'U', 'TVA COLLECTE 19%'], ['V', 'W', 'TVA DEDUCTIBLE (LOCAL)'], ['X', 'Y', 'TVA DEDUCTIBLE (IMPORT)'], ['Z', 'AA', 'TVA DEDUCTIBLE (INVESTISSEMENT)'], ['AB', 'AB', 'ANCIEN REPORT'], ['AC', 'AD', 'LIQUIDATION TVA'], ['AE', 'AE', 'REVERSEMENT TVA'], ['AF', 'AG', 'RESTE A LIQUIDER'], ['AH', 'AI', 'VENTE EXPORT'], ['AJ', 'AK', 'FODEC'], ['AL', 'AL', 'TIMBRES'], ['AM', 'AN', 'TCL CA LOCAL 0,2%'], ['AO', 'AP', 'TCL CA LOCAL 0,1%'], ['AQ', 'AQ', 'PENALITE'], ['AR', 'AR', 'TOTAL DECLARATION'], ['AS', 'AS', 'QUITTANCE N°'], ['AT', 'AT', 'DATE'], ['AU', 'AU', 'RECETTES DES FINANCES'], ['AV', 'AV', 'ECHEANCE'], ['AW', 'AW', 'DATE DEPOT'], ['AX', 'AX', 'MONTANT PAYE'], ['AY', 'AY', 'DATE PAIEMENT']];
const RC_SUB = { B: 'BASE', C: 'MT', D: 'CSS 1%', E: 'BASE', F: 'MT', G: 'BASE', H: 'MT', I: 'BASE', J: 'MT', K: 'BASE', L: 'MT', M: 'BASE', N: 'MT', O: 'MT', P: 'BASE', Q: 'MT', R: 'BASE', S: 'MT', T: 'BASE', U: 'MT', V: 'BASE', W: 'MT', X: 'BASE', Y: 'MT', Z: 'BASE', AA: 'MT', AC: 'REPORT', AD: 'A PAYER', AF: 'REPORT', AG: 'A PAYER', AH: 'BASE', AI: 'MT', AJ: 'BASE', AK: '1%', AM: 'BASE', AN: 'MT', AO: 'BASE', AP: 'MT', AR: 'NET A PAYER' };
const cIdx = L => { let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
const dSerial = iso => iso ? Math.round((toUTC(iso) - Date.UTC(1899, 11, 30)) / 864e5) : null;
function recapXlsx(c, y, kind, blank) {
  const cells = {}, put = (a, v, s = 0) => { if (v !== null && v !== undefined && v !== '') cells[a] = { v, s }; };
  put('A6', 'Client : ', 3); put('B6', c.name, 3); put('J6', 'Rédigé par :', 3); put('A7', 'Clôture :', 3); put('B7', `31/${pad(c.clotM || 12)}/${y}`.replace('31/02', '28/02').replace('31/04', '30/04').replace('31/06', '30/06').replace('31/09', '30/09').replace('31/11', '30/11'), 3); put('J7', 'Le :', 3); put('A8', 'Taches :', 3); put('B8', kind === 'M' ? 'Récap fiscal' : 'Récap fiscal trimestriel', 3); put('J8', 'Contrôlé par :', 3);
  const merges = [];
  for (const [a, b, t] of RC_HEAD1) { put(a + '10', t, 1); if (a !== b) merges.push(`${a}10:${b}10`); else merges.push(`${a}10:${a}11`); for (let i = cIdx(a); i <= cIdx(b); i++) { const L = colL(i - 1); if (!cells[L + '10']) cells[L + '10'] = { v: '', s: 1 }; if (RC_SUB[L]) put(L + '11', RC_SUB[L], 1); else cells[L + '11'] = { v: '', s: 1 }; } }
  const lines = kind === 'M' ? MOIS.map(m => m[0].toUpperCase() + m.slice(1)) : QTR; const first = 12;
  lines.forEach((lab, i) => {
    const r = first + i, o = oFromKey(recKey(c.id, kind, y, i + 1)), lv = blank ? null : lastV(o.rec), v = lv ? lv.vals : {}, cc = calcRec(v);
    put('A' + r, lab, 4); for (const [L, k] of Object.entries(RC_COLS)) if (lv) put(L + r, v[k] === '' ? null : v[k], 2);
    if (lv) for (const [L, f] of Object.entries(RC_CALC)) put(L + r, f(cc, v), 2);
    if (lv) { put('AS' + r, lv.quit, 0); put('AT' + r, dSerial(lv.quitDate), 5); put('AU' + r, lv.recette, 0); put('AW' + r, dSerial(lv.depDate), 5); put('AX' + r, lv.paid === '' ? null : lv.paid, 2); put('AY' + r, dSerial(lv.paidDate), 5); }
    put('AV' + r, dSerial(o.due), 5);
  });
  const tr = first + lines.length; put('A' + tr, 'TOTAL', 6);
  for (let i = 2; i <= cIdx('AR'); i++) { const L = colL(i - 1); if (['AC', 'AF'].includes(L)) continue; put(L + tr, null); const inp = RC_COLS[L] || RC_CALC[L]; if (inp) cells[L + tr] = { f: `SUM(${L}${first}:${L}${tr - 1})`, v: blank ? 0 : lines.reduce((a, _, j) => a + num((cells[L + (first + j)] || {}).v), 0), s: 6 }; }
  return buildSheetXlsx(cells, merges, 'V1', { widths: { A: 14 }, defW: 12, wideCols: { AS: 14, AU: 20, AV: 13, AW: 13, AX: 14, AY: 13 }, freeze: 'B12' });
}
function buildSheetXlsx(cells, merges, name, o) {
  const rowsM = {}; for (const [a, c] of Object.entries(cells)) { const m = a.match(/^([A-Z]+)(\d+)$/); (rowsM[+m[2]] = rowsM[+m[2]] || []).push([m[1], c]); }
  const sd = Object.keys(rowsM).map(Number).sort((a, b) => a - b).map(r => `<row r="${r}"${r === 10 || r === 11 ? ' ht="30" customHeight="1"' : ''}>${rowsM[r].sort((a, b) => cIdx(a[0]) - cIdx(b[0])).map(([L, c]) => { const ref = L + r; if (c.f) return `<c r="${ref}" s="${c.s}"><f>${xe(c.f)}</f><v>${c.v}</v></c>`; return typeof c.v === 'number' ? `<c r="${ref}" s="${c.s}"><v>${c.v}</v></c>` : `<c r="${ref}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`; }).join('')}</row>`).join('');
  const maxC = Math.max(...Object.keys(cells).map(a => cIdx(a.match(/^[A-Z]+/)[0])));
  const cols = Array.from({ length: maxC }, (_, i) => { const L = colL(i); return `<col min="${i + 1}" max="${i + 1}" width="${(o.widths && o.widths[L]) || (o.wideCols && o.wideCols[L]) || o.defW}" customWidth="1"/>`; }).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="11" topLeftCell="${o.freeze}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${sd}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}</worksheet>`;
  const font = (b, c) => `<font>${b ? '<b/>' : ''}<sz val="11"/>${c ? `<color rgb="${c}"/>` : ''}<name val="Book Antiqua"/></font>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.000"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3">${font(0)}${font(1, 'FFFFFFFF')}${font(1)}</fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2B3990"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4EBFA"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFBFB8A5"/></left><right style="thin"><color rgb="FFBFB8A5"/></right><top style="thin"><color rgb="FFBFB8A5"/></top><bottom style="thin"><color rgb="FFBFB8A5"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="7"><xf fontId="0" borderId="1" applyBorder="1"/><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/><xf fontId="2" borderId="0" applyFont="1"/><xf fontId="2" borderId="1" applyFont="1" applyBorder="1"/><xf numFmtId="165" fontId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyNumberFormat="1" applyFill="1" applyBorder="1" applyFont="1"/></cellXfs></styleSheet>`;
  return zip([['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`], ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`], ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`], ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`], ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', sheet]]);
}

/* ---------- Excel : lecture (xlsx) ---------- */
async function readXlsx(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error("Ce fichier n'est pas un classeur Excel .xlsx");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = new Map();
  for (let i = 0; i < n; i++) { const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true), name = td.decode(u8.subarray(p + 46, p + 46 + nl)), st = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); files.set(name, { method, data: u8.subarray(st, st + csz) }); p += 46 + nl + el + cl; }
  const get = async name => { const f = files.get(name); if (!f) return ''; if (f.method === 0) return td.decode(f.data); const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(f.data); w.close(); return td.decode(await new Response(ds.readable).arrayBuffer()); };
  const un = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const ss = []; const sst = await get('xl/sharedStrings.xml'); for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(un([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  const wb = await get('xl/workbook.xml'), rels = await get('xl/_rels/workbook.xml.rels'), sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"/g)) { const t = (rels.match(new RegExp(`<Relationship\\b[^>]*?Id="${m[2]}"[^>]*?Target="([^"]*)"`)) || rels.match(new RegExp(`<Relationship\\b[^>]*?Target="([^"]*)"[^>]*?Id="${m[2]}"`)) || [])[1]; if (t) sheets.push([un(m[1]), 'xl/' + t.replace(/^\/?(xl\/)?/, '')]); }
  const out = [];
  for (const [name, path] of sheets) {
    const x = await get(path), cells = new Map();
    for (const m of x.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const ref = (m[1].match(/\br="([A-Z]+\d+)"/) || [])[1], t = (m[1].match(/\bt="(\w+)"/) || [])[1]; if (!ref || !m[2]) continue; let v; const iv = m[2].match(/<v>([\s\S]*?)<\/v>/), is = m[2].match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/); if (t === 'inlineStr' && is) v = un(is[1]); else if (iv) { v = t === 's' ? ss[+iv[1]] : t === 'str' ? un(iv[1]) : t === 'b' ? iv[1] === '1' : Number(iv[1]); } if (v !== undefined && v !== '') cells.set(ref, v); }
    out.push({ name, cells });
  }
  return out;
}
const nrm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const xDate = v => { if (v == null || v === '') return ''; if (typeof v === 'number') { const t = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return ISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); } const m = String(v).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m) return ISO(+m[3], +m[2], +m[1]); return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : ''; };

/* import : récap mensuel / trimestriel */
function parseRecapSheet(sh) {
  const g = a => sh.cells.get(a);
  if (!(nrm(g('A10')) === 'mois' && /salaire/.test(nrm(g('B10'))))) throw new Error("Modèle non reconnu : la ligne 10 doit commencer par « MOIS » puis « R/S-SALAIRE » (modèle SGC de récap fiscal).");
  const rows = []; for (let r = 11; r <= 40; r++) { const lab = nrm(g('A' + r)); const mi = MOIS.findIndex(m => nrm(m) === lab || (lab === 'decembre' && m === 'décembre')); const qi = /^t[1-4]$/.test(lab) ? +lab[1] - 1 : -1; if (mi < 0 && qi < 0) continue; const vals = {}; for (const [L, k] of Object.entries(RC_COLS)) { const v = g(L + r); vals[k] = typeof v === 'number' ? v : ''; } const meta = { quit: g('AS' + r) != null ? String(g('AS' + r)) : '', quitDate: xDate(g('AT' + r)), recette: g('AU' + r) != null ? String(g('AU' + r)) : '', depDate: xDate(g('AW' + r)), paid: typeof g('AX' + r) === 'number' ? g('AX' + r) : '', paidDate: xDate(g('AY' + r)) }; rows.push({ kind: mi >= 0 ? 'M' : 'T', p: (mi >= 0 ? mi : qi) + 1, vals, meta, any: Object.values(vals).some(v => v !== '' && v !== 0) }); }
  if (!rows.length) throw new Error('Aucun mois trouvé dans ce fichier');
  return { client: String(g('B6') ?? ''), rows };
}
ACT.rimp = () => {
  const c = pickCo(); if (!c) return; if (!perm(c.id, 'ech', 'c')) return toast('Droit de création manquant', 1);
  const ov = openModal(`Importer un récap Excel — ${c.name} ${S.y}`, `<p class="lead" style="margin-top:0">Choisissez un fichier .xlsx au format des modèles SGC (récap mensuel/trimestriel, IS ou acomptes provisionnels). Un aperçu s'affiche avant tout import.</p><input type="file" id="rimpf" accept=".xlsx" class="sel"><div id="rimp-prev" style="margin-top:12px"></div>`, { save: false });
  $('#rimpf', ov).onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const box = $('#rimp-prev', ov);
    try {
      const sheets = await readXlsx(await f.arrayBuffer()); let parsed = null, err = '';
      for (const sh of sheets) { try { parsed = { t: 'rec', ...parseRecapSheet(sh) }; break; } catch (x) { err = x.message; } }
      if (!parsed) { const sh = sheets[0], g = a => sh.cells.get(a); if (/deduire|base ap/i.test(nrm(g('B7')) + nrm(g('B5')))) parsed = { t: 'ap', cells: sh.cells }; else if (/stock/.test(nrm(g('B2'))) && /declaration is/.test(nrm(g('B8')))) parsed = { t: 'is', cells: sh.cells }; }
      if (!parsed) throw new Error(err || 'Fichier non reconnu');
      if (parsed.t === 'rec') {
        const kind = parsed.rows[0].kind, ex = p => db.rec.find(r => r.id === recKey(c.id, kind, +S.y, p) && !r.d);
        box.innerHTML = `<p class="sub">Client lu dans le fichier : <b>${esc(parsed.client || '—')}</b>. Les quittances renseignées sont considérées comme payées.</p><div class="hist">${parsed.rows.map((r, i) => { const e = ex(r.p), locked = e && e.versions[0] && e.versions[0].depDate; const t = recTotal(kind, r.vals); return `<div><label style="display:flex;gap:10px;align-items:center;flex:1"><input class="cb" type="checkbox" data-i="${i}" ${r.any && !locked ? 'checked' : ''} ${r.any ? '' : 'disabled'}> <span>${kind === 'M' ? MOIS[r.p - 1] : QTR[r.p - 1]}</span></label><span class="sub">${r.any ? money(t) : 'vide'}${locked ? ' · déjà déposé : rectificative conseillée' : e ? ' · remplacé' : ''}</span></div>`; }).join('')}</div><button class="btn pri" data-go>Importer la sélection</button>`;
        $('[data-go]', box).onclick = () => { let n = 0; $$('input[data-i]:checked', box).forEach(cb => { const r = parsed.rows[+cb.dataset.i], key = recKey(c.id, kind, +S.y, r.p), m = r.meta, filed = m.quit || m.depDate || m.quitDate; const t = recTotal(kind, r.vals); const v = { id: uid(), n: 0, vals: r.vals, depDate: m.depDate || m.quitDate || '', quit: m.quit, quitDate: m.quitDate, recette: m.recette, paid: m.paid !== '' ? m.paid : (m.quit ? t : ''), paidDate: m.paidDate || (m.quit ? m.quitDate : ''), note: 'Importé depuis Excel' }; let rec = db.rec.find(x => x.id === key); if (!rec) { rec = { id: key, co: c.id, kind, y: +S.y, p: r.p, versions: [] }; db.rec.push(rec); } rec.d = false; if (rec.versions[0] && rec.versions[0].depDate) rec.versions.push({ ...v, n: rec.versions.length }); else rec.versions[0] = v; touch(rec); n++; }); logAct(`Import Excel : ${n} période(s) — ${c.name} ${S.y}`, 'import', 'ech'); ov.close(); render(); toast(`${n} période(s) importée(s)`); };
      } else {
        const g = a => parsed.cells.get(a), key = (kind, p) => recKey(c.id, kind, +S.y, p);
        let vals, kind, p = 1; if (parsed.t === 'is') { kind = 'IS'; p = 0; vals = { stock1: g('C2'), stock2: g('C3'), achat: g('C4'), venteHT: g('C5'), resComptable: g('C11'), resFiscal: g('C12'), apPaye: g('C15'), report: g('C16'), rs: g('C17'), avirpp: g('C18') }; } else { kind = 'AP'; vals = { base: g('C5'), taux: 30, deduire: g('C9') }; }
        Object.keys(vals).forEach(k => { if (typeof vals[k] !== 'number') vals[k] = ''; });
        box.innerHTML = `<p>${kind === 'IS' ? 'IS' : '1er acompte provisionnel'} : <b>${money(recTotal(kind, vals))}</b> à payer.</p><button class="btn pri" data-go>Importer</button>`;
        $('[data-go]', box).onclick = () => { const k = key(kind, p); let rec = db.rec.find(x => x.id === k); if (!rec) { rec = { id: k, co: c.id, kind, y: +S.y, p, versions: [] }; db.rec.push(rec); } rec.d = false; const v = { id: uid(), n: rec.versions.length, vals, depDate: '', quit: '', quitDate: '', recette: '', paid: '', paidDate: '', note: 'Importé depuis Excel' }; if (rec.versions[0] && rec.versions[0].depDate) rec.versions.push(v); else rec.versions[0] = v; touch(rec); logAct(`Import Excel ${kind} — ${c.name} ${S.y}`, 'import', 'ech'); ov.close(); render(); toast('Importé'); };
      }
    } catch (er) { box.innerHTML = `<div class="note" style="background:var(--redbg);color:var(--red)">${esc(er.message)}</div>`; }
  };
};
