import { useState } from 'react';
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
} from '../utils/helpers';
import type { Participant, ChecklistItem, Study } from '../types';

export function StudyDetail() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { studies, addParticipant, updateStudy, deleteStudy, deleteParticipant } = useStudyStore();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showEditStudy, setShowEditStudy] = useState(false);
  const [showChecklistEditor, setShowChecklistEditor] = useState(false);
  const [checklistInput, setChecklistInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'recruited' | 'upcoming' | 'completed'>('all');
  const [search, setSearch] = useState('');

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
    if (
      window.confirm(
        `Remove participant ${p.subjectId} (${p.nip}) from this study? This will delete all their session data.`
      )
    ) {
      deleteParticipant(study.id, p.id);
    }
  };

  const handleDeleteStudy = () => {
    if (window.confirm(`Delete study "${study.name}"? This cannot be undone.`)) {
      deleteStudy(study.id);
      navigate('/');
    }
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

  // Filtering and search
  const filtered = study.participants.filter((p) => {
    const matchesStatus = filter === 'all' || p.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.subjectId.toLowerCase().includes(q) ||
      p.nip.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    recruited: study.participants.filter((p) => p.status === 'recruited').length,
    upcoming: study.participants.filter((p) => p.status === 'upcoming').length,
    completed: study.participants.filter((p) => p.status === 'completed').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Studies
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium truncate max-w-xs">{study.name}</span>
      </div>

      {/* Study header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{study.name}</h1>
              <StudyStatusBadge status={status} />
            </div>
            {study.description && (
              <p className="text-slate-500 mb-4 leading-relaxed max-w-2xl">{study.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
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
            <div className="text-4xl font-bold text-slate-900">{completed}</div>
            <div className="text-sm text-slate-500 mb-2">of {total} participants</div>
            <div className="w-28 bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowEditStudy(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Pencil size={13} />
              Edit Study
            </button>
            <button
              onClick={() => exportStudyToCSV(study)}
              className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={() => downloadStudyReport(study)}
              className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <FileText size={13} />
              HTML Report
            </button>
          </div>
          <button
            onClick={handleDeleteStudy}
            className="flex items-center gap-1.5 text-sm text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
            Delete study
          </button>
        </div>
      </div>

      {/* Participants table */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Participants
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({study.participants.length} enrolled / {total} expected)
              </span>
            </h2>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
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
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users size={36} className="mx-auto mb-3 text-slate-200" />
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
                <tr className="text-xs font-medium text-slate-400 uppercase tracking-wide bg-slate-50">
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
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => {
                  const { completed: sc, total: st } = getParticipantSessionProgress(p, study);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/studies/${study.id}/participants/${p.id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                        {p.subjectId}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.nip}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.age > 0 ? `${p.age} y` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.gender
                          ? <span className={p.gender === 'male' ? 'text-blue-600 font-medium' : 'text-pink-500 font-medium'}>{p.gender === 'male' ? '♂ M' : '♀ F'}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.handedness
                          ? <span>{p.handedness === 'right' ? '🤜 R' : '🤛 L'}</span>
                          : <span className="text-slate-300">—</span>}
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
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-400'
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
                          <div className="w-14 bg-slate-100 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${st > 0 ? (sc / st) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
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
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => setShowChecklistEditor(!showChecklistEditor)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <span className="font-semibold text-slate-900">Preparation Checklist</span>
            <span className="text-sm text-slate-400">
              ({study.preparationChecklist.length} items)
            </span>
          </div>
          <ChevronRight
            size={16}
            className={`text-slate-400 transition-transform ${showChecklistEditor ? 'rotate-90' : ''}`}
          />
        </button>

        {showChecklistEditor && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 mb-4">
              Items are shown step-by-step during the acquisition preparation phase.
            </p>
            {study.preparationChecklist.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">No checklist items yet.</p>
            ) : (
              <div className="space-y-1.5 mb-4">
                {study.preparationChecklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 group py-1">
                    <span className="text-xs text-slate-300 w-5 text-right shrink-0">{idx + 1}</span>
                    <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                    <button
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
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
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addChecklistItem}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
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
    </div>
  );
}
