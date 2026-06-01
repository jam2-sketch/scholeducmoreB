import React from 'react';
import { Calendar, BookOpen, Settings, Info, LogOut } from 'lucide-react';
import { useScholeduc } from '../../ScholeducProvider';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useScholeduc();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse active class ID from current URL if inside a class Detail page
  const match = location.pathname.match(/\/class\/([^/]+)/);
  const currentClassId = match ? match[1] : null;
  const isCourseActive = !!currentClassId;

  const navItems = [
    { icon: Calendar, label: 'Calendar' },
    { icon: BookOpen, label: 'To-do' },
  ];

  const handleItemClick = (label: string) => {
    if (!isCourseActive) return;

    if (label === 'To-do') {
      // Connects "To-do" to the Assignments (classwork) page inside the class
      navigate(`/class/${currentClassId}?tab=classwork`);
    } else if (label === 'Calendar') {
      // Connects "Calendar" to the lower part of the Stream page with class deadlines highlighted
      navigate(`/class/${currentClassId}?tab=stream&scroll=deadlines`);
    }
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-16 h-[calc(100vh-64px)] w-20 bg-white border-r border-brand-border z-40
        transform transition-transform duration-300 ease-in-out flex flex-col items-center py-8 gap-10
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col gap-10">
          {navItems.map((item) => (
            <button
              key={item.label}
              title={isCourseActive ? item.label : `${item.label} (Enter a Course First)`}
              disabled={!isCourseActive}
              onClick={() => handleItemClick(item.label)}
              className={`group relative flex flex-col items-center ${
                isCourseActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-25'
              }`}
            >
              <item.icon className={`w-6 h-6 text-brand-text ${
                isCourseActive ? 'opacity-40 group-hover:opacity-100 transition-all' : 'opacity-30'
              }`} />
              <span className="absolute left-full ml-4 px-2 py-1 bg-brand-text text-white text-[10px] uppercase font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {isCourseActive ? item.label : `${item.label} (Requires Course)`}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto mb-4 flex flex-col items-center gap-6">
          <button title="Logout" onClick={logout} className="group relative flex flex-col items-center">
            <LogOut className="w-6 h-6 text-red-600/40 group-hover:text-red-600 transition-all" />
            <span className="absolute left-full ml-4 px-2 py-1 bg-red-600 text-white text-[10px] uppercase font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Logout
            </span>
          </button>
          <button title="Settings" className="group">
            <Settings className="w-6 h-6 text-brand-text opacity-40 group-hover:opacity-100 transition-all" />
          </button>
          <div className="w-10 h-10 rounded-full border border-brand-border bg-brand-bg flex items-center justify-center group cursor-pointer overflow-hidden relative">
            <div className="w-full h-full bg-blue-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <Info className="w-4 h-4 text-brand-text opacity-40 group-hover:opacity-100" />
          </div>
        </div>
      </aside>
    </>
  );
}
