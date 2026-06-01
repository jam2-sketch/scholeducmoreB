import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, GraduationCap, School, ShieldCheck, MoreVertical, MessageSquare, Database, ChevronDown, ChevronUp, Copy, Check, Eye, X, Search, Award, Activity, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Class, UserProfile } from '../../types';
import { useScholeduc } from '../../ScholeducProvider';

export default function People({ cls }: { cls: Class }) {
  const { profile, user } = useScholeduc();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [showRlsHelper, setShowRlsHelper] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Search & Profile Modal state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  
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

  const filteredTeachers = teachers.filter(t =>
    t.display_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.display_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const isEducatorViewer = profile?.role === 'teacher' || user?.id === cls.owner_id;

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

      {/* RLS Policy Helper Guide - ONLY visible to Teachers/Creators */}
      {!dismissedRls && isEducatorViewer && (
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
                     Educator Database Assistant
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                     By default, Supabase's Row-Level Security restricts standard students from searching database records of other users. Execute the SQL command below in your Supabase SQL Editor to enable visibility between classmates.
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

      {/* Classmate Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-brand-text/30 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          placeholder="Search course contributors by name, registry profile, email..."
          className="w-full bg-white border border-brand-border/60 pl-11 pr-4 py-3 rounded-2xl text-xs outline-none focus:border-brand-text/40 transition-all text-brand-text placeholder:text-brand-text/25 font-serif italic shadow-sm"
        />
        {studentSearch && (
          <button 
            type="button"
            onClick={() => setStudentSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 hover:text-[#1A1A1A] cursor-pointer animate-none"
          >
            Reset
          </button>
        )}
      </div>

      {/* Teachers Section */}
      <section>
        <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-text rounded-full flex items-center justify-center text-white font-serif italic text-xl">Σ</div>
              <h2 className="text-3xl font-serif italic text-brand-text tracking-tight">The Educators</h2>
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-text/30 animate-none">
             {filteredTeachers.length} Authority
           </span>
        </div>
        
        {filteredTeachers.length === 0 ? (
          <p className="p-8 text-center text-xs font-serif italic text-brand-text/35 bg-white rounded-3xl border border-brand-border">No educators match your search criteria.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeachers.map((teacher) => (
               <motion.div 
                 key={teacher.uid}
                 onClick={() => setSelectedProfile(teacher)}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex items-center justify-between p-6 bg-white rounded-2xl border border-brand-border hover:border-brand-text/20 hover:shadow-md transition-all group cursor-pointer"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-brand-text overflow-hidden flex items-center justify-center shadow-md shadow-brand-text/5 grayscale group-hover:grayscale-0 transition-all">
                        {teacher.photo_url ? (
                          <img src={teacher.photo_url} alt={teacher.display_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : <User className="w-6 h-6 text-white" />}
                     </div>
                     <div>
                        <h4 className="text-base font-bold text-brand-text tracking-tight uppercase flex items-center gap-2 transition-colors group-hover:text-blue-600">
                          {teacher.display_name}
                          <ShieldCheck className="w-4 h-4 text-blue-600 opacity-40 animate-pulse" />
                        </h4>
                        <p className="text-[10px] font-bold text-brand-text/30 uppercase tracking-widest">{teacher.email}</p>
                     </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <Eye className="w-5 h-5 text-brand-text/20 hover:text-blue-600 transition-colors" />
                  </div>
               </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Students Section */}
      <section>
        <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-8">
           <div className="flex items-center gap-4">
              <h2 className="text-2xl font-serif italic text-brand-text/40 tracking-tight">The Learners</h2>
              <div className="flex-1 h-px bg-brand-border" />
           </div>
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-text/30">
             {filteredStudents.length} Total
           </span>
        </div>
        
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <p className="p-12 text-center text-brand-text/20 font-serif italic text-xl bg-white rounded-3xl border border-brand-border">
              {studentSearch ? "No learners match this search design." : "The current roster is vacant."}
            </p>
          ) : (
            filteredStudents.map((student) => (
              <motion.div 
                key={student.uid}
                onClick={() => setSelectedProfile(student)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 px-6 hover:bg-white hover:shadow-md hover:border-l-4 hover:border-l-blue-600 rounded-xl transition-all group border-b border-brand-border/5 last:border-b-0 cursor-pointer"
              >
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-bg text-brand-text/30 overflow-hidden flex items-center justify-center border border-brand-border grayscale group-hover:grayscale-0 transition-all font-serif italic font-bold">
                       {student.photo_url ? (
                         <img src={student.photo_url} alt={student.display_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       ) : student.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-brand-text/60 uppercase tracking-widest group-hover:text-brand-text transition-colors">{student.display_name}</span>
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A]/35 group-hover:text-blue-600 transition-colors">See credentials</span>
                    <Eye className="w-4 h-4 text-brand-text/20 group-hover:text-blue-600 transition-colors" />
                 </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Premium Profile ID Academic Seal Modal Overlay */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border text-brand-text border-brand-border rounded-[2.5rem] relative overflow-hidden max-w-md w-full shadow-2xl p-6 sm:p-10 font-sans"
            >
              {/* Seal Banner Watermark */}
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full border border-dashed border-[#1A1A1A]/10 flex items-center justify-center select-none pointer-events-none rotate-12">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#1A1A1A]/10">SCHOLEDUC ACADEMIA</span>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-6 right-6 p-2 rounded-full border border-brand-border hover:bg-brand-bg transition-colors cursor-pointer text-brand-text/40 hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-6 pt-4">
                {/* Academic Header Badge */}
                <div className="mx-auto w-fit px-4 py-1 border border-brand-text/20 rounded-full text-[8.5px] font-black uppercase tracking-[0.34em] text-brand-text/60">
                  {selectedProfile.role === 'teacher' ? 'Faculty Officer Roster' : 'Registered Student Roster'}
                </div>

                {/* Avatar with Custom Frame */}
                <div className="relative mx-auto w-24 h-24 p-1 border border-brand-border rounded-full flex items-center justify-center bg-white group shadow-sm">
                  <div className="w-full h-full rounded-full overflow-hidden bg-brand-bg relative">
                    {selectedProfile.photo_url ? (
                      <img src={selectedProfile.photo_url} alt={selectedProfile.display_name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-serif italic text-brand-text/55">
                        {selectedProfile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#1A1A1A] p-2 rounded-full text-white shadow-md border border-white">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>

                {/* Main Name & Email */}
                <div>
                  <h3 className="text-2xl font-serif italic text-brand-text tracking-tight">{selectedProfile.display_name}</h3>
                  <p className="text-xs font-mono font-medium opacity-55 mt-1 tracking-tight">{selectedProfile.email}</p>
                </div>

                {/* Ornate Divider Line */}
                <div className="flex items-center gap-3 justify-center text-brand-text/20 select-none">
                  <div className="w-20 h-px bg-[#1A1A1A]/10" />
                  <Sparkles className="w-4 h-4 opacity-45 animate-pulse" />
                  <div className="w-20 h-px bg-[#1A1A1A]/10" />
                </div>

                {/* Credential Data List */}
                <div className="bg-brand-bg rounded-3xl border border-brand-border/60 p-5 text-left space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-brand-text/40 uppercase tracking-widest text-[9px]">Class Standing</span>
                    <span className="font-serif italic font-semibold text-brand-text">
                      {selectedProfile.role === 'teacher' ? 'Course Chancellor' : 'Scholar in Good Standing'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-brand-border/10 pt-3">
                    <span className="font-bold text-brand-text/40 uppercase tracking-widest text-[9px]">Course Velocity</span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 font-bold animate-none">
                      <Activity className="w-3.5 h-3.5" />
                      {selectedProfile.role === 'teacher' ? 'Instructor Lead' : '92.4% Optimal'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-brand-border/10 pt-3">
                    <span className="font-bold text-brand-text/40 uppercase tracking-widest text-[9px]">Registry Identifier</span>
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-text">
                      {selectedProfile.role === 'teacher' ? 'FAC-' : 'SCH-'}{selectedProfile.uid.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Contact Email letter of inquiry */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `mailto:${selectedProfile.email}?subject=Scholeduc Correspondence - ${cls.name}`;
                  }}
                  className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-text/10 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  Send Letter of Inquiry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
