'use strict';
/* Exports sans bibliothèque : Excel (.xlsx), Word (.docx), CSV, PDF (impression) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) { // files: [[name, string|Uint8Array]] — sans compression
  const parts = [], cen = []; let off = 0;
  for (const [name, data] of files) {
    const nb = te.encode(name), d = typeof data === 'string' ? te.encode(data) : data, crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, d);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + d.length;
  }
  const cl = cen.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)]);
}
const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const cell = (col, t, v) => { const v2 = t === 'money' || t === 'int' ? (v === '' || v == null || isNaN(v) ? null : +v) : (t === 'date' ? fmtD(v) : v); return v2; };
const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function xlsx(doc) {
  const secs = doc.sections.filter(s => s.cols), sheets = [];
  secs.forEach((s, si) => {
    let rows = '', r = 1;
    rows += `<row r="${r}">` + s.cols.map((c, i) => `<c r="${colL(i)}${r}" s="1" t="inlineStr"><is><t>${xe(c.h)}</t></is></c>`).join('') + '</row>';
    for (const row of s.rows) { r++; rows += `<row r="${r}">` + s.cols.map((c, i) => { const v = cell(c, c.t, row[c.k]); if (v == null || v === '') return ''; const ref = colL(i) + r; return typeof v === 'number' ? `<c r="${ref}" s="${c.t === 'money' ? 2 : 0}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${xe(v)}</t></is></c>`; }).join('') + '</row>'; }
    sheets.push(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${s.cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 16}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${colL(s.cols.length - 1)}${Math.max(r, 1)}"/></worksheet>`);
  });
  const names = secs.map((s, i) => (s.sheet || s.title || 'Feuille' + (i + 1)).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31));
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.000"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Book Antiqua"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Book Antiqua"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2B3990"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`;
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xe(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', styles], ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s])
  ];
  return zip(files);
}
function docx(doc) {
  const P = (t, o = {}) => `<w:p><w:pPr><w:jc w:val="${o.jc || 'both'}"/><w:spacing w:line="${o.line || 360}" w:lineRule="auto" w:after="${o.after ?? 120}"/>${o.pb ? '<w:pageBreakBefore/>' : ''}</w:pPr><w:r><w:rPr>${o.b ? '<w:b/>' : ''}<w:color w:val="${o.color || '000000'}"/><w:sz w:val="${o.sz || 22}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r></w:p>`;
  let body = P(doc.title, { sz: 40, b: 1, color: '14306B', jc: 'left' });
  if (doc.subtitle) body += P(doc.subtitle, { sz: 24, color: '24489A', jc: 'left' });
  body += P(`Édité le ${fmtD(todayISO())} — ${APP_NAME}`, { sz: 20, jc: 'left' });
  const secs = doc.sections.filter(s => s.cols);
  body += P('Sommaire', { sz: 30, b: 1, color: '24489A', jc: 'left', after: 60 }) + secs.map((s, i) => P(`${i + 1}. ${s.title}`, { jc: 'left', after: 20 })).join('');
  if (doc.kpis && doc.kpis.length) body += P('Synthèse', { sz: 30, b: 1, color: '24489A', jc: 'left', after: 60 }) + doc.kpis.map(([l, v]) => P(`${l} : ${v}`, { jc: 'left', after: 20 })).join('');
  const land = secs.some(s => s.cols.length > 6);
  secs.forEach(s => {
    body += P(s.title, { sz: 30, b: 1, color: '24489A', jc: 'left', pb: 1 });
    const tw = land ? 14400 : 9900, ws = s.cols.map(c => c.w || 16), sum = ws.reduce((a, b) => a + b, 0);
    const tc = (t, w, h, right) => `<w:tc><w:tcPr><w:tcW w:w="${Math.round(w / sum * tw)}" w:type="dxa"/>${h ? '<w:shd w:val="clear" w:color="auto" w:fill="2B3990"/>' : ''}</w:tcPr><w:p><w:pPr><w:jc w:val="${right ? 'right' : 'left'}"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${h ? '<w:b/><w:color w:val="FFFFFF"/>' : '<w:color w:val="000000"/>'}<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r></w:p></w:tc>`;
    const fmt = (c, v) => c.t === 'money' ? (v === '' || v == null ? '' : money(v)) : c.t === 'date' ? fmtD(v) : (v ?? '');
    body += `<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:color="BFB8A5"/>`).join('')}</w:tblBorders></w:tblPr><w:tr>${s.cols.map((c, i) => tc(c.h, ws[i], 1)).join('')}</w:tr>${s.rows.map(r => `<w:tr>${s.cols.map((c, i) => tc(fmt(c, r[c.k]), ws[i], 0, c.t === 'money')).join('')}</w:tr>`).join('')}</w:tbl>` + P('', { after: 60 });
  });
  const sect = land ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838"/>';
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Book Antiqua" w:hAnsi="Book Antiqua" w:cs="Book Antiqua"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr>${sect}<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`]
  ]);
}
function csv(doc) {
  const s = doc.sections.find(x => x.cols); const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const fm = (c, v) => c.t === 'date' ? fmtD(v) : c.t === 'money' ? (v === '' || v == null ? '' : String(v).replace('.', ',')) : v;
  return new Blob(['﻿' + [s.cols.map(c => q(c.h)).join(';'), ...s.rows.map(r => s.cols.map(c => q(fm(c, r[c.k]))).join(';'))].join('\r\n')], { type: 'text/csv;charset=utf-8' });
}
function printDoc(doc) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f);
  const fm = (c, v) => c.t === 'money' ? (v === '' || v == null ? '' : money(v)) : c.t === 'date' ? fmtD(v) : esc(v ?? '');
  const secs = doc.sections.filter(s => s.cols);
  f.contentDocument.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>@page{size:A4 landscape;margin:14mm}body{font:11pt/1.5 "Book Antiqua",Georgia,serif;color:#000}h1{color:#14306B;font-size:22pt;margin:0}h2{color:#24489A;font-size:15pt;margin:18px 0 6px}.s{color:#24489A}table{border-collapse:collapse;width:100%;font-size:9pt}th{background:#2B3990;color:#fff;text-align:left;padding:5px}td{border:1px solid #bfb8a5;padding:4px;text-align:justify}td.r{text-align:right}ul{margin:4px 0}</style></head><body><h1>${esc(doc.title)}</h1><div class="s">${esc(doc.subtitle || '')}</div><p>Édité le ${fmtD(todayISO())} — ${APP_NAME}</p><h2>Sommaire</h2><ul>${secs.map((s, i) => `<li>${i + 1}. ${esc(s.title)}</li>`).join('')}</ul>${(doc.kpis || []).length ? '<h2>Synthèse</h2><ul>' + doc.kpis.map(([l, v]) => `<li>${esc(l)} : ${esc(v)}</li>`).join('') + '</ul>' : ''}${secs.map(s => `<h2>${esc(s.title)}</h2><table><tr>${s.cols.map(c => `<th>${esc(c.h)}</th>`).join('')}</tr>${s.rows.map(r => `<tr>${s.cols.map(c => `<td class="${c.t === 'money' ? 'r' : ''}">${fm(c, r[c.k])}</td>`).join('')}</tr>`).join('')}</table>`).join('')}</body></html>`);
  f.contentDocument.close(); setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 300);
}
const DOCS = {};
function exportDoc(kind, doc) {
  const fn = (doc.filename || 'export') + '-' + todayISO();
  if (kind === 'xlsx') download(xlsx(doc), fn + '.xlsx'); else if (kind === 'docx') download(docx(doc), fn + '.docx');
  else if (kind === 'csv') download(csv(doc), fn + '.csv'); else if (kind === 'pdf') printDoc(doc);
  logAct(`Export ${kind.toUpperCase()} : ${doc.title}`, 'export', 'rap', true);
}
