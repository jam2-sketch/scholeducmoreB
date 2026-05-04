import React from 'react';
import { LayoutDashboard, Calendar, BookOpen, Settings, Info, LogOut } from 'lucide-react';
import { useScholeduc } from '../../ScholeducProvider';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, logout } = useScholeduc();

  const navItems = [
    { icon: LayoutDashboard, label: 'Classes', href: '/' },
    { icon: Calendar, label: 'Calendar', href: '/tasks' },
    { icon: BookOpen, label: 'To-do', href: '/todo' },
  ];

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
              title={item.label}
              className="group relative flex flex-col items-center"
            >
              <item.icon className="w-6 h-6 text-brand-text opacity-40 group-hover:opacity-100 transition-all" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-brand-text text-white text-[10px] uppercase font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
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
