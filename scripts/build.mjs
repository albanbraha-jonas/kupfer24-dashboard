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

const focus = parseCsv(focusCsv);
const pipeline = parseCsv(pipelineCsv);
const toContact = focus.filter(r => r.status === 'to_contact');
const byRegion = Object.entries(focus.reduce((acc, row) => {
  acc[row.region] = (acc[row.region] || 0) + 1;
  return acc;
}, {})).sort((a,b)=>a[0].localeCompare(b[0]));

const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kupfer24 Outreach Dashboard</title>
  <style>
    :root { --bg:#0b1020; --card:#121a31; --muted:#93a0c3; --text:#eef2ff; --accent:#f59e0b; --good:#22c55e; --line:#24304f; }
    *{box-sizing:border-box} body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(180deg,#0b1020,#111933);color:var(--text)}
    .wrap{max-width:1200px;margin:0 auto;padding:32px 20px 64px}
    .hero{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px}
    .card{background:rgba(18,26,49,.92);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
    h1,h2,h3,p{margin:0} h1{font-size:40px;line-height:1.05;margin-bottom:12px} .muted{color:var(--muted)}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}.stat{padding:18px;border-radius:16px;background:#0f1730;border:1px solid var(--line)}
    .stat strong{display:block;font-size:28px;margin-bottom:6px}.badge{display:inline-block;background:rgba(245,158,11,.15);color:#fbbf24;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px} th,td{padding:12px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top} th{color:#c7d2fe;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}.list{display:grid;gap:12px;margin-top:14px}.item{padding:14px;border:1px solid var(--line);border-radius:14px;background:#0f1730}
    .good{color:var(--good)} a{color:#c4b5fd;text-decoration:none} .small{font-size:12px}.pill{padding:4px 8px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:#cbd5e1}
    @media (max-width: 900px){.hero,.grid,.stats{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="card">
        <span class="badge">Kupfer24 Leader Sprint</span>
        <h1>5 Elektrikerfirmen bis 30.04.2026 gewinnen</h1>
        <p class="muted">Nicht Listen sammeln, sondern echte Partnerquellen aufbauen. Fokusregionen: Aargau, Zürich, Solothurn, Zug, Luzern.</p>
      </div>
      <div class="card">
        <h3>Heute wichtig</h3>
        <div class="list">
          <div class="item"><strong>Priorität 1</strong><div class="muted small">Aargau und Zürich zuerst kontaktieren</div></div>
          <div class="item"><strong>Prinzip</strong><div class="muted small">20 bis 50 individuelle Mails pro Tag, keine Blasts</div></div>
          <div class="item"><strong>Ziel</strong><div class="muted small">Gespräche, Testlieferung, dann wiederkehrende Zusammenarbeit</div></div>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><strong>${focus.length}</strong><span class="muted">Elektriker in Fokusliste</span></div>
      <div class="stat"><strong>${toContact.length}</strong><span class="muted">Kontaktbereit</span></div>
      <div class="stat"><strong>${pipeline.length}</strong><span class="muted">Gesamtpipeline</span></div>
      <div class="stat"><strong>5</strong><span class="muted">Ziel gewonnene Firmen</span></div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Kontaktbereit jetzt</h2>
        <table>
          <thead><tr><th>Firma</th><th>Region</th><th>Status</th><th>Kontakt</th><th>Hinweis</th></tr></thead>
          <tbody>
            ${toContact.map(r => `<tr><td><strong>${r.company || '-'}</strong><div class="small"><a href="${r.website}">${r.website || ''}</a></div></td><td>${r.region}</td><td><span class="pill">${r.status}</span></td><td>${r.email || '-'}<div class="small">${r.phone || ''}</div></td><td>${r.notes || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Regionenfokus</h2>
        <div class="list">
          ${byRegion.map(([region,count]) => `<div class="item"><strong>${region}</strong><div class="muted small">${count} Firmen im Fokus</div></div>`).join('')}
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
