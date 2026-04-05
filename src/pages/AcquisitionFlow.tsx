import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Brain,
  ClipboardList,
} from 'lucide-react';
import { useStudyStore } from '../store/studyStore';
import { MachineBadge } from '../components/MachineBadge';
import { Stepper, Step } from '../components/Stepper';
import type { MachineSession, Run, MachineType } from '../types';
import { getMachineTrackProgress } from '../utils/helpers';

type WizardStep = 'machine' | 'checklist' | 'session-notes' | 'runs' | 'meg-wrap-up' | 'complete';

const MEG_WRAP_UP = [
  { id: 0, label: 'Shut down the videoprojector' },
  { id: 1, label: 'Clean the electrodes' },
  { id: 2, label: 'Put the MEG in liquefaction mode', note: 'Only if this is the last experiment of the day' },
];

const PARTICIPANT_STATES = [
  { emoji: '😀', label: 'Alert' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😴', label: 'Drowsy' },
  { emoji: '😵', label: 'Struggling' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🏃', label: 'Moved excessively' },
];

export function AcquisitionFlow() {
  const { studyId, participantId } = useParams<{
    studyId: string;
    participantId: string;
  }>();
  const navigate = useNavigate();
  const { studies, saveMachineSession, updateParticipant } = useStudyStore();

  const study = studies.find((s) => s.id === studyId);
  const participant = study?.participants.find((p) => p.id === participantId);

  // Auto-select machine if only one
  const [selectedMachine, setSelectedMachine] = useState<MachineType | null>(
    study?.machineTypes.length === 1 ? study.machineTypes[0] : null
  );
  const [step, setStep] = useState<WizardStep>(
    study?.machineTypes.length === 1 ? 'checklist' : 'machine'
  );


  // Session date (editable, defaults to today)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Session-level notes
  const [sessionNotes, setSessionNotes] = useState('');

  // Anatomical MRI acquired this session (MRI machines only)
  const [anatAcquired, setAnatAcquired] = useState(false);

  // Run data
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [runNotes, setRunNotes] = useState<Record<string, string>>({});
  const [runState, setRunState] = useState<Record<string, string>>({});
  const [runRestingState, setRunRestingState] = useState<Record<string, boolean>>({});

  // Saved on finish to avoid stale-closure bugs
  const [completedSessionNum, setCompletedSessionNum] = useState(0);
  const [completedMachine, setCompletedMachine] = useState<MachineType | null>(null);
  const [participantCompleted, setParticipantCompleted] = useState(false);

  // MEG wrap-up checklist
  const [wrapUpChecked, setWrapUpChecked] = useState<Record<number, boolean>>({});

  if (!study || !participant) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-500">Participant or study not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 text-sm hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const checklist = study.preparationChecklist;

  // Session number for the selected machine (how many sessions already + 1)
  const nextSessionNum = selectedMachine
    ? (getMachineTrackProgress(participant, selectedMachine, study.sessionsPerParticipant).completed + 1)
    : 1;

  const totalRuns = study.runsPerSession;
  const isLastRun = currentRunIndex === totalRuns - 1;
  const runNum = currentRunIndex + 1;

  const handleFinish = () => {
    if (!selectedMachine) return;

    const runs: Run[] = Array.from({ length: totalRuns }, (_, i): Run => ({
      id: crypto.randomUUID(),
      runNumber: i + 1,
      isRestingState: runRestingState[String(i + 1)] ?? false,
      participantState: runState[String(i + 1)] ?? '😐 Neutral',
      notes: runNotes[String(i + 1)] ?? '',
      completed: true,
      completedAt: new Date().toISOString(),
    }));

    const session: MachineSession = {
      id: crypto.randomUUID(),
      sessionNumber: nextSessionNum,
      date: sessionDate,
      notes: sessionNotes,
      runs,
      completed: true,
    };

    saveMachineSession(study.id, participant.id, selectedMachine, session);

    // Determine new participant status: check if every machine track is complete.
    // Note: participant.machineTracks is the PRE-save state here (stale closure), so we
    // add +1 for the machine we just saved.
    const allDone = study.machineTypes.every((mt) => {
      const existing = getMachineTrackProgress(participant, mt, study.sessionsPerParticipant).completed;
      const count = mt === selectedMachine ? existing + 1 : existing;
      return count >= study.sessionsPerParticipant;
    });

    const scannerKey = selectedMachine === '3T MRI' ? '3T' : selectedMachine === '7T MRI' ? '7T' : null;
    updateParticipant(study.id, participant.id, {
      status: allDone ? 'completed' : 'upcoming',
      ...(anatAcquired && scannerKey ? {
        anatomicalMRI: {
          ...participant.anatomicalMRI,
          [scannerKey]: { acquired: true, date: sessionDate },
        },
      } : {}),
    });
    setCompletedSessionNum(nextSessionNum);
    setCompletedMachine(selectedMachine);
    setParticipantCompleted(allDone);
    setStep(selectedMachine === 'MEG' ? 'meg-wrap-up' : 'complete');
  };

  // ─── STEP: MACHINE SELECTION ──────────────────────────────────────────────
  if (step === 'machine') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
        <button
          onClick={() => navigate(`/studies/${studyId}/participants/${participantId}`)}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
        >
          <ChevronLeft size={16} />
          Back to participant
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-600">New Acquisition</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Select Machine</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Participant:{' '}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>
        </p>

        <div className="grid grid-cols-1 gap-3">
          {study.machineTypes.map((m) => {
            const { completed: done, total } = getMachineTrackProgress(
              participant, m, study.sessionsPerParticipant
            );
            const allDone = done >= total;
            return (
              <button
                key={m}
                onClick={() => {
                  setSelectedMachine(m);
                  setStep('checklist');
                }}
                disabled={allDone}
                className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                  allDone
                    ? 'border-green-200 bg-green-50 cursor-not-allowed opacity-60'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
                }`}
              >
                <MachineBadge machine={m} />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {allDone ? `All ${total} sessions completed` : `Session ${done + 1} of ${total}`}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {done}/{total} sessions done
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="w-20 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                  />
                </div>
                {allDone ? (
                  <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                ) : (
                  <ArrowRight size={18} className="text-slate-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── STEP: CHECKLIST (sequential) ─────────────────────────────────────────
  if (step === 'checklist') {
    if (checklist.length === 0) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
          <button
            onClick={() => {
              if (study.machineTypes.length > 1) setStep('machine');
              else navigate(`/studies/${studyId}/participants/${participantId}`);
            }}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center mb-6">
            <ClipboardList size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No checklist items defined.</p>
            <button onClick={() => navigate(`/studies/${studyId}`)} className="text-blue-500 text-sm hover:underline">
              Add checklist items to the study →
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep('session-notes')}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
        <button
          onClick={() => {
            if (study.machineTypes.length > 1) setStep('machine');
            else navigate(`/studies/${studyId}/participants/${participantId}`);
          }}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-blue-600" />
          {selectedMachine && <MachineBadge machine={selectedMachine} />}
          <span className="text-sm font-medium text-blue-600">
            Session {nextSessionNum} · Preparation
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Preparation Checklist</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>
        </p>

        {/* Stepper card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-8 py-8">
          <Stepper
            onComplete={() => setStep('session-notes')}
            nextButtonText="Done"
            finalButtonText="Complete"
          >
            {checklist.map((item) => (
              <Step key={item.id}>
                <div className="flex flex-col items-center text-center py-6 gap-6">
                  <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 leading-snug max-w-sm">
                    {item.label}
                  </p>
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      className="max-h-64 max-w-full rounded-xl object-contain border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                  )}
                </div>
              </Step>
            ))}
          </Stepper>
        </div>

        {/* Skip link */}
        <div className="mt-4 flex justify-start">
          <button
            onClick={() => setStep('session-notes')}
            className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
          >
            Skip all
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: SESSION NOTES ──────────────────────────────────────────────────
  if (step === 'session-notes') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
        <button
          onClick={() => setStep('checklist')}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
        >
          <ChevronLeft size={16} />
          Back to checklist
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-blue-600" />
          {selectedMachine && <MachineBadge machine={selectedMachine} />}
          <span className="text-sm font-medium text-blue-600">
            Session {nextSessionNum} · Pre-session notes
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Session Notes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>
        </p>

        <div className="space-y-4">
          {/* Session date */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Session date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Anatomical MRI (MRI machines only) */}
          {(selectedMachine === '3T MRI' || selectedMachine === '7T MRI') && (() => {
            const scannerKey = selectedMachine === '3T MRI' ? '3T' : '7T';
            const alreadyAcquired = participant.anatomicalMRI[scannerKey]?.acquired;
            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Anatomical MRI ({scannerKey})
                </label>
                {alreadyAcquired && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                    Already recorded for this participant — enabling this will overwrite the existing date.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setAnatAcquired((v) => !v)}
                  className="flex items-center gap-3"
                >
                  <div className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${anatAcquired ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${anatAcquired ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Anatomical scan acquired during this session
                  </span>
                </button>
              </div>
            );
          })()}

          {/* Session notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Overall session notes{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={6}
              placeholder="Overall session quality, issues affecting multiple runs, general observations about setup, participant condition at arrival..."
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              These notes summarise the session as a whole and are separate from per-run notes.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={() => setStep('runs')}
            className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
          >
            Skip
          </button>
          <button
            onClick={() => setStep('runs')}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Start Runs <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: RUNS ───────────────────────────────────────────────────────────
  if (step === 'runs') {
    const key = String(runNum);
    const selectedState = runState[key] ?? '😐 Neutral';

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
        <button
          onClick={() => {
            if (currentRunIndex === 0) setStep('session-notes');
            else setCurrentRunIndex((i) => i - 1);
          }}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
        >
          <ChevronLeft size={16} />
          {currentRunIndex === 0 ? 'Back to session notes' : 'Previous run'}
        </button>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-blue-600" />
            {selectedMachine && <MachineBadge machine={selectedMachine} />}
            <span className="text-sm font-medium text-blue-600">
              Session {nextSessionNum} · Run {runNum} of {totalRuns}
            </span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Run {runNum}</h1>
        <p className="text-sm text-slate-500 mb-5">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>
        </p>

        {/* Run progress */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalRuns }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentRunIndex ? 'bg-green-500' : i === currentRunIndex ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          {/* Participant state */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Participant state
            </label>
            <div className="flex gap-2 flex-wrap">
              {PARTICIPANT_STATES.map(({ emoji, label }) => {
                const value = `${emoji} ${label}`;
                const isSelected = selectedState === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRunState((prev) => ({ ...prev, [key]: value }))}
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <span className={`text-xs font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resting state toggle */}
          {study.hasRestingState && (
            <button
              type="button"
              onClick={() =>
                setRunRestingState((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              className="flex items-center gap-3"
            >
              <div
                className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${
                  runRestingState[key] ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    runRestingState[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Resting state run</span>
            </button>
          )}

          {/* Run notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Run notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={runNotes[key] ?? ''}
              onChange={(e) => setRunNotes((prev) => ({ ...prev, [key]: e.target.value }))}
              rows={6}
              placeholder={`Notes for Run ${runNum}...\nE.g. head movements, stimulus issues, channel noise, participant comments`}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">Run {runNum} of {totalRuns}</p>
          {isLastRun ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 size={15} />
              Finish Acquisition
            </button>
          ) : (
            <button
              onClick={() => setCurrentRunIndex((i) => i + 1)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Next Run <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP: MEG WRAP-UP ───────────────────────────────────────────────────
  if (step === 'meg-wrap-up') {
    const allChecked = MEG_WRAP_UP.slice(0, 2).every((item) => wrapUpChecked[item.id]);

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-blue-600" />
          {selectedMachine && <MachineBadge machine={selectedMachine} />}
          <span className="text-sm font-medium text-blue-600">Session wrap-up</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">End of MEG Session</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>
        </p>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 mb-6">
          {MEG_WRAP_UP.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setWrapUpChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
              className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-colors ${
                wrapUpChecked[item.id] ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  wrapUpChecked[item.id]
                    ? 'border-green-500 bg-green-500'
                    : 'border-slate-300'
                }`}
              >
                {wrapUpChecked[item.id] && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${wrapUpChecked[item.id] ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                  {item.label}
                </p>
                {item.note && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{item.note}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setStep('complete')}
            disabled={!allChecked}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={15} />
            Done
          </button>
        </div>
        {!allChecked && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-2">
            Check the first two items to continue
          </p>
        )}
      </div>
    );
  }

  // ─── STEP: COMPLETE ───────────────────────────────────────────────────────
  if (step === 'complete') {
    const machine = completedMachine ?? selectedMachine;
    const { completed: done, total } = machine
      ? getMachineTrackProgress(participant, machine, study.sessionsPerParticipant)
      : { completed: 0, total: 0 };
    // done is pre-save count; the session we just saved = done + 1
    const sessionsLeft = total - (done + 1);

    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Acquisition Complete</h1>
        {machine && (
          <div className="flex justify-center mb-2">
            <MachineBadge machine={machine} />
          </div>
        )}
        <p className="text-slate-500 dark:text-slate-400 mb-1">
          Session {completedSessionNum} for{' '}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {participant.subjectId} · {participant.nip}
          </span>{' '}
          saved.
        </p>
        <p className="text-sm text-slate-400 mb-2">
          {totalRuns} run{totalRuns > 1 ? 's' : ''} recorded.
        </p>
        {sessionsLeft <= 0 ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-4">
            All {total} sessions completed for this machine.
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            {sessionsLeft} session{sessionsLeft > 1 ? 's' : ''} remaining for this machine.
          </p>
        )}

        {participantCompleted && (
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 rounded-xl px-4 py-3 mb-8 text-sm font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            Participant marked as <strong>completed</strong> — all machines done.
          </div>
        )}
        {!participantCompleted && <div className="mb-8" />}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/studies/${studyId}/participants/${participantId}`)}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View Participant
          </button>
          <button
            onClick={() => navigate(`/studies/${studyId}`)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Study
          </button>
        </div>
      </div>
    );
  }

  return null;
}
