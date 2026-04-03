import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './Modal';
import type { Study, MachineType } from '../types';
import { getDefaultChecklist } from '../utils/helpers';

interface CreateStudyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (study: Study) => void;
}

const MACHINES: MachineType[] = ['MEG', '3T MRI', '7T MRI'];

const MACHINE_ACTIVE_CLASS: Record<MachineType, string> = {
  MEG: 'bg-purple-600 text-white border-purple-600',
  '3T MRI': 'bg-blue-600 text-white border-blue-600',
  '7T MRI': 'bg-emerald-600 text-white border-emerald-600',
};

export function CreateStudyModal({ open, onClose, onSubmit }: CreateStudyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState(20);
  const [sessionsPerParticipant, setSessionsPerParticipant] = useState(1);
  const [runsPerSession, setRunsPerSession] = useState(4);
  const [hasRestingState, setHasRestingState] = useState(false);

  const toggleMachine = (m: MachineType) =>
    setMachineTypes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || machineTypes.length === 0) return;

    const study: Study = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim(),
      machineTypes,
      expectedParticipants,
      sessionsPerParticipant,
      runsPerSession,
      hasRestingState,
      preparationChecklist: getDefaultChecklist(machineTypes),
      participants: [],
      createdAt: new Date().toISOString(),
    };

    onSubmit(study);
    setName('');
    setDescription('');
    setMachineTypes([]);
    setExpectedParticipants(20);
    setSessionsPerParticipant(1);
    setRunsPerSession(4);
    setHasRestingState(false);
  };

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <Modal open={open} onClose={onClose} title="Create New Study" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Study Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Study name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Visual Attention MEG Study"
            required
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of the study goals and protocol..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Machine Types */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Machine type(s) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {MACHINES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMachine(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  machineTypes.includes(m)
                    ? MACHINE_ACTIVE_CLASS[m]
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {machineTypes.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">Select at least one machine type</p>
          )}
        </div>

        {/* Numeric fields */}
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
              Resting-state acquisition
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

        {/* Info about auto-checklist */}
        {machineTypes.length > 0 && (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            A preparation checklist will be auto-generated based on your selected machines. You can
            edit it after creation.
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || machineTypes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Study
          </button>
        </div>
      </form>
    </Modal>
  );
}
