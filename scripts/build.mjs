import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const workspace = path.resolve(root, '../..');
const focusCsv = fs.readFileSync(path.join(workspace, 'outreach', 'kupfer24_elektriker_focus.csv'), 'utf8');
const pipelineCsv = fs.readFileSync(path.join(workspace, 'outreach', 'kupfer24_outreach_pipeline.csv'), 'utf8');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.map(line => {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] || '').trim());
    return row;
  });
}

function countBy(rows, key) {
  return Object.entries(rows.reduce((acc, row) => {
    const val = row[key] || 'unbekannt';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => a[0].localeCompare(b[0], 'de'));
}

const focus = parseCsv(focusCsv);
const pipeline = parseCsv(pipelineCsv);
const visibleFocus = focus.filter(r => r.company);
const toContact = visibleFocus.filter(r => r.status === 'to_contact');
const replied = visibleFocus.filter(r => ['replied', 'interested', 'qualified', 'meeting_requested', 'won'].includes(r.status));
const won = visibleFocus.filter(r => r.status === 'won');
const lost = visibleFocus.filter(r => ['lost', 'cold'].includes(r.status));
const nextAction = visibleFocus.filter(r => ['to_contact', 'followup_due', 'interested', 'qualified', 'meeting_requested'].includes(r.status));
const byRegion = countBy(focus.filter(r => r.region), 'region');
const byStatus = countBy(visibleFocus.length ? visibleFocus : focus, 'status');

function statusLabel(status) {
  const map = {
    research_pending: 'Recherche offen',
    to_contact: 'Zu kontaktieren',
    contacted: 'Kontaktiert',
    replied: 'Geantwortet',
    interested: 'Interessiert',
    qualified: 'Qualifiziert',
    followup_due: 'Follow-up fällig',
    meeting_requested: 'Termin gewünscht',
    won: 'Gewonnen',
    lost: 'Verloren',
    cold: 'Kalt'
  };
  return map[status] || status || '-';
}

function esc(s='') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRows(rows) {
  return rows.map(r => `<tr>
    <td><strong>${esc(r.company || '-')}</strong><div class="small">${r.website ? `<a href="${esc(r.website)}">Website</a>` : ''}</div></td>
    <td>${esc(r.region || '-')}</td>
    <td><span class="pill">${esc(statusLabel(r.status))}</span></td>
    <td>${esc(r.email || '-')}<div class="small">${esc(r.phone || '')}</div></td>
    <td>${esc(r.last_contacted || '-')}</td>
    <td>${esc(r.next_followup || '-')}</td>
    <td>${esc(r.notes || '-')}</td>
  </tr>`).join('');
}

const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kupfer24 CRM Dashboard</title>
  <style>
    :root { --bg:#09101f; --card:#121a31; --muted:#93a0c3; --text:#eef2ff; --accent:#f59e0b; --good:#22c55e; --bad:#ef4444; --line:#24304f; }
    *{box-sizing:border-box} body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(180deg,#09101f,#111933);color:var(--text)}
    .wrap{max-width:1320px;margin:0 auto;padding:28px 18px 60px}
    .hero{display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:20px}
    .card{background:rgba(18,26,49,.94);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
    h1,h2,h3,p{margin:0} h1{font-size:38px;line-height:1.05;margin-bottom:10px} h2{font-size:22px;margin-bottom:14px} .muted{color:var(--muted)}
    .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin:20px 0}.stat{padding:18px;border-radius:16px;background:#0f1730;border:1px solid var(--line)}
    .stat strong{display:block;font-size:28px;margin-bottom:6px}.badge{display:inline-block;background:rgba(245,158,11,.15);color:#fbbf24;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.list{display:grid;gap:12px}.item{padding:14px;border:1px solid var(--line);border-radius:14px;background:#0f1730}
    table{width:100%;border-collapse:collapse;font-size:14px} th,td{padding:12px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top} th{color:#c7d2fe;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    .section{margin-top:18px}.small{font-size:12px;color:var(--muted)} .pill{padding:4px 8px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:#cbd5e1;display:inline-block}
    .tabs{display:grid;gap:18px}.ok{color:var(--good)} .bad{color:var(--bad)} a{color:#c4b5fd;text-decoration:none}
    @media (max-width: 1000px){.hero,.grid2,.stats{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="card">
        <span class="badge">Kupfer24 Outreach CRM</span>
        <h1>Immer aktuell, wer kontaktiert wurde und was als Nächstes ansteht</h1>
        <p class="muted">Ziel bis 30.04.2026: mindestens 5 Elektrikerfirmen gewinnen, die ihr Kupfer an Kupfer24 verkaufen.</p>
      </div>
      <div class="card">
        <h3>Heute Fokus</h3>
        <div class="list" style="margin-top:12px">
          <div class="item"><strong>Aargau + Zürich</strong><div class="small">erste Kontaktwelle priorisieren</div></div>
          <div class="item"><strong>Personalisierung</strong><div class="small">20 bis 50 Einzelmails pro Tag, keine Blasts</div></div>
          <div class="item"><strong>Conversion statt Vanity</strong><div class="small">Gespräch, Testlieferung, dann wiederkehrende Zusammenarbeit</div></div>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><strong>${visibleFocus.length}</strong><span class="muted">sichtbare Firmen</span></div>
      <div class="stat"><strong>${toContact.length}</strong><span class="muted">zu kontaktieren</span></div>
      <div class="stat"><strong>${replied.length}</strong><span class="muted">geantwortet/interessiert</span></div>
      <div class="stat"><strong>${won.length}</strong><span class="muted">gewonnen</span></div>
      <div class="stat"><strong>${lost.length}</strong><span class="muted">verloren/kalt</span></div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Nächste Aktionen</h2>
        <div class="list">
          ${nextAction.slice(0,8).map(r => `<div class="item"><strong>${esc(r.company || '-')}</strong><div class="small">${esc(r.region || '-')} · ${esc(statusLabel(r.status))}</div><div style="margin-top:6px">${esc(r.notes || 'Kontakt aufnehmen und Reaktion auswerten')}</div></div>`).join('') || '<div class="item">Noch keine konkreten nächsten Aktionen.</div>'}
        </div>
      </div>
      <div class="card">
        <h2>Verteilung</h2>
        <div class="list">
          <div class="item"><strong>Nach Region</strong><div class="small" style="margin-top:8px">${byRegion.map(([k,v]) => `${esc(k)}: ${v}`).join(' · ')}</div></div>
          <div class="item"><strong>Nach Status</strong><div class="small" style="margin-top:8px">${byStatus.map(([k,v]) => `${esc(statusLabel(k))}: ${v}`).join(' · ')}</div></div>
          <div class="item"><strong>Pipeline</strong><div class="small" style="margin-top:8px">Gesamtpipeline aktuell: ${pipeline.length} Einträge</div></div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="card section">
        <h2>Wen haben wir kontaktiert / als Nächstes auf dem Tisch</h2>
        <table>
          <thead><tr><th>Firma</th><th>Region</th><th>Status</th><th>Kontakt</th><th>Letzter Kontakt</th><th>Nächster Schritt</th><th>Notiz</th></tr></thead>
          <tbody>${renderRows(nextAction.length ? nextAction : visibleFocus)}</tbody>
        </table>
      </div>

      <div class="card section">
        <h2>Wer hat geantwortet</h2>
        <table>
          <thead><tr><th>Firma</th><th>Region</th><th>Status</th><th>Kontakt</th><th>Letzter Kontakt</th><th>Nächster Schritt</th><th>Notiz</th></tr></thead>
          <tbody>${replied.length ? renderRows(replied) : '<tr><td colspan="7">Noch keine Antworten erfasst.</td></tr>'}</tbody>
        </table>
      </div>

      <div class="grid2">
        <div class="card section">
          <h2 class="ok">Zugesagt / gewonnen</h2>
          <table>
            <thead><tr><th>Firma</th><th>Region</th><th>Status</th><th>Kontakt</th><th>Letzter Kontakt</th><th>Nächster Schritt</th><th>Notiz</th></tr></thead>
            <tbody>${won.length ? renderRows(won) : '<tr><td colspan="7">Noch keine gewonnenen Firmen.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="card section">
          <h2 class="bad">Abgesagt / verloren</h2>
          <table>
            <thead><tr><th>Firma</th><th>Region</th><th>Status</th><th>Kontakt</th><th>Letzter Kontakt</th><th>Nächster Schritt</th><th>Notiz</th></tr></thead>
            <tbody>${lost.length ? renderRows(lost) : '<tr><td colspan="7">Noch keine verlorenen Firmen.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const outDir = path.join(root, 'dist');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('built dist/index.html');
