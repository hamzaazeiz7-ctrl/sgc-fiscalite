'use strict';
/* Démarrage, événements délégués, thème, synchro */
function logout() { if (me) logAct('Déconnexion', 'déconnexion', '', true); me = null; LS.del(KEY.sess); SS.del(KEY.sess); renderAuth('login'); }
ACT.logout = logout;
ACT.nav = el => { let v = el.dataset.v; if (v === 'decl') v = S.dk || 'mens'; if (DECL_PAGES.includes(v)) S.dk = v; S.page = v; window.scrollTo(0, 0); render(); };
ACT.theme = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; LS.set(KEY.theme, t); try { localStorage.setItem('sgcfisc.theme', t); } catch { } render(); };
ACT.noop = () => { };
function startApp() {
  S.page = 'home'; render(); dailyNotify();
  if (ghReady()) { syncState = cfg.dirty ? 'pending' : 'ok'; syncNow(); }
}
onSynced = r => {
  if (r === 'kicked') { toast('Votre accès a été retiré', 1); return logout(); }
  if (!me) return;
  if (r === 'newer' && !$('.ov') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) render();
  else { const b = $('[data-act=sync] .dot'); if (!b && (r === 'err')) render(); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return; if (el.matches('button,a') && el.type !== 'checkbox') e.preventDefault();
  if (el.matches('input[type=checkbox]')) return; // géré par change
  f(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('input[type=checkbox][data-act]')) { const f = ACT[el.dataset.act]; if (f) f(el, e); return; }
  const b = el.dataset && el.dataset.bind; if (!b) return;
  if (b === 'co') { S.co = el.value; return render(); }
  const [o, k] = b.split('.'); S[o][k] = el.value; if (el.tagName === 'SELECT') render(); else liveList();
});
document.addEventListener('input', e => { const b = e.target.dataset && e.target.dataset.bind; if (!b || e.target.tagName === 'SELECT' || b === 'co') return; const [o, k] = b.split('.'); S[o][k] = e.target.value; liveList(); });
function liveList() {
  const x = $('#xres'); if (!x) return;
  if (S.page === 'soc') x.innerHTML = socCards(); else if (S.page === 'ech') x.innerHTML = echList(); else if (S.page === 'ctl') x.innerHTML = ctlList();
  else if (S.page === 'log') { const f = S.lf, q = f.q.trim().toLowerCase(); x.innerHTML = logHTML(db.log.filter(l => (!f.u || l.uid === f.u) && (!f.a || l.action === f.a) && (!q || l.text.toLowerCase().includes(q))).slice(0, 150)); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && me) { if (!$('.ov') && S.page === 'home') render(); if (ghReady() && Date.now() - (cfg.last || 0) > 20000) syncNow(); dailyNotify(); } });
addEventListener('online', () => { if (me && ghReady()) syncNow(); });
setInterval(() => { if (me && ghReady() && document.visibilityState === 'visible') syncNow(); }, 180000);
(function boot() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  db = LS.get(KEY.db, null); if (db) db = normalize(db);
  const s = LS.get(KEY.sess, null) || SS.get(KEY.sess, null);
  if (db && s && s.exp > Date.now()) { const u = live(db.users).find(x => x.id === s.id && x.active !== false); if (u) { me = u; return startApp(); } }
  renderAuth(db ? 'login' : 'new');
})();
