import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, Users, BarChart3, Settings, Hash, ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Class } from '../types';
import Stream from '../components/classroom/Stream';
import Classwork from '../components/classroom/Classwork';
import People from '../components/classroom/People';

type Tab = 'stream' | 'classwork' | 'people' | 'grades';

export default function ClassDetail() {
  const { classId } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('stream');
  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const fetchClass = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();
      
      if (error) {
        console.error(error);
      } else {
        setCls(data as Class);
      }
      setLoading(false);
    };

    fetchClass();

    const channel = supabase
      .channel(`class-${classId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
        (payload) => {
          setCls(payload.new as Class);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!cls) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Class not found</h2>
      <Link to="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
    </div>
  );

  const tabs = [
    { id: 'stream', label: 'Stream', icon: Hash },
    { id: 'classwork', label: 'Classwork', icon: BookOpen },
    { id: 'people', label: 'People', icon: Users },
    { id: 'grades', label: 'Grades', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 md:space-y-10">
      <header className="min-h-[160px] md:h-40 border-b border-brand-border flex flex-col md:flex-row justify-end md:items-end px-4 md:px-10 py-6 md:pb-8 bg-white -mx-4 md:-mx-10 -mt-4 md:-mt-10 overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-64 h-full ${cls.theme_color} opacity-10 blur-3xl -z-10`} />
        
        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
            <Link 
              to="/" 
              className="p-2 border border-brand-border hover:bg-brand-bg rounded-full transition-colors self-start"
            >
              <ArrowLeft className="w-4 h-4 text-brand-text" />
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600 truncate">{cls.section || 'Engineering'} / SY 2024</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase whitespace-nowrap">Join Code: {cls.join_code}</span>
              <button 
                onClick={() => window.location.reload()}
                className="text-[9px] font-bold text-brand-text/30 hover:text-brand-text transition-colors uppercase tracking-[0.2em] whitespace-nowrap"
              >
                Hard Reset
              </button>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif tracking-tight text-brand-text break-words">{cls.name}</h1>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0 w-full md:w-auto border-t border-brand-border md:border-0 pt-4 md:pt-0">
          <div className="text-left md:text-right">
            <p className="text-xs font-bold">Class Identity</p>
            <p className="text-[10px] opacity-50 uppercase tracking-widest">Digital Hub</p>
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'stream') {
                // We'll rely on the Stream component's own posting state if we can find a way,
                // but for now let's use a simpler approach or just switch tab.
                setActiveTab('stream');
              } else if (activeTab === 'classwork') {
                // This would ideally trigger the modal in Classwork, 
                // but since they are separate routes/components it's tricky without a store.
                // For now, we'll just ensure the tabs work well.
              }
            }}
            className="w-12 h-12 bg-brand-text text-white rounded-full flex items-center justify-center text-xl shadow-lg transform rotate-45 hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6 transform -rotate-45" />
          </button>
        </div>
      </header>

      <nav className="flex gap-6 md:gap-10 border-b border-brand-border pb-px overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`
              text-[11px] font-bold uppercase tracking-[0.2em] pb-3 transition-all relative shrink-0
              ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-brand-text/30 hover:text-brand-text/60'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'stream' && <Stream cls={cls} />}
            {activeTab === 'classwork' && <Classwork cls={cls} />}
            {activeTab === 'people' && <People cls={cls} />}
            {activeTab === 'grades' && <div className="p-20 text-center text-brand-text/30 font-serif italic">Gradebook management coming soon to Scholeduc OS...</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
