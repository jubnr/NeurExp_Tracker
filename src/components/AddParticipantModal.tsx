import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './Modal';
import type { Participant, Gender, Handedness } from '../types';
import { generateSubjectId } from '../utils/helpers';

interface AddParticipantModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (participant: Participant) => void;
  existingParticipants: Participant[];
}

export function AddParticipantModal({
  open,
  onClose,
  onSubmit,
  existingParticipants,
}: AddParticipantModalProps) {
  const [subjectId, setSubjectId] = useState('');
  const [nip, setNip] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [handedness, setHandedness] = useState<Handedness | undefined>(undefined);
  const [acquisitionDate, setAcquisitionDate] = useState('');
  // Anatomical MRI — 3T
  const [anat3TAcquired, setAnat3TAcquired] = useState(false);
  const [anat3TDate, setAnat3TDate] = useState('');
  // Anatomical MRI — 7T
  const [anat7TAcquired, setAnat7TAcquired] = useState(false);
  const [anat7TDate, setAnat7TDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSubjectId(generateSubjectId(existingParticipants));
    }
  }, [open, existingParticipants]);

  const handleClose = () => {
    setSubjectId('');
    setNip('');
    setAge('');
    setGender(undefined);
    setHandedness(undefined);
    setAcquisitionDate('');
    setAnat3TAcquired(false);
    setAnat3TDate('');
    setAnat7TAcquired(false);
    setAnat7TDate('');
    setError('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedNip = nip.trim().toUpperCase();
    if (!normalizedNip) { setError('NIP is required'); return; }
    if (existingParticipants.some((p) => p.nip === normalizedNip)) {
      setError('This NIP already exists in the study');
      return;
    }
    if (!subjectId.trim()) { setError('Subject ID is required'); return; }

    const participant: Participant = {
      id: uuidv4(),
      subjectId: subjectId.trim(),
      nip: normalizedNip,
      age: age ? Number(age) : 0,
      gender,
      handedness,
      status: acquisitionDate ? 'upcoming' : 'recruited',
      acquisitionDate: acquisitionDate || undefined,
      anatomicalMRI: {
        ...(anat3TAcquired ? { '3T': { acquired: true, date: anat3TDate || undefined } } : {}),
        ...(anat7TAcquired ? { '7T': { acquired: true, date: anat7TDate || undefined } } : {}),
      },
      machineTracks: [],
      createdAt: new Date().toISOString(),
    };

    onSubmit(participant);
    handleClose();
  };

  const inputClass =
    'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <Modal open={open} onClose={handleClose} title="Add Participant" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* IDs row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subject ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="sub-01"
              required
              className={inputClass}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Auto-generated, editable</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              NIP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="e.g. AB1234"
              required
              autoFocus
              className={inputClass}
            />
          </div>
        </div>

        {/* Age + date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 28"
              min={0}
              max={120}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Acquisition date
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Gender + Handedness */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gender</label>
            <div className="flex gap-2">
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(gender === g ? undefined : g)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    gender === g
                      ? g === 'male'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="text-base leading-none">{g === 'male' ? '♂' : '♀'}</span>
                  <span className="capitalize">{g}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Handedness</label>
            <div className="flex gap-2">
              {(['right', 'left'] as Handedness[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHandedness(handedness === h ? undefined : h)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    handedness === h
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="text-base leading-none">{h === 'right' ? '🤜' : '🤛'}</span>
                  <span className="capitalize">{h}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Anatomical MRI */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Anatomical MRI</p>
          {/* 3T */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600 dark:text-slate-400 w-6 shrink-0">3T</span>
            <button
              type="button"
              onClick={() => setAnat3TAcquired(!anat3TAcquired)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                anat3TAcquired
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {anat3TAcquired ? '✓ Acquired' : '○ Not acquired'}
            </button>
            {anat3TAcquired && (
              <input
                type="date"
                value={anat3TDate}
                onChange={(e) => setAnat3TDate(e.target.value)}
                placeholder="Date"
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          {/* 7T */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600 dark:text-slate-400 w-6 shrink-0">7T</span>
            <button
              type="button"
              onClick={() => setAnat7TAcquired(!anat7TAcquired)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                anat7TAcquired
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {anat7TAcquired ? '✓ Acquired' : '○ Not acquired'}
            </button>
            {anat7TAcquired && (
              <input
                type="date"
                value={anat7TDate}
                onChange={(e) => setAnat7TDate(e.target.value)}
                placeholder="Date"
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Participant
          </button>
        </div>
      </form>
    </Modal>
  );
}
