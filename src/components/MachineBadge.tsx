import type { MachineType } from '../types';

const MACHINE_CONFIG: Record<MachineType, { label: string; className: string }> = {
  MEG: { label: 'MEG', className: 'bg-purple-100 text-purple-700' },
  '3T MRI': { label: '3T MRI', className: 'bg-blue-100 text-blue-700' },
  '7T MRI': { label: '7T MRI', className: 'bg-emerald-100 text-emerald-700' },
};

interface MachineBadgeProps {
  machine: MachineType;
}

export function MachineBadge({ machine }: MachineBadgeProps) {
  const config = MACHINE_CONFIG[machine];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
