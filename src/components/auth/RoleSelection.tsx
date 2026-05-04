import { useState } from 'react';
import { motion } from 'framer-motion';
import { useScholeduc } from '../../ScholeducProvider';
import { GraduationCap, School } from 'lucide-react';

export default function RoleSelection() {
  const { setRole, logout } = useScholeduc();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      id: 'teacher' as const,
      title: 'Educator',
      description: 'Orchestrate classes, draft assignments, and curate data with AI intelligence.',
      icon: School,
    },
    {
      id: 'student' as const,
      title: 'Student',
      description: 'Engage with materials, contribute to the stream, and refine your practice.',
      icon: GraduationCap,
    },
  ];

  const handleRoleSelection = async (roleId: 'teacher' | 'student') => {
    setIsProcessing(true);
    setError(null);
    try {
      await setRole(roleId);
    } catch (err: any) {
      console.error('Role selection error:', err);
      setError(err.message || 'Failed to initialize profile. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 relative overflow-hidden">
      {/* Sign Out Button */}
      <div className="absolute top-8 right-8 z-50">
        <button 
          onClick={logout}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text/30 hover:text-brand-text transition-colors flex items-center gap-2 group"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">Disconnect session</span>
          Sign Out
        </button>
      </div>

      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-100/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
           <div className="w-12 h-px bg-brand-border" />
           <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-text/30">Orientation Sequence</span>
           <div className="w-12 h-px bg-brand-border" />
        </div>
        <h1 className="text-5xl md:text-6xl font-serif italic text-brand-text tracking-tight mb-4">Define your <span className="opacity-30">purpose</span></h1>
        <p className="text-brand-text/40 mb-16 text-xl font-serif italic">In the Scholeduc ecosystem, every role is an architect.</p>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-serif italic rounded-xl">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-10">
          {roles.map((role, idx) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={!isProcessing ? { y: -10 } : {}}
              disabled={isProcessing}
              onClick={() => handleRoleSelection(role.id)}
              className={`group bg-white p-12 rounded-[40px] shadow-2xl shadow-brand-text/5 border border-brand-border text-left flex flex-col items-start transition-all hover:border-brand-text/20 overflow-hidden relative ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center mb-10 group-hover:bg-brand-text group-hover:text-white transition-all">
                <role.icon className="w-5 h-5 opacity-40 group-hover:opacity-100" />
              </div>
              <h2 className="text-3xl font-serif italic text-brand-text mb-4 group-hover:text-blue-600 transition-colors tracking-tight">{role.title}</h2>
              <p className="text-brand-text/40 leading-relaxed font-serif italic text-lg pr-4">
                {role.description}
              </p>
              
              <div className="mt-12 flex items-center gap-4 text-[10px] font-bold text-brand-text/20 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-[0.2em]">
                 {isProcessing ? 'Synchronizing...' : 'Acknowledge & Continue'}
                 <div className="w-8 h-px bg-brand-border group-hover:bg-blue-600 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
