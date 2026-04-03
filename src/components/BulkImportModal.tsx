import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './Modal';
import type { Participant, Gender, Handedness, AnatomicalMRIMap } from '../types';
import { parseGender, parseHandedness, parseDateStr, parseAnatMRI } from '../utils/helpers';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (participants: Participant[]) => void;
  existingParticipants: Participant[];
}

interface ParsedRow {
  line: number;
  subjectId: string;    // from CSV or auto-generated
  nip: string;
  age: number | null;
  gender: Gender | undefined;
  handedness: Handedness | undefined;
  acquisitionDate: string | undefined;
  anatMRI: AnatomicalMRIMap;
  error: string | null; // null = valid
}

const PLACEHOLDER = `Paste your spreadsheet data here — header row recommended.

Example (your lab format):
  Subject    NIP         Acq. Date  Gender  MRI anat
  Sub-01     fa123456    05/06/24   M       ✅ [3T 05/06/24]
  Sub-02     mn240236    06/06/24   F       ✅ [3T 06/06/24] [7T 08/06/24]

Recognised columns (any order, case-insensitive):
  Subject ID  → subject, subjectId, sub-id
  NIP         → nip
  Age         → age
  Acq. Date   → acq. date, acquisition date, date  (DD/MM/YY or DD/MM/YYYY)
  Gender      → gender, sex, sexe  (M/F, male/female, homme/femme)
  Handedness  → handedness, laterality, main  (R/L, right/left, droite/gauche)
  MRI anat    → mri anat, anat, anatomical  (✅ [3T date] [7T date])

Comma-separated also works.`;

// ─── Parser ────────────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  return line.includes('\t') ? '\t' : ',';
}

const HEADER_ALIASES: Record<string, string> = {
  // Subject ID
  subjectid: 'subjectId',
  subject_id: 'subjectId',
  subject: 'subjectId',
  'sub-id': 'subjectId',
  sub: 'subjectId',
  // NIP
  nip: 'nip',
  // Age
  age: 'age',
  // Acquisition date
  'acq. date': 'acquisitionDate',
  'acq.date': 'acquisitionDate',
  'acq date': 'acquisitionDate',
  acqdate: 'acquisitionDate',
  'first acq. date': 'acquisitionDate',
  'first acq.date': 'acquisitionDate',
  'first acq date': 'acquisitionDate',
  'first acquisition date': 'acquisitionDate',
  'acquisition date': 'acquisitionDate',
  acquisition_date: 'acquisitionDate',
  'date acq': 'acquisitionDate',
  'date acq.': 'acquisitionDate',
  'date première acq': 'acquisitionDate',
  'première acq': 'acquisitionDate',
  date: 'acquisitionDate',
  // Gender
  gender: 'gender',
  sex: 'gender',
  sexe: 'gender',
  genre: 'gender',
  // Handedness
  handedness: 'handedness',
  laterality: 'handedness',
  lateralite: 'handedness',
  hand: 'handedness',
  main: 'handedness',
  // Anatomical MRI
  'mri anat': 'anatMRI',
  mri_anat: 'anatMRI',
  'anat mri': 'anatMRI',
  'anatomical mri': 'anatMRI',
  anatomical: 'anatMRI',
  anat: 'anatMRI',
  mri: 'anatMRI',
};

function isHeaderRow(cells: string[]): boolean {
  return cells.some((c) => HEADER_ALIASES[c.toLowerCase().trim()] !== undefined);
}

function parseRows(raw: string, existingParticipants: Participant[]): ParsedRow[] {
  const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines[0]);
  let rows = lines.map((l) => l.split(delim).map((c) => c.trim()));

  // Detect and strip header row
  let colMap: Record<string, number> = {};
  if (isHeaderRow(rows[0])) {
    rows[0].forEach((cell, i) => {
      const key = HEADER_ALIASES[cell.toLowerCase().trim()];
      if (key) colMap[key] = i;
    });
    rows = rows.slice(1);
  } else {
    // Infer column layout from number of columns
    if (rows[0].length >= 5) {
      // subjectId, nip, age, gender, handedness
      colMap = { subjectId: 0, nip: 1, age: 2, gender: 3, handedness: 4 };
    } else if (rows[0].length === 4) {
      // subjectId, nip, age, gender
      colMap = { subjectId: 0, nip: 1, age: 2, gender: 3 };
    } else if (rows[0].length === 3) {
      // subjectId, nip, age
      colMap = { subjectId: 0, nip: 1, age: 2 };
    } else if (rows[0].length === 2) {
      // nip, age  — subjectId auto-generated
      colMap = { nip: 0, age: 1 };
    } else if (rows[0].length === 1) {
      // nip only
      colMap = { nip: 0 };
    }
  }

  // Keep a running set to detect intra-paste duplicates
  const existingNips = new Set(existingParticipants.map((p) => p.nip.toUpperCase()));
  const seenNips = new Set<string>();

  // We'll build subjectIds incrementally starting from the next available number
  let autoSubIndex =
    existingParticipants.reduce((max, p) => {
      const m = p.subjectId.match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0) + 1;

  return rows.map((cells, idx) => {
    const get = (key: string) =>
      colMap[key] !== undefined ? (cells[colMap[key]] ?? '').trim() : '';

    const rawNip = get('nip').toUpperCase();
    const rawAge = get('age');
    const rawSubject = get('subjectId');
    const rawGender = get('gender');
    const rawHandedness = get('handedness');
    const rawAcqDate = get('acquisitionDate');
    const rawAnatMRI = get('anatMRI');

    const emptyExtra = { gender: undefined, handedness: undefined, acquisitionDate: undefined, anatMRI: {} };

    if (!rawNip) {
      return { line: idx + 1, subjectId: '', nip: '', age: null, ...emptyExtra, error: 'NIP is missing' };
    }
    if (existingNips.has(rawNip)) {
      return { line: idx + 1, subjectId: rawSubject, nip: rawNip, age: null, ...emptyExtra, error: `NIP ${rawNip} already exists in study` };
    }
    if (seenNips.has(rawNip)) {
      return { line: idx + 1, subjectId: rawSubject, nip: rawNip, age: null, ...emptyExtra, error: `NIP ${rawNip} is duplicated in this import` };
    }

    seenNips.add(rawNip);
    existingNips.add(rawNip);

    const age = rawAge && /^\d+$/.test(rawAge) ? parseInt(rawAge, 10) : null;
    const gender = rawGender ? parseGender(rawGender) : undefined;
    const handedness = rawHandedness ? parseHandedness(rawHandedness) : undefined;
    const acquisitionDate = rawAcqDate ? parseDateStr(rawAcqDate) : undefined;
    const anatMRI = rawAnatMRI ? parseAnatMRI(rawAnatMRI) : {};

    let subjectId = rawSubject;
    if (!subjectId) {
      subjectId = `sub-${String(autoSubIndex).padStart(2, '0')}`;
      autoSubIndex++;
    }

    return { line: idx + 1, subjectId, nip: rawNip, age, gender, handedness, acquisitionDate, anatMRI, error: null };
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BulkImportModal({
  open,
  onClose,
  onImport,
  existingParticipants,
}: BulkImportModalProps) {
  const [raw, setRaw] = useState('');

  const rows = useMemo(
    () => parseRows(raw, existingParticipants),
    [raw, existingParticipants]
  );

  const validRows = rows.filter((r) => r.error === null);
  const errorRows = rows.filter((r) => r.error !== null);

  const handleImport = () => {
    const now = new Date().toISOString();
    const participants: Participant[] = validRows.map((r) => ({
      id: uuidv4(),
      subjectId: r.subjectId,
      nip: r.nip,
      age: r.age ?? 0,
      gender: r.gender,
      handedness: r.handedness,
      status: (r.acquisitionDate ? 'upcoming' : 'recruited') as 'upcoming' | 'recruited',
      acquisitionDate: r.acquisitionDate,
      anatomicalMRI: r.anatMRI,
      machineTracks: [],
      createdAt: now,
    }));
    onImport(participants);
    setRaw('');
    onClose();
  };

  const handleClose = () => {
    setRaw('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Import Participants" size="lg">
      <div className="space-y-4">
        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Paste spreadsheet data
          </label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={7}
            placeholder={PLACEHOLDER}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:font-sans placeholder:text-xs"
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-1">
            Accepts tab-separated (Excel/Sheets copy-paste) or comma-separated. Header row optional.
          </p>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-slate-700">
                Preview — {rows.length} row{rows.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 text-xs">
                {validRows.length > 0 && (
                  <span className="text-green-600 font-medium">✓ {validRows.length} valid</span>
                )}
                {errorRows.length > 0 && (
                  <span className="text-red-500 font-medium">✗ {errorRows.length} skipped</span>
                )}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Subject ID</th>
                    <th className="text-left px-3 py-2">NIP</th>
                    <th className="text-left px-3 py-2">Age</th>
                    <th className="text-left px-3 py-2">Gender</th>
                    <th className="text-left px-3 py-2">Hand.</th>
                    <th className="text-left px-3 py-2">Acq. Date</th>
                    <th className="text-left px-3 py-2">Anat MRI</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const anat3T = row.anatMRI['3T'];
                    const anat7T = row.anatMRI['7T'];
                    const anatLabel = [
                      anat3T?.acquired ? `3T${anat3T.date ? ' ✓' : ' ✓'}` : '',
                      anat7T?.acquired ? `7T ✓` : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={row.line} className={row.error ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-3 py-2 text-slate-400">{row.line}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {row.subjectId || <span className="text-slate-300 italic">auto</span>}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                          {row.nip || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.age != null ? row.age : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.gender
                            ? <span className={row.gender === 'male' ? 'text-blue-600' : 'text-pink-500'}>{row.gender === 'male' ? '♂ M' : '♀ F'}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.handedness
                            ? <span>{row.handedness === 'right' ? '🤜 R' : '🤛 L'}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.acquisitionDate || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-green-600 font-medium">
                          {anatLabel || <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.error
                            ? <span className="text-red-500">{row.error}</span>
                            : <span className="text-green-600 font-medium">Ready</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validRows.length === 0}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {validRows.length > 0 ? `${validRows.length} participant${validRows.length > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}
