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
import { getAllImages, restoreAllImages } from './imageDB';

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
  if (study.participants.length === 0) return 'to_be_scheduled';
  const allCompleted = study.participants.every((p) => p.status === 'completed');
  if (allCompleted && study.participants.length >= study.expectedParticipants) return 'completed';
  if (study.participants.length < study.expectedParticipants) return 'recruiting';
  // Enrollment target met but data collection still in progress
  return 'active';
}

/** Participant-level progress only — sessions are tracked separately per machine. */
export function getStudyProgress(study: Study): { completed: number; total: number } {
  const completed = study.participants.filter((p) => p.status === 'completed').length;
  return {
    completed,
    total: Math.max(study.expectedParticipants, study.participants.length),
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
  const items: ChecklistItem[] = [];

  if (machineTypes.includes('MEG')) {
    items.push(
      { id: 'meg-position',    label: 'Set the MEG to 68° position',                          machineType: 'MEG' },
      { id: 'meg-electrodes',  label: 'Prepare electrodes (stickers)',                         machineType: 'MEG' },
      { id: 'meg-noise',       label: 'Check noise level (Tools > Commands > Measure Noise). If a channel is noisy → heat it', machineType: 'MEG' },
      { id: 'meg-empty-room',  label: 'Record an empty room',                                  machineType: 'MEG' },
      { id: 'meg-stim',        label: 'Test the stimulation script and triggers',              machineType: 'MEG' },
      { id: 'meg-brief',       label: 'Brief the participant',                                 machineType: 'MEG' }
    );
  }

  if (machineTypes.includes('3T MRI')) {
    items.push(
      { id: 'mri3t-boldscreen', label: 'Turn on the BOLDScreen',                          machineType: '3T MRI' },
      { id: 'mri3t-hdmi',       label: 'Connect the screen via HDMI',                     machineType: '3T MRI' },
      { id: 'mri3t-mirror',     label: 'Enable mirror mode',                              machineType: '3T MRI' },
      { id: 'mri3t-ttl',        label: 'Connect TTL via USB to the stim PC',       machineType: '3T MRI' },
      { id: 'mri3t-brief',      label: 'Brief the participant',                           machineType: '3T MRI' }
    );
  }

  if (machineTypes.includes('7T MRI')) {
    items.push(
      { id: 'mri7t-boldscreen', label: 'Turn on the BOLDScreen',                          machineType: '7T MRI' },
      { id: 'mri7t-hdmi',       label: 'Connect the screen via HDMI',                     machineType: '7T MRI' },
      { id: 'mri7t-mirror',     label: 'Enable mirror mode',                              machineType: '7T MRI' },
      { id: 'mri7t-ttl',        label: 'Connect TTL via USB to the stim PC',       machineType: '7T MRI' },
      { id: 'mri7t-brief',      label: 'Brief the participant',                           machineType: '7T MRI' }
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

function stateClass(state: string): string {
  const label = state.split(' ').slice(1).join(' ').toLowerCase();
  if (label === 'alert') return 'state-alert';
  if (label === 'good') return 'state-good';
  if (label === 'neutral') return 'state-neutral';
  if (label === 'drowsy') return 'state-drowsy';
  if (label === 'anxious') return 'state-anxious';
  if (label === 'struggling') return 'state-struggling';
  if (label.includes('moved')) return 'state-moved';
  return '';
}

function runBlockHTML(run: Run): string {
  const parts = (run.participantState || '🙂 Good').split(' ');
  const emoji = parts[0];
  const label = parts.slice(1).join(' ');
  const cls = stateClass(run.participantState || '');
  return `
<div class="run-card ${cls}">
  <div class="run-row">
    <span class="run-label">Run ${run.runNumber}</span>
    ${run.isRestingState ? '<span class="tag">RS</span>' : ''}
    <span class="run-state">${emoji}</span>
    <span class="state-text">${escapeHtml(label)}</span>
  </div>
  ${run.notes?.trim() ? `<div class="run-notes">${escapeHtml(run.notes.trim())}</div>` : ''}
</div>`;
}

function sessionBlockHTML(session: MachineSession): string {
  return `
<div class="session-block">
  <div class="session-title">
    Session ${session.sessionNumber}
    ${session.date ? `<span class="session-date">${formatDate(session.date)}</span>` : ''}
  </div>
  ${session.notes?.trim() ? `<div class="session-notes"><strong>Session notes</strong><p>${escapeHtml(session.notes.trim())}</p></div>` : ''}
  ${session.runs.length === 0
    ? '<p class="no-data">No runs recorded</p>'
    : `<div class="runs-grid">${session.runs.map(runBlockHTML).join('')}</div>`}
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
  const items = (['3T', '7T'] as const)
    .filter((k) => anat[k]?.acquired)
    .map((k) => {
      const rec = anat[k]!;
      return `<span class="anat-item">${k}: <span class="check">✓</span>${rec.date ? ' ' + formatDate(rec.date) : ''}</span>`;
    });
  if (!items.length) return '';
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
  const pct = st > 0 ? Math.round((sc / st) * 100) : 0;
  const meta = [
    `NIP: <code>${escapeHtml(p.nip)}</code>`,
    p.age > 0 ? `${p.age} y` : null,
    p.gender ? genderHTML(p.gender) : null,
    p.handedness ? handednessHTML(p.handedness) : null,
    p.acquisitionDate ? formatDate(p.acquisitionDate) : null,
  ].filter(Boolean).join(' <span class="sep">·</span> ');
  return `
<div id="tab-${tabId}" class="tab-content">
  <div class="p-header">
    <div>
      <div class="p-title">${escapeHtml(p.subjectId || '—')} <span class="badge badge-${p.status}">${p.status}</span></div>
      <div class="p-meta">${meta}</div>
    </div>
    <div class="p-progress">
      <div class="p-progress-num">${sc}<span style="font-size:16px;color:#94a3b8;font-weight:500"> / ${st}</span></div>
      <div class="p-progress-label">sessions completed</div>
      <div class="mini-bar"><div class="mini-fill" style="width:${pct}%"></div></div>
    </div>
  </div>
  ${p.notes?.trim() ? `<div class="notes-card"><div class="notes-card-title">Participant notes</div><p>${escapeHtml(p.notes.trim())}</p></div>` : ''}
  ${anatomicalHTML(p.anatomicalMRI) ? `<div class="anat-card"><div class="anat-card-title">Anatomical MRI</div><div class="anat-row">${anatomicalHTML(p.anatomicalMRI)}</div></div>` : ''}
  ${study.machineTypes.map((mt) => {
    const track = p.machineTracks.find((t) => t.machineType === mt);
    return track
      ? machineTrackHTML(track)
      : `<div class="track-block"><div class="track-title">${machineBadgeHTML(mt)}</div><p class="no-data">No sessions recorded</p></div>`;
  }).join('')}
</div>`;
}

const REPORT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b;line-height:1.5;font-size:16px;}
/* ── Header ── */
.report-header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:white;padding:32px 48px 28px;}
.report-header h1{font-size:30px;font-weight:700;margin-bottom:6px;letter-spacing:-0.02em;}
.report-header .meta{font-size:15px;color:#94a3b8;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;}
.report-header .desc{font-size:15px;color:#cbd5e1;margin-top:10px;max-width:640px;line-height:1.6;}
.sep{color:#475569;}
.stats-row{display:flex;gap:16px;margin-top:22px;flex-wrap:wrap;}
.stat-box{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 20px;}
.stat-val{font-size:24px;font-weight:700;color:white;line-height:1;}
.stat-label{font-size:12px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.06em;}
/* ── Tab nav ── */
.tab-nav-wrapper{background:white;border-bottom:2px solid #e2e8f0;position:sticky;top:0;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.tab-search-row{padding:8px 40px 0;display:flex;align-items:center;gap:10px;}
.tab-search-row input{padding:5px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;font-family:inherit;color:#1e293b;outline:none;width:200px;}
.tab-search-row input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.15);}
.tab-nav{display:flex;padding:0 40px;overflow-x:auto;gap:2px;}
.tab{padding:10px 14px;cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;font-size:14px;font-weight:500;color:#64748b;margin-bottom:-2px;white-space:nowrap;font-family:inherit;transition:color .15s;}
.tab:hover{color:#1e293b;}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6;font-weight:600;}
.tab.hidden{display:none;}
/* ── Content ── */
.tab-content{display:none;padding:32px 48px 48px;max-width:1400px;margin:0 auto;}
.tab-content.active{display:block;}
/* ── Table ── */
table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07);font-size:15px;}
th{background:#f8fafc;padding:13px 18px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600;border-bottom:1px solid #e2e8f0;}
td{padding:14px 18px;border-top:1px solid #f8fafc;vertical-align:middle;}
tr:hover td{background:#f8fafc;}
/* ── Progress ── */
.progress-wrap{display:flex;align-items:center;gap:8px;}
.progress-bar{width:60px;background:#f1f5f9;border-radius:999px;height:5px;overflow:hidden;flex-shrink:0;}
.progress-fill{height:100%;background:#3b82f6;border-radius:999px;transition:width .3s;}
.progress-text{font-size:13px;color:#64748b;white-space:nowrap;}
/* ── Badges ── */
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;}
.badge-completed{background:#dcfce7;color:#166534;}
.badge-recruited{background:#f1f5f9;color:#475569;}
.badge-upcoming{background:#dbeafe;color:#1e40af;}
.mbadge{display:inline-block;padding:3px 9px;border-radius:5px;font-size:12px;font-weight:700;margin-right:3px;}
.meg{background:#f3e8ff;color:#7c3aed;}
.mri3t{background:#dbeafe;color:#1d4ed8;}
.mri7t{background:#d1fae5;color:#065f46;}
/* ── Participant header ── */
.p-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #f1f5f9;gap:16px;flex-wrap:wrap;}
.p-title{font-size:24px;font-weight:700;margin-bottom:8px;letter-spacing:-0.01em;display:flex;align-items:center;gap:10px;}
.p-meta{font-size:15px;color:#64748b;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.p-progress{text-align:right;flex-shrink:0;}
.p-progress-num{font-size:30px;font-weight:700;color:#0f172a;line-height:1;}
.p-progress-label{font-size:12px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.05em;}
.mini-bar{width:100%;background:#f1f5f9;border-radius:999px;height:4px;margin-top:8px;overflow:hidden;}
.mini-fill{height:100%;background:#3b82f6;border-radius:999px;}
/* ── Notes ── */
.notes-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:20px;}
.notes-card-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;}
.notes-card p{font-size:15px;color:#475569;white-space:pre-wrap;line-height:1.6;}
/* ── Anat card ── */
.anat-card{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px 18px;margin-bottom:20px;}
.anat-card-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;}
.anat-row{display:flex;gap:20px;flex-wrap:wrap;}
.anat-item{font-size:15px;display:inline-flex;align-items:center;gap:5px;}
.check{color:#22c55e;font-weight:700;}
/* ── Machine track ── */
.track-block{margin-bottom:20px;background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}
.track-title{display:flex;align-items:center;gap:8px;padding:13px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:15px;}
.track-count{font-size:13px;font-weight:400;color:#94a3b8;}
/* ── Session ── */
.session-block{padding:18px 20px;border-bottom:1px solid #f8fafc;}
.session-block:last-child{border-bottom:none;}
.session-title{font-size:15px;font-weight:600;color:#334155;margin-bottom:10px;display:flex;align-items:center;gap:10px;}
.session-date{font-size:13px;font-weight:500;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:4px;}
.session-notes{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;}
.session-notes strong{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#92400e;margin-bottom:4px;}
.session-notes p{font-size:14px;color:#78350f;line-height:1.5;white-space:pre-wrap;}
/* ── Run cards ── */
.runs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}
.run-card{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;border-left:3px solid #e2e8f0;}
.run-card.state-alert{border-left-color:#22c55e;}
.run-card.state-good{border-left-color:#10b981;}
.run-card.state-neutral{border-left-color:#94a3b8;}
.run-card.state-drowsy{border-left-color:#f59e0b;}
.run-card.state-anxious{border-left-color:#f97316;}
.run-card.state-struggling{border-left-color:#ef4444;}
.run-card.state-moved{border-left-color:#dc2626;}
.run-row{display:flex;align-items:center;gap:8px;}
.run-label{font-size:15px;font-weight:600;color:#334155;}
.tag{background:#f0fdf4;color:#166534;font-size:11px;padding:2px 7px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.run-state{font-size:16px;line-height:1;}
.state-text{font-size:13px;color:#64748b;}
.run-notes{font-size:13px;color:#475569;white-space:pre-wrap;line-height:1.5;margin-top:7px;padding-top:7px;border-top:1px solid #f1f5f9;}
.no-data{font-size:14px;color:#94a3b8;font-style:italic;padding:8px 0;}
/* ── Misc ── */
code{font-family:'SF Mono',ui-monospace,monospace;background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:13px;}
h2.sec{font-size:17px;font-weight:700;margin-bottom:16px;color:#0f172a;letter-spacing:-0.01em;}
.gender-male{color:#2563eb;font-weight:600;}
.gender-female{color:#db2777;font-weight:600;}
.report-footer{text-align:center;padding:32px 48px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;margin-top:16px;}
/* ── Print ── */
@media print{
  body{background:white;}
  .tab-nav-wrapper{position:static;box-shadow:none;}
  .tab-search-row{display:none;}
  .tab-content{display:block!important;padding:24px 0;page-break-before:always;}
  .tab-content:first-of-type{page-break-before:avoid;}
  .run-card{break-inside:avoid;}
  .track-block{break-inside:avoid;}
  .session-block{break-inside:avoid;}
  .report-header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .stat-box{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
`;

export function generateStudyReportHTML(study: Study): string {
  const completedCount = study.participants.filter((p) => p.status === 'completed').length;
  const enrolledCount = study.participants.length;
  const expectedTotal = Math.max(study.expectedParticipants, enrolledCount);
  const completionPct = expectedTotal > 0 ? Math.min(Math.round((completedCount / expectedTotal) * 100), 100) : 0;
  const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const has3T = study.machineTypes.includes('3T MRI');
  const has7T = study.machineTypes.includes('7T MRI');

  const tabNav = [
    `<button class="tab active" data-tab="overview" onclick="showTab('overview')">Overview</button>`,
    ...study.participants.map((p) => {
      const id = p.subjectId || p.id;
      return `<button class="tab" data-tab="${id}" onclick="showTab('${id}')">${escapeHtml(p.subjectId || p.nip)}</button>`;
    }),
  ].join('');

  const overviewRows = study.participants.map((p) => {
    const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
    const pct = st > 0 ? Math.round((sc / st) * 100) : 0;
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
  ${has3T ? `<td>${anat3T?.acquired ? `<span class="check">✓</span>${anat3T.date ? ' ' + formatDate(anat3T.date) : ''}` : '—'}</td>` : ''}
  ${has7T ? `<td>${anat7T?.acquired ? `<span class="check">✓</span>${anat7T.date ? ' ' + formatDate(anat7T.date) : ''}` : '—'}</td>` : ''}
  <td><div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-text">${sc} / ${st}</span></div></td>
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
function filterTabs(q){
  var query=q.toLowerCase();
  document.querySelectorAll('.tab-nav .tab').forEach(function(t){
    if(!t.dataset.tab||t.dataset.tab==='overview'){return;}
    t.classList.toggle('hidden',!t.textContent.toLowerCase().includes(query));
  });
}
</script>
</head>
<body>
<div class="report-header">
  <h1>${escapeHtml(study.name)}</h1>
  <div class="meta">
    ${study.machineTypes.map(machineBadgeHTML).join('')}
    <span class="sep">·</span>
    ${study.sessionsPerParticipant} session${study.sessionsPerParticipant > 1 ? 's' : ''}/machine
    <span class="sep">·</span>
    ${study.runsPerSession} run${study.runsPerSession > 1 ? 's' : ''}/session
    ${study.hasRestingState ? '<span class="sep">·</span> Resting state' : ''}
  </div>
  ${study.description ? `<div class="desc">${escapeHtml(study.description)}</div>` : ''}
  <div class="stats-row">
    <div class="stat-box"><div class="stat-val">${enrolledCount} <span style="font-size:14px;color:#64748b">/ ${expectedTotal}</span></div><div class="stat-label">Enrolled</div></div>
    <div class="stat-box"><div class="stat-val">${completedCount}</div><div class="stat-label">Completed</div></div>
    <div class="stat-box"><div class="stat-val">${completionPct}%</div><div class="stat-label">Completion</div></div>
  </div>
</div>
<div class="tab-nav-wrapper">
  <div class="tab-search-row"><input type="search" placeholder="Filter participants…" oninput="filterTabs(this.value)" /></div>
  <div class="tab-nav">${tabNav}</div>
</div>
<div id="tab-overview" class="tab-content active">
  <h2 class="sec">Overview</h2>
  <table>
    <thead><tr>
      <th>Subject ID</th><th>NIP</th><th>Age</th><th>Gender</th><th>Handedness</th><th>Status</th>
      ${has3T ? '<th>Anat 3T</th>' : ''}${has7T ? '<th>Anat 7T</th>' : ''}
      <th>Sessions</th><th>Acq. Date</th>
    </tr></thead>
    <tbody>${overviewRows}</tbody>
  </table>
</div>
${study.participants.map((p) => participantTabHTML(study, p)).join('')}
<div class="report-footer">Generated by NeurExp Tracker &nbsp;·&nbsp; ${genDate}</div>
</body>
</html>`;
}

export function generateParticipantReportHTML(study: Study, p: Participant): string {
  const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
  const pct = st > 0 ? Math.round((sc / st) * 100) : 0;
  const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(p.subjectId || p.nip)} – ${escapeHtml(study.name)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="report-header">
  <div class="meta" style="margin-bottom:6px">${escapeHtml(study.name)}</div>
  <h1>${escapeHtml(p.subjectId || p.nip)}</h1>
  <div class="meta">
    NIP: <code style="background:rgba(255,255,255,.15);color:#fff">${escapeHtml(p.nip)}</code>
    ${p.age > 0 ? ` &nbsp;·&nbsp; Age: ${p.age} y` : ''}
    ${p.gender ? ` &nbsp;·&nbsp; ${genderHTML(p.gender)}` : ''}
    ${p.handedness ? ` &nbsp;·&nbsp; ${handednessHTML(p.handedness)}` : ''}
    &nbsp;·&nbsp; <span class="badge badge-${p.status}">${p.status}</span>
  </div>
  <div style="margin-top:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:13px;color:rgba(255,255,255,.75);">Sessions completed</span>
      <span style="font-size:13px;font-weight:600;color:#fff;">${sc} / ${st} &nbsp;<span style="font-weight:400;color:rgba(255,255,255,.6);">(${pct}%)</span></span>
    </div>
    <div style="background:rgba(255,255,255,.2);border-radius:999px;height:6px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:#fff;border-radius:999px;"></div>
    </div>
  </div>
</div>
<div style="max-width:900px;margin:0 auto;padding:0 24px 40px;">
  ${p.notes?.trim() ? `<div class="notes-card"><div class="notes-card-title">Participant notes</div><p>${escapeHtml(p.notes.trim())}</p></div>` : ''}
  ${anatomicalHTML(p.anatomicalMRI) ? `<div class="anat-card"><div class="anat-card-title">Anatomical MRI</div><div class="anat-row">${anatomicalHTML(p.anatomicalMRI)}</div></div>` : ''}
  ${study.machineTypes.map((mt) => {
    const track = p.machineTracks.find((t) => t.machineType === mt);
    return track
      ? machineTrackHTML(track)
      : `<div class="track-block"><div class="track-title">${machineBadgeHTML(mt)}</div><p class="no-data">No sessions recorded</p></div>`;
  }).join('')}
</div>
<div class="report-footer">Generated by NeurExp Tracker &nbsp;·&nbsp; ${genDate}</div>
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

async function renderHtmlToPdf(htmlString: string, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  // Mount a hidden container with the report content
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;';
  // Extract <body> content + inject <style> inline so html2canvas can read it
  const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const styleMatch = htmlString.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  container.innerHTML = `<style>${styleMatch?.[1] ?? ''}</style>${bodyMatch?.[1] ?? htmlString}`;
  // Make all tab-content visible (study report hides inactive tabs)
  container.querySelectorAll<HTMLElement>('.tab-content').forEach((el) => {
    el.style.display = 'block';
  });
  // Hide interactive elements
  container.querySelectorAll<HTMLElement>('.print-btn,.tab-nav-wrapper,.tab-search-row').forEach((el) => {
    el.style.display = 'none';
  });
  document.body.appendChild(container);

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadStudyReportPdf(study: Study): Promise<void> {
  return renderHtmlToPdf(
    generateStudyReportHTML(study),
    `${study.name.replace(/\s+/g, '_')}_report.pdf`
  );
}

export function downloadParticipantReportPdf(study: Study, participant: Participant): Promise<void> {
  return renderHtmlToPdf(
    generateParticipantReportHTML(study, participant),
    `${study.name.replace(/\s+/g, '_')}_${participant.subjectId || participant.nip}_report.pdf`
  );
}

// ─── participants_to_import.tsv generator ─────────────────────────────────────

const TSV_HEADER = 'participant_id\tNIP\tinfos_participant\tsession_label\tacq_date\tacq_label\tlocation\tto_import';

function getLocation(scannerType: '3T' | '7T', acqDate: string): string {
  // "from September 2025 onward" means acqDate >= '2025-09-01'
  const isBefore = acqDate < '2025-09-01';
  if (isBefore) return scannerType === '3T' ? 'prisma' : '7t';
  return scannerType === '3T' ? 'cimax' : 'terrax';
}

export function generateParticipantsToImportTSV(participants: Participant[]): string {
  const rows: string[] = [TSV_HEADER];
  for (const p of participants) {
    for (const scannerType of ['3T', '7T'] as const) {
      const rec = p.anatomicalMRI[scannerType];
      if (!rec?.acquired || !rec.date) continue;
      const location = getLocation(scannerType, rec.date);
      rows.push([p.subjectId.toLowerCase(), p.nip.toLowerCase(), '', '', rec.date, '', location, ''].join('\t'));
    }
  }
  return rows.join('\n');
}

export function downloadParticipantsToImportTSV(participants: Participant[]): void {
  triggerDownload(
    generateParticipantsToImportTSV(participants),
    'participants_to_import.tsv',
    'text/tab-separated-values'
  );
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'neurexp-storage';

export async function exportBackup(): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const images = await getAllImages();
  const data = JSON.parse(raw);
  if (Object.keys(images).length > 0) data._images = images;
  const date = new Date().toISOString().split('T')[0];
  triggerDownload(JSON.stringify(data), `neurexp-backup-${date}.json`, 'application/json');
}

export function importBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.state?.studies) throw new Error('Invalid backup file.');
        if (parsed._images) {
          await restoreAllImages(parsed._images);
          delete parsed._images;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
