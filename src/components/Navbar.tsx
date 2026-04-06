import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Download, Upload, AlertCircle } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { exportBackup, importBackup } from '../utils/helpers';
import { SplitText } from './SplitText';

export function Navbar() {
  const { isDark, toggle } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      await importBackup(file);
      window.location.reload();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <Link
        to="/"
        className="flex items-center gap-2 text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <img src="/app_icon_nobg.png" alt="NeurExp icon" className="h-7 w-7 object-contain" />
        <SplitText
          text="NeurExp Tracker"
          className="font-bold text-lg tracking-tight"
          delay={35}
          duration={0.45}
          from={{ opacity: 0, y: 16 }}
        />
      </Link>

      <div className="flex items-center gap-1">
        {/* Import error inline */}
        {importError && (
          <span className="flex items-center gap-1 text-xs text-red-500 mr-2">
            <AlertCircle size={13} />
            {importError}
          </span>
        )}

        {/* Export backup */}
        <button
          onClick={() => exportBackup().catch((err) => setImportError(err instanceof Error ? err.message : 'Export failed.'))}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Export backup (JSON)"
        >
          <Download size={17} />
        </button>

        {/* Import backup */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Import backup (JSON)"
        >
          <Upload size={17} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
