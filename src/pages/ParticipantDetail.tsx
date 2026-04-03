import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Play,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  ChevronDown,
  Pencil,
  Trash2,
  FileText,
  Save,
  X,
  Plus,
  StickyNote,
} from 'lucide-react';
import { useStudyStore } from '../store/studyStore';
import { ParticipantStatusBadge } from '../components/StatusBadge';
import { MachineBadge } from '../components/MachineBadge';
import { Modal } from '../components/Modal';
import { formatDate, downloadParticipantReport } from '../utils/helpers';
import type { MachineType, ParticipantStatus, Gender, Handedness } from '../types';

const PARTICIPANT_STATES = [
  { emoji: '😀', label: 'Alert' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😴', label: 'Drowsy' },
  { emoji: '😵', label: 'Struggling' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🏃', label: 'Moved excessively' },
];

export function ParticipantDetail() {
  const { studyId, participantId } = useParams<{
    studyId: string;
    participantId: string;
  }>();
  const navigate = useNavigate();
  const {
    studies,
    updateParticipant,
    deleteMachineSession,
    saveMachineSession,
    updateRun,
    addRun,
    deleteRun,
  } = useStudyStore();

  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<ParticipantStatus>('recruited');
  const [editGender, setEditGender] = useState<Gender | undefined>(undefined);
  const [editHandedness, setEditHandedness] = useState<Handedness | undefined>(undefined);

  // Participant notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // Inline run editing
  const [editingRun, setEditingRun] = useState<{
    machineType: MachineType;
    sessionId: string;
    runId: string;
  } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editState, setEditState] = useState('');

  const study = studies.find((s) => s.id === studyId);
  const participant = study?.participants.find((p) => p.id === participantId);

  if (!study || !participant) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-slate-500">Participant not found.</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          ← Back
        </Link>
      </div>
    );
  }

  const totalCompletedSessions = participant.machineTracks.reduce(
    (sum, track) => sum + track.sessions.filter((s) => s.completed).length,
    0
  );
  const totalExpectedSessions = study.machineTypes.length * study.sessionsPerParticipant;
  const canAcquire =
    totalCompletedSessions < totalExpectedSessions && participant.status !== 'completed';

  // ── Edit participant modal ───────────────────────────────────────────────────

  const openEdit = () => {
    setEditAge(participant.age > 0 ? String(participant.age) : '');
    setEditDate(participant.acquisitionDate ?? '');
    setEditStatus(participant.status);
    setEditGender(participant.gender);
    setEditHandedness(participant.handedness);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    updateParticipant(study.id, participant.id, {
      age: editAge ? Number(editAge) : 0,
      acquisitionDate: editDate || undefined,
      status: editStatus,
      gender: editGender,
      handedness: editHandedness,
    });
    setShowEditModal(false);
  };

  // ── Participant notes ────────────────────────────────────────────────────────

  const openNotes = () => {
    setNotesValue(participant.notes ?? '');
    setEditingNotes(true);
  };

  const saveNotes = () => {
    updateParticipant(study.id, participant.id, { notes: notesValue || undefined });
    setEditingNotes(false);
  };

  // ── Sessions ─────────────────────────────────────────────────────────────────

  const handleDeleteSession = (machineType: MachineType, sessionId: string, hasRuns: boolean) => {
    const msg = hasRuns
      ? 'Delete this session? All run data will be permanently lost.'
      : 'Delete this empty session?';
    if (window.confirm(msg)) {
      deleteMachineSession(study.id, participant.id, machineType, sessionId);
      setExpandedSession(null);
    }
  };

  const handleAddSession = (machineType: MachineType, currentCount: number) => {
    const newSession = {
      id: crypto.randomUUID(),
      sessionNumber: currentCount + 1,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      runs: [],
      completed: false,
    };
    saveMachineSession(study.id, participant.id, machineType, newSession);
    setExpandedSession(newSession.id);
  };

  // ── Runs ──────────────────────────────────────────────────────────────────────

  const handleAddRun = (machineType: MachineType, sessionId: string, currentRunCount: number) => {
    const newRun = {
      id: crypto.randomUUID(),
      runNumber: currentRunCount + 1,
      isRestingState: false,
      participantState: '😐 Neutral',
      notes: '',
      completed: false,
    };
    addRun(study.id, participant.id, machineType, sessionId, newRun);
  };

  const handleDeleteRun = (
    machineType: MachineType,
    sessionId: string,
    runId: string,
    hasNotes: boolean
  ) => {
    const msg = hasNotes
      ? 'Delete this run? Its notes will be lost.'
      : 'Delete this run?';
    if (window.confirm(msg)) {
      deleteRun(study.id, participant.id, machineType, sessionId, runId);
      if (editingRun?.runId === runId) setEditingRun(null);
    }
  };

  // ── Run editing ───────────────────────────────────────────────────────────────

  const startEditRun = (
    machineType: MachineType,
    sessionId: string,
    runId: string,
    notes: string,
    state: string
  ) => {
    setEditingRun({ machineType, sessionId, runId });
    setEditNotes(notes);
    setEditState(state || '😐 Neutral');
  };

  const saveRunEdit = () => {
    if (!editingRun) return;
    updateRun(
      study.id,
      participant.id,
      editingRun.machineType,
      editingRun.sessionId,
      editingRun.runId,
      { notes: editNotes, participantState: editState }
    );
    setEditingRun(null);
  };

  // ── Anatomical MRI ────────────────────────────────────────────────────────────

  const updateAnatMRI = (field: '3T' | '7T', acquired: boolean, date?: string) => {
    updateParticipant(study.id, participant.id, {
      anatomicalMRI: {
        ...participant.anatomicalMRI,
        [field]: acquired ? { acquired: true, date } : undefined,
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-blue-600 transition-colors">Studies</Link>
        <ChevronRight size={14} />
        <Link to={`/studies/${studyId}`} className="hover:text-blue-600 truncate max-w-xs">
          {study.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium font-mono">
          {participant.subjectId} · {participant.nip}
        </span>
      </div>

      {/* Participant header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0">
              <User size={22} className="text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900 font-mono">
                  {participant.subjectId}
                </h1>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-slate-600">{participant.nip}</span>
                <ParticipantStatusBadge status={participant.status} size="md" />
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                {participant.age > 0 && <span>{participant.age} years old</span>}
                {participant.gender && (
                  <span className={participant.gender === 'male' ? 'text-blue-600' : 'text-pink-500'}>
                    {participant.gender === 'male' ? '♂' : '♀'} {participant.gender === 'male' ? 'Male' : 'Female'}
                  </span>
                )}
                {participant.handedness && (
                  <span>
                    {participant.handedness === 'right' ? '🤜' : '🤛'} {participant.handedness === 'right' ? 'Right' : 'Left'}-handed
                  </span>
                )}
                {participant.acquisitionDate && (
                  <div className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>{formatDate(participant.acquisitionDate)}</span>
                  </div>
                )}
                <span>
                  {totalCompletedSessions} / {totalExpectedSessions} sessions
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => downloadParticipantReport(study, participant)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileText size={13} />
              Report
            </button>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Pencil size={13} />
              Edit
            </button>
            {canAcquire && (
              <button
                onClick={() => navigate(`/studies/${studyId}/participants/${participantId}/acquire`)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Play size={14} />
                Start Acquisition
              </button>
            )}
            {!canAcquire && participant.status !== 'completed' && (
              <button
                onClick={() => updateParticipant(study.id, participant.id, { status: 'completed' })}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <CheckCircle2 size={14} />
                Mark Completed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participant notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StickyNote size={15} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Participant Notes</h3>
          </div>
          {!editingNotes && (
            <button
              onClick={openNotes}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Pencil size={11} />
              {participant.notes ? 'Edit' : 'Add notes'}
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              placeholder="Remarks about this participant (contraindications, preferences, contact info, etc.)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNotes(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Save size={11} /> Save
              </button>
            </div>
          </div>
        ) : participant.notes ? (
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {participant.notes}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">No notes yet.</p>
        )}
      </div>

      {/* Anatomical MRI card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-900 mb-3">Anatomical MRI</h3>
        <div className="space-y-3">
          {(['3T', '7T'] as const).map((field) => {
            const rec = participant.anatomicalMRI?.[field];
            return (
              <div key={field} className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-slate-500 w-6 shrink-0">{field}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateAnatMRI(field, true, rec?.date)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      rec?.acquired
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    Acquired
                  </button>
                  <button
                    onClick={() => updateAnatMRI(field, false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      !rec?.acquired
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Circle size={13} />
                    Not acquired
                  </button>
                </div>
                {rec?.acquired && (
                  <input
                    type="date"
                    value={rec.date ?? ''}
                    onChange={(e) => updateAnatMRI(field, true, e.target.value || undefined)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Machine-track sessions */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Session History</h2>

        {participant.machineTracks.length === 0 && !canAcquire ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            <p className="text-sm">No sessions recorded yet.</p>
          </div>
        ) : participant.machineTracks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            <p className="text-sm mb-3">No sessions recorded yet.</p>
            <button
              onClick={() => navigate(`/studies/${studyId}/participants/${participantId}/acquire`)}
              className="text-blue-600 text-sm hover:underline"
            >
              Start the first acquisition →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {study.machineTypes.map((machineType) => {
              const track = participant.machineTracks.find((t) => t.machineType === machineType);
              const sessions = track?.sessions ?? [];

              return (
                <div key={machineType}>
                  {/* Machine track header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MachineBadge machine={machineType} />
                      <span className="text-xs text-slate-400">
                        {sessions.filter((s) => s.completed).length} /{' '}
                        {study.sessionsPerParticipant} sessions
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddSession(machineType, sessions.length)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Plus size={11} />
                      Add session
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-400 italic pl-2">No sessions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => {
                        const isExpanded = expandedSession === session.id;
                        const completedRuns = session.runs.filter((r) => r.completed).length;
                        const hasRuns = session.runs.length > 0;

                        return (
                          <div
                            key={session.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                          >
                            {/* Session header */}
                            <div className="flex items-center">
                              <button
                                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                                className="flex-1 flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {session.completed ? (
                                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                  ) : (
                                    <Circle size={18} className="text-slate-300 shrink-0" />
                                  )}
                                  <span className="font-semibold text-slate-900">
                                    Session {session.sessionNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                  <span>{completedRuns}/{session.runs.length} runs</span>
                                  {session.date && <span>{formatDate(session.date)}</span>}
                                  <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSession(machineType, session.id, hasRuns)
                                }
                                className="px-3 py-4 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete session"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Expanded: session notes + runs */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 px-6 py-4 space-y-4">
                                {/* Session-level notes */}
                                {session.notes && (
                                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                                    <p className="text-xs font-medium text-amber-700 mb-1">
                                      Session notes
                                    </p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                      {session.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Runs */}
                                {session.runs.length === 0 ? (
                                  <p className="text-sm text-slate-400 italic">No runs recorded.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {session.runs.map((run) => {
                                      const isEditing =
                                        editingRun?.runId === run.id &&
                                        editingRun?.sessionId === session.id &&
                                        editingRun?.machineType === machineType;
                                      const stateParts = (run.participantState || '😐 Neutral').split(' ');
                                      const stateEmoji = stateParts[0];
                                      const stateLabel = stateParts.slice(1).join(' ');

                                      return (
                                        <div
                                          key={run.id}
                                          className={`rounded-lg border ${
                                            run.completed
                                              ? 'border-green-200 bg-green-50'
                                              : 'border-slate-200 bg-slate-50'
                                          }`}
                                        >
                                          {isEditing ? (
                                            /* Edit mode */
                                            <div className="p-3 space-y-3">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-slate-700">
                                                  Run {run.runNumber}
                                                </span>
                                                <div className="flex gap-1">
                                                  <button
                                                    onClick={saveRunEdit}
                                                    className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700"
                                                  >
                                                    <Save size={11} /> Save
                                                  </button>
                                                  <button
                                                    onClick={() => setEditingRun(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                              {/* State selector */}
                                              <div>
                                                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                                                  Participant state
                                                </label>
                                                <div className="flex gap-1.5 flex-wrap">
                                                  {PARTICIPANT_STATES.map(({ emoji, label }) => {
                                                    const val = `${emoji} ${label}`;
                                                    return (
                                                      <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => setEditState(val)}
                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                                                          editState === val
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                        }`}
                                                      >
                                                        <span>{emoji}</span>
                                                        <span>{label}</span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                              {/* Notes */}
                                              <textarea
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                rows={4}
                                                placeholder="Notes..."
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                autoFocus
                                              />
                                            </div>
                                          ) : (
                                            /* View mode */
                                            <div className="px-4 py-3">
                                              <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-slate-700">
                                                    Run {run.runNumber}
                                                  </span>
                                                  {run.isRestingState && (
                                                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                                      Resting state
                                                    </span>
                                                  )}
                                                  <span
                                                    className="text-base leading-none"
                                                    title={stateLabel}
                                                  >
                                                    {stateEmoji}
                                                  </span>
                                                  <span className="text-xs text-slate-400">
                                                    {stateLabel}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  {run.completed && (
                                                    <CheckCircle2 size={13} className="text-green-500" />
                                                  )}
                                                  <button
                                                    onClick={() =>
                                                      startEditRun(
                                                        machineType,
                                                        session.id,
                                                        run.id,
                                                        run.notes,
                                                        run.participantState
                                                      )
                                                    }
                                                    className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors"
                                                    title="Edit run"
                                                  >
                                                    <Pencil size={12} />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      handleDeleteRun(
                                                        machineType,
                                                        session.id,
                                                        run.id,
                                                        Boolean(run.notes)
                                                      )
                                                    }
                                                    className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                                    title="Delete run"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                              {run.notes ? (
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                  {run.notes}
                                                </p>
                                              ) : (
                                                <p className="text-xs text-slate-400 italic">
                                                  No notes — click edit to add
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Add run button */}
                                <button
                                  onClick={() =>
                                    handleAddRun(machineType, session.id, session.runs.length)
                                  }
                                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-dashed border-slate-300 hover:border-blue-300 px-3 py-2 rounded-lg w-full justify-center transition-colors"
                                >
                                  <Plus size={12} />
                                  Add run
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Participant">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
            <input
              type="number"
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              min={0}
              max={120}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
              <div className="flex gap-2">
                {(['male', 'female'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditGender(editGender === g ? undefined : g)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      editGender === g
                        ? g === 'male'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-pink-500 text-white border-pink-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-base leading-none">{g === 'male' ? '♂' : '♀'}</span>
                    <span className="capitalize">{g}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Handedness</label>
              <div className="flex gap-2">
                {(['right', 'left'] as Handedness[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setEditHandedness(editHandedness === h ? undefined : h)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      editHandedness === h
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-base leading-none">{h === 'right' ? '🤜' : '🤛'}</span>
                    <span className="capitalize">{h}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Acquisition date
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex gap-2">
              {(['recruited', 'upcoming', 'completed'] as ParticipantStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                    editStatus === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
