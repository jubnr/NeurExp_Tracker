import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { Study } from '../types';

interface EditStudyModalProps {
  open: boolean;
  onClose: () => void;
  study: Study;
  onSave: (updates: Partial<Study>) => void;
}

export function EditStudyModal({ open, onClose, study, onSave }: EditStudyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState(1);
  const [sessionsPerParticipant, setSessionsPerParticipant] = useState(1);
  const [runsPerSession, setRunsPerSession] = useState(1);
  const [hasRestingState, setHasRestingState] = useState(false);

  useEffect(() => {
    if (open) {
      setName(study.name);
      setDescription(study.description);
      setExpectedParticipants(study.expectedParticipants);
      setSessionsPerParticipant(study.sessionsPerParticipant);
      setRunsPerSession(study.runsPerSession);
      setHasRestingState(study.hasRestingState);
    }
  }, [open, study]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      expectedParticipants,
      sessionsPerParticipant,
      runsPerSession,
      hasRestingState,
    });
    onClose();
  };

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <Modal open={open} onClose={onClose} title="Edit Study" size="lg">
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Study name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expected participants
            </label>
            <input
              type="number"
              value={expectedParticipants}
              onChange={(e) => setExpectedParticipants(Math.max(1, Number(e.target.value)))}
              min={1}
              className={inputClass}
            />
            {expectedParticipants < study.participants.length && (
              <p className="text-xs text-amber-600 mt-1">
                Warning: lower than current enrolled count ({study.participants.length})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sessions per participant
            </label>
            <input
              type="number"
              value={sessionsPerParticipant}
              onChange={(e) => setSessionsPerParticipant(Math.max(1, Number(e.target.value)))}
              min={1}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Runs per session
            </label>
            <input
              type="number"
              value={runsPerSession}
              onChange={(e) => setRunsPerSession(Math.max(1, Number(e.target.value)))}
              min={1}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resting-state
            </label>
            <div className="flex gap-2 mt-0.5">
              {(['Yes', 'No'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHasRestingState(opt === 'Yes')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    hasRestingState === (opt === 'Yes')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
