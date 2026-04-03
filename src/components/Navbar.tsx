import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center sticky top-0 z-40 shadow-sm">
      <Link
        to="/"
        className="flex items-center gap-2 text-slate-900 hover:text-blue-600 transition-colors"
      >
        <img src="/app_icon_nobg.png" alt="NeurExp icon" className="h-7 w-7 object-contain" />
        <span className="font-bold text-lg tracking-tight">NeurExp Tracker</span>
      </Link>
    </nav>
  );
}
