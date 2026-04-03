import type { StudyStatus, ParticipantStatus } from '../types';

const STUDY_STATUS_CONFIG: Record<StudyStatus, { label: string; className: string }> = {
  to_be_scheduled: { label: 'To be scheduled', className: 'bg-slate-100 text-slate-600' },
  recruiting: { label: 'Recruiting', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
};

const PARTICIPANT_STATUS_CONFIG: Record<ParticipantStatus, { label: string; className: string }> = {
  recruited: { label: 'Recruited', className: 'bg-slate-100 text-slate-600' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
};

interface StudyStatusBadgeProps {
  status: StudyStatus;
  size?: 'sm' | 'md';
}

export function StudyStatusBadge({ status, size = 'md' }: StudyStatusBadgeProps) {
  const config = STUDY_STATUS_CONFIG[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}

interface ParticipantStatusBadgeProps {
  status: ParticipantStatus;
  size?: 'sm' | 'md';
}

export function ParticipantStatusBadge({ status, size = 'sm' }: ParticipantStatusBadgeProps) {
  const config = PARTICIPANT_STATUS_CONFIG[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
