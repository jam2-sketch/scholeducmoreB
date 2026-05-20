import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronRight, Hash, Users, Sparkles, BookOpen, LayoutDashboard, Database, ChevronDown, ChevronUp, Copy, Check, ShieldCheck, X } from 'lucide-react';
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
  
  const [showRlsHelper, setShowRlsHelper] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissedRls, setDismissedRls] = useState(() => {
    return localStorage.getItem('scholeduc_rls_dismiss_dashboard') === 'true';
  });

  const fetchClasses = async () => {
    if (!user) return;
    console.log('--- Syncing Classes ---');
    setError('');
    
    try {
      // Fetch enrollments and owned classes in parallel
      const [enrollmentRes, ownedRes] = await Promise.all([
        supabase.from('enrollments').select('class_id').eq('user_id', user.id),
        supabase.from('classes').select('*').eq('owner_id', user.id)
      ]);

      if (enrollmentRes.error) {
        console.error('Enrollment fetch error:', enrollmentRes.error.message);
        setError(`Enrollment link recursion: ${enrollmentRes.error.message}`);
      }
      if (ownedRes.error) {
        console.error('Owned classes fetch error:', ownedRes.error.message);
        setError(`Owned classes filter recursion: ${ownedRes.error.message}`);
      }

      const enrolledIds = enrollmentRes.data?.map(e => e.class_id) || [];
      
      let finalClasses = [...(ownedRes.data || [])];

      if (enrolledIds.length > 0) {
        const { data: enrolledClasses, error: enrolledError } = await supabase
          .from('classes')
          .select('*')
          .in('id', enrolledIds);
        
        if (enrolledError) {
          console.error('Enrolled classes fetch error:', enrolledError.message);
          setError(`Enrolled classes display restriction: ${enrolledError.message}`);
        } else if (enrolledClasses) {
          finalClasses = [...finalClasses, ...enrolledClasses];
        }
      }

      // Deduplicate
      const unique = Array.from(new Map(finalClasses.map(c => [c.id, c])).values());
      
      if (unique.length > 0 || !loading) {
        setClasses(unique as Class[]);
      }
    } catch (err: any) {
      console.error('Failed to sync dashboard data:', err);
      setError(err.message || 'An unexpected database link issue occurred.');
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

  const sqlCommands = `-- ==========================================================
-- OPTION A: DISABLE ROW LEVEL SECURITY (100% LOOP-FREE & EASY)
-- Run this if you are developing and want to bypass RLS errors completely:
-- ==========================================================
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- ==========================================================
-- OPTION B: RECREATE 100% RECURSION-IMMUNE RLS POLICIES
-- ==========================================================

-- 1. FORCE-DROP ALL ACTIVE POLICIES ACROSS ALL TABLES TO CLEAR BLOCKS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('classes', 'enrollments', 'profiles', 'assignments', 'posts', 'comments')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3. CLASSES POLICIES (No cross-table queries)
CREATE POLICY "Allow authenticated read classes"
ON public.classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert classes"
ON public.classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow authenticated update classes"
ON public.classes FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Allow authenticated delete classes"
ON public.classes FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 4. PROFILES POLICIES
CREATE POLICY "Allow authenticated read profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to manage own profile"
ON public.profiles FOR ALL TO authenticated
USING (auth.uid() = uid) WITH CHECK (auth.uid() = uid);

-- 5. ENROLLMENTS POLICIES (No cross-table queries)
CREATE POLICY "Allow authenticated read enrollments"
ON public.enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow user insert self enrollment"
ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete enrollments"
ON public.enrollments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. ASSIGNMENTS POLICIES
CREATE POLICY "Allow authenticated read assignments"
ON public.assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage assignments"
ON public.assignments FOR ALL TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- 7. POSTS POLICIES
CREATE POLICY "Allow authenticated read posts"
ON public.posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage posts"
ON public.posts FOR ALL TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- 8. COMMENTS POLICIES
CREATE POLICY "Allow authenticated read comments"
ON public.comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage comments"
ON public.comments FOR ALL TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-brand-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600">Scholeduc 2.0 / {new Date().getFullYear()}</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Academy Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight text-brand-text break-words">Your <span className="underline decoration-[#1A1A1A]/10 underline-offset-4 md:underline-offset-8">Classrooms</span></h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest">{profile?.display_name} — Lead Educator</p>
            <button 
              onClick={fetchClasses}
              className="text-[9px] font-bold text-blue-600 hover:opacity-50 transition-colors uppercase tracking-[0.2em]"
            >
              Sync Classrooms
            </button>
          </div>
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

      {error && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs font-bold text-orange-700 uppercase tracking-widest text-center">
          Note: {error}
        </div>
      )}

      {/* RLS Policy Helper Guide for classes/enrollments issues */}
      {!dismissedRls && (error || classes.length === 0) && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all hover:bg-slate-50/70 shadow-sm">
          <button 
            type="button"
            onClick={() => {
              localStorage.setItem('scholeduc_rls_dismiss_dashboard', 'true');
              setDismissedRls(true);
            }}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer z-10"
            title="Dismiss instruction card"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
            <div className="flex items-start gap-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center justify-center">
                  <Database className="w-6 h-6 animate-pulse" />
               </div>
               <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                     Database Infinite Recursion Detected?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed font-serif">
                     Supabase Row-Level Security (RLS) policies for classes/enrollments are running into circular references. Paste this safe 100% loop-free policy builder into your Supabase SQL Editor and click Run.
                  </p>
               </div>
            </div>
            <button 
              type="button" 
              onClick={() => setShowRlsHelper(!showRlsHelper)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px] rounded-full shadow-sm transition-all whitespace-nowrap self-start sm:self-center cursor-pointer"
            >
               <span>{showRlsHelper ? 'Hide SQL Fix' : 'See SQL Solution'}</span>
               {showRlsHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {showRlsHelper && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 border-t border-slate-200 pt-6 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execute in your Supabase SQL Editor:</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors cursor-pointer animate-none"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Script
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed rounded-2xl overflow-y-auto max-h-72 border border-slate-800">
                  {sqlCommands}
                </pre>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Loop-Free Classes + Enrollments + Profiles policies
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white border border-brand-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-brand-border px-6">
          <BookOpen className="w-12 h-12 text-brand-text opacity-10 mb-6" />
          <h2 className="text-xl font-serif text-brand-text mb-2">No Active Courses</h2>
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
              className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-[40px] shadow-2xl p-6 sm:p-10 border border-brand-border overflow-hidden"
            >
              <div className="mb-6 sm:mb-10 text-center">
                 <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Access Point</span>
                    <div className="w-8 h-px bg-brand-border" />
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-serif italic text-brand-text tracking-tight animate-pulse-subtle">
                   {showCreateModal ? 'Draft New Studio' : 'Connect to Session'}
                 </h2>
              </div>

              <form onSubmit={showCreateModal ? handleCreateClass : handleJoinClass} className="space-y-6 sm:space-y-8">
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
          <h3 className="text-xl font-serif text-white tracking-tight truncate">{cls.name}</h3>
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
