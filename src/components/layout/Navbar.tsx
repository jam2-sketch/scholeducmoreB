import { motion } from 'framer-motion';
import { User, Menu, LogOut } from 'lucide-react';
import { useScholeduc } from '../../ScholeducProvider';

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, logout } = useScholeduc();

  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-brand-border">
      <div className="flex h-16 items-center px-4 md:px-10 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-brand-bg rounded-full transition-colors md:hidden"
            id="mobile-menu-toggle"
          >
            <Menu className="w-5 h-5 text-brand-text" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-text rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
              <span className="font-serif">S</span>
            </div>
            <span className="text-xl font-serif italic tracking-tight text-brand-text">Scholeduc</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {profile && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-text">{profile.display_name}</span>
                <span className="text-[9px] opacity-20 font-bold uppercase tracking-[0.2em]">{profile.role}</span>
              </div>
              
              <div className="flex items-center gap-3 border-l border-brand-border pl-6">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-600/60 hover:text-red-600 transition-colors group"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
                <div className="w-10 h-10 rounded-full border border-brand-border bg-brand-bg flex items-center justify-center overflow-hidden">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4 text-brand-text/30" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
