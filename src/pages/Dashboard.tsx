import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FlaskConical, Search } from 'lucide-react';
import { useStudyStore } from '../store/studyStore';
import { CreateStudyModal } from '../components/CreateStudyModal';
import { StudyStatusBadge } from '../components/StatusBadge';
import { MachineBadge } from '../components/MachineBadge';
import { BorderGlow } from '../components/BorderGlow';
import { getStudyStatus, getStudyProgress } from '../utils/helpers';
import { useDarkMode } from '../hooks/useDarkMode';
import type { Study, MachineType } from '../types';

export function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState<MachineType | 'all'>('all');
  const { studies, addStudy } = useStudyStore();
  const navigate = useNavigate();
  const { isDark } = useDarkMode();

  const handleCreate = (study: Study) => {
    addStudy(study);
    setShowModal(false);
    navigate(`/studies/${study.id}`);
  };

  // Collect all machine types used across studies
  const allMachineTypes = Array.from(
    new Set(studies.flatMap((s) => s.machineTypes))
  ) as MachineType[];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Studies</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {studies.length === 0
              ? 'No studies yet'
              : `${studies.length} ${studies.length === 1 ? 'study' : 'studies'}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Study
        </button>
      </div>

      {/* Search + machine filter */}
      {studies.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studies…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          {allMachineTypes.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
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
              {allMachineTypes.map((m) => (
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
      )}

      {/* Empty state / grid */}
      {studies.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <FlaskConical size={44} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No studies yet</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
            Create your first study to start tracking neuroimaging acquisitions across your
            participants.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create your first study
          </button>
        </div>
      ) : (
        /* Study grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studies
            .filter((s) => {
              const matchesSearch =
                search.trim() === '' ||
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.description.toLowerCase().includes(search.toLowerCase());
              const matchesMachine =
                machineFilter === 'all' || s.machineTypes.includes(machineFilter);
              return matchesSearch && matchesMachine;
            })
            .map((study) => {
            const status = getStudyStatus(study);
            const { completed, total } = getStudyProgress(study);
            const progress = total > 0 ? (completed / total) * 100 : 0;

            return (
              <BorderGlow
                key={study.id}
                onClick={() => navigate(`/studies/${study.id}`)}
                className="cursor-pointer group transition-transform duration-200 hover:scale-[1.05]"
                backgroundColor={isDark ? '#1e293b' : '#ffffff'}
                edgeSensitivity={0}
              >
                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">
                      {study.name}
                    </h3>
                    <StudyStatusBadge status={status} size="sm" />
                  </div>

                  {/* Description */}
                  {study.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                      {study.description}
                    </p>
                  )}

                  {/* Machine badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {study.machineTypes.map((m) => (
                      <MachineBadge key={m} machine={m} />
                    ))}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Participants</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {completed} / {total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                    <span>
                      {study.sessionsPerParticipant} session
                      {study.sessionsPerParticipant > 1 ? 's' : ''}
                    </span>
                    <span>·</span>
                    <span>
                      {study.runsPerSession} run{study.runsPerSession > 1 ? 's' : ''}
                    </span>
                    {study.hasRestingState && (
                      <>
                        <span>·</span>
                        <span>Resting state</span>
                      </>
                    )}
                  </div>
                </div>
              </BorderGlow>
            );
          })}
        </div>
      )}

      <CreateStudyModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreate} />
    </div>
  );
}
