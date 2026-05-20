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
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif text-brand-text tracking-tight mb-4">Define your <span className="opacity-30">purpose</span></h1>
        <p className="text-brand-text/40 mb-8 sm:mb-16 text-base sm:text-xl font-serif px-4">In the Scholeduc ecosystem, every role is an architect.</p>

        {error && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 text-brand-text rounded-2xl text-left max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="text-red-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              ⚠️ DB Policy Coordination Failure
            </div>
            <p className="text-xs text-slate-700 font-serif leading-relaxed">
              {error}
            </p>
            <div className="mt-4 border-t border-red-200/50 pt-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Database Repair SQL Solution:</div>
              <p className="text-[11px] text-slate-500 leading-normal font-serif">
                This app uses Supabase for account roles and classroom enrollment. Active recursive Row-Level Security (RLS) policies in your database are causing an infinite loop. Copy the SQL script below, paste it directly into your <strong>Supabase SQL Editor</strong>, and click <strong>Run</strong>:
              </p>
              
              <div className="relative">
                <pre className="p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl overflow-y-auto max-h-40 font-mono text-[10px] leading-relaxed select-all">
{`-- ==========================================================
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
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);`}
                </pre>
              </div>
              <div className="text-[10px] font-bold text-slate-400">
                💡 Note: After successfully executing the SQL query in Supabase, feel free to choose a role below to proceed!
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {roles.map((role, idx) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={!isProcessing ? { y: -10 } : {}}
              disabled={isProcessing}
              onClick={() => handleRoleSelection(role.id)}
              className={`group bg-white p-6 sm:p-12 rounded-2xl sm:rounded-[40px] shadow-2xl shadow-brand-text/5 border border-brand-border text-left flex flex-col items-start transition-all hover:border-brand-text/20 overflow-hidden relative ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center mb-6 sm:mb-10 group-hover:bg-brand-text group-hover:text-white transition-all">
                <role.icon className="w-5 h-5 opacity-40 group-hover:opacity-100" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-brand-text mb-4 group-hover:text-blue-600 transition-colors tracking-tight">{role.title}</h2>
              <p className="text-brand-text/40 leading-relaxed font-serif text-base sm:text-lg pr-4">
                {role.description}
              </p>
              
              <div className="mt-8 sm:mt-12 flex items-center gap-4 text-[10px] font-bold text-brand-text/20 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-[0.2em]">
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
