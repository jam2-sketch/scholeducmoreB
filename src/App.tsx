import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScholeducProvider, useScholeduc } from './ScholeducProvider';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoginView from './components/auth/LoginView';
import RoleSelection from './components/auth/RoleSelection';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';

function AppContent() {
  const { user, profile, loading } = useScholeduc();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  console.log('[AppContent] Rendering - user:', user?.id, 'profile:', profile?.uid, 'loading:', loading);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Opening Scholeduc...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (!profile) {
    return <RoleSelection />;
  }

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 md:ml-20 pt-16 transition-all duration-300">
        <div className="max-w-[1200px] mx-auto p-4 md:p-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/class/:classId" element={<ClassDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  console.log('[App] Rendering');
  return (
    <BrowserRouter>
      <ScholeducProvider>
        <AppContent />
      </ScholeducProvider>
    </BrowserRouter>
  );
}
