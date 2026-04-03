import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Study, Participant, MachineSession, MachineTrack, MachineType, Run } from '../types';

interface StudyState {
  studies: Study[];
  // Study CRUD
  addStudy: (study: Study) => void;
  updateStudy: (studyId: string, updates: Partial<Study>) => void;
  deleteStudy: (studyId: string) => void;
  // Participant CRUD
  addParticipant: (studyId: string, participant: Participant) => void;
  updateParticipant: (studyId: string, participantId: string, updates: Partial<Participant>) => void;
  deleteParticipant: (studyId: string, participantId: string) => void;
  // Machine-session CRUD
  saveMachineSession: (studyId: string, participantId: string, machineType: MachineType, session: MachineSession) => void;
  updateMachineSession: (studyId: string, participantId: string, machineType: MachineType, sessionId: string, updates: Partial<MachineSession>) => void;
  deleteMachineSession: (studyId: string, participantId: string, machineType: MachineType, sessionId: string) => void;
  // Run editing
  updateRun: (studyId: string, participantId: string, machineType: MachineType, sessionId: string, runId: string, updates: Partial<Run>) => void;
  addRun: (studyId: string, participantId: string, machineType: MachineType, sessionId: string, run: Run) => void;
  deleteRun: (studyId: string, participantId: string, machineType: MachineType, sessionId: string, runId: string) => void;
}

// ─── Migration ───────────────────────────────────────────────────────────────
// Converts old localStorage shape (sessions with acquisitions) → new machineTracks shape.

function migrateStudies(studies: Study[]): Study[] {
  return studies.map((study) => ({
    ...study,
    participants: study.participants.map((p, idx) => migrateParticipant(p, idx)),
  }));
}

function migrateParticipant(p: any, idx: number): Participant {
  // Already migrated
  if (Array.isArray(p.machineTracks)) {
    return {
      ...p,
      machineTracks: p.machineTracks.map(migrateTrack),
      anatomicalMRI: migrateAnatomicalMRI(p.anatomicalMRI),
      subjectId: p.subjectId ?? `sub-${String(idx + 1).padStart(2, '0')}`,
    } as Participant;
  }

  // Old shape: p.sessions = [{ acquisitions: [{machineType, runs}], date, completed }]
  const oldSessions: any[] = p.sessions ?? [];
  const trackMap: Record<string, MachineSession[]> = {};

  for (const oldSess of oldSessions) {
    const acqs: any[] = oldSess.acquisitions ?? [];
    for (const acq of acqs) {
      const mt: string = acq.machineType;
      if (!trackMap[mt]) trackMap[mt] = [];
      const sess: MachineSession = {
        id: crypto.randomUUID(),
        sessionNumber: trackMap[mt].length + 1,
        date: oldSess.date ?? new Date().toISOString().split('T')[0],
        notes: '',
        runs: (acq.runs ?? []).map((r: any) => ({
          ...r,
          participantState: r.participantState ?? '😐 Neutral',
        })),
        completed: oldSess.completed ?? false,
      };
      trackMap[mt].push(sess);
    }
  }

  const machineTracks: MachineTrack[] = Object.entries(trackMap).map(
    ([mt, sessions]) => ({ machineType: mt as MachineType, sessions })
  );

  return {
    ...p,
    subjectId: p.subjectId ?? `sub-${String(idx + 1).padStart(2, '0')}`,
    anatomicalMRI: migrateAnatomicalMRI(p.anatomicalMRI),
    machineTracks,
  } as Participant;
}

function migrateTrack(t: any): MachineTrack {
  return {
    machineType: t.machineType,
    sessions: (t.sessions ?? []).map((s: any) => ({
      ...s,
      notes: s.notes ?? '',
      runs: (s.runs ?? []).map((r: any) => ({
        ...r,
        participantState: r.participantState ?? '😐 Neutral',
      })),
    })),
  };
}

function migrateAnatomicalMRI(old: any): Participant['anatomicalMRI'] {
  if (!old) return {};
  // Old shape: { acquired: boolean; date?: string }  → put in '3T' by default
  if (typeof old.acquired === 'boolean') {
    return old.acquired ? { '3T': { acquired: true, date: old.date } } : {};
  }
  // Already new shape: { '3T'?: ..., '7T'?: ... }
  return old;
}

// ─── Deep update helpers ──────────────────────────────────────────────────────

function updateTrack(
  tracks: MachineTrack[],
  machineType: MachineType,
  fn: (t: MachineTrack) => MachineTrack
): MachineTrack[] {
  return tracks.map((t) => (t.machineType === machineType ? fn(t) : t));
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      studies: [],

      // ── Study ────────────────────────────────────────────────────────────────

      addStudy: (study) =>
        set((s) => ({ studies: [...s.studies, study] })),

      updateStudy: (studyId, updates) =>
        set((s) => ({
          studies: s.studies.map((st) => (st.id === studyId ? { ...st, ...updates } : st)),
        })),

      deleteStudy: (studyId) =>
        set((s) => ({ studies: s.studies.filter((st) => st.id !== studyId) })),

      // ── Participant ──────────────────────────────────────────────────────────

      addParticipant: (studyId, participant) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id === studyId
              ? { ...st, participants: [...st.participants, participant] }
              : st
          ),
        })),

      updateParticipant: (studyId, participantId, updates) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id === participantId ? { ...p, ...updates } : p
                  ),
                }
          ),
        })),

      deleteParticipant: (studyId, participantId) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : { ...st, participants: st.participants.filter((p) => p.id !== participantId) }
          ),
        })),

      // ── Machine sessions ─────────────────────────────────────────────────────

      saveMachineSession: (studyId, participantId, machineType, session) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) => {
                    if (p.id !== participantId) return p;

                    const existingIdx = p.machineTracks.findIndex(
                      (t) => t.machineType === machineType
                    );

                    if (existingIdx >= 0) {
                      // Track exists → add or update session
                      const tracks = [...p.machineTracks];
                      const track = tracks[existingIdx];
                      const sessIdx = track.sessions.findIndex((ses) => ses.id === session.id);
                      const sessions =
                        sessIdx >= 0
                          ? track.sessions.map((ses, i) => (i === sessIdx ? session : ses))
                          : [...track.sessions, session];
                      tracks[existingIdx] = { ...track, sessions };
                      return { ...p, machineTracks: tracks };
                    } else {
                      // Create new track for this machine
                      return {
                        ...p,
                        machineTracks: [
                          ...p.machineTracks,
                          { machineType, sessions: [session] },
                        ],
                      };
                    }
                  }),
                }
          ),
        })),

      updateMachineSession: (studyId, participantId, machineType, sessionId, updates) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id !== participantId
                      ? p
                      : {
                          ...p,
                          machineTracks: updateTrack(p.machineTracks, machineType, (t) => ({
                            ...t,
                            sessions: t.sessions.map((ses) =>
                              ses.id === sessionId ? { ...ses, ...updates } : ses
                            ),
                          })),
                        }
                  ),
                }
          ),
        })),

      deleteMachineSession: (studyId, participantId, machineType, sessionId) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id !== participantId
                      ? p
                      : {
                          ...p,
                          machineTracks: updateTrack(p.machineTracks, machineType, (t) => ({
                            ...t,
                            sessions: t.sessions.filter((ses) => ses.id !== sessionId),
                          })),
                        }
                  ),
                }
          ),
        })),

      // ── Run editing ──────────────────────────────────────────────────────────

      updateRun: (studyId, participantId, machineType, sessionId, runId, updates) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id !== participantId
                      ? p
                      : {
                          ...p,
                          machineTracks: updateTrack(p.machineTracks, machineType, (t) => ({
                            ...t,
                            sessions: t.sessions.map((ses) =>
                              ses.id !== sessionId
                                ? ses
                                : {
                                    ...ses,
                                    runs: ses.runs.map((r) =>
                                      r.id === runId ? { ...r, ...updates } : r
                                    ),
                                  }
                            ),
                          })),
                        }
                  ),
                }
          ),
        })),

      addRun: (studyId, participantId, machineType, sessionId, run) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id !== participantId
                      ? p
                      : {
                          ...p,
                          machineTracks: updateTrack(p.machineTracks, machineType, (t) => ({
                            ...t,
                            sessions: t.sessions.map((ses) =>
                              ses.id !== sessionId ? ses : { ...ses, runs: [...ses.runs, run] }
                            ),
                          })),
                        }
                  ),
                }
          ),
        })),

      deleteRun: (studyId, participantId, machineType, sessionId, runId) =>
        set((s) => ({
          studies: s.studies.map((st) =>
            st.id !== studyId
              ? st
              : {
                  ...st,
                  participants: st.participants.map((p) =>
                    p.id !== participantId
                      ? p
                      : {
                          ...p,
                          machineTracks: updateTrack(p.machineTracks, machineType, (t) => ({
                            ...t,
                            sessions: t.sessions.map((ses) =>
                              ses.id !== sessionId
                                ? ses
                                : { ...ses, runs: ses.runs.filter((r) => r.id !== runId) }
                            ),
                          })),
                        }
                  ),
                }
          ),
        })),
    }),
    {
      name: 'neurexp-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.studies = migrateStudies(state.studies);
        }
      },
    }
  )
);
