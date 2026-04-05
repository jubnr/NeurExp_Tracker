import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Play,
  ChevronRight,
  Users,
  Layers,
  GitBranch,
  Settings,
  Download,
  Trash2,
  Pencil,
  Search,
  FileText,
  Brain,
  Copy,
  ImagePlus,
  X,
} from 'lucide-react';
import { useStudyStore } from '../store/studyStore';
import { AddParticipantModal } from '../components/AddParticipantModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { EditStudyModal } from '../components/EditStudyModal';
import { StudyStatusBadge } from '../components/StatusBadge';
import { ParticipantStatusBadge } from '../components/StatusBadge';
import { MachineBadge } from '../components/MachineBadge';
import {
  getStudyStatus,
  getStudyProgress,
  formatDate,
  getParticipantSessionProgress,
  exportStudyToCSV,
  downloadStudyReport,
  downloadParticipantsToImportTSV,
} from '../utils/helpers';
import { UndoToast } from '../components/UndoToast';
import type { Participant, ChecklistItem, Study, MachineType } from '../types';

export function StudyDetail() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { studies, addStudy, addParticipant, updateStudy, deleteStudy, deleteParticipant } = useStudyStore();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showEditStudy, setShowEditStudy] = useState(false);
  const [showChecklistEditor, setShowChecklistEditor] = useState(false);
  const [checklistInput, setChecklistInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'recruited' | 'upcoming' | 'completed'>('all');
  const [machineFilter, setMachineFilter] = useState<MachineType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [confirmDeleteStudy, setConfirmDeleteStudy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const study = studies.find((s) => s.id === studyId);

  if (!study) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-500">Study not found.</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const status = getStudyStatus(study);
  const { completed, total } = getStudyProgress(study);
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const handleAddParticipant = (participant: Participant) => {
    addParticipant(study.id, participant);
    setShowAddParticipant(false);
  };

  const handleBulkImport = (participants: Participant[]) => {
    participants.forEach((p) => addParticipant(study.id, p));
  };

  const handleDeleteParticipant = (p: Participant, e: React.MouseEvent) => {
    e.stopPropagation();
    // Cancel any in-flight deletion and execute it immediately
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    const label = `${p.subjectId} removed.`;
    setToastMsg(label);
    toastTimer.current = setTimeout(() => {
      deleteParticipant(study.id, p.id);
      setToastMsg(null);
      toastTimer.current = null;
    }, 5000);
  };

  const undoDelete = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToastMsg(null);
  };

  const handleDeleteStudy = () => {
    deleteStudy(study.id);
    navigate('/');
  };

  const handleDuplicate = () => {
    const duplicate = {
      ...study,
      id: crypto.randomUUID(),
      name: `${study.name} (copy)`,
      participants: [],
    };
    addStudy(duplicate);
    navigate(`/studies/${duplicate.id}`);
  };

  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: checklistInput.trim(),
    };
    updateStudy(study.id, {
      preparationChecklist: [...study.preparationChecklist, newItem],
    });
    setChecklistInput('');
  };

  const removeChecklistItem = (itemId: string) => {
    updateStudy(study.id, {
      preparationChecklist: study.preparationChecklist.filter((i) => i.id !== itemId),
    });
  };

  const setChecklistItemImage = (itemId: string, image: string | undefined) => {
    updateStudy(study.id, {
      preparationChecklist: study.preparationChecklist.map((i) =>
        i.id === itemId ? { ...i, image } : i
      ),
    });
  };

  const handleChecklistImageUpload = (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') setChecklistItemImage(itemId, result);
    };
    reader.readAsDataURL(file);
  };

  // Filtering and search
  const filtered = study.participants.filter((p) => {
    const matchesStatus = filter === 'all' || p.status === filter;
    const matchesMachine =
      machineFilter === 'all' ||
      p.machineTracks.some((t) => t.machineType === machineFilter);
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.subjectId.toLowerCase().includes(q) ||
      p.nip.toLowerCase().includes(q);
    return matchesStatus && matchesMachine && matchesSearch;
  });

  const counts = {
    recruited: study.participants.filter((p) => p.status === 'recruited').length,
    upcoming: study.participants.filter((p) => p.status === 'upcoming').length,
    completed: study.participants.filter((p) => p.status === 'completed').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Studies
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-xs">{study.name}</span>
      </div>

      {/* Study header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{study.name}</h1>
              <StudyStatusBadge status={status} />
            </div>
            {study.description && (
              <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-2xl">{study.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex gap-1.5">
                {study.machineTypes.map((m) => (
                  <MachineBadge key={m} machine={m} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                {/* Progress: participants completed vs total expected — not sessions */}
                <span>{completed} / {total} participants completed</span>
              </div>
              <div className="flex items-center gap-1">
                <Layers size={14} />
                <span>
                  {study.sessionsPerParticipant} session{study.sessionsPerParticipant > 1 ? 's' : ''}
                  &nbsp;·&nbsp;
                  {study.runsPerSession} run{study.runsPerSession > 1 ? 's' : ''}/session
                </span>
              </div>
              {study.hasRestingState && (
                <div className="flex items-center gap-1">
                  <GitBranch size={14} />
                  <span>Resting state</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress block */}
          <div className="text-right shrink-0">
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">{completed}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">of {total} participants</div>
            <div className="w-28 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowEditStudy(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Pencil size={13} />
              Edit Study
            </button>
            <button
              onClick={() => exportStudyToCSV(study)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={() => downloadStudyReport(study)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <FileText size={13} />
              HTML Report
            </button>
            <button
              onClick={() => downloadParticipantsToImportTSV(study.participants)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Brain size={13} />
              TSV Import
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Copy size={13} />
              Duplicate
            </button>
          </div>
          {confirmDeleteStudy ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400">Delete study permanently?</span>
              <button
                onClick={handleDeleteStudy}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDeleteStudy(false)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteStudy(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13} />
              Delete study
            </button>
          )}
        </div>
      </div>

      {/* Participants table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Participants
              <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                ({study.participants.length} enrolled / {total} expected)
              </span>
            </h2>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              title="Import multiple participants from a spreadsheet"
            >
              <Plus size={14} />
              Bulk Import
            </button>
            <button
              onClick={() => setShowAddParticipant(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add Participant
            </button>
          </div>

          {/* Search + filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by subject ID or NIP..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'recruited', label: `Recruited (${counts.recruited})` },
                  { key: 'upcoming', label: `Upcoming (${counts.upcoming})` },
                  { key: 'completed', label: `Done (${counts.completed})` },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Machine filter — only shown if study uses more than one machine */}
            {study.machineTypes.length > 1 && (
              <div className="flex gap-1.5 flex-wrap border-l border-slate-200 dark:border-slate-700 pl-3">
                <button
                  onClick={() => setMachineFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    machineFilter === 'all'
                      ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  All machines
                </button>
                {study.machineTypes.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMachineFilter(m)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      machineFilter === m
                        ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <Users size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-600" />
            <p className="text-sm">
              {study.participants.length === 0
                ? 'No participants yet — add the first one above.'
                : 'No participants match this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3">Subject ID</th>
                  <th className="text-left px-4 py-3">NIP</th>
                  <th className="text-left px-4 py-3">Age</th>
                  <th className="text-left px-4 py-3">Gender</th>
                  <th className="text-left px-4 py-3">Handedness</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Anat. MRI</th>
                  <th className="text-left px-4 py-3">Sessions</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filtered.map((p) => {
                  const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/studies/${study.id}/participants/${p.id}`)}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {p.subjectId}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.nip}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {p.age > 0 ? `${p.age} y` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.gender
                          ? <span className={p.gender === 'male' ? 'text-blue-600 font-medium' : 'text-pink-500 font-medium'}>{p.gender === 'male' ? '♂ M' : '♀ F'}</span>
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {p.handedness
                          ? <span>{p.handedness === 'right' ? '🤜 R' : '🤛 L'}</span>
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <ParticipantStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1.5">
                          {(['3T', '7T'] as const).map((field) => {
                            const rec = p.anatomicalMRI?.[field];
                            return (
                              <span
                                key={field}
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  rec?.acquired
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                                }`}
                              >
                                {field}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">{sc}/{st}</span>
                          <div className="w-14 bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${st > 0 ? (sc / st) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {p.acquisitionDate ? formatDate(p.acquisitionDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/studies/${study.id}/participants/${p.id}/acquire`);
                            }}
                            disabled={p.status === 'completed'}
                            className="inline-flex items-center gap-1 bg-green-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Play size={11} />
                            Acquire
                          </button>
                          <button
                            onClick={(e) => handleDeleteParticipant(p, e)}
                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove participant"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preparation checklist editor */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowChecklistEditor(!showChecklistEditor)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Preparation Checklist</span>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              ({study.preparationChecklist.length} items)
            </span>
          </div>
          <ChevronRight
            size={16}
            className={`text-slate-400 transition-transform ${showChecklistEditor ? 'rotate-90' : ''}`}
          />
        </button>

        {showChecklistEditor && (
          <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Items are shown step-by-step during the acquisition preparation phase.
            </p>
            {study.preparationChecklist.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">No checklist items yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {study.preparationChecklist.map((item, idx) => (
                  <div key={item.id} className="group border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 dark:text-slate-600 w-5 text-right shrink-0">{idx + 1}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{item.label}</span>
                      {/* Image upload */}
                      <label
                        className="cursor-pointer p-1 rounded text-slate-300 dark:text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Attach image"
                      >
                        <ImagePlus size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleChecklistImageUpload(item.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        onClick={() => removeChecklistItem(item.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                    {item.image && (
                      <div className="mt-2 ml-8 relative inline-block">
                        <img src={item.image} alt="" className="h-20 rounded object-contain border border-slate-200 dark:border-slate-600" />
                        <button
                          onClick={() => setChecklistItemImage(item.id, undefined)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                placeholder="Add checklist item..."
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addChecklistItem}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddParticipantModal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        onSubmit={handleAddParticipant}
        existingParticipants={study.participants}
      />
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
        existingParticipants={study.participants}
      />
      <EditStudyModal
        open={showEditStudy}
        onClose={() => setShowEditStudy(false)}
        study={study}
        onSave={(updates: Partial<Study>) => updateStudy(study.id, updates)}
      />
      {toastMsg && (
        <UndoToast message={toastMsg} onUndo={undoDelete} onDismiss={undoDelete} />
      )}
    </div>
  );
}
