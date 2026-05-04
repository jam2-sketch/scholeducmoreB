import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, GraduationCap, School, ShieldCheck, MoreVertical, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Class, UserProfile } from '../../types';

export default function People({ cls }: { cls: Class }) {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeople = async () => {
      // Supabase can do joins if foreign keys are set up.
      // Assuming enrollment.user_id references profiles.uid
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          role,
          user_id,
          profiles:user_id (
            uid,
            email,
            display_name,
            photo_url,
            role,
            age,
            sex,
            created_at
          )
        `)
        .eq('class_id', cls.id);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const teacherList: UserProfile[] = [];
      const studentList: UserProfile[] = [];

      enrollments?.forEach((en: any) => {
        const profile = en.profiles;
        if (profile) {
          // Map snake_case to what the component expects if necessary
          const mappedProfile: UserProfile = {
            uid: profile.uid,
            email: profile.email,
            display_name: profile.display_name,
            photo_url: profile.photo_url,
            role: profile.role,
            age: profile.age,
            sex: profile.sex,
            created_at: profile.created_at
          };
          if (en.role === 'teacher') teacherList.push(mappedProfile);
          else studentList.push(mappedProfile);
        }
      });

      setTeachers(teacherList);
      setStudents(studentList);
      setLoading(false);
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
  }, [cls.id]);

  if (loading) return (
    <div className="flex justify-center py-20">
       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12">
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
