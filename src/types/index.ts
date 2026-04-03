export type MachineType = 'MEG' | '3T MRI' | '7T MRI';
export type StudyStatus = 'to_be_scheduled' | 'recruiting' | 'completed';
export type ParticipantStatus = 'recruited' | 'upcoming' | 'completed';

// ─── Run (leaf-level data) ───────────────────────────────────────────────────

export interface Run {
  id: string;
  runNumber: number;
  isRestingState: boolean;
  participantState: string; // e.g. '😀 Attentive'
  notes: string;
  completed: boolean;
  completedAt?: string;
}

// ─── Machine-based session hierarchy ────────────────────────────────────────

export interface MachineSession {
  id: string;
  sessionNumber: number; // sequential within this machine track
  date: string;
  notes: string;         // session-level summary notes (separate from run notes)
  runs: Run[];
  completed: boolean;
}

export interface MachineTrack {
  machineType: MachineType;
  sessions: MachineSession[];
}

// ─── Anatomical MRI ──────────────────────────────────────────────────────────

export interface AnatomicalMRIRecord {
  acquired: boolean;
  date?: string;
}

// Keyed by '3T' or '7T'; a participant may have one, both, or neither.
export type AnatomicalMRIMap = {
  '3T'?: AnatomicalMRIRecord;
  '7T'?: AnatomicalMRIRecord;
};

// ─── Participant ─────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female';
export type Handedness = 'right' | 'left';

export interface Participant {
  id: string;
  subjectId: string;         // e.g. 'sub-01'
  nip: string;
  age: number;
  gender?: Gender;
  handedness?: Handedness;
  status: ParticipantStatus;
  acquisitionDate?: string;
  anatomicalMRI: AnatomicalMRIMap;
  machineTracks: MachineTrack[]; // one entry per machine type used so far
  notes?: string;            // free-text participant-level notes
  createdAt: string;
}

// ─── Study ───────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface Study {
  id: string;
  name: string;
  description: string;
  machineTypes: MachineType[];
  expectedParticipants: number;
  sessionsPerParticipant: number; // target sessions per machine type per participant
  runsPerSession: number;
  hasRestingState: boolean;
  preparationChecklist: ChecklistItem[];
  participants: Participant[];
  createdAt: string;
}
