import { X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-xl shadow-xl animate-in">
      <span className="text-sm">{message}</span>
      <button
        onClick={onUndo}
        className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
      >
        Undo
      </button>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
