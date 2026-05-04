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

  console.log('[AppContent] user:', user?.id, 'profile:', profile?.uid, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Opening Scholeduc...</span>
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
  return (
    <BrowserRouter>
      <ScholeducProvider>
        <AppContent />
      </ScholeducProvider>
    </BrowserRouter>
  );
}
