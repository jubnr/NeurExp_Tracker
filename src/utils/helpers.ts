import type {
  Study,
  StudyStatus,
  MachineType,
  ChecklistItem,
  Participant,
  MachineTrack,
  MachineSession,
  Run,
  AnatomicalMRIMap,
  Gender,
  Handedness,
} from '../types';

export function parseGender(raw: string): Gender | undefined {
  switch (raw.toLowerCase().trim()) {
    case 'm': case 'male': case 'homme': case 'h': case 'man': return 'male';
    case 'f': case 'female': case 'femme': case 'woman': case 'w': return 'female';
    default: return undefined;
  }
}

export function parseHandedness(raw: string): Handedness | undefined {
  switch (raw.toLowerCase().trim()) {
    case 'r': case 'right': case 'right-handed': case 'righthanded':
    case 'droite': case 'droitier': case 'droitière': case 'd': return 'right';
    case 'l': case 'left': case 'left-handed': case 'lefthanded':
    case 'gauche': case 'gaucher': case 'gauchère': case 'g': return 'left';
    default: return undefined;
  }
}

/** Parse DD/MM/YY or DD/MM/YYYY → YYYY-MM-DD. Returns undefined if unparseable. */
export function parseDateStr(raw: string): string | undefined {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Parse an "MRI anat" cell like "✅ [3T 05/06/24]" or "✅ [3T 05/06/24] [7T 10/06/24]".
 * Also handles plain "✅", "yes", "3T", "7T", "3T + 7T".
 */
export function parseAnatMRI(raw: string): AnatomicalMRIMap {
  const s = raw.trim();
  if (!s) return {};

  const isPositive =
    s.includes('✅') || s.includes('✓') || /\b(yes|oui|acquired|acq|ok)\b/i.test(s);
  if (!isPositive) return {};

  const result: AnatomicalMRIMap = {};

  const bracket3T = s.match(/\[3T\s+([^\]]+)\]/i);
  const bracket7T = s.match(/\[7T\s+([^\]]+)\]/i);
  const has3T = bracket3T || /\b3T\b/i.test(s);
  const has7T = bracket7T || /\b7T\b/i.test(s);

  if (has3T) {
    const dateStr = bracket3T ? parseDateStr(bracket3T[1].trim()) : undefined;
    result['3T'] = { acquired: true, ...(dateStr ? { date: dateStr } : {}) };
  }
  if (has7T) {
    const dateStr = bracket7T ? parseDateStr(bracket7T[1].trim()) : undefined;
    result['7T'] = { acquired: true, ...(dateStr ? { date: dateStr } : {}) };
  }

  return result;
}

// ─── Study-level helpers ──────────────────────────────────────────────────────

export function getStudyStatus(study: Study): StudyStatus {
  const completed = study.participants.filter((p) => p.status === 'completed').length;
  if (study.expectedParticipants > 0 && completed >= study.expectedParticipants) return 'completed';
  if (study.participants.length > 0) return 'recruiting';
  return 'to_be_scheduled';
}

/** Participant-level progress only — sessions are tracked separately per machine. */
export function getStudyProgress(study: Study): { completed: number; total: number } {
  return {
    completed: study.participants.filter((p) => p.status === 'completed').length,
    total: study.expectedParticipants,
  };
}

/** Total session progress for a participant across ALL machine types in the study. */
export function getParticipantSessionProgress(
  participant: Participant,
  study: Study
): { completed: number; total: number } {
  const total = study.machineTypes.length * study.sessionsPerParticipant;
  const completed = study.machineTypes.reduce((acc, mt) => {
    const track = participant.machineTracks.find((t) => t.machineType === mt);
    return acc + (track?.sessions.filter((s) => s.completed).length ?? 0);
  }, 0);
  return { completed, total };
}

/** Sessions completed and expected for a single machine track. */
export function getMachineTrackProgress(
  participant: Participant,
  machineType: MachineType,
  sessionsPerParticipant: number
): { completed: number; total: number; track: MachineTrack | undefined } {
  const track = participant.machineTracks.find((t) => t.machineType === machineType);
  return {
    completed: track?.sessions.filter((s) => s.completed).length ?? 0,
    total: sessionsPerParticipant,
    track,
  };
}

// ─── Participant helpers ──────────────────────────────────────────────────────

export function generateSubjectId(existingParticipants: Participant[]): string {
  const nums = existingParticipants
    .map((p) => {
      const m = (p.subjectId ?? '').match(/sub-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `sub-${String(max + 1).padStart(2, '0')}`;
}

// ─── Checklist defaults ───────────────────────────────────────────────────────

export function getDefaultChecklist(machineTypes: MachineType[]): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: 'verify-id', label: 'Verify participant identity (subject ID and NIP)' },
    { id: 'brief-protocol', label: 'Brief participant on experimental protocol' },
  ];

  if (machineTypes.includes('MEG')) {
    items.push(
      { id: 'meg-cap', label: 'Prepare MEG cap and electrodes' },
      { id: 'meg-position', label: 'Position MEG sensor array at 68°' },
      { id: 'meg-empty-room', label: 'Record empty room measurement' },
      { id: 'meg-stim', label: 'Prepare and test stimulation script' },
      { id: 'meg-audio', label: 'Adjust audio/visual display settings' }
    );
  }

  if (machineTypes.includes('3T MRI')) {
    items.push(
      { id: 'mri3t-safety', label: 'Complete MRI safety screening questionnaire' },
      { id: 'mri3t-metal', label: 'Remove all metallic objects' },
      { id: 'mri3t-coil', label: 'Set up head coil' },
      { id: 'mri3t-display', label: 'Prepare and test stimulation display' }
    );
  }

  if (machineTypes.includes('7T MRI')) {
    items.push(
      { id: 'mri7t-safety', label: 'Complete 7T MRI enhanced safety screening' },
      { id: 'mri7t-metal', label: 'Remove all metallic items (check implants, hearing aids)' },
      { id: 'mri7t-coil', label: 'Set up 7T head coil' },
      { id: 'mri7t-rf', label: 'Apply RF shielding if required' },
      { id: 'mri7t-display', label: 'Prepare and test stimulation display' }
    );
  }

  return items;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportStudyToCSV(study: Study): void {
  const machineHeaders = study.machineTypes.map((m) => `Sessions (${m})`).join(',');
  const rows: string[] = [
    `Subject ID,NIP,Age,Gender,Handedness,Status,Anat 3T,Anat 3T Date,Anat 7T,Anat 7T Date,${machineHeaders},Acquisition Date`,
  ];

  for (const p of study.participants) {
    const machineCols = study.machineTypes.map((m) => {
      const track = p.machineTracks.find((t) => t.machineType === m);
      return track?.sessions.filter((s) => s.completed).length ?? 0;
    });

    rows.push(
      [
        p.subjectId,
        p.nip,
        p.age > 0 ? p.age : '',
        p.gender ?? '',
        p.handedness ?? '',
        p.status,
        p.anatomicalMRI['3T']?.acquired ? 'yes' : 'no',
        p.anatomicalMRI['3T']?.date ?? '',
        p.anatomicalMRI['7T']?.acquired ? 'yes' : 'no',
        p.anatomicalMRI['7T']?.date ?? '',
        ...machineCols,
        p.acquisitionDate ?? '',
      ].join(',')
    );
  }

  triggerDownload(rows.join('\n'), `${study.name.replace(/\s+/g, '_')}_participants.csv`, 'text/csv');
}

// ─── HTML report generator ────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function machineBadgeHTML(m: MachineType): string {
  const cls = m === 'MEG' ? 'meg' : m === '3T MRI' ? 'mri3t' : 'mri7t';
  return `<span class="mbadge ${cls}">${m}</span>`;
}

function runBlockHTML(run: Run): string {
  const parts = (run.participantState || '😐 Neutral').split(' ');
  const emoji = parts[0];
  const label = parts.slice(1).join(' ');
  return `
<div class="run-card">
  <div class="run-row">
    <span class="run-label">Run ${run.runNumber}</span>
    ${run.isRestingState ? '<span class="tag">Resting state</span>' : ''}
    <span class="run-state">${emoji}</span>
    <span class="state-text">${escapeHtml(label)}</span>
  </div>
  ${run.notes
    ? `<pre class="run-notes">${escapeHtml(run.notes)}</pre>`
    : '<p class="no-data">No notes</p>'}
</div>`;
}

function sessionBlockHTML(session: MachineSession): string {
  return `
<div class="session-block">
  <div class="session-title">
    Session ${session.sessionNumber}
    ${session.date ? `<span class="session-date">${formatDate(session.date)}</span>` : ''}
  </div>
  ${session.notes ? `<div class="session-notes"><strong>Session notes:</strong> ${escapeHtml(session.notes)}</div>` : ''}
  ${session.runs.length === 0
    ? '<p class="no-data">No runs recorded</p>'
    : session.runs.map(runBlockHTML).join('')}
</div>`;
}

function machineTrackHTML(track: MachineTrack): string {
  return `
<div class="track-block">
  <div class="track-title">${machineBadgeHTML(track.machineType)}
    <span class="track-count">${track.sessions.length} session${track.sessions.length !== 1 ? 's' : ''}</span>
  </div>
  ${track.sessions.length === 0
    ? '<p class="no-data">No sessions recorded</p>'
    : track.sessions.map(sessionBlockHTML).join('')}
</div>`;
}

function anatomicalHTML(anat: AnatomicalMRIMap): string {
  const items = (['3T', '7T'] as const).map((k) => {
    const rec = anat[k];
    return `<span class="anat-item">
      ${k}: ${rec?.acquired
        ? `<span class="check">✓</span>${rec.date ? ' ' + formatDate(rec.date) : ''}`
        : `<span class="cross">○</span>`}
    </span>`;
  });
  return `<div class="anat-row">${items.join('')}</div>`;
}

function genderHTML(g: Gender | undefined): string {
  if (!g) return '';
  return g === 'male'
    ? '<span class="gender-male">♂ Male</span>'
    : '<span class="gender-female">♀ Female</span>';
}

function handednessHTML(h: Handedness | undefined): string {
  if (!h) return '';
  return h === 'right' ? '🤜 Right-handed' : '🤛 Left-handed';
}

function participantTabHTML(study: Study, p: Participant): string {
  const tabId = p.subjectId || p.id;
  const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
  const extraMeta = [
    p.gender ? genderHTML(p.gender) : '',
    p.handedness ? handednessHTML(p.handedness) : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');
  return `
<div id="tab-${tabId}" class="tab-content">
  <div class="p-header">
    <div class="p-title">${escapeHtml(p.subjectId || '—')}</div>
    <div class="p-meta">
      NIP: <code>${escapeHtml(p.nip)}</code> &nbsp;·&nbsp;
      Age: ${p.age > 0 ? p.age + ' y' : '—'} &nbsp;·&nbsp;
      ${extraMeta ? extraMeta + ' &nbsp;·&nbsp; ' : ''}
      <span class="badge badge-${p.status}">${p.status}</span> &nbsp;·&nbsp;
      ${sc}/${st} sessions
    </div>
  </div>
  <div class="anat-card">
    <strong>Anatomical MRI:</strong>
    ${anatomicalHTML(p.anatomicalMRI)}
  </div>
  ${study.machineTypes.map((mt) => {
    const track = p.machineTracks.find((t) => t.machineType === mt);
    return track
      ? machineTrackHTML(track)
      : `<div class="track-block"><div class="track-title">${machineBadgeHTML(mt)}</div><p class="no-data">No sessions recorded</p></div>`;
  }).join('')}
</div>`;
}

const REPORT_CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.5;}
.report-header{background:#0f172a;color:white;padding:24px 40px;}
.report-header h1{font-size:22px;font-weight:700;margin-bottom:6px;}
.report-header .meta{font-size:13px;color:#94a3b8;margin-top:6px;}
.report-header .desc{font-size:13px;color:#cbd5e1;margin-top:8px;max-width:600px;}
.tab-nav{display:flex;background:white;border-bottom:2px solid #e2e8f0;padding:0 32px;overflow-x:auto;position:sticky;top:0;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.tab-nav .tab{padding:12px 16px;cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;font-size:13px;font-weight:500;color:#64748b;margin-bottom:-2px;white-space:nowrap;}
.tab-nav .tab:hover{color:#1e293b;}
.tab-nav .tab.active{color:#3b82f6;border-bottom-color:#3b82f6;}
.tab-content{display:none;padding:32px 40px;max-width:1100px;margin:0 auto;}
.tab-content.active{display:block;}
table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:13px;}
th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600;border-bottom:1px solid #e2e8f0;}
td{padding:12px 14px;border-top:1px solid #f8fafc;vertical-align:middle;}
tr:hover td{background:#fafafa;}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;}
.badge-completed{background:#dcfce7;color:#166534;}
.badge-recruited{background:#f1f5f9;color:#475569;}
.badge-upcoming{background:#dbeafe;color:#1e40af;}
.mbadge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;margin-right:3px;}
.meg{background:#f3e8ff;color:#7c3aed;}
.mri3t{background:#dbeafe;color:#1d4ed8;}
.mri7t{background:#d1fae5;color:#065f46;}
.track-block{margin-bottom:24px;background:white;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;}
.track-title{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;}
.track-count{font-size:12px;font-weight:400;color:#94a3b8;}
.session-block{padding:16px;border-bottom:1px solid #f1f5f9;}
.session-block:last-child{border-bottom:none;}
.session-title{font-size:14px;font-weight:600;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:10px;}
.session-date{font-size:12px;font-weight:400;color:#94a3b8;}
.session-notes{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 12px;font-size:13px;color:#78350f;margin-bottom:10px;}
.run-card{background:white;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:6px;}
.run-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.run-label{font-size:13px;font-weight:600;color:#334155;}
.tag{background:#f0fdf4;color:#166534;font-size:11px;padding:2px 6px;border-radius:4px;font-weight:600;}
.run-state{font-size:18px;}
.state-text{font-size:12px;color:#64748b;}
.run-notes{font-size:13px;color:#475569;white-space:pre-wrap;font-family:inherit;line-height:1.5;}
.no-data{font-size:12px;color:#94a3b8;font-style:italic;padding:8px 0;}
.p-header{margin-bottom:16px;}
.p-title{font-size:20px;font-weight:700;margin-bottom:4px;}
.p-meta{font-size:13px;color:#64748b;}
.anat-card{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;}
.anat-row{display:flex;gap:24px;margin-top:8px;}
.anat-item{font-size:13px;}
.check{color:#22c55e;}
.cross{color:#94a3b8;}
code{font-family:monospace;background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px;}
h2.sec{font-size:16px;font-weight:700;margin-bottom:14px;}
.gender-male{color:#2563eb;font-weight:600;}
.gender-female{color:#ec4899;font-weight:600;}
`;

export function generateStudyReportHTML(study: Study): string {
  const completedCount = study.participants.filter((p) => p.status === 'completed').length;
  const genDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const tabNav = [
    `<button class="tab active" data-tab="overview" onclick="showTab('overview')">Overview</button>`,
    ...study.participants.map((p) => {
      const id = p.subjectId || p.id;
      return `<button class="tab" data-tab="${id}" onclick="showTab('${id}')">${escapeHtml(p.subjectId || p.nip)}</button>`;
    }),
  ].join('');

  const overviewRows = study.participants.map((p) => {
    const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
    const anat3T = p.anatomicalMRI['3T'];
    const anat7T = p.anatomicalMRI['7T'];
    return `
<tr>
  <td><strong>${escapeHtml(p.subjectId || '—')}</strong></td>
  <td><code>${escapeHtml(p.nip)}</code></td>
  <td>${p.age > 0 ? p.age : '—'}</td>
  <td>${p.gender ? genderHTML(p.gender) : '—'}</td>
  <td>${p.handedness ? handednessHTML(p.handedness) : '—'}</td>
  <td><span class="badge badge-${p.status}">${p.status}</span></td>
  <td>${anat3T?.acquired ? `<span class="check">✓</span>${anat3T.date ? ' ' + formatDate(anat3T.date) : ''}` : `<span class="cross">○</span>`}</td>
  <td>${anat7T?.acquired ? `<span class="check">✓</span>${anat7T.date ? ' ' + formatDate(anat7T.date) : ''}` : `<span class="cross">○</span>`}</td>
  <td>${sc} / ${st}</td>
  <td>${p.acquisitionDate ? formatDate(p.acquisitionDate) : '—'}</td>
</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Study Report – ${escapeHtml(study.name)}</title>
<style>${REPORT_CSS}</style>
<script>
function showTab(id){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active');});
  document.getElementById('tab-'+id).classList.add('active');
  document.querySelector('[data-tab="'+id+'"]').classList.add('active');
}
</script>
</head>
<body>
<div class="report-header">
  <h1>${escapeHtml(study.name)}</h1>
  <div class="meta">
    ${study.machineTypes.map(machineBadgeHTML).join('')} &nbsp;·&nbsp;
    ${completedCount} / ${study.expectedParticipants} participants &nbsp;·&nbsp;
    ${study.sessionsPerParticipant} session${study.sessionsPerParticipant > 1 ? 's' : ''}/machine &nbsp;·&nbsp;
    ${study.runsPerSession} runs/session &nbsp;·&nbsp;
    Generated ${genDate}
  </div>
  ${study.description ? `<div class="desc">${escapeHtml(study.description)}</div>` : ''}
</div>
<nav class="tab-nav">${tabNav}</nav>
<div id="tab-overview" class="tab-content active">
  <h2 class="sec">Participant Overview</h2>
  <table>
    <thead><tr>
      <th>Subject ID</th><th>NIP</th><th>Age</th><th>Gender</th><th>Handedness</th><th>Status</th>
      <th>Anat 3T</th><th>Anat 7T</th><th>Sessions</th><th>Acq. Date</th>
    </tr></thead>
    <tbody>${overviewRows}</tbody>
  </table>
</div>
${study.participants.map((p) => participantTabHTML(study, p)).join('')}
</body>
</html>`;
}

export function generateParticipantReportHTML(study: Study, p: Participant): string {
  const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
  const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Participant Report – ${escapeHtml(p.subjectId || p.nip)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="report-header">
  <div class="meta" style="margin-bottom:6px">${escapeHtml(study.name)} &nbsp;·&nbsp; Generated ${genDate}</div>
  <h1>${escapeHtml(p.subjectId || p.nip)}</h1>
  <div class="meta">
    NIP: <code style="background:rgba(255,255,255,.15);color:#fff">${escapeHtml(p.nip)}</code> &nbsp;·&nbsp;
    Age: ${p.age > 0 ? p.age + ' y' : '—'} &nbsp;·&nbsp;
    ${p.gender ? genderHTML(p.gender) + ' &nbsp;·&nbsp; ' : ''}
    ${p.handedness ? handednessHTML(p.handedness) + ' &nbsp;·&nbsp; ' : ''}
    <span class="badge badge-${p.status}">${p.status}</span> &nbsp;·&nbsp;
    ${sc}/${st} sessions
  </div>
</div>
<div class="tab-content active">
  <div class="anat-card" style="margin-bottom:20px">
    <strong>Anatomical MRI</strong>
    ${anatomicalHTML(p.anatomicalMRI)}
  </div>
  ${study.machineTypes.map((mt) => {
    const track = p.machineTracks.find((t) => t.machineType === mt);
    return track
      ? machineTrackHTML(track)
      : `<div class="track-block"><div class="track-title">${machineBadgeHTML(mt)}</div><p class="no-data">No sessions recorded</p></div>`;
  }).join('')}
</div>
</body>
</html>`;
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadStudyReport(study: Study): void {
  triggerDownload(
    generateStudyReportHTML(study),
    `${study.name.replace(/\s+/g, '_')}_report.html`,
    'text/html'
  );
}

export function downloadParticipantReport(study: Study, participant: Participant): void {
  triggerDownload(
    generateParticipantReportHTML(study, participant),
    `${study.name.replace(/\s+/g, '_')}_${participant.subjectId || participant.nip}_report.html`,
    'text/html'
  );
}
