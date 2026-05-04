import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, BookOpen, Clock, ChevronRight, FileText, Sparkles, Wand2, Calendar, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useScholeduc } from '../../ScholeducProvider';
import { Class, Assignment } from '../../types';
import { formatDate } from '../../lib/utils';
import { generateAssignmentDescription } from '../../services/genieService';

export default function Classwork({ cls }: { cls: Class }) {
  const { profile, user } = useScholeduc();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', cls.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setAssignments(data as Assignment[]);
      }
    };

    fetchAssignments();

    const channel = supabase
      .channel(`assignments-${cls.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `class_id=eq.${cls.id}` },
        () => fetchAssignments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cls.id]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          class_id: cls.id,
          title: newTitle,
          description: newDescription,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          points: Number(points),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Automatically post to stream
      const { error: postError } = await supabase
        .from('posts')
        .insert([{
          class_id: cls.id,
          author_id: user.id,
          author_name: profile.display_name,
          author_photo: profile.photo_url,
          content: `New Assignment: ${newTitle}`,
          type: 'assignment',
          attachment_url: assignmentData.id,
          created_at: new Date().toISOString(),
        }]);

      if (postError) throw postError;

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAIAssist = async () => {
    if (!newTitle) return;
    setIsGenerating(true);
    try {
      const desc = await generateAssignmentDescription(newTitle, cls.name);
      setNewDescription(desc || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-end border-b border-brand-border pb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Academic Catalog</span>
              <div className="w-8 h-px bg-brand-border" />
           </div>
           <h2 className="text-4xl font-serif italic text-brand-text">Curriculum <span className="opacity-30">&</span> Modules</h2>
        </div>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-text text-white px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-brand-text/10 hover:scale-105 active:scale-95 transition-all"
          >
            Draft Assignment
          </button>
        )}
      </header>

      <section className="space-y-6">
        {assignments.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-brand-border">
             <BookOpen className="w-12 h-12 text-brand-text opacity-5 mx-auto mb-6" />
             <p className="text-brand-text/30 font-serif italic text-xl">The syllabus remains unwritten...</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <motion.div 
               key={assignment.id}
               whileHover={{ x: 6 }}
               className="group bg-white rounded-2xl p-6 border border-brand-border flex items-center gap-8 transition-all hover:border-brand-text/20 cursor-pointer"
            >
               <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center border border-brand-border group-hover:bg-brand-text group-hover:text-white transition-all shrink-0">
                  <FileText className="w-5 h-5 opacity-40 group-hover:opacity-100" />
               </div>
               <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-text tracking-tight uppercase group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                  <div className="flex items-center gap-6 mt-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text/30 uppercase tracking-widest">
                       <Clock className="w-3.5 h-3.5" />
                       Posted {formatDate(assignment.created_at)}
                    </div>
                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">
                         <Target className="w-3.5 h-3.5" />
                         Due {formatDate(assignment.due_date)}
                      </div>
                    )}
                  </div>
               </div>
               <div className="text-right hidden sm:block">
                  <p className="text-xl font-serif italic text-brand-text">{assignment.points}</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-30 font-bold">Credits</p>
               </div>
               <ChevronRight className="w-5 h-5 opacity-10 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))
        )}
      </section>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-brand-text/10 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
             <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-white rounded-[40px] p-12 border border-brand-border shadow-2xl shadow-brand-text/5 overflow-hidden overflow-y-auto max-h-[90vh]"
             >
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-8 right-8 w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text/20 hover:text-brand-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-6 mb-12">
                   <div className="w-16 h-16 bg-brand-text rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-text/20">
                      <Plus className="w-8 h-8 text-white" />
                   </div>
                   <div>
                       <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Module Creation</span>
                          <div className="w-8 h-px bg-brand-border" />
                       </div>
                       <h2 className="text-4xl font-serif italic text-brand-text tracking-tight">Draft <span className="opacity-30">Assignment</span></h2>
                   </div>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-brand-bg p-6 rounded-3xl border border-brand-border flex flex-col items-center">
                         <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-2">Credit Value</label>
                         <input 
                           type="number" 
                           value={points} 
                           onChange={(e) => setPoints(Number(e.target.value))}
                           className="w-full bg-transparent text-center font-serif italic text-3xl text-brand-text focus:outline-none" 
                         />
                      </div>
                      <div className="bg-brand-bg p-6 rounded-3xl border border-brand-border flex flex-col items-center">
                         <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-2">Target Date</label>
                         <input 
                           type="date" 
                           value={dueDate} 
                           onChange={(e) => setDueDate(e.target.value)}
                           className="w-full bg-transparent text-center text-xs font-bold text-brand-text focus:outline-none uppercase tracking-widest" 
                         />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="border-b border-brand-border pb-2">
                        <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-1">Assignment Title</label>
                        <input 
                          type="text" 
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Untitled Masterpiece..."
                          className="w-full text-2xl font-serif italic text-brand-text placeholder:text-brand-text/10 border-none focus:ring-0 outline-none p-0"
                        />
                      </div>
                      
                      <div className="relative">
                        <textarea 
                           required
                           value={newDescription}
                           onChange={(e) => setNewDescription(e.target.value)}
                           placeholder="Describe the instructions for your students..."
                           className="w-full min-h-[250px] bg-brand-bg rounded-3xl p-8 text-brand-text border border-brand-border focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-xl leading-relaxed placeholder:text-brand-text/10"
                        />
                        <button 
                           type="button"
                           onClick={handleAIAssist}
                           disabled={!newTitle || isGenerating}
                           className="absolute top-6 right-6 bg-brand-text text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-all transform active:scale-90 disabled:opacity-10 flex items-center gap-2"
                        >
                           {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        </button>
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-8 border-t border-brand-border">
                      <p className="text-[9px] font-bold text-brand-text/20 uppercase tracking-[0.2em]">Revision Status: Pristine</p>
                      <div className="flex gap-4">
                        <button 
                           type="button"
                           onClick={() => setShowCreateModal(false)}
                           className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-text/30 hover:text-brand-text transition-colors"
                        >
                           Discard
                        </button>
                        <button 
                           type="submit"
                           className="bg-brand-text text-white px-10 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-brand-text/20 hover:scale-105 transition-all active:scale-95"
                        >
                           Publish Assignment
                        </button>
                      </div>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
