import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, GraduationCap, School, ShieldCheck, MoreVertical, MessageSquare, Database, ChevronDown, ChevronUp, Copy, Check, Eye, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Class, UserProfile } from '../../types';

export default function People({ cls }: { cls: Class }) {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [showRlsHelper, setShowRlsHelper] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [dismissedRls, setDismissedRls] = useState(() => {
    return localStorage.getItem('scholeduc_rls_dismiss_people') === 'true';
  });

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        setError(null);
        console.log('[fetchPeople] Fetching enrollments for class ID:', cls.id);
        
        // 1. Fetch all enrollments for this class
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('role, user_id')
          .eq('class_id', cls.id);

        if (enrollError) {
          console.error('[fetchPeople] Error fetching enrollments:', enrollError);
          setError(`Enrollment link issue: ${enrollError.message}`);
        }

        console.log('[fetchPeople] Enrollments returned:', enrollments);

        // 2. Gather unique user IDs, ensuring course creator (owner_id) is always included
        const enrolledUserIds = enrollments?.map((e: any) => e.user_id) || [];
        const allUserIds = Array.from(new Set([cls.owner_id, ...enrolledUserIds].filter(Boolean)));

        console.log('[fetchPeople] Unique user IDs to fetch profiles for:', allUserIds);

        if (allUserIds.length === 0) {
          setTeachers([]);
          setStudents([]);
          setLoading(false);
          return;
        }

        // 3. Fetch user profiles for these IDs directly
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('uid', allUserIds);

        if (profilesError) {
          console.error('[fetchPeople] Error fetching profiles:', profilesError);
          setError(`Profile link restriction: ${profilesError.message}`);
        }

        console.log('[fetchPeople] Profiles returned:', profiles);

        // 4. Map profiles by UID for easy lookup
        const profileMap = new Map<string, any>();
        profiles?.forEach((p: any) => {
          profileMap.set(p.uid, p);
        });

        const teacherList: UserProfile[] = [];
        const studentList: UserProfile[] = [];

        // Always check and add the class owner as Lead Educator
        const ownerProfile = profileMap.get(cls.owner_id);
        const ownerMapped: UserProfile = {
          uid: cls.owner_id,
          email: ownerProfile?.email || 'educator@scholeduc.org',
          display_name: ownerProfile?.display_name || 'Lead Educator',
          photo_url: ownerProfile?.photo_url || '',
          role: 'teacher',
          age: ownerProfile?.age || 0,
          sex: ownerProfile?.sex || 'other',
          created_at: ownerProfile?.created_at || new Date().toISOString()
        };
        teacherList.push(ownerMapped);

        // Map and process other enrollments
        enrollments?.forEach((en: any) => {
          // If this enrollment is the class owner, we already processed them as Lead Educator
          if (en.user_id === cls.owner_id) return;

          const p = profileMap.get(en.user_id);
          const mapped: UserProfile = {
            uid: en.user_id,
            email: p?.email || `student.${en.user_id.substring(0, 5)}@scholeduc.org`,
            display_name: p?.display_name || `Learner ${en.user_id.substring(0, 5).toUpperCase()}`,
            photo_url: p?.photo_url || '',
            role: en.role || 'student',
            age: p?.age || 0,
            sex: p?.sex || 'other',
            created_at: p?.created_at || new Date().toISOString()
          };

          if (en.role === 'teacher') {
            teacherList.push(mapped);
          } else {
            studentList.push(mapped);
          }
        });

        // Deduplicate lists based on uid
        const uniqueTeachers = Array.from(new Map(teacherList.map(t => [t.uid, t])).values());
        const uniqueStudents = Array.from(new Map(studentList.map(s => [s.uid, s])).values());

        console.log('[fetchPeople] Resolved Teachers list:', uniqueTeachers);
        console.log('[fetchPeople] Resolved Students list:', uniqueStudents);

        setTeachers(uniqueTeachers);
        setStudents(uniqueStudents);
      } catch (err: any) {
        console.error('Failed to fetch people:', err);
        setError(err.message || 'An unexpected error occurred during user fetch.');
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();

    const channel = supabase
      .channel(`people-${cls.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `class_id=eq.${cls.id}` },
        () => fetchPeople()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cls.id, cls.owner_id]);

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

  if (loading) return (
    <div className="flex justify-center py-20">
       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {error && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs font-bold text-orange-700 uppercase tracking-widest text-center">
          Note: {error} (Falling back to roster view from registered class logs)
        </div>
      )}

      {/* RLS Policy Helper Guide */}
      {!dismissedRls && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all hover:bg-slate-50/70">
          <button 
            type="button"
            onClick={() => {
              localStorage.setItem('scholeduc_rls_dismiss_people', 'true');
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
                     Missing Students or Classmates?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                     By default, Supabase's Row-Level Security (RLS) restricts students from selecting database records of other users. Execute the SQL command below in your Supabase SQL Editor to enable visibility between classmates.
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
                <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed rounded-2xl overflow-x-auto border border-slate-800">
                  {sqlCommands}
                </pre>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Deduplicated & Clean policies
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Teachers Section */}
      <section>
        <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-text rounded-full flex items-center justify-center text-white font-serif italic text-xl">Σ</div>
              <h2 className="text-4xl font-serif italic text-brand-text tracking-tight">The Educators</h2>
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-text/30">
             {teachers.length} Authority
           </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teachers.map((teacher) => (
             <motion.div 
               key={teacher.uid}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex items-center justify-between p-6 bg-white rounded-2xl border border-brand-border hover:border-brand-text/20 transition-all group cursor-pointer"
             >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-brand-text overflow-hidden flex items-center justify-center shadow-xl shadow-brand-text/5 grayscale">
                      {teacher.photo_url ? (
                        <img src={teacher.photo_url} alt={teacher.display_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : <User className="w-6 h-6 text-white" />}
                   </div>
                   <div>
                      <h4 className="text-base font-bold text-brand-text tracking-tight uppercase flex items-center gap-2 transition-colors group-hover:text-blue-600">
                        {teacher.display_name}
                        <ShieldCheck className="w-4 h-4 text-blue-600 opacity-30" />
                      </h4>
                      <p className="text-[10px] font-bold text-brand-text/30 uppercase tracking-widest">{teacher.email}</p>
                   </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <Mail className="w-5 h-5 text-brand-text/20 hover:text-blue-600 transition-colors" />
                </div>
             </motion.div>
          ))}
        </div>
      </section>

      {/* Students Section */}
      <section>
        <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-8">
           <div className="flex items-center gap-4">
              <h2 className="text-3xl font-serif italic text-brand-text/40 tracking-tight">The Learners</h2>
              <div className="flex-1 h-px bg-brand-border" />
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-text/30">
             {students.length} Total
           </span>
        </div>
        
        <div className="space-y-2">
          {students.length === 0 ? (
            <p className="p-12 text-center text-brand-text/20 font-serif italic text-xl bg-white rounded-3xl border border-brand-border">The current roster is vacant.</p>
          ) : (
            students.map((student) => (
              <motion.div 
                key={student.uid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 px-6 hover:bg-white hover:shadow-sm rounded-xl transition-all group border-b border-brand-border/5 last:border-b-0"
              >
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-bg text-brand-text/30 overflow-hidden flex items-center justify-center border border-brand-border grayscale group-hover:grayscale-0 transition-all">
                       {student.photo_url ? (
                         <img src={student.photo_url} alt={student.display_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       ) : <User className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-bold text-brand-text/60 uppercase tracking-widest group-hover:text-brand-text transition-colors">{student.display_name}</span>
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageSquare className="w-4 h-4 text-brand-text/20 hover:text-blue-600 cursor-pointer" />
                 </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
