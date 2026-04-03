import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FlaskConical } from 'lucide-react';
import { useStudyStore } from '../store/studyStore';
import { CreateStudyModal } from '../components/CreateStudyModal';
import { StudyStatusBadge } from '../components/StatusBadge';
import { MachineBadge } from '../components/MachineBadge';
import { getStudyStatus, getStudyProgress } from '../utils/helpers';
import type { Study } from '../types';

export function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const { studies, addStudy } = useStudyStore();
  const navigate = useNavigate();

  const handleCreate = (study: Study) => {
    addStudy(study);
    setShowModal(false);
    navigate(`/studies/${study.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Studies</h1>
          <p className="text-sm text-slate-500 mt-0.5">
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

      {/* Empty state */}
      {studies.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-xl">
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
          {studies.map((study) => {
            const status = getStudyStatus(study);
            const { completed, total } = getStudyProgress(study);
            const progress = total > 0 ? (completed / total) * 100 : 0;

            return (
              <div
                key={study.id}
                onClick={() => navigate(`/studies/${study.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                    {study.name}
                  </h3>
                  <StudyStatusBadge status={status} size="sm" />
                </div>

                {/* Description */}
                {study.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">
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
                    <span>Participants</span>
                    <span>
                      {completed} / {total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 flex-wrap">
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
            );
          })}
        </div>
      )}

      <CreateStudyModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreate} />
    </div>
  );
}
