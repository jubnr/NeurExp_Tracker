import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { StudyDetail } from './pages/StudyDetail';
import { ParticipantDetail } from './pages/ParticipantDetail';
import { AcquisitionFlow } from './pages/AcquisitionFlow';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/studies/:studyId" element={<StudyDetail />} />
            <Route
              path="/studies/:studyId/participants/:participantId"
              element={<ParticipantDetail />}
            />
            <Route
              path="/studies/:studyId/participants/:participantId/acquire"
              element={<AcquisitionFlow />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
