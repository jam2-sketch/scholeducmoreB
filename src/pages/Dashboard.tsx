import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronRight, Hash, Users, Sparkles, BookOpen, LayoutDashboard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useScholeduc } from '../ScholeducProvider';
import { Class, Enrollment } from '../types';
import { generateJoinCode } from '../lib/utils';

export default function Dashboard() {
  const { profile, user } = useScholeduc();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const fetchClasses = async () => {
    if (!user) return;
    console.log('Fetching classes for user:', user.id);
    setLoading(true);
    
    try {
      // 1. Get enrollments
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('user_id', user.id);

      if (enrollmentError) {
        console.error('Enrollment fetch error:', enrollmentError);
      }

      const classIds = enrollments ? enrollments.map(e => e.class_id) : [];
      console.log('User enrollments:', classIds);
      
      // 2. Fetch classes (Owned OR Enrolled)
      // We do two separate fetches to be safer with RLS and query complexity
      const [ownedRes, enrolledRes] = await Promise.all([
        supabase.from('classes').select('*').eq('owner_id', user.id),
        classIds.length > 0 
          ? supabase.from('classes').select('*').in('id', classIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (ownedRes.error) console.error('Owned classes fetch error:', ownedRes.error);
      if (enrolledRes.error) console.error('Enrolled classes fetch error:', enrolledRes.error);

      // Combine and deduplicate
      const combined = [...(ownedRes.data || []), ...(enrolledRes.data || [])];
      const uniqueClasses = Array.from(new Map(combined.map(c => [c.id, c])).values());

      console.log('Total unique classes found:', uniqueClasses.length);
      setClasses(uniqueClasses as Class[]);
    } catch (err) {
      console.error('Unexpected error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || !user) return;

    fetchClasses();

    // Subscribe to changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => fetchClasses()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments' },
        () => fetchClasses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    try {
      const code = generateJoinCode();
      const newClass = {
        name: newClassName,
        owner_id: user.id,
        join_code: code,
        theme_color: ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-600'][Math.floor(Math.random() * 5)],
        created_at: new Date().toISOString(),
      };

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([newClass])
        .select()
        .single();

      if (classError) throw classError;
      
      // Add enrollment for teacher
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert([{
          class_id: classData.id,
          user_id: user.id,
          role: 'teacher',
          enrolled_at: new Date().toISOString(),
        }]);

      if (enrollError) throw enrollError;

      setShowCreateModal(false);
      setNewClassName('');
      fetchClasses(); // Refresh list manually
    } catch (err) {
      console.error(err);
      setError('Failed to create class.');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    try {
      const { data: classData, error: findError } = await supabase
        .from('classes')
        .select('id')
        .eq('join_code', joinCode.toUpperCase())
        .single();
      
      if (findError || !classData) {
        setError('Class not found with this code.');
        return;
      }

      const classId = classData.id;

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .single();

      if (existingEnrollment) {
        setError('You are already in this class.');
        return;
      }

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert([{
          user_id: user.id,
          class_id: classId,
          role: 'student',
          enrolled_at: new Date().toISOString(),
        }]);

      if (enrollError) throw enrollError;

      setShowJoinModal(false);
      setJoinCode('');
      fetchClasses(); // Refresh list manually
    } catch (err) {
      console.error(err);
      setError('Failed to join class.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-brand-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600">Scholeduc 2.0 / {new Date().getFullYear()}</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Academy Engine</span>
          </div>
          <h1 className="text-5xl font-serif italic tracking-tight text-brand-text">Your <span className="underline decoration-[#1A1A1A]/10 underline-offset-8">Classrooms</span></h1>
          <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest mt-2">{profile?.display_name} — Lead Educator</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{profile?.display_name}</p>
            <p className="text-[10px] opacity-50 uppercase tracking-widest">{profile?.role}</p>
          </div>
          {profile?.role === 'teacher' ? (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="w-12 h-12 bg-brand-text text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              +
            </button>
          ) : (
            <button 
              onClick={() => setShowJoinModal(true)}
              className="px-6 py-2.5 bg-brand-text text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Join Class
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white border border-brand-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-brand-border px-6">
          <BookOpen className="w-12 h-12 text-brand-text opacity-10 mb-6" />
          <h2 className="text-xl font-serif italic text-brand-text mb-2">No Active Courses</h2>
          <p className="text-xs font-bold opacity-30 uppercase tracking-widest mb-8">Ready to architect your first curriculum?</p>
          <div className="flex gap-8">
            <button onClick={() => setShowCreateModal(true)} className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">Create Class</button>
            <button onClick={() => setShowJoinModal(true)} className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">Join Class</button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}

      {/* MODALS (Simplified for turn) */}
      <AnimatePresence>
        {(showCreateModal || showJoinModal) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowCreateModal(false); setShowJoinModal(false); setError(''); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-brand-border overflow-hidden"
            >
              <div className="mb-10 text-center">
                 <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Access Point</span>
                    <div className="w-8 h-px bg-brand-border" />
                 </div>
                 <h2 className="text-3xl font-serif italic text-brand-text tracking-tight">
                   {showCreateModal ? 'Draft New Studio' : 'Connect to Session'}
                 </h2>
              </div>

              <form onSubmit={showCreateModal ? handleCreateClass : handleJoinClass} className="space-y-8">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-brand-text/30 tracking-[0.4em] mb-3 px-1 text-center">
                    {showCreateModal ? 'Studio Identifier' : 'Sequence Code'}
                  </label>
                  <input 
                    type="text" 
                    required
                    value={showCreateModal ? newClassName : joinCode}
                    onChange={(e) => showCreateModal ? setNewClassName(e.target.value) : setJoinCode(e.target.value)}
                    placeholder={showCreateModal ? "e.g. Modern Physics" : "ABC-123"}
                    className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-brand-text placeholder:text-brand-text/10 focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-xl text-center"
                  />
                </div>

                {error && <p className="text-[10px] text-orange-600 font-bold bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center uppercase tracking-widest">{error}</p>}

                <div className="flex flex-col gap-4 pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-brand-text text-white py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] shadow-2xl shadow-brand-text/20 hover:scale-[1.02] transition-all transform active:scale-95"
                  >
                    {showCreateModal ? 'Establish Studio' : 'Enter Void'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowCreateModal(false); setShowJoinModal(false); setError(''); }}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text/20 hover:text-brand-text transition-colors"
                  >
                    Rescind Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { Link } from 'react-router-dom';

interface ClassCardProps {
  cls: Class;
  key?: any;
}

function ClassCard({ cls }: ClassCardProps) {
  return (
    <Link to={`/class/${cls.id}`} className="block">
      <motion.div 
        whileHover={{ y: -8 }}
        className="group bg-white rounded-2xl border border-brand-border shadow-sm hover:shadow-xl hover:shadow-brand-text/5 transition-all overflow-hidden relative flex flex-col h-full"
      >
        <div className={`h-24 ${cls.theme_color} relative p-6 flex flex-col justify-end overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4">
            <Hash className="w-12 h-12 text-white/10" />
          </div>
          <div className="flex items-center gap-2 text-[9px] uppercase font-bold tracking-[0.2em] text-white/70 mb-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Spring Semester
          </div>
          <h3 className="text-xl font-serif italic text-white tracking-tight truncate">{cls.name}</h3>
        </div>
        
        <div className="p-6 flex-1 flex flex-col">
          <p className="text-xs font-medium text-brand-text/60 mb-6 uppercase tracking-widest flex items-center justify-between">
            <span>{cls.section || 'General'}</span>
            <span className="opacity-30">8 Students</span>
          </p>

          <div className="mt-auto flex justify-between items-center">
            <div className="flex -space-x-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full border border-white bg-brand-bg flex items-center justify-center text-[9px] font-bold text-brand-text/40">
                  {i}
                </div>
              ))}
            </div>
            
            <button className="px-5 py-1.5 border border-brand-text text-brand-text text-[10px] font-bold rounded-full uppercase tracking-widest group-hover:bg-brand-text group-hover:text-white transition-all">
              Enter
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
